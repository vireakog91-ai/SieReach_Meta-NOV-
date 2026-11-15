import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminAuth } from "@/lib/auth";
import { computeAdvancedAdsAnalytics } from "@/lib/adAnalytics";

export type { CreativeDetailMetric, DimensionBreakdown } from "@/lib/adAnalytics";

export async function GET(req: NextRequest) {
  const unauthorized = await requireAdminAuth(req);
  if (unauthorized) return unauthorized;

  try {
    const { searchParams } = new URL(req.url);
    const filterPageId = searchParams.get("pageId");
    const filterBusiness = searchParams.get("businessName");
    const filterMediaType = searchParams.get("mediaType");
    const filterFramework = searchParams.get("copyFramework");
    const filterDesign = searchParams.get("campaignDesign");
    const daysParam = searchParams.get("days");
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");

    const result = await computeAdvancedAdsAnalytics({
      pageId: filterPageId,
      businessName: filterBusiness,
      mediaType: filterMediaType,
      copyFramework: filterFramework,
      campaignDesign: filterDesign,
      days: daysParam,
      startDate: startDateParam,
      endDate: endDateParam,
    });

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (err: any) {
    console.error("Advanced Ads Analytics API error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to calculate advanced ads analytics" },
      { status: 500 }
    );
  }
}

// POST: Save or Update Ad Creative Taxonomy & Metadata
export async function POST(req: NextRequest) {
  const unauthorized = await requireAdminAuth(req);
  if (unauthorized) return unauthorized;

  try {
    const body = await req.json();
    const {
      adSource,
      pageId,
      pageName,
      businessName = "SieLab Retail Group",
      mediaType = "photo",
      visualStyle = "Studio Product",
      mediaUrl,
      videoDurationSeconds = 0,
      aspectRatio = "1:1",
      visualHook,
      hookHeadline,
      copywritingFramework = "Direct Offer",
      callToAction = "Send Message",
      emotionalTone = "Direct Value",
      contentLengthCategory = "Medium (50-150 words)",
      uniqueSellingPoint,
      campaignObjective = "MESSAGES",
      campaignDesign = "Cold Audience Broad",
      targetAudience = "General Shoppers",
      placement = "All Meta Placements",
      offerType = "Percentage Discount",
      adSpendEstimated = 50.0,
      orderConversionValue,
      notes,
    } = body;

    if (!adSource || !adSource.trim()) {
      return NextResponse.json({ success: false, error: "adSource is required" }, { status: 400 });
    }

    const saved = await prisma.adCreativeInsight.upsert({
      where: { adSource: adSource.trim() },
      update: {
        pageId,
        pageName,
        businessName,
        mediaType,
        visualStyle,
        mediaUrl,
        videoDurationSeconds: Number(videoDurationSeconds) || 0,
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
        adSpendEstimated: Number(adSpendEstimated) || 0,
        orderConversionValue: orderConversionValue ? Number(orderConversionValue) : null,
        notes,
      },
      create: {
        adSource: adSource.trim(),
        pageId,
        pageName,
        businessName,
        mediaType,
        visualStyle,
        mediaUrl,
        videoDurationSeconds: Number(videoDurationSeconds) || 0,
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
        adSpendEstimated: Number(adSpendEstimated) || 0,
        orderConversionValue: orderConversionValue ? Number(orderConversionValue) : null,
        notes,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Successfully saved creative intelligence for "${adSource}"`,
      data: saved,
    });
  } catch (err: any) {
    console.error("Save Ad Creative Insight Error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to save creative intelligence" },
      { status: 500 }
    );
  }
}
