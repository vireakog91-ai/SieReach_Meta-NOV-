import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fetchFacebookPageProfile } from "@/lib/facebook";
import { scanInactiveLeads } from "@/lib/scanner";
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
    const pages = await prisma.facebookPage.findMany({
      include: {
        _count: {
          select: {
            leads: true,
            campaigns: true,
            logs: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    // Compute active unresponsive count for each page
    const pagesWithStats = await Promise.all(
      pages.map(async (page) => {
        const awaitingCount = await prisma.leadConversation.count({
          where: {
            pageId: page.pageId,
            status: "AWAITING_CUSTOMER",
          },
        });
        const followedUpCount = await prisma.leadConversation.count({
          where: {
            pageId: page.pageId,
            status: "FOLLOWED_UP",
          },
        });

        // Strip and mask raw access token from client response
        const { accessToken, ...safePage } = page;
        const maskedToken = accessToken && accessToken.length > 8
          ? `${accessToken.slice(0, 4)}...${accessToken.slice(-4)}`
          : (accessToken ? "••••••••" : "");

        return {
          ...safePage,
          hasAccessToken: Boolean(accessToken && accessToken.trim()),
          accessTokenMasked: maskedToken,
          awaitingCount,
          followedUpCount,
        };
      })
    );

    return NextResponse.json(
      { success: true, pages: pagesWithStats },
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
    const { pageId, businessName, accessToken } = body;
    let { name, category, avatarUrl } = body;

    if (!pageId) {
      return NextResponse.json(
        { success: false, error: "pageId is required." },
        { status: 400 }
      );
    }

    // Automatically fetch real Facebook page profile from Graph API if accessToken is provided
    let profileFetched = false;
    if (accessToken) {
      const fbProfile = await fetchFacebookPageProfile(pageId, accessToken);
      if (fbProfile) {
        profileFetched = true;
        name = name || fbProfile.name;
        category = fbProfile.category || category || "Business Page";
        avatarUrl = fbProfile.avatarUrl || avatarUrl;
      }
    }

    if (!name) {
      name = `Facebook Page (${pageId.slice(-4)})`;
    }

    const page = await prisma.facebookPage.upsert({
      where: { pageId },
      update: {
        name,
        category: category || "Business Page",
        businessName: businessName || "SieLab Retail Group",
        avatarUrl: avatarUrl || null,
        accessToken: accessToken || "",
        isActive: true,
      },
      create: {
        pageId,
        name,
        category: category || "Business Page",
        businessName: businessName || "SieLab Retail Group",
        avatarUrl: avatarUrl || null,
        accessToken: accessToken || "",
        isActive: true,
      },
    });

    // Immediately scan for live leads for this newly connected page
    let initialScanSummary = null;
    if (accessToken) {
      try {
        const scanRes = await scanInactiveLeads(24.0, page.pageId);
        initialScanSummary = {
          totalLeads: scanRes.totalLeads,
          unresponsiveCount: scanRes.unresponsiveCount,
        };
      } catch (scanErr) {
        console.error(`Initial scan failed for page ${page.pageId}:`, scanErr);
      }
    }

    const { accessToken: _token, ...safePage } = page;
    const maskedToken =
      _token && _token.length > 8
        ? `${_token.slice(0, 4)}...${_token.slice(-4)}`
        : _token
        ? "••••••••"
        : "";

    return NextResponse.json({
      success: true,
      page: {
        ...safePage,
        hasAccessToken: Boolean(_token && _token.trim()),
        accessTokenMasked: maskedToken,
      },
      profileFetched,
      initialScanSummary,
    });
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
    const { pageId, isActive, accessToken, name, category, businessName, syncProfile } = body;

    if (!pageId) {
      return NextResponse.json(
        { success: false, error: "pageId is required." },
        { status: 400 }
      );
    }

    let updatedAvatar: string | undefined = undefined;
    let updatedCategory: string | undefined = category;
    let updatedName = name;

    if (syncProfile) {
      const existing = await prisma.facebookPage.findUnique({ where: { pageId } });
      const token = accessToken || existing?.accessToken;
      if (token) {
        const fbProfile = await fetchFacebookPageProfile(pageId, token);
        if (fbProfile) {
          updatedName = fbProfile.name || updatedName;
          updatedCategory = fbProfile.category;
          updatedAvatar = fbProfile.avatarUrl;
        }
      }
    }

    const updated = await prisma.facebookPage.update({
      where: { pageId },
      data: {
        ...(typeof isActive === "boolean" ? { isActive } : {}),
        ...(accessToken !== undefined ? { accessToken } : {}),
        ...(updatedName !== undefined ? { name: updatedName } : {}),
        ...(updatedCategory !== undefined ? { category: updatedCategory } : {}),
        ...(businessName !== undefined ? { businessName } : {}),
        ...(updatedAvatar !== undefined ? { avatarUrl: updatedAvatar } : {}),
      },
    });

    const { accessToken: _token, ...safeUpdated } = updated;
    const maskedToken =
      _token && _token.length > 8
        ? `${_token.slice(0, 4)}...${_token.slice(-4)}`
        : _token
        ? "••••••••"
        : "";

    return NextResponse.json({
      success: true,
      page: {
        ...safeUpdated,
        hasAccessToken: Boolean(_token && _token.trim()),
        accessTokenMasked: maskedToken,
      },
    });
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
    const pageId = searchParams.get("pageId");

    if (!pageId) {
      return NextResponse.json(
        { success: false, error: "pageId is required." },
        { status: 400 }
      );
    }

    await prisma.facebookPage.delete({
      where: { pageId },
    });

    return NextResponse.json({ success: true, message: "Page removed" });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
