import { prisma } from "@/lib/prisma";
import { parseSpintax } from "@/lib/spintax";
import { sendTelegramPost, InlineButton } from "@/lib/telegram";

export interface SchedulerExecutionResult {
  processedCount: number;
  successCount: number;
  failedCount: number;
  details: Array<{
    postId: string;
    title: string;
    targetsCount: number;
    success: boolean;
    errors?: string[];
  }>;
}

/**
 * Calculate the next run time for recurring schedules
 */
export function calculateNextRunTime(post: {
  recurrenceRule?: string | null;
  recurrenceDays?: string | null;
  recurrenceTime?: string | null;
  recurrenceIntervalHours?: number | null;
  recurrenceEndDate?: Date | null;
  scheduledAt: Date;
}): Date | null {
  const now = new Date();
  const rule = post.recurrenceRule || "daily";
  let nextDate = new Date(Math.max(now.getTime(), new Date(post.scheduledAt).getTime()));

  if (rule === "interval_hours") {
    const hours = post.recurrenceIntervalHours && post.recurrenceIntervalHours > 0
      ? post.recurrenceIntervalHours
      : 6;
    nextDate = new Date(now.getTime() + hours * 60 * 60 * 1000);
  } else if (rule === "daily") {
    // Add 1 day
    nextDate.setDate(nextDate.getDate() + 1);
    if (post.recurrenceTime) {
      const [hours, minutes] = post.recurrenceTime.split(":").map(Number);
      if (!isNaN(hours) && !isNaN(minutes)) {
        nextDate.setHours(hours, minutes, 0, 0);
      }
    }
  } else if (rule === "weekly" || rule === "custom_days") {
    const dayMap: Record<string, number> = {
      SUN: 0,
      MON: 1,
      TUE: 2,
      WED: 3,
      THU: 4,
      FRI: 5,
      SAT: 6,
    };

    let targetDays: number[] = [1, 3, 5]; // Default Mon, Wed, Fri
    if (post.recurrenceDays) {
      try {
        const parsed = JSON.parse(post.recurrenceDays);
        if (Array.isArray(parsed) && parsed.length > 0) {
          targetDays = parsed
            .map((d: string) => dayMap[d.toUpperCase()])
            .filter((d: number) => d !== undefined);
        }
      } catch {
        // Use default
      }
    }

    if (targetDays.length === 0) targetDays = [1, 3, 5];

    // Find the next matching day in the future
    let daysAhead = 1;
    let candidate = new Date(now);
    while (daysAhead <= 7) {
      candidate.setDate(candidate.getDate() + 1);
      if (targetDays.includes(candidate.getDay())) {
        nextDate = candidate;
        break;
      }
      daysAhead++;
    }

    if (post.recurrenceTime) {
      const [hours, minutes] = post.recurrenceTime.split(":").map(Number);
      if (!isNaN(hours) && !isNaN(minutes)) {
        nextDate.setHours(hours, minutes, 0, 0);
      }
    }
  } else {
    // Fallback: 24h
    nextDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  }

  // Check against end date
  if (post.recurrenceEndDate && new Date(post.recurrenceEndDate) < nextDate) {
    return null; // Expired
  }

  return nextDate;
}

/**
 * Execute delivery for a single post
 */
