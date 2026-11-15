import { prisma } from "@/lib/prisma";
import { detectLeadAuthenticity } from "@/lib/fraudDetector";

export interface CreativeDetailMetric {
  id: string;
  adSource: string;
  pageId: string;
  pageName: string;
  businessName: string;
  // Creative Visuals
  mediaType: "photo" | "video" | "carousel" | "text";
  visualStyle: string;
  mediaUrl: string | null;
  videoDurationSeconds: number;
  aspectRatio: string;
  visualHook: string | null;
  // Content & Copy
  hookHeadline: string | null;
  copywritingFramework: string;
  callToAction: string;
  emotionalTone: string;
  contentLengthCategory: string;
  uniqueSellingPoint: string | null;
  // Campaign Strategy
  campaignObjective: string;
  campaignDesign: string;
  targetAudience: string;
  placement: string;
  offerType: string;
  // Commercial & Sales
  totalLeads: number;
  qualifiedHumanLeads: number;
  fakeLeadsCount: number;
  fakeLeadRate: number; // %
  salesConversions: number;
  conversionRate: number; // %
  totalRevenue: number; // $
  adSpend: number; // $
  roas: number; // x
  cpa: number; // $
  cpl: number; // $
  ghostedLeads: number;
  ghostingRate: number; // %
  recoveriesCount: number;
  recoveryRate: number; // %
  // AI Diagnostics
  healthTier: "Scale Winner" | "High Efficiency" | "Needs Hook Revamp" | "Ghosting Trap" | "Bot Infected";
  aiCreativeSummary: string;
  aiSalesDriver: string;
  aiWeaknessFactors: string;
  aiScalingVerdict: string;
  aiPromptContext: string;
}

export interface DimensionBreakdown {
  name: string;
  creativesCount: number;
  totalLeads: number;
  conversions: number;
  convRate: number; // %
  revenue: number; // $
  spend: number; // $
  roas: number; // x
  cpa: number; // $
  topCreative: string | null;
}

export interface AdAnalyticsFilterOptions {
  pageId?: string | null;
  businessName?: string | null;
  mediaType?: string | null;
  copyFramework?: string | null;
  campaignDesign?: string | null;
  days?: string | null;
  startDate?: string | null;
  endDate?: string | null;
}

