import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fetchFacebookPageProfile } from "@/lib/facebook";

export async function GET() {
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

        return {
          ...page,
          awaitingCount,
          followedUpCount,
        };
      })
    );

    return NextResponse.json({ success: true, pages: pagesWithStats });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    let { pageId, name, category, businessName, avatarUrl, accessToken } = body;

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

    return NextResponse.json({ success: true, page, profileFetched });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
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

    return NextResponse.json({ success: true, page: updated });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
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
