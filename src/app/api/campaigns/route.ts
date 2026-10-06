import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminAuth } from "@/lib/auth";

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
    const businessName = searchParams.get("businessName");

    const where: any = {};
    if (businessName && businessName !== "ALL") {
      where.businessName = businessName;
    }

    const campaigns = await prisma.followUpCampaign.findMany({
      where,
      include: {
        page: true,
        _count: {
          select: { logs: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(
      { success: true, campaigns },
      { headers: noCacheHeaders }
    );
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500, headers: noCacheHeaders }
    );
  }
}

export async function POST(req: NextRequest) {
  const unauthorized = await requireAdminAuth(req);
  if (unauthorized) return unauthorized;

  try {
    const body = await req.json();
    const {
      name,
      businessName,
      pageId,
      inactiveHoursThreshold,
      messageTemplate,
      imageUrl,
      imageUrls,
      enableImageSpin,
      messageTag,
      autoBlast,
      excludePast24h,
      dripMinSeconds,
      dripMaxSeconds,
      maxFollowUps,
      cooldownHours,
      step2CampaignId,
      step2MessageTemplate,
      step2ImageUrl,
      isActive,
    } = body;

    if (!name || !messageTemplate) {
      return NextResponse.json(
        { success: false, error: "Campaign name and message template are required." },
        { status: 400 }
      );
    }

    // Resolve business name: if pageId is provided and businessName isn't, lookup the page
    let resolvedBusinessName = businessName;
    if (!resolvedBusinessName && pageId) {
      const targetPage = await prisma.facebookPage.findUnique({ where: { pageId } });
      if (targetPage) resolvedBusinessName = targetPage.businessName;
    }
    if (!resolvedBusinessName) {
      resolvedBusinessName = "SieLab Retail Group";
    }

    const campaign = await prisma.followUpCampaign.create({
      data: {
        name,
        businessName: resolvedBusinessName,
        ...(pageId ? { page: { connect: { pageId } } } : {}),
        inactiveHoursThreshold: parseFloat(inactiveHoursThreshold ?? "24.0"),
        messageTemplate,
        imageUrl: imageUrl || null,
        imageUrls: imageUrls ? (typeof imageUrls === "string" ? imageUrls : JSON.stringify(imageUrls)) : null,
        enableImageSpin: Boolean(enableImageSpin),
        messageTag: messageTag || "HUMAN_AGENT",
        autoBlast: Boolean(autoBlast),
        excludePast24h: excludePast24h !== undefined ? Boolean(excludePast24h) : true,
        dripMinSeconds: dripMinSeconds !== undefined ? Math.max(3.0, parseFloat(dripMinSeconds)) : 3.0,
        dripMaxSeconds: dripMaxSeconds !== undefined ? Math.max(3.0, parseFloat(dripMaxSeconds)) : 5.0,
        maxFollowUps: maxFollowUps !== undefined ? Math.max(1, parseInt(maxFollowUps)) : 1,
        cooldownHours: cooldownHours !== undefined ? Math.max(0.5, parseFloat(cooldownHours)) : 3.0,
        step2CampaignId: step2CampaignId || null,
        step2MessageTemplate: step2MessageTemplate || null,
        step2ImageUrl: step2ImageUrl || null,
        isActive: isActive !== undefined ? Boolean(isActive) : false,
      },
    });

    return NextResponse.json({ success: true, campaign });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  const unauthorized = await requireAdminAuth(req);
  if (unauthorized) return unauthorized;

  try {
    const body = await req.json();
    const {
      id,
      name,
      businessName,
      pageId,
      inactiveHoursThreshold,
      messageTemplate,
      imageUrl,
      imageUrls,
      enableImageSpin,
      messageTag,
      autoBlast,
      excludePast24h,
      dripMinSeconds,
      dripMaxSeconds,
      maxFollowUps,
      cooldownHours,
      step2CampaignId,
      step2MessageTemplate,
      step2ImageUrl,
      isActive,
    } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Campaign ID is required." },
        { status: 400 }
      );
    }

    const updated = await prisma.followUpCampaign.update({
      where: { id },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(businessName !== undefined ? { businessName } : {}),
        ...(pageId !== undefined
          ? pageId
            ? { page: { connect: { pageId } } }
            : { page: { disconnect: true } }
          : {}),
        ...(inactiveHoursThreshold !== undefined
          ? { inactiveHoursThreshold: parseFloat(inactiveHoursThreshold) }
          : {}),
        ...(messageTemplate !== undefined ? { messageTemplate } : {}),
        ...(imageUrl !== undefined ? { imageUrl: imageUrl || null } : {}),
        ...(imageUrls !== undefined
          ? { imageUrls: imageUrls ? (typeof imageUrls === "string" ? imageUrls : JSON.stringify(imageUrls)) : null }
          : {}),
        ...(enableImageSpin !== undefined ? { enableImageSpin: Boolean(enableImageSpin) } : {}),
        ...(messageTag !== undefined ? { messageTag } : {}),
        ...(autoBlast !== undefined ? { autoBlast: Boolean(autoBlast) } : {}),
        ...(excludePast24h !== undefined ? { excludePast24h: Boolean(excludePast24h) } : {}),
        ...(dripMinSeconds !== undefined
          ? { dripMinSeconds: Math.max(3.0, parseFloat(dripMinSeconds)) }
          : {}),
        ...(dripMaxSeconds !== undefined
          ? { dripMaxSeconds: Math.max(3.0, parseFloat(dripMaxSeconds)) }
          : {}),
        ...(maxFollowUps !== undefined
          ? { maxFollowUps: Math.max(1, parseInt(maxFollowUps)) }
          : {}),
        ...(cooldownHours !== undefined
          ? { cooldownHours: Math.max(0.5, parseFloat(cooldownHours)) }
          : {}),
        ...(step2CampaignId !== undefined ? { step2CampaignId: step2CampaignId || null } : {}),
        ...(step2MessageTemplate !== undefined ? { step2MessageTemplate: step2MessageTemplate || null } : {}),
        ...(step2ImageUrl !== undefined ? { step2ImageUrl: step2ImageUrl || null } : {}),
        ...(isActive !== undefined ? { isActive: Boolean(isActive) } : {}),
      },
    });

    return NextResponse.json({ success: true, campaign: updated });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  const unauthorized = await requireAdminAuth(req);
  if (unauthorized) return unauthorized;

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Campaign ID is required." },
        { status: 400 }
      );
    }

    await prisma.followUpCampaign.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: "Campaign deleted." });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
