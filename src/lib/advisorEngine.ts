/**
 * SieReach Meta - Central Intelligence & Diagnostic Advisor Engine
 * 100% deterministic, zero external API cost, ultra-fast heuristics & math calculations.
 */

export interface FunnelStage {
  name: string;
  count: number;
  percentage: number;
  dropOffRate?: number;
  color: string;
}

export interface HourlyResponseMetric {
  hour: number; // 0 - 23
  label: string; // "12 AM", "1 PM", etc.
  leadCount: number;
  avgResponseMinutes: number;
  conversionRate: number;
  isPeakHour: boolean;
  isDangerZone: boolean; // High volume + slow response
}

export interface HubActionCard {
  id: string;
  priority: "URGENT" | "HIGH" | "MEDIUM" | "OPPORTUNITY";
  title: string;
  badge: string;
  diagnostic: string; // The "Why this happened"
  impact: string; // Expected financial or conversion gain
  targetTool: "blaster" | "response" | "comcent" | "pages" | "ad-attribution";
  actionLabel: string;
  suggestedCopy?: string;
  metadata?: {
    pageId?: string;
    pageName?: string;
    leadCount?: number;
    leadIds?: string[];
    suggestedRuleName?: string;
    filterType?: string;
    adSource?: string;
  };
}

export interface PageHealthSummary {
  pageId: string;
  name: string;
  businessName?: string;
  healthScore: number;
  healthScoreLabel: "EXCELLENT" | "GOOD" | "NEEDS_ATTENTION" | "CRITICAL";
  totalLeads: number;
  ghostedWarmLeads: number;
  avgResponseMinutes: number;
  conversionRate: number;
  hasToken: boolean;
}

export interface AdPerformer {
  adSource: string;
  pageId?: string;
  pageName?: string;
  totalLeads: number;
  ghostingRate: number; // %
  recoveryRate: number; // %
  revenue: number;
  wastedSpend: number;
  fakeLeadRate: number; // %
  healthTier: "Scale Winner" | "Healthy" | "Ghosting Alert" | "Step 2 Dependent" | "Underperforming";
  fraudTier: string;
}

export interface AdsAdvisorSummary {
  trackedCreativesCount: number;
  totalAttributedRevenue: number;
  totalWastedAdSpend: number;
  topWinner?: AdPerformer;
  worstWaster?: AdPerformer;
  scaleWinnersCount: number;
  budgetBleedersCount: number;
}

export interface HubSummaryResult {
  healthScore: number; // 0 - 100
  healthScoreLabel: "EXCELLENT" | "GOOD" | "NEEDS_ATTENTION" | "CRITICAL";
  lostPipelineRevenue: number;
  totalLeads: number;
  ghostedWarmLeads: number;
  avgResponseMinutes: number;
  overallConversionRate: number;
  followUpCoverageRate: number;
  funnel: FunnelStage[];
  hourlyActivity: HourlyResponseMetric[];
  actionCards: HubActionCard[];
  aiEnhanced: boolean;
  generatedAt: string;
  selectedPageName?: string;
  pageComparisons?: PageHealthSummary[];
  adsAdvisor?: AdsAdvisorSummary;
  cacheStatus?: {
    isCached: boolean;
    ageMinutes: number;
    ttlMinutes: number;
  };
}

/**
 * Format 24h number into human-readable hour label (e.g., 0 -> "12 AM", 13 -> "1 PM")
 */
