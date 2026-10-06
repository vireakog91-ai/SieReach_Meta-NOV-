import { NextRequest, NextResponse } from "next/server";
import { executeFollowUpBlast } from "@/lib/blaster";
import { requireAdminAuth } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const unauthorized = await requireAdminAuth(req);
  if (unauthorized) return unauthorized;

  try {
    const body = await req.json();
    const {
      campaignId,
      leadIds,
      customMessageTemplate,
      customImageUrl,
      customAudioUrl,
      customThresholdHours,
      messageTag,
      targetPageId,
      excludePast24h,
      dripMinSeconds,
      dripMaxSeconds,
      maxFollowUps,
      cooldownHours,
    } = body;

    const report = await executeFollowUpBlast({
      campaignId,
      leadIds,
      customMessageTemplate,
      customImageUrl,
      customAudioUrl,
      customThresholdHours:
        customThresholdHours !== undefined ? parseFloat(customThresholdHours) : undefined,
      messageTag,
      targetPageId,
      excludePast24h: excludePast24h !== undefined ? Boolean(excludePast24h) : undefined,
      dripMinSeconds: dripMinSeconds !== undefined ? parseFloat(dripMinSeconds) : undefined,
      dripMaxSeconds: dripMaxSeconds !== undefined ? parseFloat(dripMaxSeconds) : undefined,
      maxFollowUps: maxFollowUps !== undefined ? parseInt(maxFollowUps) : undefined,
      cooldownHours: cooldownHours !== undefined ? parseFloat(cooldownHours) : undefined,
    });

    return NextResponse.json({
      success: true,
      report,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
