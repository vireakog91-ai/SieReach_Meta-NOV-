import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminAuth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const unauthorized = await requireAdminAuth(req);
  if (unauthorized) return unauthorized;

  try {
    const { searchParams } = new URL(req.url);
    const pageId = searchParams.get("pageId");
    const status = searchParams.get("status");

    const logs = await prisma.blastLog.findMany({
      where: {
        ...(pageId ? { pageId } : {}),
        ...(status ? { status } : {}),
      },
      include: {
        page: {
          select: {
            name: true,
            avatarUrl: true,
          },
        },
        campaign: {
          select: {
            name: true,
            inactiveHoursThreshold: true,
          },
        },
      },
      orderBy: { sentAt: "desc" },
      take: 100,
    });

    const totalDelivered = await prisma.blastLog.count({
      where: { status: "DELIVERED" },
    });
    const totalFailed = await prisma.blastLog.count({
      where: { status: "FAILED" },
    });

    return NextResponse.json({
      success: true,
      stats: {
        totalLogs: logs.length,
        totalDelivered,
        totalFailed,
      },
      logs,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
