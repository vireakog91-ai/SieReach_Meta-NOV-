import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyChatInfo, formatTelegramError } from "@/lib/telegram";

export async function GET() {
  try {
    const channels = await prisma.telegramChannel.findMany({
      include: {
        bot: {
          select: { id: true, name: true, username: true },
        },
        _count: {
          select: { postTargets: true, deliveryLogs: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, channels });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: formatTelegramError(error.message) },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { chatId, title, botId } = body;

    if (!chatId || chatId.trim() === "") {
      return NextResponse.json(
        { success: false, error: "Chat ID or @username is required." },
        { status: 400 }
      );
    }

    // Determine bot to use for verification
    let bot = null;
    if (botId) {
      bot = await prisma.telegramBot.findUnique({ where: { id: botId } });
    } else {
      bot = await prisma.telegramBot.findFirst({ where: { isActive: true } });
    }

    const botToken = bot?.botToken || "SANDBOX_DEFAULT";

    // Verify chat via Telegram API
    const verification = await verifyChatInfo(botToken, chatId.trim());

    if (!verification.valid) {
      return NextResponse.json(
        {
          success: false,
          error:
            verification.error ||
            "Please add this bot to your Telegram channel (and grant it Administrator permissions with 'Post Messages' enabled).",
        },
        { status: 400 }
      );
    }

    const chatInfo = verification.chat!;
    const cleanChatId = String(chatInfo.id);
    const channelTitle = title?.trim() || chatInfo.title || cleanChatId;

    const channel = await prisma.telegramChannel.upsert({
      where: { chatId: cleanChatId },
      update: {
        title: channelTitle,
        username: chatInfo.username || null,
        type: chatInfo.type || "channel",
        memberCount: chatInfo.memberCount || 0,
        isBotAdmin: chatInfo.isBotAdmin ?? true,
        canPostMessages: chatInfo.canPostMessages ?? true,
        botId: bot?.id || null,
        isActive: true,
      },
      create: {
        chatId: cleanChatId,
        title: channelTitle,
        username: chatInfo.username || null,
        type: chatInfo.type || "channel",
        memberCount: chatInfo.memberCount || 0,
        isBotAdmin: chatInfo.isBotAdmin ?? true,
        canPostMessages: chatInfo.canPostMessages ?? true,
        botId: bot?.id || null,
        isActive: true,
      },
      include: {
        bot: true,
      },
    });

    return NextResponse.json({ success: true, channel });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, title, chatId, username, type, botId, isActive, action } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Channel ID is required." },
        { status: 400 }
      );
    }

    const channel = await prisma.telegramChannel.findUnique({
      where: { id },
      include: { bot: true },
    });

    if (!channel) {
      return NextResponse.json(
        { success: false, error: "Channel not found." },
        { status: 404 }
      );
    }

    // If sync action requested, refresh from Telegram API
    if (action === "sync") {
      const botToken = channel.bot?.botToken || "SANDBOX_DEFAULT";
      const verification = await verifyChatInfo(botToken, channel.chatId);

      if (verification.valid && verification.chat) {
        const updated = await prisma.telegramChannel.update({
          where: { id },
          data: {
            title: verification.chat.title || channel.title,
            memberCount: verification.chat.memberCount || channel.memberCount,
            isBotAdmin: verification.chat.isBotAdmin ?? channel.isBotAdmin,
            canPostMessages: verification.chat.canPostMessages ?? channel.canPostMessages,
          },
          include: { bot: true },
        });

        return NextResponse.json({ success: true, channel: updated });
      }

      return NextResponse.json({
        success: true,
        channel,
        warning: "Could not refresh from Telegram API, kept existing values.",
      });
    }

    // Otherwise, perform manual edit update
    const updateData: any = {};
    if (title !== undefined) updateData.title = title.trim();
    if (chatId !== undefined) {
      let cleanChatId = chatId.trim();
      if (!cleanChatId.startsWith("@") && !cleanChatId.startsWith("-") && isNaN(Number(cleanChatId))) {
        cleanChatId = `@${cleanChatId}`;
      }
      updateData.chatId = cleanChatId;
    }
    if (username !== undefined) updateData.username = username?.trim() || null;
    if (type !== undefined) updateData.type = type;
    if (botId !== undefined) updateData.botId = botId || null;
    if (isActive !== undefined) updateData.isActive = Boolean(isActive);

    const updated = await prisma.telegramChannel.update({
      where: { id },
      data: updateData,
      include: { bot: true },
    });

    return NextResponse.json({ success: true, channel: updated });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
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
        { success: false, error: "Channel ID is required." },
        { status: 400 }
      );
    }

    // Safely remove post targets first to prevent foreign key errors
    await prisma.scheduledPostTarget.deleteMany({
      where: { channelId: id },
    });

    // Unlink delivery logs so historical records are kept without foreign key error
    await prisma.postDeliveryLog.updateMany({
      where: { channelId: id },
      data: { channelId: null },
    });

    await prisma.telegramChannel.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: "Channel disconnected successfully." });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
