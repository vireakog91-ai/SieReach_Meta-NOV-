import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  MOCK_BOTS,
  MOCK_CHANNELS,
  MOCK_TEMPLATES,
} from "@/lib/mockTelegramData";
import { seedInitialUsers } from "@/lib/seedUsers";

export async function POST() {
  try {
    // 0. Ensure initial users exist
    await seedInitialUsers();

    // 1. Ensure system settings exist
    await prisma.systemSetting.upsert({
      where: { key: "sandbox_mode" },
      update: { value: "true" },
      create: {
        key: "sandbox_mode",
        value: "true",
        description: "Sandbox mode simulates Telegram API calls for safe testing",
      },
    });

    await prisma.systemSetting.upsert({
      where: { key: "timezone" },
      update: { value: "Asia/Phnom_Penh" },
      create: {
        key: "timezone",
        value: "Asia/Phnom_Penh",
        description: "Default timezone for post scheduling",
      },
    });

    // 2. Seed Bots
    const createdBots = [];
    for (const b of MOCK_BOTS) {
      const bot = await prisma.telegramBot.upsert({
        where: { botToken: b.botToken },
        update: {
          name: b.name,
          username: b.username,
          firstName: b.firstName,
          canJoinGroups: b.canJoinGroups,
          canReadAllGroupMsgs: b.canReadAllGroupMsgs,
          isActive: b.isActive,
        },
        create: b,
      });
      createdBots.push(bot);
    }

    const defaultBotId = createdBots[0]?.id;

    // 3. Seed Channels
    const createdChannels = [];
    for (const c of MOCK_CHANNELS) {
      const channel = await prisma.telegramChannel.upsert({
        where: { chatId: c.chatId },
        update: {
          title: c.title,
          username: c.username,
          type: c.type,
          memberCount: c.memberCount,
          isBotAdmin: c.isBotAdmin,
          canPostMessages: c.canPostMessages,
          avatarUrl: c.avatarUrl,
          botId: defaultBotId,
        },
        create: {
          ...c,
          botId: defaultBotId,
        },
      });
      createdChannels.push(channel);
    }

    // 4. Seed Templates
    const createdTemplates = [];
    for (const t of MOCK_TEMPLATES) {
      const existing = await prisma.postTemplate.findFirst({
        where: { title: t.title },
      });

      if (!existing) {
        const created = await prisma.postTemplate.create({
          data: t,
        });
        createdTemplates.push(created);
      } else {
        createdTemplates.push(existing);
      }
    }

    // 5. Check if scheduled posts exist, if not create sample posts
    const existingPostsCount = await prisma.scheduledPost.count();
    if (existingPostsCount === 0 && createdChannels.length > 0) {
      const now = new Date();

      // Post 1: Scheduled 2 hours from now (Product 2.0 release)
      const post1Date = new Date(now.getTime() + 2 * 60 * 60 * 1000);
      const post1 = await prisma.scheduledPost.create({
        data: {
          title: "🚀 SieReach 2.0 Major Launch Announcement",
          content: `<b>🚀 Introducing SieReach Telegram Scheduler 2.0!</b>\n\nNo more manual copy-pasting or missed posting hours. Schedule posts in advance, broadcast across all your channels with 1 click, and view live mockups.\n\n✨ <i>Features:</i>\n• Multi-Channel Broadcast\n• Interactive Content Calendar\n• Recurrence Rules (Daily/Weekly)\n• Live Telegram Chat Mockup Preview`,
          parseMode: "HTML",
          mediaType: "photo",
          mediaUrl:
            "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop",
          inlineButtons: JSON.stringify([
            [
              { text: "🚀 Explore SieReach", url: "https://sielab.co" },
              { text: "💬 Join VIP Community", url: "https://t.me/sielab_tech" },
            ],
          ]),
          status: "SCHEDULED",
          scheduledAt: post1Date,
          isPinned: true,
          targets: {
            create: [
              { channelId: createdChannels[0].id },
              { channelId: createdChannels[1].id },
            ],
          },
        },
      });

      // Post 2: Recurring Daily Morning Digest
      const post2Date = new Date(now.getTime() + 14 * 60 * 60 * 1000);
      post2Date.setHours(9, 0, 0, 0);
      await prisma.scheduledPost.create({
        data: {
          title: "☀️ Daily Morning Business & AI Digest",
          content: `<b>☀️ Good morning {Innovators|Entrepreneurs|Builders}!</b>\n\n💡 <i>Today's Core Principle:</i>\n<blockquote>"{The best way to predict the future is to automate it.|Consistent small actions create monumental compounding results.|Focus on high-leverage workflows and let automated tools handle the routine.}"</blockquote>\n\nDrop a 🔥 below if you're taking action today!`,
          parseMode: "HTML",
          mediaType: "none",
          status: "SCHEDULED",
          scheduledAt: post2Date,
          isRecurring: true,
          recurrenceRule: "daily",
          recurrenceTime: "09:00",
          targets: {
            create: [
              { channelId: createdChannels[1].id },
              { channelId: createdChannels[2].id },
            ],
          },
        },
      });

      // Post 3: Recurring Weekly Flash Sale
      const post3Date = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
      post3Date.setHours(18, 0, 0, 0);
      await prisma.scheduledPost.create({
        data: {
          title: "⚡ Weekend Exclusive Flash Sale",
          content: `<b>⚡ {WEEKEND SPECIAL|FLASH PROMO|LIMITED DISCOUNT}!</b>\n\nSave 40% on all annual subscriptions this weekend only.\n\nUse promo code: <code>SIELAB40</code> at checkout!`,
          parseMode: "HTML",
          mediaType: "photo",
          mediaUrl:
            "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=800&auto=format&fit=crop",
          inlineButtons: JSON.stringify([
            [{ text: "🛍️ Shop Deal Now", url: "https://sielab.co/deal" }],
          ]),
          status: "SCHEDULED",
          scheduledAt: post3Date,
          isRecurring: true,
          recurrenceRule: "weekly",
          recurrenceDays: JSON.stringify(["FRI", "SAT"]),
          recurrenceTime: "18:00",
          targets: {
            create: [
              { channelId: createdChannels[3].id },
              { channelId: createdChannels[4].id },
            ],
          },
        },
      });

      // Post 4: Successfully Published Post (Yesterday)
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const post4 = await prisma.scheduledPost.create({
        data: {
          title: "🎙️ Community AMA & Live Q&A Announcement",
          content: `<b>🎙️ Weekly Community Voice Q&A session starts in 1 hour!</b>\n\nBring your questions regarding channel growth, automation scripts, and monetization strategies.\n\nSee everyone inside! 🎧`,
          parseMode: "HTML",
          mediaType: "none",
          status: "PUBLISHED",
          scheduledAt: yesterday,
          lastRunAt: yesterday,
          totalSentCount: 1,
          targets: {
            create: [
              { channelId: createdChannels[0].id },
              { channelId: createdChannels[1].id },
            ],
          },
        },
      });

      // Create delivery logs for Post 4
      await prisma.postDeliveryLog.createMany({
        data: [
          {
            postId: post4.id,
            channelId: createdChannels[0].id,
            chatId: createdChannels[0].chatId,
            channelTitle: createdChannels[0].title,
            status: "SIMULATED",
            telegramMessageId: "40192",
            telegramMessageUrl: `https://t.me/${createdChannels[0].username}/40192`,
            sentAt: yesterday,
          },
          {
            postId: post4.id,
            channelId: createdChannels[1].id,
            chatId: createdChannels[1].chatId,
            channelTitle: createdChannels[1].title,
            status: "SIMULATED",
            telegramMessageId: "40193",
            telegramMessageUrl: `https://t.me/${createdChannels[1].username}/40193`,
            sentAt: yesterday,
          },
        ],
      });

      // Post 5: Failed Post to show error tracking and 1-click retry
      const pastHour = new Date(now.getTime() - 2 * 60 * 60 * 1000);
      const post5 = await prisma.scheduledPost.create({
        data: {
          title: "⚠️ VIP Crypto Signal Report #104",
          content: `<b>💎 VIP Signal Alert: BTC/USDT Support Level Retest</b>\n\nEntry range: <b>$64,200 - $64,800</b>\nTarget 1: $66,500\nTarget 2: $68,000\nStop loss: $63,100`,
          parseMode: "HTML",
          mediaType: "none",
          status: "FAILED",
          scheduledAt: pastHour,
          lastRunAt: pastHour,
          targets: {
            create: [{ channelId: createdChannels[3].id }],
          },
        },
      });

      await prisma.postDeliveryLog.create({
        data: {
          postId: post5.id,
          channelId: createdChannels[3].id,
          chatId: createdChannels[3].chatId,
          channelTitle: createdChannels[3].title,
          status: "FAILED",
          errorMessage: "Telegram 403 Forbidden: Bot was demoted or lacks 'can_post_messages' permission in channel.",
          sentAt: pastHour,
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: "Showcase demo data seeded successfully with bots, channels, templates, and schedule pipeline!",
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
