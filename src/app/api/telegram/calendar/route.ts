import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const month = searchParams.get("month"); // 1 - 12 (default current)
    const year = searchParams.get("year");   // e.g. 2026

    const now = new Date();
    const targetYear = year ? parseInt(year, 10) : now.getFullYear();
    const targetMonth = month ? parseInt(month, 10) - 1 : now.getMonth();

    // Start & end of requested month with buffer
    const startDate = new Date(targetYear, targetMonth, 1, 0, 0, 0);
    const endDate = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59);

    const posts = await prisma.scheduledPost.findMany({
      where: {
        scheduledAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        targets: {
          include: {
            channel: {
              select: { id: true, title: true, type: true, username: true },
            },
          },
        },
      },
      orderBy: { scheduledAt: "asc" },
    });

    return NextResponse.json({
      success: true,
      year: targetYear,
      month: targetMonth + 1,
      totalEvents: posts.length,
      events: posts.map((p) => ({
        id: p.id,
        title: p.title,
        scheduledAt: p.scheduledAt,
        status: p.status,
        isRecurring: p.isRecurring,
        mediaType: p.mediaType,
        channels: p.targets.map((t) => t.channel.title),
      })),
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
