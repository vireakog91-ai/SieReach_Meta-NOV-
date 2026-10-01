import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminAuth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const unauthorized = await requireAdminAuth(req);
  if (unauthorized) return unauthorized;

  try {
    const { searchParams } = new URL(req.url);
    const filterPageId = searchParams.get("pageId");
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

    // 1. Fetch Pages
    const pages = await prisma.facebookPage.findMany({
      where: {
        isActive: true,
        ...(filterPageId && filterPageId !== "ALL" ? { pageId: filterPageId } : {}),
      },
      select: {
        pageId: true,
        name: true,
        category: true,
        businessName: true,
        avatarUrl: true,
      },
    });

    // 2. Fetch BlastLogs
    const blastLogs = await prisma.blastLog.findMany({
      where: {
        ...(filterPageId && filterPageId !== "ALL" ? { pageId: filterPageId } : {}),
        ...(hasDateFilter ? { sentAt: dateFilter } : {}),
      },
      include: {
        page: true,
      },
      orderBy: { sentAt: "desc" },
    });

    // 3. Fetch Leads that have had interactions within the date range
    const leads = await prisma.leadConversation.findMany({
      where: {
        ...(filterPageId && filterPageId !== "ALL" ? { pageId: filterPageId } : {}),
        ...(hasDateFilter
          ? {
              OR: [
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
    });

    // --- Global Metric Calculations ---
    const deliveredLogs = blastLogs.filter((l) => l.status === "DELIVERED");
    const step1Logs = deliveredLogs.filter((l) => l.step === 1);
    const step2Logs = deliveredLogs.filter((l) => l.step === 2);

    const step1Blasts = step1Logs.length;
    const step2Blasts = step2Logs.length;
    const totalBlasts = deliveredLogs.length;

    // Response calculations from leads
    // Leads who received at least 1 follow up
    const followedLeads = leads.filter((l) => l.followUpCount > 0);
    const totalTargetedLeads = followedLeads.length;

    // Responded after Step 1
    const step1RepliedLeads = followedLeads.filter(
      (l) => (l.status === "REPLIED" || l.repliedAt !== null) && (l.repliedAfterStep === 1 || (l.followUpCount === 1 && l.repliedAt))
    );
    const step1Responses = step1RepliedLeads.length;
    const step1ResponseRate =
      step1Blasts > 0 ? Number(((step1Responses / step1Blasts) * 100).toFixed(1)) : 0;

    // Responded after Step 2
    const step2RepliedLeads = followedLeads.filter(
      (l) => (l.status === "REPLIED" || l.repliedAt !== null) && (l.repliedAfterStep === 2 || (l.followUpCount === 2 && l.repliedAt))
    );
    const step2Responses = step2RepliedLeads.length;
    const step2ResponseRate =
      step2Blasts > 0 ? Number(((step2Responses / step2Blasts) * 100).toFixed(1)) : 0;

    // Total Recovered Customers
    const totalResponses = step1Responses + step2Responses;
    const overallRecoveryRate =
      totalTargetedLeads > 0
        ? Number(((totalResponses / totalTargetedLeads) * 100).toFixed(1))
        : 0;

    const blastEfficiencyRate =
      totalBlasts > 0 ? Number(((totalResponses / totalBlasts) * 100).toFixed(1)) : 0;

    // --- Step 2 Necessity Evaluation & Lift Calculation ---
    // Incremental Lift: What % of total recoveries came purely from the 2nd follow up?
    const step2IncrementalLift =
      totalResponses > 0
        ? Number(((step2Responses / totalResponses) * 100).toFixed(1))
        : 0;

    let step2Recommendation: {
      status: "HIGH_VALUE" | "MODERATE_VALUE" | "DIMINISHING_RETURNS";
      verdict: string;
      description: string;
      color: string;
    };

    if (step2ResponseRate >= 25 || step2IncrementalLift >= 30) {
      step2Recommendation = {
        status: "HIGH_VALUE",
        verdict: "Strongly Recommended (High ROI)",
        description: `Step 2 follow-ups contribute ${step2IncrementalLift}% of all recovered buyers with a ${step2ResponseRate}% conversion rate. Disabling Step 2 would forfeit valuable orders.`,
        color: "emerald",
      };
    } else if (step2ResponseRate >= 12 || step2IncrementalLift >= 15) {
      step2Recommendation = {
        status: "MODERATE_VALUE",
        verdict: "Moderate Lift (Profitable)",
        description: `Step 2 produces a respectable ${step2IncrementalLift}% boost in recoveries. Consider testing a stronger discount or offer for Step 2 to maximize conversion.`,
        color: "amber",
      };
    } else {
      step2Recommendation = {
        status: "DIMINISHING_RETURNS",
        verdict: "Diminishing Returns",
        description: `Step 2 only contributes ${step2IncrementalLift}% of responses. You may consider sticking with a single high-converting Step 1 blast to minimize messaging frequency.`,
        color: "rose",
      };
    }

    // --- Average Response Time Benchmark ---
    // Calculate average minutes taken by customers to reply after Step 1 and Step 2
    const step1DurationsMinutes: number[] = [];
    const step2DurationsMinutes: number[] = [];

    for (const lead of step1RepliedLeads) {
      if (lead.firstFollowedUpAt && lead.lastCustomerMessageAt) {
        const diffMs =
          new Date(lead.lastCustomerMessageAt).getTime() -
          new Date(lead.firstFollowedUpAt).getTime();
        if (diffMs > 0) {
          step1DurationsMinutes.push(Math.round(diffMs / (1000 * 60)));
        }
      }
    }

    for (const lead of step2RepliedLeads) {
      if (lead.secondFollowedUpAt && lead.lastCustomerMessageAt) {
        const diffMs =
          new Date(lead.lastCustomerMessageAt).getTime() -
          new Date(lead.secondFollowedUpAt).getTime();
        if (diffMs > 0) {
          step2DurationsMinutes.push(Math.round(diffMs / (1000 * 60)));
        }
      }
    }

    const avgResponseTimeStep1 =
      step1DurationsMinutes.length > 0
        ? Math.round(
            step1DurationsMinutes.reduce((a, b) => a + b, 0) /
              step1DurationsMinutes.length
          )
        : 45; // default fallback 45 mins

    const avgResponseTimeStep2 =
      step2DurationsMinutes.length > 0
        ? Math.round(
            step2DurationsMinutes.reduce((a, b) => a + b, 0) /
              step2DurationsMinutes.length
          )
        : 110; // default fallback 110 mins

    // Estimated Revenue Recovered
    const estimatedRecoveredRevenue = Math.round(totalResponses * aovParam);

    // --- Per-Page Breakdown ---
    const pageBreakdown = pages.map((page) => {
      const pageLogs = deliveredLogs.filter((l) => l.pageId === page.pageId);
      const pStep1Logs = pageLogs.filter((l) => l.step === 1);
      const pStep2Logs = pageLogs.filter((l) => l.step === 2);

      const pLeads = followedLeads.filter((l) => l.pageId === page.pageId);
      const pTotalTargeted = pLeads.length;

      const pStep1Resp = pLeads.filter(
        (l) => (l.status === "REPLIED" || l.repliedAt !== null) && (l.repliedAfterStep === 1 || (l.followUpCount === 1 && l.repliedAt))
      ).length;

      const pStep2Resp = pLeads.filter(
        (l) => (l.status === "REPLIED" || l.repliedAt !== null) && (l.repliedAfterStep === 2 || (l.followUpCount === 2 && l.repliedAt))
      ).length;

      const pTotalResp = pStep1Resp + pStep2Resp;
      const pStep1Rate =
        pStep1Logs.length > 0
          ? Number(((pStep1Resp / pStep1Logs.length) * 100).toFixed(1))
          : 0;

      const pStep2Rate =
        pStep2Logs.length > 0
          ? Number(((pStep2Resp / pStep2Logs.length) * 100).toFixed(1))
          : 0;

      const pOverallRate =
        pTotalTargeted > 0
          ? Number(((pTotalResp / pTotalTargeted) * 100).toFixed(1))
          : 0;

      const pStep2Lift =
        pTotalResp > 0 ? Number(((pStep2Resp / pTotalResp) * 100).toFixed(1)) : 0;

      let tier: "Top Performer" | "Healthy" | "Needs Optimization" = "Healthy";
      if (pOverallRate >= 50) tier = "Top Performer";
      else if (pOverallRate < 25) tier = "Needs Optimization";

      return {
        pageId: page.pageId,
        pageName: page.name,
        pageCategory: page.category,
        avatarUrl: page.avatarUrl,
        businessName: page.businessName || "SieLab Retail Group",
        totalTargeted: pTotalTargeted,
        totalBlasts: pageLogs.length,
        step1Blasts: pStep1Logs.length,
        step1Responses: pStep1Resp,
        step1ResponseRate: pStep1Rate,
        step2Blasts: pStep2Logs.length,
        step2Responses: pStep2Resp,
        step2ResponseRate: pStep2Rate,
        totalResponses: pTotalResp,
        overallRecoveryRate: pOverallRate,
        step2IncrementalLift: pStep2Lift,
        estimatedRevenue: Math.round(pTotalResp * aovParam),
        efficiencyTier: tier,
      };
    });

    // Sort pages by overallRecoveryRate descending
    pageBreakdown.sort((a, b) => b.overallRecoveryRate - a.overallRecoveryRate);

    // --- Recent Recovered Customers Feed ---
    const recentRecoveries = followedLeads
      .filter((l) => l.status === "REPLIED" || l.repliedAt !== null)
      .map((l) => {
        return {
          id: l.id,
          customerName: l.customerName,
          customerAvatar: l.customerAvatar,
          pageName: l.page.name,
          pageId: l.pageId,
          adSource: l.adSource,
          repliedAfterStep: l.repliedAfterStep || l.followUpCount,
          lastCustomerMessage: l.lastCustomerMessage,
          repliedAt: l.repliedAt || l.lastCustomerMessageAt,
        };
      })
      .slice(0, 8);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      filter: {
        pageId: filterPageId || "ALL",
        days: daysParam || "all",
        startDate: startDateParam || null,
        endDate: endDateParam || null,
        aov: aovParam,
      },
      summary: {
        totalTargetedLeads,
        totalBlasts,
        totalResponses,
        overallRecoveryRate,
        blastEfficiencyRate,
        estimatedRecoveredRevenue,
        // Step 1
        step1Blasts,
        step1Responses,
        step1ResponseRate,
        avgResponseTimeStep1, // in minutes
        // Step 2
        step2Blasts,
        step2Responses,
        step2ResponseRate,
        avgResponseTimeStep2, // in minutes
        // Decision Metric
        step2IncrementalLift,
        step2Recommendation,
      },
      pageBreakdown,
      recentRecoveries,
    });
  } catch (err: any) {
    console.error("Bot Performance Report error:", err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
