import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminAuth } from "@/lib/auth";
import {
  generateMockHubSummary,
  calculateHealthScore,
  formatHourLabel,
  generateHeuristicActionCards,
  FunnelStage,
  HourlyResponseMetric,
  HubSummaryResult,
  PageHealthSummary,
} from "@/lib/advisorEngine";
import { generateGeminiActionCards } from "@/lib/geminiAdvisor";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const noCacheHeaders = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

export async function GET(req: NextRequest) {
  const unauthorized = await requireAdminAuth(req);
  if (unauthorized) return unauthorized;

  try {
    const { searchParams } = new URL(req.url);
    const pageId = searchParams.get("pageId") || "ALL";
    const timeRange = searchParams.get("timeRange") || "all";
    const businessName = searchParams.get("business") || "ALL";
    const rawAov = searchParams.get("aov");
    const forceRefresh = searchParams.get("refresh") === "true";

    // Fetch system settings
    const settingsList = await prisma.systemSetting.findMany();
    const settingsMap: Record<string, string> = {};
    for (const item of settingsList) {
      settingsMap[item.key] = item.value;
    }

    const isMockMode = settingsMap["MOCK_MODE"] === "true";
    const defaultAov = parseInt(settingsMap["REPORT_AOV"] || "45", 10) || 45;
    const aov = rawAov ? Math.max(1, parseInt(rawAov, 10)) : defaultAov;

    // Fetch connected pages for active business portfolio
    const connectedPages = await prisma.facebookPage.findMany({
      where: businessName !== "ALL" ? { businessName } : {},
      select: { pageId: true, name: true, businessName: true, accessToken: true },
    });

    // Find specific page name if pageId is scoped
    let selectedPageName: string | undefined;
    if (pageId !== "ALL") {
      const pageRecord =
        connectedPages.find((p) => p.pageId === pageId) ||
        (await prisma.facebookPage.findUnique({
          where: { pageId },
          select: { name: true },
        }));
      selectedPageName = pageRecord?.name;
    }

    // In Mock Mode, return realistic simulated data mapped to actual connected pages
    if (isMockMode) {
      const mockData = generateMockHubSummary(aov, pageId, selectedPageName, connectedPages);

      // Attempt AI enhancement if key is provided (cached automatically)
      const aiResult = await generateGeminiActionCards({
        pageId: pageId !== "ALL" ? pageId : undefined,
        pageName: selectedPageName,
        businessName: businessName !== "ALL" ? businessName : "SieLab Retail Group",
        timeRange,
        totalLeads: mockData.totalLeads,
        ghostedWarmLeads: mockData.ghostedWarmLeads,
        avgResponseMinutes: mockData.avgResponseMinutes,
        overallConversionRate: mockData.overallConversionRate,
        aov,
        dangerHours: mockData.hourlyActivity.filter((h) => h.isDangerZone),
        forceRefresh,
      });

      if (aiResult && aiResult.cards.length > 0) {
        mockData.actionCards = aiResult.cards;
        mockData.aiEnhanced = true;
        mockData.cacheStatus = {
          isCached: aiResult.isCached,
          ageMinutes: aiResult.ageMinutes,
          ttlMinutes: aiResult.ttlMinutes,
        };
      }

      return NextResponse.json(
        { success: true, data: mockData, mode: "MOCK" },
        { headers: noCacheHeaders }
      );
    }

    // Live Database Calculation
    let dateFilter: Date | undefined;
    const now = new Date();
    if (timeRange === "7d") {
      dateFilter = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (timeRange === "30d") {
      dateFilter = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    const whereClause: any = {};
    if (dateFilter) {
      whereClause.createdAt = { gte: dateFilter };
    }

    // Filter by pageId if specified
    if (pageId !== "ALL") {
      whereClause.pageId = pageId;
    } else if (businessName !== "ALL") {
      const pageList = await prisma.facebookPage.findMany({
        where: { businessName },
        select: { pageId: true },
      });
      whereClause.pageId = { in: pageList.map((p) => p.pageId) };
    }

    const allLeads = await prisma.leadConversation.findMany({
      where: whereClause,
      include: {
        page: { select: { name: true, businessName: true, accessToken: true } },
      },
    });

    // If database has very few leads, fallback to realistic mock summary so UI renders properly
    if (allLeads.length < 5) {
      const mockFallback = generateMockHubSummary(aov, pageId, selectedPageName);
      return NextResponse.json(
        { success: true, data: mockFallback, mode: "MOCK_FALLBACK", note: "Insufficient live data (< 5 leads), rendering sample pipeline." },
        { headers: noCacheHeaders }
      );
    }

    // Calculate Real Metrics
    const totalLeads = allLeads.length;
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const ghostedWarmLeadsList = allLeads.filter(
      (l) => l.status === "AWAITING_CUSTOMER" && l.lastCustomerMessageAt < twentyFourHoursAgo
    );
    const ghostedWarmLeads = ghostedWarmLeadsList.length;

    const ghostedPriceLeadsList = ghostedWarmLeadsList.filter(
      (l) =>
        /price|cost|how much|discount|quote|promo/i.test(l.lastCustomerMessage || "") ||
        /price|cost|\$|฿|usd/i.test(l.lastAgentMessage || "")
    );
    const ghostedPriceLeads = ghostedPriceLeadsList.length;

    const convertedLeads = allLeads.filter(
      (l) => l.status === "CONVERTED" || (l.status === "REPLIED" && l.repliedAfterStep !== null)
    ).length;

    const followedUpLeads = allLeads.filter((l) => l.followUpCount > 0).length;
    const followUpCoverageRate = ghostedWarmLeads > 0
      ? Math.round((followedUpLeads / (ghostedWarmLeads + followedUpLeads)) * 100)
      : 85;

    const overallConversionRate = Math.round((convertedLeads / totalLeads) * 100);
    const lostPipelineRevenue = ghostedWarmLeads * aov;
    const ghostRate = Math.round((ghostedWarmLeads / totalLeads) * 100);

    // Compute average response times (in minutes)
    let totalResponseMinutes = 0;
    let measuredResponsesCount = 0;
    const hourlyBuckets: Record<number, { leadCount: number; totalRespMin: number; convertedCount: number }> = {};

    for (let h = 0; h < 24; h++) {
      hourlyBuckets[h] = { leadCount: 0, totalRespMin: 0, convertedCount: 0 };
    }

    for (const lead of allLeads) {
      const msgHour = new Date(lead.lastCustomerMessageAt).getHours();
      hourlyBuckets[msgHour].leadCount += 1;

      if (lead.status === "CONVERTED") {
        hourlyBuckets[msgHour].convertedCount += 1;
      }

      if (lead.lastAgentMessageAt && lead.lastCustomerMessageAt) {
        const diffMs = new Date(lead.lastAgentMessageAt).getTime() - new Date(lead.lastCustomerMessageAt).getTime();
        if (diffMs > 0 && diffMs < 24 * 60 * 60 * 1000) {
          const diffMinutes = Math.round(diffMs / (60 * 1000));
          totalResponseMinutes += diffMinutes;
          measuredResponsesCount += 1;
          hourlyBuckets[msgHour].totalRespMin += diffMinutes;
        }
      }
    }

    const avgResponseMinutes = measuredResponsesCount > 0
      ? Math.round(totalResponseMinutes / measuredResponsesCount)
      : 12;

    const { score: healthScore, label: healthScoreLabel } = calculateHealthScore({
      conversionRate: overallConversionRate,
      avgResponseMinutes,
      followUpCoverageRate,
      ghostRate,
    });

    // Build 24-Hour activity distribution
    const hourlyActivity: HourlyResponseMetric[] = Object.keys(hourlyBuckets).map((key) => {
      const h = parseInt(key, 10);
      const bucket = hourlyBuckets[h];
      const avgMin = bucket.leadCount > 0 && bucket.totalRespMin > 0
        ? Math.round(bucket.totalRespMin / bucket.leadCount)
        : avgResponseMinutes;
      const convRate = bucket.leadCount > 0
        ? Math.round((bucket.convertedCount / bucket.leadCount) * 100)
        : overallConversionRate;
      const isPeakHour = bucket.leadCount >= Math.max(3, Math.round(totalLeads / 15));
      const isDangerZone = isPeakHour && avgMin > 25;

      return {
        hour: h,
        label: formatHourLabel(h),
        leadCount: bucket.leadCount,
        avgResponseMinutes: avgMin,
        conversionRate: convRate,
        isPeakHour,
        isDangerZone,
      };
    });

    const dangerHours = hourlyActivity.filter((h) => h.isDangerZone);

    const funnel: FunnelStage[] = [
      { name: "Total Inbound Leads", count: totalLeads, percentage: 100, color: "bg-blue-500" },
      { name: "Product & Price Inquired", count: Math.round(totalLeads * 0.7), percentage: 70, color: "bg-indigo-500" },
      { name: "Ghosted / Abandoned", count: ghostedWarmLeads, percentage: ghostRate, color: "bg-amber-500" },
      { name: "Successfully Converted", count: convertedLeads, percentage: overallConversionRate, color: "bg-emerald-500" },
    ];

    // Compute Ads Advisor metrics from adSource tracking
    const leadsByAdSource: Record<string, typeof allLeads> = {};
    for (const lead of allLeads) {
      const src = lead.adSource || "Direct / Organic";
      if (!leadsByAdSource[src]) leadsByAdSource[src] = [];
      leadsByAdSource[src].push(lead);
    }

    const adSourcesList = Object.keys(leadsByAdSource);
    let topWinner: any | undefined;
    let worstWaster: any | undefined;
    let totalAttributedRevenue = 0;
    let totalWastedAdSpend = 0;
    let scaleWinnersCount = 0;
    let budgetBleedersCount = 0;

    for (const src of adSourcesList) {
      if (src === "Direct / Organic") continue;
      const srcLeads = leadsByAdSource[src];
      const sTotal = srcLeads.length;
      const sGhost = srcLeads.filter(
        (l) => l.status === "AWAITING_CUSTOMER" && l.lastCustomerMessageAt < twentyFourHoursAgo
      ).length;
      const sConverted = srcLeads.filter((l) => l.status === "CONVERTED").length;
      const sRev = sConverted * aov;
      const sGhostRate = Math.round((sGhost / sTotal) * 100);
      const sRecovRate = Math.round((sConverted / sTotal) * 100);
      const sWasted = Math.round(sGhost * (aov * 0.15));

      totalAttributedRevenue += sRev;
      totalWastedAdSpend += sWasted;

      if (sRev >= aov * 2 && sGhostRate <= 40) {
        scaleWinnersCount++;
      }
      if (sGhostRate >= 50 && sTotal >= 3) {
        budgetBleedersCount++;
      }

      const performer = {
        adSource: src,
        pageId: srcLeads[0]?.pageId,
        pageName: srcLeads[0]?.page?.name || selectedPageName,
        totalLeads: sTotal,
        ghostingRate: sGhostRate,
        recoveryRate: sRecovRate,
        revenue: sRev,
        wastedSpend: sWasted,
        fakeLeadRate: 0,
        healthTier: sRev > 1000 ? "Scale Winner" : sGhostRate > 50 ? "Underperforming" : "Healthy",
        fraudTier: "Clean Traffic",
      };

      if (!topWinner || sRev > topWinner.revenue) {
        topWinner = performer;
      }
      if (!worstWaster || sWasted > worstWaster.wastedSpend) {
        worstWaster = performer;
      }
    }

    const liveAdsAdvisor = {
      trackedCreativesCount: adSourcesList.filter((s) => s !== "Direct / Organic").length,
      totalAttributedRevenue,
      totalWastedAdSpend,
      topWinner,
      worstWaster,
      scaleWinnersCount,
      budgetBleedersCount,
    };

    let actionCards = generateHeuristicActionCards({
      pageId: pageId !== "ALL" ? pageId : undefined,
      pageName: selectedPageName,
      totalLeads,
      ghostedWarmLeads,
      ghostedPriceLeads: ghostedPriceLeads > 0 ? ghostedPriceLeads : Math.round(ghostedWarmLeads * 0.45),
      avgResponseMinutes,
      dangerHours,
      aov,
      adsSummary: liveAdsAdvisor,
    });

    // Multi-Page Health Comparison when in ALL view
    let pageComparisons: PageHealthSummary[] | undefined;
    if (pageId === "ALL") {
      const allPages = await prisma.facebookPage.findMany({
        where: businessName !== "ALL" ? { businessName } : {},
        include: {
          leads: {
            select: {
              status: true,
              lastCustomerMessageAt: true,
              lastAgentMessageAt: true,
              followUpCount: true,
            },
          },
        },
      });

      pageComparisons = allPages.map((pg) => {
        const pTotal = pg.leads.length;
        const pGhost = pg.leads.filter(
          (l) => l.status === "AWAITING_CUSTOMER" && l.lastCustomerMessageAt < twentyFourHoursAgo
        ).length;
        const pConverted = pg.leads.filter((l) => l.status === "CONVERTED").length;
        const pConvRate = pTotal > 0 ? Math.round((pConverted / pTotal) * 100) : 15;
        const pGhostRate = pTotal > 0 ? Math.round((pGhost / pTotal) * 100) : 30;

        let pRespTotal = 0;
        let pRespCount = 0;
        for (const l of pg.leads) {
          if (l.lastAgentMessageAt && l.lastCustomerMessageAt) {
            const diff = new Date(l.lastAgentMessageAt).getTime() - new Date(l.lastCustomerMessageAt).getTime();
            if (diff > 0 && diff < 24 * 60 * 60 * 1000) {
              pRespTotal += Math.round(diff / 60000);
              pRespCount += 1;
            }
          }
        }
        const pAvgResp = pRespCount > 0 ? Math.round(pRespTotal / pRespCount) : 15;
        const { score, label } = calculateHealthScore({
          conversionRate: pConvRate,
          avgResponseMinutes: pAvgResp,
          followUpCoverageRate: 70,
          ghostRate: pGhostRate,
        });

        return {
          pageId: pg.pageId,
          name: pg.name,
          businessName: pg.businessName,
          healthScore: score,
          healthScoreLabel: label,
          totalLeads: pTotal,
          ghostedWarmLeads: pGhost,
          avgResponseMinutes: pAvgResp,
          conversionRate: pConvRate,
          hasToken: Boolean(pg.accessToken && pg.accessToken.trim().length > 5),
        };
      });
    }

    // Attempt Gemini AI Enhancement with 15-Minute Cache & Rate-Limit Guard
    let aiEnhanced = false;
    let cacheStatus = { isCached: false, ageMinutes: 0, ttlMinutes: 15 };

    const aiResult = await generateGeminiActionCards({
      pageId: pageId !== "ALL" ? pageId : undefined,
      pageName: selectedPageName,
      businessName: businessName !== "ALL" ? businessName : "SieLab Retail Group",
      timeRange,
      totalLeads,
      ghostedWarmLeads,
      avgResponseMinutes,
      overallConversionRate,
      aov,
      dangerHours,
      forceRefresh,
    });

    if (aiResult && aiResult.cards.length > 0) {
      actionCards = aiResult.cards;
      aiEnhanced = true;
      cacheStatus = {
        isCached: aiResult.isCached,
        ageMinutes: aiResult.ageMinutes,
        ttlMinutes: aiResult.ttlMinutes,
      };
    }

    const liveResult: HubSummaryResult = {
      healthScore,
      healthScoreLabel,
      lostPipelineRevenue,
      totalLeads,
      ghostedWarmLeads,
      avgResponseMinutes,
      overallConversionRate,
      followUpCoverageRate,
      funnel,
      hourlyActivity,
      actionCards,
      aiEnhanced,
      generatedAt: new Date().toISOString(),
      selectedPageName,
      pageComparisons,
      adsAdvisor: liveAdsAdvisor,
      cacheStatus,
    };

    return NextResponse.json(
      { success: true, data: liveResult, mode: "LIVE" },
      { headers: noCacheHeaders }
    );
  } catch (err: any) {
    console.error("Hub summary analytics error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to compute sales analytics summary" },
      { status: 500, headers: noCacheHeaders }
    );
  }
}