export function formatHourLabel(hour: number): string {
  const ampm = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${displayHour} ${ampm}`;
}

/**
 * Calculate the overall Business Health Score (0-100) based on social commerce benchmarks
 */
export function calculateHealthScore(metrics: {
  conversionRate: number; // e.g. 15 (%)
  avgResponseMinutes: number; // e.g. 20 (mins)
  followUpCoverageRate: number; // e.g. 70 (%)
  ghostRate: number; // e.g. 40 (%)
}): { score: number; label: "EXCELLENT" | "GOOD" | "NEEDS_ATTENTION" | "CRITICAL" } {
  const convScore = Math.min(100, (metrics.conversionRate / 20) * 100) * 0.35;

  let speedScore = 100;
  if (metrics.avgResponseMinutes > 60) speedScore = 20;
  else if (metrics.avgResponseMinutes > 30) speedScore = 45;
  else if (metrics.avgResponseMinutes > 15) speedScore = 70;
  else if (metrics.avgResponseMinutes > 5) speedScore = 85;
  const speedWeighted = speedScore * 0.3;

  const coverageScore = Math.min(100, metrics.followUpCoverageRate) * 0.2;
  const ghostScore = Math.max(0, 100 - metrics.ghostRate) * 0.15;

  const rawScore = Math.round(convScore + speedWeighted + coverageScore + ghostScore);
  const score = Math.max(15, Math.min(99, rawScore));

  let label: "EXCELLENT" | "GOOD" | "NEEDS_ATTENTION" | "CRITICAL" = "GOOD";
  if (score >= 80) label = "EXCELLENT";
  else if (score >= 65) label = "GOOD";
  else if (score >= 45) label = "NEEDS_ATTENTION";
  else label = "CRITICAL";

  return { score, label };
}

/**
 * Deterministic Heuristics Generator: Formulates dynamically priority-ranked Action Cards
 * Evaluates financial severity ($ lost), lead volume, response latency, and Ad ROAS / wasted spend.
 */
export function generateHeuristicActionCards(data: {
  pageId?: string;
  pageName?: string;
  totalLeads: number;
  ghostedWarmLeads: number;
  ghostedPriceLeads: number;
  avgResponseMinutes: number;
  dangerHours: HourlyResponseMetric[];
  aov: number;
  lowCoveredPageNames?: string[];
  adsSummary?: AdsAdvisorSummary;
}): HubActionCard[] {
  const cards: HubActionCard[] = [];
  const pagePrefix = data.pageName ? `on ${data.pageName}` : "";

  // Card 1: Ghost After Price Drop (Evaluated dynamically against pipeline revenue at risk)
  if (data.ghostedPriceLeads > 0) {
    const estimatedValue = data.ghostedPriceLeads * data.aov;

    let pricePriority: "URGENT" | "HIGH" | "MEDIUM" = "MEDIUM";
    if (estimatedValue >= 1500 || data.ghostedPriceLeads >= 25) {
      pricePriority = "URGENT";
    } else if (estimatedValue >= 500 || data.ghostedPriceLeads >= 10) {
      pricePriority = "HIGH";
    }

    cards.push({
      id: `action-price-recovery-${data.pageId || "all"}`,
      priority: pricePriority,
      title: `Recover ${data.ghostedPriceLeads} Inquiries Abandoned After Price Quote ${pagePrefix}`.trim(),
      badge: "High-Intent Pipeline",
      diagnostic: `${data.ghostedPriceLeads} customers showed active buying interest by asking for pricing ${pagePrefix}, but went cold after receiving quotes.`,
      impact: `Est. potential revenue recovery: $${estimatedValue.toLocaleString()} (based on $${data.aov} AOV).`,
      targetTool: "blaster",
      actionLabel: "Launch Price Recovery Blast",
      suggestedCopy:
        "Hi {{first_name}}! Quick heads up—we have a limited bonus offer on our {{ad_source}} this week! Would you like me to hold one with free express shipping for you? 🎁",
      metadata: {
        pageId: data.pageId,
        pageName: data.pageName,
        leadCount: data.ghostedPriceLeads,
        filterType: "PRICE_DROP",
      },
    });
  }

  // Card 2: After-Hours / Peak Latency Bottleneck (Evaluated dynamically by latency severity)
  if (data.dangerHours.length > 0) {
    const dangerPeak = data.dangerHours[0];

    let latencyPriority: "URGENT" | "HIGH" | "MEDIUM" = "HIGH";
    if (dangerPeak.avgResponseMinutes >= 45 && dangerPeak.leadCount >= 8) {
      latencyPriority = "URGENT";
    } else if (dangerPeak.avgResponseMinutes >= 25) {
      latencyPriority = "HIGH";
    } else {
      latencyPriority = "MEDIUM";
    }

    cards.push({
      id: `action-evening-bot-${data.pageId || "all"}`,
      priority: latencyPriority,
      title: `Automate Response During Peak Evening Hours (${dangerPeak.label}) ${pagePrefix}`.trim(),
      badge: "Speed-to-Lead Leak",
      diagnostic: `Customer message volume spikes at ${dangerPeak.label} ${pagePrefix}, but staff response delay averages ${dangerPeak.avgResponseMinutes} mins. Inquiries replied to in <5m convert 3.2x higher.`,
      impact: "Cuts response delay to 0 seconds and recovers an estimated 15-22% lost evening conversions.",
      targetTool: "response",
      actionLabel: "Create Evening Triage Rule",
      suggestedCopy:
        "Thanks for reaching out! Our team is reserving stock for tonight's orders right now. Drop your preferred size/color and we will verify availability instantly!",
      metadata: {
        pageId: data.pageId,
        pageName: data.pageName,
        suggestedRuleName: `Evening Triage Bot (${dangerPeak.label})`,
      },
    });
  }

  // Card 3: Inactive Leads (Evaluated dynamically by dormant queue volume)
  if (data.ghostedWarmLeads > 5) {
    let dormantPriority: "HIGH" | "MEDIUM" | "OPPORTUNITY" = "MEDIUM";
    if (data.ghostedWarmLeads >= 50) {
      dormantPriority = "HIGH";
    } else if (data.ghostedWarmLeads < 15) {
      dormantPriority = "OPPORTUNITY";
    }

    cards.push({
      id: `action-warm-winback-${data.pageId || "all"}`,
      priority: dormantPriority,
      title: `Re-Engage ${data.ghostedWarmLeads} Dormant Warm Inquiries ${pagePrefix}`.trim(),
      badge: "Zero-Cost Outreach",
      diagnostic: `${data.ghostedWarmLeads} prospects inquired recently ${pagePrefix} but have not received a follow-up touchpoint in over 24 hours.`,
      impact: "Historically, structured Step-1 follow-ups convert 8-12% of abandoned conversations.",
      targetTool: "blaster",
      actionLabel: "Configure Step-1 Follow-Up",
      suggestedCopy:
        "Hey {{first_name}}, just checking back on your inquiry about {{ad_source}}! Let me know if you had any questions on sizing or delivery before our batch ships out tomorrow! ✨",
      metadata: {
        pageId: data.pageId,
        pageName: data.pageName,
        leadCount: data.ghostedWarmLeads,
        filterType: "STEP_1_DORMANT",
      },
    });
  }

  // Card 4: Scale Ad Winner (From Ad Intelligence)
  if (data.adsSummary?.topWinner) {
    const winner = data.adsSummary.topWinner;
    const winnerPriority = winner.revenue >= 1500 ? "URGENT" : "HIGH";

    cards.push({
      id: `action-ad-winner-${data.pageId || "all"}`,
      priority: winnerPriority,
      title: `Scale Winning Ad: "${winner.adSource}" (${winner.recoveryRate}% Conversion) ${pagePrefix}`.trim(),
      badge: "Meta Ad Winner",
      diagnostic: `"${winner.adSource}" is driving high-intent buyers with an estimated $${winner.revenue.toLocaleString()} in revenue and only ${winner.ghostingRate}% ghost rate.`,
      impact: "Recommended: Increase daily ad set budget by +25% in Meta Ads Manager to capture more scale.",
      targetTool: "ad-attribution",
      actionLabel: "Review & Scale Winner Creative",
      metadata: {
        pageId: data.pageId,
        pageName: data.pageName,
        filterType: "SCALE_WINNER",
        adSource: winner.adSource,
      },
    });
  }

  // Card 5: Stop Budget Bleeder / High Ghosting Ad Set
  if (data.adsSummary?.worstWaster && data.adsSummary.worstWaster.wastedSpend > 100) {
    const waster = data.adsSummary.worstWaster;
    const wasterPriority = waster.wastedSpend >= 300 ? "URGENT" : "HIGH";

    cards.push({
      id: `action-ad-waster-${data.pageId || "all"}`,
      priority: wasterPriority,
      title: `Pause Budget Bleeder: "${waster.adSource}" (${waster.ghostingRate}% Ghost Rate) ${pagePrefix}`.trim(),
      badge: "Wasted Ad Spend Alert",
      diagnostic: `"${waster.adSource}" generates clicks but ${waster.ghostingRate}% of inquiries ghost immediately, wasting an estimated $${waster.wastedSpend} in ad spend.`,
      impact: `Pausing or re-targeting this ad set will immediately save ~$${waster.wastedSpend}/week with zero loss in real sales.`,
      targetTool: "ad-attribution",
      actionLabel: "Inspect Wasted Ad Spend",
      metadata: {
        pageId: data.pageId,
        pageName: data.pageName,
        filterType: "BUDGET_BLEEDER",
        adSource: waster.adSource,
      },
    });
  }

  // Fallback / Opportunity card if everything is running smoothly
  if (cards.length === 0) {
    cards.push({
      id: `action-opportunity-upsell-${data.pageId || "all"}`,
      priority: "OPPORTUNITY",
      title: `Pipeline Is Running Efficiently ${pagePrefix}`.trim(),
      badge: "Growth Optimization",
      diagnostic: `Response times and follow-up coverage are currently healthy ${pagePrefix || "across all pages"}.`,
      impact: "Consider testing a limited VIP loyalty promo to convert past purchasers into repeat buyers.",
      targetTool: "blaster",
      actionLabel: "Explore Re-Engagement Campaign",
    });
  }

  // Sort cards dynamically by severity weight (URGENT -> HIGH -> MEDIUM -> OPPORTUNITY)
  const priorityWeight: Record<string, number> = {
    URGENT: 4,
    HIGH: 3,
    MEDIUM: 2,
    OPPORTUNITY: 1,
  };

  return cards.sort((a, b) => (priorityWeight[b.priority] || 0) - (priorityWeight[a.priority] || 0));
}

/**
 * Generate high-fidelity realistic analytics for Sandbox / Mock Mode or empty databases
 */
export function generateMockHubSummary(
  aov: number = 45,
  pageId: string = "ALL",
  pageName?: string,
  availablePages?: Array<{ pageId: string; name: string; businessName?: string; accessToken?: string }>
): HubSummaryResult {
  const isSinglePage = pageId !== "ALL";
  const totalLeads = isSinglePage ? 142 : 328;
  const ghostedWarmLeads = isSinglePage ? 38 : 94;
  const ghostedPriceLeads = isSinglePage ? 21 : 48;
  const convertedLeads = isSinglePage ? 29 : 56;
  const lostPipelineRevenue = ghostedWarmLeads * aov;
  const overallConversionRate = Math.round((convertedLeads / totalLeads) * 100);
  const avgResponseMinutes = isSinglePage ? 14 : 18;
  const followUpCoverageRate = 65;
  const ghostRate = Math.round((ghostedWarmLeads / totalLeads) * 100);

  const { score: healthScore, label: healthScoreLabel } = calculateHealthScore({
    conversionRate: overallConversionRate,
    avgResponseMinutes,
    followUpCoverageRate,
    ghostRate,
  });

  const funnel: FunnelStage[] = [
    { name: "Total Inbound Leads", count: totalLeads, percentage: 100, color: "bg-blue-500" },
    { name: "Product & Price Inquired", count: Math.round(totalLeads * 0.68), percentage: 68, dropOffRate: 32, color: "bg-indigo-500" },
    { name: "Ghosted / Abandoned", count: ghostedWarmLeads, percentage: ghostRate, dropOffRate: 54, color: "bg-amber-500" },
    { name: "Successfully Converted", count: convertedLeads, percentage: overallConversionRate, color: "bg-emerald-500" },
  ];

  // 24-hour distribution curve reflecting social commerce patterns
  const hourlyActivity: HourlyResponseMetric[] = Array.from({ length: 24 }, (_, h) => {
    let leadCount = 2 + Math.floor(Math.sin(h / 3) * 3);
    if (h >= 11 && h <= 14) leadCount = (isSinglePage ? 8 : 18) + Math.floor(Math.random() * 5);
    else if (h >= 19 && h <= 23) leadCount = (isSinglePage ? 14 : 28) + Math.floor(Math.random() * 8);
    else if (h >= 0 && h <= 6) leadCount = 1 + Math.floor(Math.random() * 2);
    else if (h >= 7 && h <= 10) leadCount = 5 + Math.floor(Math.random() * 4);
    else leadCount = 6 + Math.floor(Math.random() * 4);

    let respMin = 8;
    if (h >= 19 && h <= 23) respMin = 42 + Math.floor(Math.random() * 12);
    else if (h >= 0 && h <= 7) respMin = 110 + Math.floor(Math.random() * 40);
    else if (h >= 12 && h <= 14) respMin = 12 + Math.floor(Math.random() * 5);
    else respMin = 6 + Math.floor(Math.random() * 4);

    const convRate = respMin < 15 ? 26 : respMin < 30 ? 15 : 6;
    const isPeakHour = leadCount >= (isSinglePage ? 10 : 20);
    const isDangerZone = isPeakHour && respMin > 25;

    return {
      hour: h,
      label: formatHourLabel(h),
      leadCount,
      avgResponseMinutes: respMin,
      conversionRate: convRate,
      isPeakHour,
      isDangerZone,
    };
  });

  const dangerHours = hourlyActivity.filter((h) => h.isDangerZone);

  // Mock Ads Intelligence Summary
  const adsAdvisor: AdsAdvisorSummary = {
    trackedCreativesCount: 6,
    totalAttributedRevenue: 6480,
    totalWastedAdSpend: 420,
    scaleWinnersCount: 2,
    budgetBleedersCount: 1,
    topWinner: {
      adSource: "Summer-Reel-Review-01",
      pageId: isSinglePage ? pageId : "fb_page_01",
      pageName: pageName || "SieLab Fashion & Streetwear",
      totalLeads: 86,
      ghostingRate: 28,
      recoveryRate: 34,
      revenue: 2840,
      wastedSpend: 45,
      fakeLeadRate: 2,
      healthTier: "Scale Winner",
      fraudTier: "Clean Traffic",
    },
    worstWaster: {
      adSource: "Broad-Interest-Promo-V2",
      pageId: isSinglePage ? pageId : "fb_page_02",
      pageName: pageName || "SieLab Electronics & Gadgets",
      totalLeads: 114,
      ghostingRate: 64,
      recoveryRate: 6,
      revenue: 360,
      wastedSpend: 375,
      fakeLeadRate: 24,
      healthTier: "Underperforming",
      fraudTier: "Moderate Risk",
    },
  };

  const actionCards = generateHeuristicActionCards({
    pageId: isSinglePage ? pageId : undefined,
    pageName: pageName,
    totalLeads,
    ghostedWarmLeads,
    ghostedPriceLeads,
    avgResponseMinutes,
    dangerHours,
    aov,
    adsSummary: adsAdvisor,
  });

  // Dynamic multi-page comparisons mapping to actual connected pages
  let pageComparisons: PageHealthSummary[] | undefined;
  if (!isSinglePage) {
    if (availablePages && availablePages.length > 0) {
      const mockProfiles = [
        { score: 84, label: "EXCELLENT" as const, leads: 186, ghost: 34, resp: 9, conv: 24 },
        { score: 58, label: "NEEDS_ATTENTION" as const, leads: 142, ghost: 60, resp: 44, conv: 8 },
        { score: 91, label: "EXCELLENT" as const, leads: 98, ghost: 12, resp: 5, conv: 28 },
        { score: 64, label: "GOOD" as const, leads: 74, ghost: 22, resp: 22, conv: 16 },
      ];
      pageComparisons = availablePages.map((pg, idx) => {
        const prof = mockProfiles[idx % mockProfiles.length];
        return {
          pageId: pg.pageId,
          name: pg.name,
          businessName: pg.businessName,
          healthScore: prof.score,
          healthScoreLabel: prof.label,
          totalLeads: prof.leads,
          ghostedWarmLeads: prof.ghost,
          avgResponseMinutes: prof.resp,
          conversionRate: prof.conv,
          hasToken: Boolean(pg.accessToken && pg.accessToken.length > 5),
        };
      });
    } else {
      pageComparisons = [
        {
          pageId: "fb_page_01",
          name: "SieLab Fashion & Streetwear",
          businessName: "SieLab Retail Group",
          healthScore: 84,
          healthScoreLabel: "EXCELLENT",
          totalLeads: 186,
          ghostedWarmLeads: 34,
          avgResponseMinutes: 9,
          conversionRate: 24,
          hasToken: true,
        },
        {
          pageId: "fb_page_02",
          name: "SieLab Electronics & Gadgets",
          businessName: "SieLab Retail Group",
          healthScore: 58,
          healthScoreLabel: "NEEDS_ATTENTION",
          totalLeads: 142,
          ghostedWarmLeads: 60,
          avgResponseMinutes: 44,
          conversionRate: 8,
          hasToken: true,
        },
      ];
    }
  }

  return {
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
    aiEnhanced: false,
    generatedAt: new Date().toISOString(),
    selectedPageName: pageName,
    pageComparisons: isSinglePage ? undefined : pageComparisons,
    adsAdvisor,
    cacheStatus: {
      isCached: false,
      ageMinutes: 0,
      ttlMinutes: 15,
    },
  };
}
