import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyBotToken, formatTelegramError } from "@/lib/telegram";

export async function GET() {
  try {
    const bots = await prisma.telegramBot.findMany({
      include: {
        _count: {
          select: { channels: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, bots });
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
    const { name, botToken } = body;

    if (!botToken || botToken.trim() === "") {
      return NextResponse.json(
        { success: false, error: "Bot token is required." },
        { status: 400 }
      );
    }

    // Verify token with Telegram Bot API
    const verification = await verifyBotToken(botToken.trim());
    if (!verification.valid) {
      return NextResponse.json(
        {
          success: false,
          error:
            verification.error ||
            "Invalid Telegram Bot Token. Please check the token provided by @BotFather and try again.",
        },
        { status: 400 }
      );
    }

    const botInfo = verification.bot;
    const botName = name?.trim() || botInfo?.first_name || "Telegram Bot";

    // Upsert or create bot
    const bot = await prisma.telegramBot.upsert({
      where: { botToken: botToken.trim() },
      update: {
        name: botName,
        username: botInfo?.username || null,
        firstName: botInfo?.first_name || null,
        canJoinGroups: botInfo?.can_join_groups ?? true,
        canReadAllGroupMsgs: botInfo?.can_read_all_group_messages ?? false,
        isActive: true,
      },
      create: {
        name: botName,
        botToken: botToken.trim(),
        username: botInfo?.username || null,
        firstName: botInfo?.first_name || null,
        canJoinGroups: botInfo?.can_join_groups ?? true,
        canReadAllGroupMsgs: botInfo?.can_read_all_group_messages ?? false,
        isActive: true,
      },
    });

    return NextResponse.json({ success: true, bot });
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
        { success: false, error: "Bot ID is required." },
        { status: 400 }
      );
    }

    await prisma.telegramBot.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: "Bot deleted successfully." });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
