import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const post = await prisma.scheduledPost.findUnique({
      where: { id },
      include: {
        targets: {
          include: { channel: true },
        },
        deliveryLogs: {
          orderBy: { sentAt: "desc" },
        },
        template: true,
      },
    });

    if (!post) {
      return NextResponse.json(
        { success: false, error: "Post not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, post });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    const {
      title,
      content,
      parseMode,
      mediaType,
      mediaUrl,
      inlineButtons,
      isPinned,
      isSilent,
      disablePreview,
      status,
      scheduledAt,
      isRecurring,
      recurrenceRule,
      recurrenceDays,
      recurrenceTime,
      recurrenceIntervalHours,
      recurrenceEndDate,
      channelIds,
    } = body;

    const updateData: any = {};

    if (title !== undefined) updateData.title = title;
    if (content !== undefined) updateData.content = content;
    if (parseMode !== undefined) updateData.parseMode = parseMode;
    if (mediaType !== undefined) updateData.mediaType = mediaType;
    if (mediaUrl !== undefined) updateData.mediaUrl = mediaUrl;
    if (inlineButtons !== undefined) {
      updateData.inlineButtons =
        typeof inlineButtons === "string"
          ? inlineButtons
          : JSON.stringify(inlineButtons);
    }
    if (isPinned !== undefined) updateData.isPinned = Boolean(isPinned);
    if (isSilent !== undefined) updateData.isSilent = Boolean(isSilent);
    if (disablePreview !== undefined)
      updateData.disablePreview = Boolean(disablePreview);
    if (status !== undefined) updateData.status = status;
    if (scheduledAt !== undefined)
      updateData.scheduledAt = new Date(scheduledAt);

    if (isRecurring !== undefined) {
      updateData.isRecurring = Boolean(isRecurring);
      if (recurrenceRule !== undefined)
        updateData.recurrenceRule = recurrenceRule;
      if (recurrenceDays !== undefined) {
        updateData.recurrenceDays =
          typeof recurrenceDays === "string"
            ? recurrenceDays
            : JSON.stringify(recurrenceDays);
      }
      if (recurrenceTime !== undefined)
        updateData.recurrenceTime = recurrenceTime;
      if (recurrenceIntervalHours !== undefined) {
        updateData.recurrenceIntervalHours = Number(recurrenceIntervalHours);
      }
      if (recurrenceEndDate !== undefined) {
        updateData.recurrenceEndDate = recurrenceEndDate
          ? new Date(recurrenceEndDate)
          : null;
      }
    }

    // Update channel targets if provided
    if (channelIds && Array.isArray(channelIds)) {
      await prisma.scheduledPostTarget.deleteMany({
        where: { postId: id },
      });
      await prisma.scheduledPostTarget.createMany({
        data: channelIds.map((cid: string) => ({
          postId: id,
          channelId: cid,
        })),
      });
    }

    const updatedPost = await prisma.scheduledPost.update({
      where: { id },
      data: updateData,
      include: {
        targets: { include: { channel: true } },
      },
    });

    return NextResponse.json({ success: true, post: updatedPost });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await prisma.scheduledPost.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: "Post deleted successfully.",
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
