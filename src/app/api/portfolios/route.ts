import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const portfolios = await prisma.businessPortfolio.findMany({
      orderBy: { createdAt: "asc" },
    });

    // Augment portfolios with live page and lead counts
    const portfoliosWithStats = await Promise.all(
      portfolios.map(async (portfolio) => {
        const pages = await prisma.facebookPage.findMany({
          where: { businessName: portfolio.name },
          select: { pageId: true },
        });

        const pageIds = pages.map((p) => p.pageId);

        const totalLeads = await prisma.leadConversation.count({
          where: { pageId: { in: pageIds } },
        });

        const awaitingLeads = await prisma.leadConversation.count({
          where: {
            pageId: { in: pageIds },
            status: "AWAITING_CUSTOMER",
          },
        });

        return {
          ...portfolio,
          pageCount: pages.length,
          totalLeads,
          awaitingLeads,
        };
      })
    );

    return NextResponse.json({
      success: true,
      portfolios: portfoliosWithStats,
    });
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
    const { name, industry, icon, description } = body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json(
        { success: false, error: "Portfolio name is required." },
        { status: 400 }
      );
    }

    const trimmedName = name.trim();

    // Check for duplicate portfolio name
    const existing = await prisma.businessPortfolio.findUnique({
      where: { name: trimmedName },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: `A business portfolio named "${trimmedName}" already exists.` },
        { status: 400 }
      );
    }

    const portfolio = await prisma.businessPortfolio.create({
      data: {
        name: trimmedName,
        industry: industry?.trim() || "General Business",
        icon: icon?.trim() || "🏢",
        description: description?.trim() || null,
      },
    });

    return NextResponse.json({ success: true, portfolio });
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
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Portfolio ID is required." },
        { status: 400 }
      );
    }

    const portfolio = await prisma.businessPortfolio.findUnique({
      where: { id },
    });

    if (!portfolio) {
      return NextResponse.json(
        { success: false, error: "Business portfolio not found." },
        { status: 404 }
      );
    }

    // Safety check: Ensure no pages are assigned to this business portfolio before deleting
    const attachedPagesCount = await prisma.facebookPage.count({
      where: { businessName: portfolio.name },
    });

    if (attachedPagesCount > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `Cannot delete portfolio "${portfolio.name}" because it still has ${attachedPagesCount} connected Facebook page(s). Please disconnect or reassign those pages first.`,
        },
        { status: 400 }
      );
    }

    await prisma.businessPortfolio.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: `Business portfolio "${portfolio.name}" deleted.`,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
