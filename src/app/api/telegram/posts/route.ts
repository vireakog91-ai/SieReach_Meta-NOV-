import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { deliverPost } from "@/lib/schedulerEngine";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || "ALL";
    const channelId = searchParams.get("channelId");
    const search = searchParams.get("search")?.trim();
    const isRecurringFilter = searchParams.get("recurring");

    const where: any = {};

    if (status !== "ALL") {
      if (status === "RECURRING") {
        where.isRecurring = true;
      } else {
        where.status = status;
      }
    }

    if (isRecurringFilter === "true") {
      where.isRecurring = true;
    } else if (isRecurringFilter === "false") {
      where.isRecurring = false;
    }

    if (channelId && channelId !== "ALL") {
      where.targets = {
        some: {
          channelId: channelId,
        },
      };
    }

    if (search) {
      where.OR = [
        { title: { contains: search } },
        { content: { contains: search } },
      ];
    }

    const posts = await prisma.scheduledPost.findMany({
      where,
      include: {
        targets: {
          include: {
            channel: {
              select: {
                id: true,
                title: true,
                username: true,
                chatId: true,
                type: true,
                memberCount: true,
              },
            },
          },
        },
        deliveryLogs: {
          take: 5,
          orderBy: { sentAt: "desc" },
        },
        template: {
          select: { id: true, title: true, category: true },
        },
      },
      orderBy: { scheduledAt: "desc" },
    });

    return NextResponse.json({ success: true, posts });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      title,
      content,
      parseMode = "HTML",
      mediaType = "none",
      mediaUrl = null,
      inlineButtons = null,
      isPinned = false,
      isSilent = false,
      disablePreview = false,
      channelIds = [],
      scheduledAt,
      sendNow = false,
      isDraft = false,
      isRecurring = false,
      recurrenceRule = "daily",
      recurrenceDays = null,
      recurrenceTime = null,
      recurrenceIntervalHours = null,
      recurrenceEndDate = null,
      templateId = null,
    } = body;

    if (!content || content.trim() === "") {
      return NextResponse.json(
        { success: false, error: "Content / Message text is required." },
        { status: 400 }
      );
    }

    if (!isDraft && (!channelIds || channelIds.length === 0)) {
      return NextResponse.json(
        { success: false, error: "Please select at least one channel or group." },
        { status: 400 }
      );
    }

    // Determine initial status & schedule time
    let postStatus = "SCHEDULED";
    let scheduleDate = scheduledAt ? new Date(scheduledAt) : new Date();

    if (isDraft) {
      postStatus = "DRAFT";
    } else if (sendNow) {
      postStatus = "SCHEDULED";
      scheduleDate = new Date();
    }

    const postTitle =
      title?.trim() ||
      content.substring(0, 45).replace(/<[^>]*>?/gm, "").trim() ||
      "Untitled Post";

    const stringButtons = inlineButtons
      ? typeof inlineButtons === "string"
        ? inlineButtons
        : JSON.stringify(inlineButtons)
      : null;

    const stringDays = recurrenceDays
      ? typeof recurrenceDays === "string"
        ? recurrenceDays
        : JSON.stringify(recurrenceDays)
      : null;

    // Create post in DB
    const post = await prisma.scheduledPost.create({
      data: {
        title: postTitle,
        content,
        parseMode,
        mediaType,
        mediaUrl: mediaUrl || null,
        inlineButtons: stringButtons,
        isPinned,
        isSilent,
        disablePreview,
        status: postStatus,
        scheduledAt: scheduleDate,
        isRecurring: Boolean(isRecurring),
        recurrenceRule: isRecurring ? recurrenceRule : null,
        recurrenceDays: isRecurring ? stringDays : null,
        recurrenceTime: isRecurring ? recurrenceTime : null,
        recurrenceIntervalHours:
          isRecurring && recurrenceIntervalHours
            ? Number(recurrenceIntervalHours)
            : null,
        recurrenceEndDate:
          isRecurring && recurrenceEndDate ? new Date(recurrenceEndDate) : null,
        nextRunAt: isRecurring ? scheduleDate : null,
        templateId: templateId || null,
        targets: {
          create: channelIds.map((cid: string) => ({
            channelId: cid,
          })),
        },
      },
      include: {
        targets: {
          include: {
            channel: true,
          },
        },
      },
    });

    // If sendNow requested, deliver immediately!
    let deliveryResult = null;
    if (sendNow) {
      deliveryResult = await deliverPost(post.id, { force: true });
    }

    return NextResponse.json({
      success: true,
      post,
      deliveryResult,
      message: sendNow
        ? "Post broadcast initiated immediately!"
        : isDraft
        ? "Draft saved successfully."
        : "Post scheduled successfully.",
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
