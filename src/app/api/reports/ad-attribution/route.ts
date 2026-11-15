import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminAuth } from "@/lib/auth";
import { detectLeadAuthenticity, AuthenticityScoreResult } from "@/lib/fraudDetector";

export interface AdCreativeMetric {
  adSource: string;
  pageId: string;
  pageName: string;
  pageAvatar?: string | null;
  businessName: string;
  totalLeads: number;
  activeLeads: number;
  ghostedLeads: number;
  ghostingRate: number; // %
  step1Blasts: number;
  step1Recoveries: number;
  step1RecoveryRate: number; // %
  step2Blasts: number;
  step2Recoveries: number;
  step2RecoveryRate: number; // %
  totalRecoveries: number;
  overallRecoveryRate: number; // %
  step2IncrementalLift: number; // %
  estimatedRevenue: number;
  // Bot & Fake Account Detection Metrics
  fakeLeadsCount: number;
  confirmedFakeCount: number;
  fakeLeadRate: number; // %
  estimatedWastedSpend: number; // $
  fraudTier: "Clean Traffic" | "Moderate Risk" | "High Bot Concentration" | "Critical Bot Fraud";
  fraudAlert?: string | null;
  healthTier: "Scale Winner" | "Healthy" | "Ghosting Alert" | "Step 2 Dependent" | "Underperforming";
  recommendation: string;
  leads: Array<{
    id: string;
    customerName: string;
    customerAvatar?: string | null;
    lastCustomerMessage: string;
    lastCustomerMessageAt: Date;
    status: string;
    followUpCount: number;
    repliedAfterStep?: number | null;
    repliedAt?: Date | null;
    hoursUnresponsive?: number;
    // Authenticity
    authenticityStatus: AuthenticityScoreResult["status"];
    fakeRiskScore: number;
    authenticityReasons: string[];
  }>;
}