export async function computeAdvancedAdsAnalytics(filters: AdAnalyticsFilterOptions = {}) {
  const {
    pageId: filterPageId,
    businessName: filterBusiness,
    mediaType: filterMediaType,
    copyFramework: filterFramework,
    campaignDesign: filterDesign,
    days: daysParam,
    startDate: startDateParam,
    endDate: endDateParam,
  } = filters;

  // Date filtering
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
        dateFilter.gte = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      }
    }
  }

  const hasDateFilter = Boolean(dateFilter.gte || dateFilter.lte);

  // 1. Fetch matching Pages
  const pages = await prisma.facebookPage.findMany({
    where: {
      isActive: true,
      ...(filterPageId && filterPageId !== "ALL" ? { pageId: filterPageId } : {}),
      ...(filterBusiness && filterBusiness !== "ALL" ? { businessName: filterBusiness } : {}),
    },
    select: {
      pageId: true,
      name: true,
      businessName: true,
      avatarUrl: true,
    },
  });

  const targetPageIds = pages.map((p) => p.pageId);
  const pageMap = new Map(pages.map((p) => [p.pageId, p]));

  if (targetPageIds.length === 0) {
    return {
      summary: {
        totalCreatives: 0,
        totalLeads: 0,
        totalQualifiedLeads: 0,
        totalConversions: 0,
        blendedConvRate: 0,
        totalRevenue: 0,
        totalSpend: 0,
        blendedRoas: 0,
        blendedCpa: 0,
        topVisualFormat: "N/A",
        topCopyFramework: "N/A",
        topCampaignDesign: "N/A",
        topRevenueAd: null,
        bestRoasAd: null,
        worstGhostingAd: null,
      },
      breakdowns: {
        byMediaType: [],
        byVisualStyle: [],
        byCopyFramework: [],
        byCampaignDesign: [],
        byPlacement: [],
      },
      creatives: [],
    };
  }

  // 2. Fetch Leads
  const leads = await prisma.leadConversation.findMany({
    where: {
      pageId: { in: targetPageIds },
      ...(hasDateFilter
        ? {
            OR: [
              { createdAt: dateFilter },
              { lastFollowedUpAt: dateFilter },
              { repliedAt: dateFilter },
            ],
          }
        : {}),
    },
    include: { page: true },
  });

  // 3. Fetch BlastLogs for delivery error tracking
  const blastLogs = await prisma.blastLog.findMany({
    where: {
      pageId: { in: targetPageIds },
      ...(hasDateFilter ? { sentAt: dateFilter } : {}),
    },
    orderBy: { sentAt: "desc" },
  });

  const lastErrorByLeadId: Record<string, string> = {};
  for (const log of blastLogs) {
    if (log.leadId && log.status === "FAILED" && log.errorMessage) {
      if (!lastErrorByLeadId[log.leadId]) {
        lastErrorByLeadId[log.leadId] = log.errorMessage;
      }
    }
  }

  // 4. Fetch stored Ad Creative Insights taxonomy from DB
  const storedInsights = await prisma.adCreativeInsight.findMany({
    where: {
      ...(filterBusiness && filterBusiness !== "ALL" ? { businessName: filterBusiness } : {}),
    },
  });

  const insightsMap = new Map(storedInsights.map((i) => [i.adSource.trim(), i]));

  // 5. Group Leads by adSource
  const groupedLeads: Record<string, typeof leads> = {};
  for (const lead of leads) {
    const src = (lead.adSource && lead.adSource.trim()) || "Direct Messenger / Organic";
    if (!groupedLeads[src]) groupedLeads[src] = [];
    groupedLeads[src].push(lead);
  }

  for (const insight of storedInsights) {
    if (!groupedLeads[insight.adSource.trim()]) {
      groupedLeads[insight.adSource.trim()] = [];
    }
  }

  const creativeMetrics: CreativeDetailMetric[] = [];

  // Helper taxonomy inference fallback
  const inferAdTaxonomy = (adSource: string) => {
    const lower = adSource.toLowerCase();
    let mediaType: "photo" | "video" | "carousel" | "text" = "photo";
    if (lower.includes("video") || lower.includes("reel") || lower.includes("demo") || lower.includes("asmr") || lower.includes("watch")) {
      mediaType = "video";
    } else if (lower.includes("carousel") || lower.includes("slides") || lower.includes("album")) {
      mediaType = "carousel";
    }

    let framework = "Direct Offer / Discount";
    if (lower.includes("tired of") || lower.includes("stop") || lower.includes("silence") || lower.includes("hate")) {
      framework = "Problem-Agitate-Solve (PAS)";
    } else if (lower.includes("viral") || lower.includes("everyone") || lower.includes("reviews")) {
      framework = "Social Proof & Trend";
    } else if (lower.includes("secret") || lower.includes("treat") || lower.includes("escape")) {
      framework = "FOMO & Lifestyle Desire";
    } else if (lower.includes("before") || lower.includes("dermatologist") || lower.includes("fading")) {
      framework = "Before-After-Bridge (BAB)";
    }

    return {
      mediaType,
      visualStyle: mediaType === "video" ? "Dynamic UGC Video" : "Studio Showcase",
      videoDurationSeconds: mediaType === "video" ? 20 : 0,
      aspectRatio: mediaType === "video" ? "9:16 Vertical Reel" : "1:1 Square Feed",
      visualHook: "Product close-up highlighting key value proposition",
      hookHeadline: adSource,
      copywritingFramework: framework,
      callToAction: "Send Message for Exclusive Voucher",
      emotionalTone: "Value & Smart Savings",
      contentLengthCategory: "Medium (50-150 words)",
      uniqueSellingPoint: "Free Delivery + Official Warranty",
      campaignObjective: "MESSAGES",
      campaignDesign: "Cold Audience Broad",
      targetAudience: "General Shoppers",
      placement: "Instagram Reels & Facebook Feed",
      offerType: "Limited Promotional Voucher",
      adSpendEstimated: 40.0,
    };
  };

  for (const [adSource, adLeads] of Object.entries(groupedLeads)) {
    const insight = insightsMap.get(adSource.trim());
    const fallback = inferAdTaxonomy(adSource);

    const firstLead = adLeads[0];
    const pageInfo = firstLead
      ? pageMap.get(firstLead.pageId) || firstLead.page
      : pages[0];

    const mediaType = (insight?.mediaType as any) || fallback.mediaType;
    const visualStyle = insight?.visualStyle || fallback.visualStyle;
    const mediaUrl = insight?.mediaUrl || null;
    const videoDurationSeconds = insight?.videoDurationSeconds ?? fallback.videoDurationSeconds;
    const aspectRatio = insight?.aspectRatio || fallback.aspectRatio;
    const visualHook = insight?.visualHook || fallback.visualHook;

    const hookHeadline = insight?.hookHeadline || fallback.hookHeadline;
    const copywritingFramework = insight?.copywritingFramework || fallback.copywritingFramework;
    const callToAction = insight?.callToAction || fallback.callToAction;
    const emotionalTone = insight?.emotionalTone || fallback.emotionalTone;
    const contentLengthCategory = insight?.contentLengthCategory || fallback.contentLengthCategory;
    const uniqueSellingPoint = insight?.uniqueSellingPoint || fallback.uniqueSellingPoint;

    const campaignObjective = insight?.campaignObjective || fallback.campaignObjective;
    const campaignDesign = insight?.campaignDesign || fallback.campaignDesign;
    const targetAudience = insight?.targetAudience || fallback.targetAudience;
    const placement = insight?.placement || fallback.placement;
    const offerType = insight?.offerType || fallback.offerType;

    // Filters
    if (filterMediaType && filterMediaType !== "ALL" && mediaType !== filterMediaType) continue;
    if (filterFramework && filterFramework !== "ALL" && copywritingFramework !== filterFramework) continue;
    if (filterDesign && filterDesign !== "ALL" && campaignDesign !== filterDesign) continue;

    const totalLeads = adLeads.length;
    let fakeLeadsCount = 0;
    let salesConversions = 0;
    let totalRevenue = 0;
    let ghostedLeads = 0;
    let recoveriesCount = 0;

    for (const lead of adLeads) {
      const lastError = lastErrorByLeadId[lead.id] || null;
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

      if (authenticity.status === "CONFIRMED_FAKE" || authenticity.status === "SUSPICIOUS") {
        fakeLeadsCount++;
      }

      const isConverted =
        lead.isConverted ||
        lead.status === "CONVERTED" ||
        (lead.status === "REPLIED" && (lead.orderValue !== null && lead.orderValue > 0));

      if (isConverted) {
        salesConversions++;
        const val = lead.orderValue ?? insight?.orderConversionValue ?? 45.0;
        totalRevenue += val;
      }

      if (lead.status === "REPLIED" || lead.repliedAt !== null) {
        recoveriesCount++;
      } else if (lead.status === "AWAITING_CUSTOMER" || lead.followUpCount > 0) {
        ghostedLeads++;
      }
    }

    const qualifiedHumanLeads = Math.max(0, totalLeads - fakeLeadsCount);
    const fakeLeadRate = totalLeads > 0 ? Number(((fakeLeadsCount / totalLeads) * 100).toFixed(1)) : 0;
    const conversionRate = totalLeads > 0 ? Number(((salesConversions / totalLeads) * 100).toFixed(1)) : 0;
    const ghostingRate = totalLeads > 0 ? Number(((ghostedLeads / totalLeads) * 100).toFixed(1)) : 0;
    const recoveryRate = totalLeads > 0 ? Number(((recoveriesCount / totalLeads) * 100).toFixed(1)) : 0;

    const adSpend = insight?.adSpendEstimated ?? fallback.adSpendEstimated;
    const roas = adSpend > 0 ? Number((totalRevenue / adSpend).toFixed(2)) : 0;
    const cpa = salesConversions > 0 ? Number((adSpend / salesConversions).toFixed(2)) : 0;
    const cpl = totalLeads > 0 ? Number((adSpend / totalLeads).toFixed(2)) : 0;

    let healthTier: CreativeDetailMetric["healthTier"] = "High Efficiency";
    if (fakeLeadRate >= 50.0 && totalLeads >= 2) {
      healthTier = "Bot Infected";
    } else if (ghostingRate >= 70.0 && salesConversions === 0) {
      healthTier = "Ghosting Trap";
    } else if (roas >= 3.0 && salesConversions >= 2) {
      healthTier = "Scale Winner";
    } else if (roas < 1.0 && totalLeads >= 2) {
      healthTier = "Needs Hook Revamp";
    } else {
      healthTier = "High Efficiency";
    }

    const aiCreativeSummary = `[${mediaType.toUpperCase()} | ${visualStyle}] Hook: "${hookHeadline}". Framework: ${copywritingFramework}. Offer: ${offerType}. Performance: ${salesConversions} sales from ${totalLeads} leads ($${totalRevenue} revenue at ${roas}x ROAS).`;

    const aiSalesDriver =
      salesConversions > 0
        ? `${visualStyle} combined with ${copywritingFramework} effectively addressed purchase objections. Strong reassurance via "${offerType}".`
        : `Zero sales recorded. Hook captured initial interest (${totalLeads} clicks), but drop-off occurred before payment confirmation.`;

    const aiWeaknessFactors =
      fakeLeadRate > 30.0
        ? `High bot/fake concentration (${fakeLeadRate}%). Ad placement attracted low-intent accidental button clickers.`
        : ghostingRate > 60.0
        ? `High ghosting rate (${ghostingRate}%). Pricing reveal or delivery terms likely caused hesitation.`
        : `Minor hesitation before final confirmation; resolved via follow-up blasts.`;

    const aiScalingVerdict =
      healthTier === "Scale Winner"
        ? `Scale ad budget +30% to +50%. Replicate visual style (${visualStyle}) across 2 new hooks.`
        : healthTier === "High Efficiency"
        ? `Maintain steady ad spend. Optimize Step 1 follow-up message to boost conversion velocity.`
        : healthTier === "Bot Infected"
        ? `Tighten Meta audience exclusions, disable Meta Audience Network placement, and test manual comment verification.`
        : healthTier === "Ghosting Trap"
        ? `Rework price presentation in ad copy. Clearly disclose COD or bundle price upfront in the visual.`
        : `Test new 3-second visual pattern interrupt and test a stronger scarcity angle.`;

    const aiPromptContext = `Ad: "${adSource}" | Format: ${mediaType} (${aspectRatio}, ${videoDurationSeconds}s) | Style: ${visualStyle} | Hook: "${hookHeadline}" | Framework: ${copywritingFramework} | Audience: ${targetAudience} | Revenue: $${totalRevenue} | Spend: $${adSpend} | ROAS: ${roas}x | ConvRate: ${conversionRate}% | Bots: ${fakeLeadRate}%`;

    creativeMetrics.push({
      id: insight?.id || `ad_${Math.random().toString(36).substring(2, 9)}`,
      adSource,
      pageId: firstLead?.pageId || pages[0].pageId,
      pageName: pageInfo?.name || "Connected Page",
      businessName: pageInfo?.businessName || "SieLab Retail Group",
      mediaType,
      visualStyle,
      mediaUrl,
      videoDurationSeconds,
      aspectRatio,
      visualHook,
      hookHeadline,
      copywritingFramework,
      callToAction,
      emotionalTone,
      contentLengthCategory,
      uniqueSellingPoint,
      campaignObjective,
      campaignDesign,
      targetAudience,
      placement,
      offerType,
      totalLeads,
      qualifiedHumanLeads,
      fakeLeadsCount,
      fakeLeadRate,
      salesConversions,
      conversionRate,
      totalRevenue,
      adSpend,
      roas,
      cpa,
      cpl,
      ghostedLeads,
      ghostingRate,
      recoveriesCount,
      recoveryRate,
      healthTier,
      aiCreativeSummary,
      aiSalesDriver,
      aiWeaknessFactors,
      aiScalingVerdict,
      aiPromptContext,
    });
  }

  creativeMetrics.sort((a, b) => b.totalRevenue - a.totalRevenue || b.roas - a.roas);

  // High-Level Dimension Breakdowns
  const aggregateDimension = (getKey: (c: CreativeDetailMetric) => string): DimensionBreakdown[] => {
    const map: Record<string, { count: number; leads: number; conv: number; rev: number; spend: number; top: { name: string; rev: number } | null }> = {};

    for (const c of creativeMetrics) {
      const key = getKey(c) || "Uncategorized";
      if (!map[key]) {
        map[key] = { count: 0, leads: 0, conv: 0, rev: 0, spend: 0, top: null };
      }
      map[key].count++;
      map[key].leads += c.totalLeads;
      map[key].conv += c.salesConversions;
      map[key].rev += c.totalRevenue;
      map[key].spend += c.adSpend;
      if (!map[key].top || c.totalRevenue > map[key].top.rev) {
        map[key].top = { name: c.adSource, rev: c.totalRevenue };
      }
    }

    return Object.entries(map).map(([name, data]) => ({
      name,
      creativesCount: data.count,
      totalLeads: data.leads,
      conversions: data.conv,
      convRate: data.leads > 0 ? Number(((data.conv / data.leads) * 100).toFixed(1)) : 0,
      revenue: Math.round(data.rev),
      spend: Math.round(data.spend),
      roas: data.spend > 0 ? Number((data.rev / data.spend).toFixed(2)) : 0,
      cpa: data.conv > 0 ? Number((data.spend / data.conv).toFixed(2)) : 0,
      topCreative: data.top?.name || null,
    })).sort((a, b) => b.revenue - a.revenue || b.roas - a.roas);
  };

  const byMediaType = aggregateDimension((c) => c.mediaType.toUpperCase());
  const byVisualStyle = aggregateDimension((c) => c.visualStyle);
  const byCopyFramework = aggregateDimension((c) => c.copywritingFramework);
  const byCampaignDesign = aggregateDimension((c) => c.campaignDesign);
  const byPlacement = aggregateDimension((c) => c.placement);

  const totalCreatives = creativeMetrics.length;
  const totalLeads = creativeMetrics.reduce((sum, c) => sum + c.totalLeads, 0);
  const totalQualifiedLeads = creativeMetrics.reduce((sum, c) => sum + c.qualifiedHumanLeads, 0);
  const totalConversions = creativeMetrics.reduce((sum, c) => sum + c.salesConversions, 0);
  const totalRevenue = creativeMetrics.reduce((sum, c) => sum + c.totalRevenue, 0);
  const totalSpend = creativeMetrics.reduce((sum, c) => sum + c.adSpend, 0);

  const blendedConvRate = totalLeads > 0 ? Number(((totalConversions / totalLeads) * 100).toFixed(1)) : 0;
  const blendedRoas = totalSpend > 0 ? Number((totalRevenue / totalSpend).toFixed(2)) : 0;
  const blendedCpa = totalConversions > 0 ? Number((totalSpend / totalConversions).toFixed(2)) : 0;

  const topVisualFormat = byMediaType.length > 0 ? byMediaType[0].name : "N/A";
  const topCopyFramework = byCopyFramework.length > 0 ? byCopyFramework[0].name : "N/A";
  const topCampaignDesign = byCampaignDesign.length > 0 ? byCampaignDesign[0].name : "N/A";

  const topRevenueAd = creativeMetrics.length > 0 ? creativeMetrics[0] : null;
  const bestRoasAd =
    creativeMetrics.filter((c) => c.salesConversions >= 1).sort((a, b) => b.roas - a.roas)[0] || null;
  const worstGhostingAd =
    creativeMetrics.filter((c) => c.totalLeads >= 2).sort((a, b) => b.ghostingRate - a.ghostingRate)[0] || null;

  return {
    summary: {
      totalCreatives,
      totalLeads,
      totalQualifiedLeads,
      totalConversions,
      blendedConvRate,
      totalRevenue,
      totalSpend,
      blendedRoas,
      blendedCpa,
      topVisualFormat,
      topCopyFramework,
      topCampaignDesign,
      topRevenueAd: topRevenueAd
        ? {
            adSource: topRevenueAd.adSource,
            revenue: topRevenueAd.totalRevenue,
            roas: topRevenueAd.roas,
            mediaType: topRevenueAd.mediaType,
            visualStyle: topRevenueAd.visualStyle,
          }
        : null,
      bestRoasAd: bestRoasAd
        ? {
            adSource: bestRoasAd.adSource,
            revenue: bestRoasAd.totalRevenue,
            roas: bestRoasAd.roas,
            mediaType: bestRoasAd.mediaType,
            framework: bestRoasAd.copywritingFramework,
          }
        : null,
      worstGhostingAd: worstGhostingAd
        ? {
            adSource: worstGhostingAd.adSource,
            ghostingRate: worstGhostingAd.ghostingRate,
            leads: worstGhostingAd.totalLeads,
          }
        : null,
    },
    breakdowns: {
      byMediaType,
      byVisualStyle,
      byCopyFramework,
      byCampaignDesign,
      byPlacement,
    },
    creatives: creativeMetrics,
  };
}
