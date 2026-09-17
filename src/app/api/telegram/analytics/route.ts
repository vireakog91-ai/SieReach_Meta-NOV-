import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);

    // 1. Post counts by status
    const [
      totalScheduled,
      totalPublished,
      totalFailed,
      totalRecurring,
      totalDrafts,
    ] = await Promise.all([
      prisma.scheduledPost.count({ where: { status: "SCHEDULED" } }),
      prisma.scheduledPost.count({ where: { status: "PUBLISHED" } }),
      prisma.scheduledPost.count({ where: { status: "FAILED" } }),
      prisma.scheduledPost.count({ where: { isRecurring: true } }),
      prisma.scheduledPost.count({ where: { status: "DRAFT" } }),
    ]);

    // 2. Delivered today
    const sentTodayCount = await prisma.postDeliveryLog.count({
      where: {
        sentAt: { gte: startOfToday },
        status: { in: ["SUCCESS", "SIMULATED"] },
      },
    });

    // 3. Overall Delivery Success vs Failed
    const [totalSuccessLogs, totalFailedLogs] = await Promise.all([
      prisma.postDeliveryLog.count({
        where: { status: { in: ["SUCCESS", "SIMULATED"] } },
      }),
      prisma.postDeliveryLog.count({
        where: { status: "FAILED" },
      }),
    ]);

    const totalLogs = totalSuccessLogs + totalFailedLogs;
    const successRate = totalLogs > 0 ? Math.round((totalSuccessLogs / totalLogs) * 100) : 100;

    // 4. Channel stats & Audience reach
    const channels = await prisma.telegramChannel.findMany({
      select: {
        id: true,
        title: true,
        type: true,
        memberCount: true,
        username: true,
        _count: {
          select: { deliveryLogs: true },
        },
      },
      orderBy: { memberCount: "desc" },
    });

    const totalAudience = channels.reduce((acc, c) => acc + (c.memberCount || 0), 0);

    // 5. Next upcoming scheduled post
    const nextUpcomingPost = await prisma.scheduledPost.findFirst({
      where: {
        status: "SCHEDULED",
        scheduledAt: { gte: now },
      },
      include: {
        targets: {
          include: { channel: { select: { title: true } } },
        },
      },
      orderBy: { scheduledAt: "asc" },
    });

    // 6. Recent delivery logs (last 10)
    const recentLogs = await prisma.postDeliveryLog.findMany({
      take: 10,
      orderBy: { sentAt: "desc" },
    });

    return NextResponse.json({
      success: true,
      stats: {
        totalScheduled,
        totalPublished,
        totalFailed,
        totalRecurring,
        totalDrafts,
        sentTodayCount,
        totalSuccessLogs,
        totalFailedLogs,
        successRate,
        totalChannels: channels.length,
        totalAudience,
      },
      nextUpcomingPost,
      channelsSummary: channels.map((c) => ({
        id: c.id,
        title: c.title,
        type: c.type,
        username: c.username,
        members: c.memberCount,
        postsCount: c._count.deliveryLogs,
      })),
      recentLogs,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