export async function GET(req: NextRequest) {
  const unauthorized = await requireAdminAuth(req);
  if (unauthorized) return unauthorized;

  try {
    const { searchParams } = new URL(req.url);
    const filterPageId = searchParams.get("pageId");
    const filterBusiness = searchParams.get("businessName");
    const daysParam = searchParams.get("days"); // '7', '30', 'today', '1', or null/'all'
    const startDateParam = searchParams.get("startDate"); // YYYY-MM-DD
    const endDateParam = searchParams.get("endDate"); // YYYY-MM-DD
    
    let aovParam = 45.0;
    const queryAov = searchParams.get("aov");
    if (queryAov && !isNaN(parseFloat(queryAov))) {
      aovParam = parseFloat(queryAov);
    } else {
      const aovSetting = await prisma.systemSetting.findUnique({
        where: { key: "REPORT_AOV" },
      });
      if (aovSetting?.value && !isNaN(parseFloat(aovSetting.value))) {
        aovParam = parseFloat(aovSetting.value);
      }
    }

    // Default estimated Meta Cost Per Message / Click ($1.80 benchmark)
    const costPerLeadParam = 1.80;

    // Date filtering: support specific calendar date range or relative days
    const dateFilter: { gte?: Date; lte?: Date } = {};

    if (startDateParam || endDateParam) {
      if (startDateParam) {
        const start = new Date(startDateParam);
        if (!isNaN(start.getTime())) {
          start.setHours(0, 0, 0, 0);
          dateFilter.gte = start;
        }
      }
      if (endDateParam) {
        const end = new Date(endDateParam);
        if (!isNaN(end.getTime())) {
          end.setHours(23, 59, 59, 999);
          dateFilter.lte = end;
        }
      }
    } else if (daysParam && daysParam !== "all") {
      if (daysParam === "today" || daysParam === "1") {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        dateFilter.gte = today;
      } else {
        const days = parseInt(daysParam);
        if (!isNaN(days) && days > 0) {
          const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
          dateFilter.gte = since;
        }
      }
    }

    const hasDateFilter = Boolean(dateFilter.gte || dateFilter.lte);

    // 1. Fetch Pages matching Business and PageId filter
    const pages = await prisma.facebookPage.findMany({
      where: {
        isActive: true,
        ...(filterPageId && filterPageId !== "ALL" ? { pageId: filterPageId } : {}),
        ...(filterBusiness && filterBusiness !== "ALL" ? { businessName: filterBusiness } : {}),
      },
      select: {
        pageId: true,
        name: true,
        category: true,
        businessName: true,
        avatarUrl: true,
      },
    });

    const pageMap = new Map(pages.map((p) => [p.pageId, p]));
    const targetPageIds = pages.map((p) => p.pageId);

    if (targetPageIds.length === 0) {
      return NextResponse.json({
        success: true,
        summary: {
          totalTrackedCreatives: 0,
          totalAttributedLeads: 0,
          totalAttributedRecoveries: 0,
          totalAttributedRevenue: 0,
          avgGhostingRate: 0,
          avgRecoveryRate: 0,
          totalFakeLeads: 0,
          totalConfirmedFake: 0,
          avgFakeRate: 0,
          totalWastedAdSpend: 0,
          highestFraudAd: null,
          topPerformingAd: null,
          worstGhostingAd: null,
        },
        creatives: [],
      });
    }

    // 2. Fetch Leads belonging to target pages
    const leads = await prisma.leadConversation.findMany({
      where: {
        pageId: { in: targetPageIds },
        ...(hasDateFilter
          ? {
              OR: [
                { createdAt: dateFilter },
                { lastFollowedUpAt: dateFilter },
                { firstFollowedUpAt: dateFilter },
                { secondFollowedUpAt: dateFilter },
                { repliedAt: dateFilter },
              ],
            }
          : {}),
      },
      include: {
        page: true,
      },
      orderBy: { lastAgentMessageAt: "desc" },
    });

    // 3. Fetch BlastLogs (both DELIVERED and FAILED) to track counts and Meta delivery errors
    const blastLogs = await prisma.blastLog.findMany({
      where: {
        pageId: { in: targetPageIds },
        ...(hasDateFilter ? { sentAt: dateFilter } : {}),
      },
      orderBy: { sentAt: "desc" },
    });

    // Map blasts by leadId & capture latest error
    const blastCountByLeadId: Record<string, { step1: number; step2: number }> = {};
    const lastErrorByLeadId: Record<string, string> = {};

    for (const log of blastLogs) {
      if (!log.leadId) continue;
      if (log.status === "DELIVERED") {
        if (!blastCountByLeadId[log.leadId]) {
          blastCountByLeadId[log.leadId] = { step1: 0, step2: 0 };
        }
        if (log.step === 1) blastCountByLeadId[log.leadId].step1++;
        if (log.step === 2) blastCountByLeadId[log.leadId].step2++;
      } else if (log.status === "FAILED" && log.errorMessage) {
        if (!lastErrorByLeadId[log.leadId]) {
          lastErrorByLeadId[log.leadId] = log.errorMessage;
        }
      }
    }

    const now = Date.now();

    // 4. Group leads by adSource (normalizing empty / null to "Direct Messenger / Organic")
    const groupedByAd: Record<string, typeof leads> = {};
    for (const lead of leads) {
      const adName = (lead.adSource && lead.adSource.trim()) || "Direct Messenger / Organic";
      if (!groupedByAd[adName]) {
        groupedByAd[adName] = [];
      }
      groupedByAd[adName].push(lead);
    }

    // 5. Calculate Metrics per Ad Creative
    const creativeMetrics: AdCreativeMetric[] = [];

    for (const [adSource, adLeads] of Object.entries(groupedByAd)) {
      const firstLead = adLeads[0];
      const pageInfo = pageMap.get(firstLead.pageId) || firstLead.page;

      const totalLeads = adLeads.length;
      let ghostedLeads = 0;
      let activeLeads = 0;
      let step1Blasts = 0;
      let step2Blasts = 0;
      let step1Recoveries = 0;
      let step2Recoveries = 0;
      let fakeLeadsCount = 0;
      let confirmedFakeCount = 0;

      const sampleLeads = adLeads.map((lead) => {
        const isReplied = lead.status === "REPLIED" || lead.repliedAt !== null;
        const isFollowedUp = lead.followUpCount > 0;
        const isAwaiting = lead.status === "AWAITING_CUSTOMER";
        const lastError = lastErrorByLeadId[lead.id] || null;

        const leadBlasts = blastCountByLeadId[lead.id] || {
          step1: lead.firstFollowedUpAt ? 1 : 0,
          step2: lead.secondFollowedUpAt ? 1 : 0,
        };

        step1Blasts += leadBlasts.step1;
        step2Blasts += leadBlasts.step2;

        if (isReplied) {
          if (lead.repliedAfterStep === 1 || (lead.followUpCount === 1 && !lead.repliedAfterStep)) {
            step1Recoveries++;
          } else if (lead.repliedAfterStep === 2 || (lead.followUpCount === 2 && !lead.repliedAfterStep)) {
            step2Recoveries++;
          } else {
            step1Recoveries++;
          }
        } else if (isAwaiting || isFollowedUp) {
          ghostedLeads++;
        } else {
          activeLeads++;
        }

        const agentMs = new Date(lead.lastAgentMessageAt).getTime();
        const hoursUnresponsive = Number(Math.max(0, (now - agentMs) / (1000 * 60 * 60)).toFixed(1));

        // Evaluate Fake Account & Bot Risk
        const authenticity = detectLeadAuthenticity({
          customerName: lead.customerName,
          customerAvatar: lead.customerAvatar,
          lastCustomerMessage: lead.lastCustomerMessage,
          status: lead.status,
          followUpCount: lead.followUpCount,
          repliedAt: lead.repliedAt,
          repliedAfterStep: lead.repliedAfterStep,
          lastError,
        });

        if (authenticity.status === "CONFIRMED_FAKE") {
          confirmedFakeCount++;
          fakeLeadsCount++;
        } else if (authenticity.status === "SUSPICIOUS") {
          fakeLeadsCount++;
        }

        return {
          id: lead.id,
          customerName: lead.customerName,
          customerAvatar: lead.customerAvatar,
          lastCustomerMessage: lead.lastCustomerMessage,
          lastCustomerMessageAt: lead.lastCustomerMessageAt,
          status: lead.status,
          followUpCount: lead.followUpCount,
          repliedAfterStep: lead.repliedAfterStep,
          repliedAt: lead.repliedAt,
          hoursUnresponsive,
          authenticityStatus: authenticity.status,
          fakeRiskScore: authenticity.score,
          authenticityReasons: authenticity.reasons,
        };
      });

      const totalRecoveries = step1Recoveries + step2Recoveries;
      const ghostingRate = totalLeads > 0 ? Number(((ghostedLeads / totalLeads) * 100).toFixed(1)) : 0;
      const step1RecoveryRate = step1Blasts > 0 ? Number(((step1Recoveries / step1Blasts) * 100).toFixed(1)) : 0;
      const step2RecoveryRate = step2Blasts > 0 ? Number(((step2Recoveries / step2Blasts) * 100).toFixed(1)) : 0;
      const overallRecoveryRate = totalLeads > 0 ? Number(((totalRecoveries / totalLeads) * 100).toFixed(1)) : 0;
      const step2IncrementalLift = totalRecoveries > 0 ? Number(((step2Recoveries / totalRecoveries) * 100).toFixed(1)) : 0;
      const estimatedRevenue = Math.round(totalRecoveries * aovParam);

      // Fraud / Bot Rate
      const fakeLeadRate = totalLeads > 0 ? Number(((fakeLeadsCount / totalLeads) * 100).toFixed(1)) : 0;
      const estimatedWastedSpend = Math.round(fakeLeadsCount * costPerLeadParam);

      let fraudTier: AdCreativeMetric["fraudTier"] = "Clean Traffic";
      let fraudAlert: string | null = null;

      if (fakeLeadRate >= 60.0 && totalLeads >= 2) {
        fraudTier = "Critical Bot Fraud";
        fraudAlert = `🚨 Critical Bot Concentration (${fakeLeadRate}% fake accounts). Immediate Action: Turn off Meta Audience Network placements and tighten age/location exclusions.`;
      } else if (fakeLeadRate >= 40.0 && totalLeads >= 2) {
        fraudTier = "High Bot Concentration";
        fraudAlert = `⚠️ High Fake Lead Rate (${fakeLeadRate}%). Likely click-farm or accidental default button clickers. Remove pre-set Messenger icebreaker buttons.`;
      } else if (fakeLeadRate >= 20.0) {
        fraudTier = "Moderate Risk";
        fraudAlert = `Moderate automated button clickers (${fakeLeadRate}%). Monitor audience quality.`;
      } else {
        fraudTier = "Clean Traffic";
      }

      // Determine Creative Health Tier & Recommendations
      let healthTier: AdCreativeMetric["healthTier"] = "Healthy";
      let recommendation = "";

      if (fraudTier === "Critical Bot Fraud" || fraudTier === "High Bot Concentration") {
        healthTier = "Ghosting Alert";
        recommendation = `High fake account rate (${fakeLeadRate}%). Your ad budget is burning on bot clicks or inactive burner profiles. Refine targeting in Meta Ads Manager.`;
      } else if (totalLeads >= 2 && overallRecoveryRate >= 35.0) {
        healthTier = "Scale Winner";
        recommendation = `High recovery rate (${overallRecoveryRate}%) with verified human buyers. Post-click purchase intent is strong. Safe to scale ad spend.`;
      } else if (totalLeads >= 2 && ghostingRate >= 75.0 && overallRecoveryRate < 15.0) {
        healthTier = "Ghosting Alert";
        recommendation = `High ghosting rate (${ghostingRate}%). Possible price shock or misleading ad copy. Test clearer pricing in the ad headline.`;
      } else if (totalRecoveries > 0 && step2IncrementalLift >= 40.0) {
        healthTier = "Step 2 Dependent";
        recommendation = `Leads rarely convert on Step 1, but ${step2IncrementalLift}% close after Step 2. Maintain multi-step cooldown blasts with special vouchers.`;
      } else if (overallRecoveryRate >= 20.0) {
        healthTier = "Healthy";
        recommendation = `Steady recovery performance (${overallRecoveryRate}%) with clean human traffic. Continue running.`;
      } else {
        healthTier = "Underperforming";
        recommendation = `Low recovery responsiveness (${overallRecoveryRate}%). Test new spintax hooks or voice notes to revive inactive prospects.`;
      }

      creativeMetrics.push({
        adSource,
        pageId: firstLead.pageId,
        pageName: pageInfo?.name || "Connected Page",
        pageAvatar: pageInfo?.avatarUrl || null,
        businessName: pageInfo?.businessName || "SieLab Retail Group",
        totalLeads,
        activeLeads,
        ghostedLeads,
        ghostingRate,
        step1Blasts,
        step1Recoveries,
        step1RecoveryRate,
        step2Blasts,
        step2Recoveries,
        step2RecoveryRate,
        totalRecoveries,
        overallRecoveryRate,
        step2IncrementalLift,
        estimatedRevenue,
        fakeLeadsCount,
        confirmedFakeCount,
        fakeLeadRate,
        estimatedWastedSpend,
        fraudTier,
        fraudAlert,
        healthTier,
        recommendation,
        leads: sampleLeads,
      });
    }

    // Sort creatives by estimatedRevenue descending by default
    creativeMetrics.sort((a, b) => b.estimatedRevenue - a.estimatedRevenue || b.totalRecoveries - a.totalRecoveries);

    // 6. Aggregate High-Level Summary Metrics
    const totalTrackedCreatives = creativeMetrics.length;
    const totalAttributedLeads = creativeMetrics.reduce((acc, c) => acc + c.totalLeads, 0);
    const totalAttributedRecoveries = creativeMetrics.reduce((acc, c) => acc + c.totalRecoveries, 0);
    const totalAttributedRevenue = creativeMetrics.reduce((acc, c) => acc + c.estimatedRevenue, 0);
    const totalFakeLeads = creativeMetrics.reduce((acc, c) => acc + c.fakeLeadsCount, 0);
    const totalConfirmedFake = creativeMetrics.reduce((acc, c) => acc + c.confirmedFakeCount, 0);
    const totalWastedAdSpend = creativeMetrics.reduce((acc, c) => acc + c.estimatedWastedSpend, 0);

    const avgGhostingRate =
      totalTrackedCreatives > 0
        ? Number((creativeMetrics.reduce((acc, c) => acc + c.ghostingRate, 0) / totalTrackedCreatives).toFixed(1))
        : 0;

    const avgRecoveryRate =
      totalTrackedCreatives > 0
        ? Number((creativeMetrics.reduce((acc, c) => acc + c.overallRecoveryRate, 0) / totalTrackedCreatives).toFixed(1))
        : 0;

    const avgFakeRate =
      totalAttributedLeads > 0
        ? Number(((totalFakeLeads / totalAttributedLeads) * 100).toFixed(1))
        : 0;

    // Top Converting Ad
    const topPerformingAd =
      creativeMetrics.length > 0
        ? [...creativeMetrics].sort((a, b) => b.estimatedRevenue - a.estimatedRevenue || b.overallRecoveryRate - a.overallRecoveryRate)[0]
        : null;

    // Worst Ghosting Ad (highest ghosting rate with at least 2 leads)
    const worstGhostingAd =
      creativeMetrics.length > 0
        ? [...creativeMetrics]
            .filter((c) => c.totalLeads >= 2)
            .sort((a, b) => b.ghostingRate - a.ghostingRate || a.overallRecoveryRate - b.overallRecoveryRate)[0] || creativeMetrics[0]
        : null;

    // Highest Fraud Ad (highest fake lead rate with at least 2 leads)
    const highestFraudAd =
      creativeMetrics.length > 0
        ? [...creativeMetrics]
            .filter((c) => c.totalLeads >= 2)
            .sort((a, b) => b.fakeLeadRate - a.fakeLeadRate || b.fakeLeadsCount - a.fakeLeadsCount)[0] || null
        : null;

    return NextResponse.json({
      success: true,
      summary: {
        totalTrackedCreatives,
        totalAttributedLeads,
        totalAttributedRecoveries,
        totalAttributedRevenue,
        avgGhostingRate,
        avgRecoveryRate,
        totalFakeLeads,
        totalConfirmedFake,
        avgFakeRate,
        totalWastedAdSpend,
        highestFraudAd: highestFraudAd
          ? {
              adSource: highestFraudAd.adSource,
              pageName: highestFraudAd.pageName,
              fakeRate: highestFraudAd.fakeLeadRate,
              fakeCount: highestFraudAd.fakeLeadsCount,
              wastedSpend: highestFraudAd.estimatedWastedSpend,
            }
          : null,
        topPerformingAd: topPerformingAd
          ? {
              adSource: topPerformingAd.adSource,
              pageName: topPerformingAd.pageName,
              recoveryRate: topPerformingAd.overallRecoveryRate,
              revenue: topPerformingAd.estimatedRevenue,
              totalRecoveries: topPerformingAd.totalRecoveries,
            }
          : null,
        worstGhostingAd: worstGhostingAd
          ? {
              adSource: worstGhostingAd.adSource,
              pageName: worstGhostingAd.pageName,
              ghostingRate: worstGhostingAd.ghostingRate,
              totalLeads: worstGhostingAd.totalLeads,
            }
          : null,
      },
      creatives: creativeMetrics,
    });
  } catch (err: any) {
    console.error("Ad Attribution API error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to calculate ad attribution report" },
      { status: 500 }
    );
  }
}