export async function deliverPost(
  postId: string,
  options: { force?: boolean } = {}
): Promise<{ success: boolean; delivered: number; failed: number; errors: string[] }> {
  const post = await prisma.scheduledPost.findUnique({
    where: { id: postId },
    include: {
      targets: {
        include: {
          channel: {
            include: {
              bot: true,
            },
          },
        },
      },
    },
  });

  if (!post) {
    throw new Error(`Post ${postId} not found.`);
  }

  if (!options.force && post.status !== "SCHEDULED") {
    return {
      success: false,
      delivered: 0,
      failed: 0,
      errors: [`Post ${postId} is not in SCHEDULED status (current: ${post.status})`],
    };
  }

  // Mark as PUBLISHING
  await prisma.scheduledPost.update({
    where: { id: postId },
    data: { status: "PUBLISHING" },
  });

  // Check Sandbox setting
  const sandboxSetting = await prisma.systemSetting.findUnique({
    where: { key: "sandbox_mode" },
  });
  const isGlobalSandbox = sandboxSetting?.value === "true";

  // Parse spintax if present
  const dynamicContent = parseSpintax(post.content);

  // Parse inline buttons JSON
  let inlineButtons: InlineButton[][] | null = null;
  if (post.inlineButtons) {
    try {
      inlineButtons = JSON.parse(post.inlineButtons);
    } catch {
      inlineButtons = null;
    }
  }

  let deliveredCount = 0;
  let failedCount = 0;
  const errors: string[] = [];

  // If no targets assigned, fetch any active channel or create a general log
  const targets = post.targets;

  if (targets.length === 0) {
    const errorMsg = "No target channels assigned to this post.";
    await prisma.postDeliveryLog.create({
      data: {
        postId: post.id,
        chatId: "UNKNOWN",
        channelTitle: "No Channels Selected",
        status: "FAILED",
        errorMessage: errorMsg,
        sentAt: new Date(),
      },
    });

    await prisma.scheduledPost.update({
      where: { id: postId },
      data: {
        status: "FAILED",
        lastRunAt: new Date(),
      },
    });

    return { success: false, delivered: 0, failed: 1, errors: [errorMsg] };
  }

  // Find fallback default active bot if channel has none
  const defaultBot = await prisma.telegramBot.findFirst({
    where: { isActive: true },
  });

  for (const target of targets) {
    const channel = target.channel;
    const botToken = channel.bot?.botToken || defaultBot?.botToken || "SANDBOX_DEFAULT";
    const isSandbox = isGlobalSandbox || !channel.bot || botToken.startsWith("SANDBOX_");

    try {
      const result = await sendTelegramPost({
        botToken,
        chatId: channel.chatId,
        content: dynamicContent,
        parseMode: post.parseMode,
        mediaType: post.mediaType,
        mediaUrl: post.mediaUrl,
        inlineButtons,
        isPinned: post.isPinned,
        isSilent: post.isSilent,
        disablePreview: post.disablePreview,
        isSandbox,
        channelUsername: channel.username,
      });

      if (result.success) {
        deliveredCount++;
        await prisma.postDeliveryLog.create({
          data: {
            postId: post.id,
            channelId: channel.id,
            chatId: channel.chatId,
            channelTitle: channel.title,
            status: result.isSimulated ? "SIMULATED" : "SUCCESS",
            telegramMessageId: result.messageId,
            telegramMessageUrl: result.messageUrl,
            sentAt: new Date(),
          },
        });
      } else {
        failedCount++;
        const err = result.error || "Unknown delivery error";
        errors.push(`[${channel.title}]: ${err}`);
        await prisma.postDeliveryLog.create({
          data: {
            postId: post.id,
            channelId: channel.id,
            chatId: channel.chatId,
            channelTitle: channel.title,
            status: "FAILED",
            errorMessage: err,
            sentAt: new Date(),
          },
        });
      }
    } catch (err: any) {
      failedCount++;
      const errText = err.message || "Execution exception";
      errors.push(`[${channel.title}]: ${errText}`);
      await prisma.postDeliveryLog.create({
        data: {
          postId: post.id,
          channelId: channel.id,
          chatId: channel.chatId,
          channelTitle: channel.title,
          status: "FAILED",
          errorMessage: errText,
          sentAt: new Date(),
        },
      });
    }
  }

  // Handle final post status & recurrence
  const overallSuccess = deliveredCount > 0;

  if (overallSuccess) {
    if (post.isRecurring) {
      const nextRunAt = calculateNextRunTime(post);
      if (nextRunAt) {
        // Reschedule for next occurrence
        await prisma.scheduledPost.update({
          where: { id: postId },
          data: {
            status: "SCHEDULED",
            scheduledAt: nextRunAt,
            nextRunAt: nextRunAt,
            lastRunAt: new Date(),
            totalSentCount: { increment: 1 },
          },
        });
      } else {
        // Recurrence ended
        await prisma.scheduledPost.update({
          where: { id: postId },
          data: {
            status: "PUBLISHED",
            lastRunAt: new Date(),
            totalSentCount: { increment: 1 },
          },
        });
      }
    } else {
      // One-time post completed
      await prisma.scheduledPost.update({
        where: { id: postId },
        data: {
          status: "PUBLISHED",
          lastRunAt: new Date(),
          totalSentCount: { increment: 1 },
        },
      });
    }
  } else {
    // Completely failed
    await prisma.scheduledPost.update({
      where: { id: postId },
      data: {
        status: "FAILED",
        lastRunAt: new Date(),
      },
    });
  }

  return {
    success: overallSuccess,
    delivered: deliveredCount,
    failed: failedCount,
    errors,
  };
}

/**
 * Process all scheduled posts that are due now
 */
export async function processDuePosts(): Promise<SchedulerExecutionResult> {
  const now = new Date();

  // Find posts due
  const duePosts = await prisma.scheduledPost.findMany({
    where: {
      status: "SCHEDULED",
      scheduledAt: {
        lte: now,
      },
    },
    take: 20, // Process in batches
  });

  const details: Array<{
    postId: string;
    title: string;
    targetsCount: number;
    success: boolean;
    errors?: string[];
  }> = [];

  let successCount = 0;
  let failedCount = 0;

  for (const post of duePosts) {
    try {
      const result = await deliverPost(post.id);
      if (result.success) {
        successCount++;
      } else {
        failedCount++;
      }

      details.push({
        postId: post.id,
        title: post.title,
        targetsCount: result.delivered + result.failed,
        success: result.success,
        errors: result.errors,
      });
    } catch (err: any) {
      failedCount++;
      details.push({
        postId: post.id,
        title: post.title,
        targetsCount: 0,
        success: false,
        errors: [err.message],
      });
    }
  }

  return {
    processedCount: duePosts.length,
    successCount,
    failedCount,
    details,
  };
}
