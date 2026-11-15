import { NextRequest, NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/auth";
import { computeAdvancedAdsAnalytics } from "@/lib/adAnalytics";

export async function GET(req: NextRequest) {
  const unauthorized = await requireAdminAuth(req);
  if (unauthorized) return unauthorized;

  try {
    const { searchParams } = new URL(req.url);
    const exportType = searchParams.get("type") || "ai_comprehensive"; // "ai_comprehensive" | "ai_ml" | "executive"
    const filterPageId = searchParams.get("pageId");
    const filterBusiness = searchParams.get("businessName");
    const filterMediaType = searchParams.get("mediaType");
    const filterFramework = searchParams.get("copyFramework");
    const filterDesign = searchParams.get("campaignDesign");
    const daysParam = searchParams.get("days");
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");

    const analyticsResult = await computeAdvancedAdsAnalytics({
      pageId: filterPageId,
      businessName: filterBusiness,
      mediaType: filterMediaType,
      copyFramework: filterFramework,
      campaignDesign: filterDesign,
      days: daysParam,
      startDate: startDateParam,
      endDate: endDateParam,
    });

    const creatives = analyticsResult.creatives || [];

    const escapeCsv = (val: any): string => {
      if (val === null || val === undefined) return '""';
      const str = String(val);
      return `"${str.replace(/"/g, '""')}"`;
    };

    let csvOutput = "";
    const dateStr = new Date().toISOString().split("T")[0];

    if (exportType === "ai_ml") {
      // 1. Machine Learning & Python Pandas Optimized CSV
      const mlHeaders = [
        "ad_id",
        "ad_name",
        "page_name",
        "business_portfolio",
        "media_type",
        "visual_style",
        "aspect_ratio",
        "video_duration_sec",
        "copy_framework",
        "emotional_tone",
        "content_length",
        "campaign_objective",
        "campaign_design",
        "placement",
        "offer_type",
        "total_leads",
        "qualified_human_leads",
        "bot_leads",
        "bot_rate_pct",
        "sales_count",
        "conversion_rate_pct",
        "revenue_usd",
        "ad_spend_usd",
        "roas",
        "cpa_usd",
        "cpl_usd",
        "ghosting_rate_pct",
        "recovery_rate_pct",
        "health_tier",
      ];

      const rows = creatives.map((c: any) => [
        escapeCsv(c.id),
        escapeCsv(c.adSource),
        escapeCsv(c.pageName),
        escapeCsv(c.businessName),
        escapeCsv(c.mediaType),
        escapeCsv(c.visualStyle),
        escapeCsv(c.aspectRatio),
        c.videoDurationSeconds,
        escapeCsv(c.copywritingFramework),
        escapeCsv(c.emotionalTone),
        escapeCsv(c.contentLengthCategory),
        escapeCsv(c.campaignObjective),
        escapeCsv(c.campaignDesign),
        escapeCsv(c.placement),
        escapeCsv(c.offerType),
        c.totalLeads,
        c.qualifiedHumanLeads,
        c.fakeLeadsCount,
        c.fakeLeadRate,
        c.salesConversions,
        c.conversionRate,
        c.totalRevenue,
        c.adSpend,
        c.roas,
        c.cpa,
        c.cpl,
        c.ghostingRate,
        c.recoveryRate,
        escapeCsv(c.healthTier),
      ]);

      csvOutput = [mlHeaders.join(","), ...rows.map((r: any[]) => r.join(","))].join("\r\n");

    } else if (exportType === "executive") {
      // 2. Executive Business Reporting CSV
      const execHeaders = [
        "Ad Creative",
        "Media Format",
        "Visual Style",
        "Page Name",
        "Business Portfolio",
        "Hook Headline",
        "Copy Framework",
        "Campaign Strategy",
        "Placement",
        "Offer",
        "Total Leads",
        "Clean Human Leads",
        "Bot Clicks",
        "Bot Rate (%)",
        "Sales Orders",
        "Conv Rate (%)",
        "Sales Revenue ($)",
        "Ad Spend ($)",
        "ROAS",
        "CPA ($)",
        "Ghosting Rate (%)",
        "Recovery Rate (%)",
        "Performance Tier",
        "Scaling Action",
      ];

      const rows = creatives.map((c: any) => [
        escapeCsv(c.adSource),
        escapeCsv(c.mediaType.toUpperCase()),
        escapeCsv(c.visualStyle),
        escapeCsv(c.pageName),
        escapeCsv(c.businessName),
        escapeCsv(c.hookHeadline || "N/A"),
        escapeCsv(c.copywritingFramework),
        escapeCsv(c.campaignDesign),
        escapeCsv(c.placement),
        escapeCsv(c.offerType),
        c.totalLeads,
        c.qualifiedHumanLeads,
        c.fakeLeadsCount,
        `${c.fakeLeadRate}%`,
        c.salesConversions,
        `${c.conversionRate}%`,
        `$${c.totalRevenue}`,
        `$${c.adSpend}`,
        `${c.roas}x`,
        `$${c.cpa}`,
        `${c.ghostingRate}%`,
        `${c.recoveryRate}%`,
        escapeCsv(c.healthTier),
        escapeCsv(c.aiScalingVerdict),
      ]);

      csvOutput = [execHeaders.join(","), ...rows.map((r: any[]) => r.join(","))].join("\r\n");

    } else {
      // 3. AI Comprehensive (Engineered for Claude, ChatGPT, Gemini Prompting & Semantic Discovery)
      const aiMetaComments = [
        "# ==============================================================================",
        "# SIE_REACH META ADS CREATIVE & SALES ATTRIBUTION DATASET (AI-OPTIMIZED)",
        "# Target Objective: Uncover which photo styles, video lengths, copy hooks,",
        "# copywriting frameworks, campaign designs, and placements brought real sales.",
        `# Generated: ${new Date().toISOString()} | Total Tracked Creatives: ${creatives.length}`,
        "# INSTRUCTION FOR AI AGENT / LLM:",
        "# 1. Correlate [visual_media_type, visual_style, hook_headline, copywriting_framework] with [total_revenue_usd, roas, conversion_rate_pct].",
        "# 2. Identify statistically superior creative patterns and contrast winning vs failing hooks.",
        "# 3. Extract exact recommendations for next month's video and photo creative briefs.",
        "# ==============================================================================",
      ];

      const aiHeaders = [
        "ad_source_name",
        "visual_media_type",
        "visual_creative_style",
        "aspect_ratio",
        "video_duration_seconds",
        "visual_hook_description",
        "hook_headline_text",
        "copywriting_framework",
        "call_to_action",
        "emotional_tone",
        "content_length_tier",
        "unique_selling_proposition",
        "campaign_objective",
        "campaign_design_strategy",
        "target_audience_demographic",
        "meta_placement",
        "offer_structure",
        "total_leads_generated",
        "qualified_human_leads",
        "fake_or_bot_leads",
        "fake_lead_rate_pct",
        "sales_conversions_count",
        "lead_to_sale_conversion_rate_pct",
        "total_sales_revenue_usd",
        "estimated_ad_spend_usd",
        "return_on_ad_spend_roas",
        "cost_per_acquisition_cpa_usd",
        "cost_per_lead_cpl_usd",
        "ghosted_leads_count",
        "ghosting_rate_pct",
        "recovery_rate_pct",
        "ai_health_tier",
        "ai_primary_sales_driver",
        "ai_weakness_and_dropoff_reason",
        "ai_recommended_action_verdict",
        "ai_dense_semantic_summary",
        "ai_prompt_context_snippet",
      ];

      const rows = creatives.map((c: any) => [
        escapeCsv(c.adSource),
        escapeCsv(c.mediaType.toUpperCase()),
        escapeCsv(c.visualStyle),
        escapeCsv(c.aspectRatio),
        c.videoDurationSeconds,
        escapeCsv(c.visualHook || "N/A"),
        escapeCsv(c.hookHeadline || "N/A"),
        escapeCsv(c.copywritingFramework),
        escapeCsv(c.callToAction),
        escapeCsv(c.emotionalTone),
        escapeCsv(c.contentLengthCategory),
        escapeCsv(c.uniqueSellingPoint || "N/A"),
        escapeCsv(c.campaignObjective),
        escapeCsv(c.campaignDesign),
        escapeCsv(c.targetAudience),
        escapeCsv(c.placement),
        escapeCsv(c.offerType),
        c.totalLeads,
        c.qualifiedHumanLeads,
        c.fakeLeadsCount,
        c.fakeLeadRate,
        c.salesConversions,
        c.conversionRate,
        c.totalRevenue,
        c.adSpend,
        c.roas,
        c.cpa,
        c.cpl,
        c.ghostedLeads,
        c.ghostingRate,
        c.recoveryRate,
        escapeCsv(c.healthTier),
        escapeCsv(c.aiSalesDriver),
        escapeCsv(c.aiWeaknessFactors),
        escapeCsv(c.aiScalingVerdict),
        escapeCsv(c.aiCreativeSummary),
        escapeCsv(c.aiPromptContext),
      ]);

      csvOutput = [
        ...aiMetaComments,
        aiHeaders.join(","),
        ...rows.map((r: any[]) => r.join(",")),
      ].join("\r\n");
    }

    const bom = "\uFEFF";
    const fullCsvContent = bom + csvOutput;

    const filename = `siereach_ads_analytics_${exportType}_${dateStr}.csv`;

    return new NextResponse(fullCsvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (err: any) {
    console.error("CSV Export Error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
