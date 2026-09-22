import { prisma } from "./prisma";
import { renderMessageTemplate, sendFacebookMessage, parseSpintax } from "./facebook";

export interface BlastRequest {
  campaignId?: string;
  leadIds?: string[];
  customMessageTemplate?: string;
  customImageUrl?: string;
  customThresholdHours?: number;
  messageTag?: string;
  targetPageId?: string;
  excludePast24h?: boolean;
  dripMinSeconds?: number;
  dripMaxSeconds?: number;
  maxFollowUps?: number;
  cooldownHours?: number;
}

export interface BlastResultItem {
  leadId: string;
  customerName: string;
  pageName: string;
  recipientPsid: string;
  success: boolean;
  messageId?: string;
  mode?: "LIVE" | "SANDBOX";
  error?: string;
  dripDelayApplied?: number;
  messageSent?: string;
  step?: number;
}

export interface BlastExecutionReport {
  totalTargeted: number;
  successful: number;
  failed: number;
  excludedPast24hCount: number;
  dripPacing: {
    minSeconds: number;
    maxSeconds: number;
  };
  details: BlastResultItem[];
}

/**
 * Execute a follow-up blast to targeted unresponsive leads with Tag Safety & Drip Rate Throttling
 */
export async function executeFollowUpBlast(
  params: BlastRequest
): Promise<BlastExecutionReport> {
  const {
    campaignId,
    leadIds,
    customMessageTemplate,
    customImageUrl,
    customThresholdHours,
    messageTag = "HUMAN_AGENT",
    targetPageId,
    excludePast24h: reqExcludePast24h,
    dripMinSeconds: reqDripMin,
    dripMaxSeconds: reqDripMax,
    maxFollowUps: reqMaxFollowUps,
    cooldownHours: reqCooldownHours,
  } = params;

  // Retrieve campaign if ID provided
  let campaign = campaignId
    ? await prisma.followUpCampaign.findUnique({ where: { id: campaignId } })
    : null;

  const templateToUse =
    customMessageTemplate ||
    campaign?.messageTemplate ||
    "Hello {{customer_name}}, just following up regarding your interest in {{page_name}}! We are here to help answer any questions or prepare your order.";

  const imageToUse = customImageUrl ?? campaign?.imageUrl ?? null;
  const tagToUse = messageTag || campaign?.messageTag || "HUMAN_AGENT";
  const threshold = customThresholdHours ?? campaign?.inactiveHoursThreshold ?? 24.0;
  const maxFollowUps = reqMaxFollowUps ?? campaign?.maxFollowUps ?? 1;
  const cooldownHours = reqCooldownHours ?? campaign?.cooldownHours ?? 3.0;

  // Tag Safety Guard (default to TRUE)
  const excludePast24h =
    reqExcludePast24h !== undefined
      ? reqExcludePast24h
      : campaign?.excludePast24h ?? true;

  // Drip Rate Throttling: Enforce minimum of 3.0s to protect Meta Page from rate limit strikes
  const dripMin = Math.max(3.0, reqDripMin ?? campaign?.dripMinSeconds ?? 3.0);
  const dripMax = Math.max(dripMin, reqDripMax ?? campaign?.dripMaxSeconds ?? 5.0);

  // Target leads query: In multi-step mode, target leads who haven't reached max follow-ups
  // Strict Business Portfolio Isolation: Target leads strictly within the campaign's dedicated business portfolio
  const pageFilter: any = {};
  if (targetPageId) {
    pageFilter.pageId = targetPageId;
  } else if (campaign?.pageId) {
    pageFilter.pageId = campaign.pageId;
  } else if (campaign?.businessName) {
    pageFilter.page = { businessName: campaign.businessName };
  }

  const whereClause: any = {
    ...pageFilter,
    ...(leadIds && leadIds.length > 0
      ? { id: { in: leadIds } }
      : {
          status: { in: ["AWAITING_CUSTOMER", "FOLLOWED_UP"] },
          followUpCount: { lt: maxFollowUps },
        }),
  };

  const candidateLeads = await prisma.leadConversation.findMany({
    where: whereClause,
    include: {
      page: true,
    },
  });

  const now = new Date();
  let excludedPast24hCount = 0;

  let step2Campaign = campaign?.step2CampaignId
    ? await prisma.followUpCampaign.findUnique({ where: { id: campaign.step2CampaignId } })
    : null;

  const eligibleLeads = candidateLeads.filter((lead) => {
    // Prevent blasting if customer already replied or lead reached max follow-ups
    if (lead.status === "REPLIED" || lead.status === "CONVERTED" || lead.status === "CLOSED" || lead.repliedAt !== null) {
      return false;
    }
    if (lead.followUpCount >= maxFollowUps) {
      return false;
    }

    const custTime = new Date(lead.lastCustomerMessageAt).getTime();
    const hoursSinceCust = (now.getTime() - custTime) / (1000 * 60 * 60);

    // 1. Tag Safety Guard: Strict 24h policy. Cooldown NEVER bypasses or overtakes 24h window.
    // If a customer was at 21h and cooldown is 3h (21+3 = 24h), once it crosses 24h it will never send.
    if (excludePast24h && hoursSinceCust > 24.0) {
      excludedPast24hCount++;
      return false;
    }

    // 2. Meta Hard Limit: Absolute 7-day (168h) cutoff to prevent Meta API error #10 on stale messages
    if (hoursSinceCust > 168.0) {
      excludedPast24hCount++;
      return false;
    }

    if (leadIds && leadIds.length > 0) return true; // explicitly chosen (subject to 24h & 7-day guards above)

    if (lead.followUpCount === 0) {
      // Step 1: Initial inactivity check (since sales rep response)
      const agentTime = new Date(lead.lastAgentMessageAt).getTime();
      const hoursUnresponsive = (now.getTime() - agentTime) / (1000 * 60 * 60);
      return hoursUnresponsive >= threshold;
    } else {
      // Step 2: Cooldown check since previous follow-up message (e.g. 3.0h)
      if (!lead.lastFollowedUpAt) return false;
      const lastBlastTime = new Date(lead.lastFollowedUpAt).getTime();
      const hoursSinceLastFollowUp = (now.getTime() - lastBlastTime) / (1000 * 60 * 60);
      return hoursSinceLastFollowUp >= cooldownHours;
    }
  });

  const report: BlastExecutionReport = {
    totalTargeted: eligibleLeads.length,
    successful: 0,
    failed: 0,
    excludedPast24hCount,
    dripPacing: {
      minSeconds: dripMin,
      maxSeconds: dripMax,
    },
    details: [],
  };

  let messageIndex = 0;
  for (const lead of eligibleLeads) {
    // Apply randomized human-like drip delay between messages (after the first message)
    let appliedDelaySec = 0;
    if (messageIndex > 0) {
      // Randomized interval between dripMin and dripMax (e.g. between 3.0s and 5.0s, or 5.0s and 7.0s)
      appliedDelaySec = Number(
        (dripMin + Math.random() * (dripMax - dripMin)).toFixed(2)
      );
      // Wait the exact randomized delay per message to prevent Meta velocity alerts
      const waitMs = Math.round(appliedDelaySec * 1000);
      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }
    messageIndex++;

    // Step 2 Rule Resolution: If this is Step 2 (followUpCount === 1), use the distinct Step 2 blast rule
    let leadTemplate = templateToUse;
    let leadImage = imageToUse;

    // Image Spin Resolution: If multiple posters configured and spin is enabled, pick random poster for this lead
    if (campaign?.enableImageSpin && campaign?.imageUrls) {
      try {
        const urls: string[] = typeof campaign.imageUrls === "string" ? JSON.parse(campaign.imageUrls) : campaign.imageUrls;
        const validUrls = Array.isArray(urls) ? urls.filter(Boolean) : [];
        if (validUrls.length > 0) {
          leadImage = validUrls[Math.floor(Math.random() * validUrls.length)];
        }
      } catch (err) {
        // fallback to imageToUse
      }
    } else if (leadImage && leadImage.includes("{") && leadImage.includes("|")) {
      leadImage = parseSpintax(leadImage);
    }

    if (lead.followUpCount === 1) {
      if (step2Campaign) {
        leadTemplate = step2Campaign.messageTemplate || leadTemplate;
        leadImage = step2Campaign.imageUrl ?? leadImage;
        if (step2Campaign.enableImageSpin && step2Campaign.imageUrls) {
          try {
            const s2Urls = JSON.parse(step2Campaign.imageUrls);
            const validS2Urls = Array.isArray(s2Urls) ? s2Urls.filter(Boolean) : [];
            if (validS2Urls.length > 0) {
              leadImage = validS2Urls[Math.floor(Math.random() * validS2Urls.length)];
            }
          } catch (e) {}
        }
      } else if (campaign?.step2MessageTemplate) {
        leadTemplate = campaign.step2MessageTemplate;
        leadImage = campaign.step2ImageUrl ?? leadImage;
      }
    }

    // Format personalized message text with dynamic Spintax resolution
    const personalizedText = renderMessageTemplate(leadTemplate, {
      customerName: lead.customerName,
      pageName: lead.page.name,
      adSource: lead.adSource,
    });

    // Check if within 24h Meta window
    const custTime = new Date(lead.lastCustomerMessageAt).getTime();
    const hoursSinceCust = (now.getTime() - custTime) / (1000 * 60 * 60);
    const within24h = hoursSinceCust <= 24.0;

    // Determine message tag: within 24h, tag is null (Standard); outside 24h, requires tag
    const appliedTag = within24h ? null : tagToUse;

    // Send Facebook Message
    const sendResult = await sendFacebookMessage({
      pageId: lead.pageId,
      pageAccessToken: lead.page.accessToken,
      recipientPsid: lead.psid,
      messageText: personalizedText,
      imageUrl: leadImage,
      messageTag: appliedTag,
    });

    const messageSentAt = new Date();

    if (sendResult.success) {
      report.successful++;

      const isStep1 = lead.followUpCount === 0;
      const stepNumber = lead.followUpCount + 1;

      // Update lead state with exact timestamp of this message
      await prisma.leadConversation.update({
        where: { id: lead.id },
        data: {
          status: "FOLLOWED_UP",
          followUpCount: { increment: 1 },
          lastFollowedUpAt: messageSentAt,
          ...(isStep1
            ? { firstFollowedUpAt: messageSentAt }
            : { secondFollowedUpAt: messageSentAt }),
        },
      });

      // Log success with exact distinct timestamp of this message
      await prisma.blastLog.create({
        data: {
          campaignId: campaign?.id || null,
          pageId: lead.pageId,
          leadId: lead.id,
          recipientPsid: lead.psid,
          recipientName: lead.customerName,
          messageSent: personalizedText,
          imageUrl: imageToUse,
          status: "DELIVERED",
          step: stepNumber,
          sentAt: messageSentAt,
        },
      });

      report.details.push({
        leadId: lead.id,
        customerName: lead.customerName,
        pageName: lead.page.name,
        recipientPsid: lead.psid,
        success: true,
        messageId: sendResult.messageId,
        mode: sendResult.mode,
        dripDelayApplied: appliedDelaySec,
        messageSent: personalizedText,
        step: stepNumber,
      });
    } else {
      report.failed++;
      const stepNumber = lead.followUpCount + 1;

      // Log failure with exact timestamp
      await prisma.blastLog.create({
        data: {
          campaignId: campaign?.id || null,
          pageId: lead.pageId,
          leadId: lead.id,
          recipientPsid: lead.psid,
          recipientName: lead.customerName,
          messageSent: personalizedText,
          imageUrl: imageToUse,
          status: "FAILED",
          step: stepNumber,
          errorMessage: sendResult.error,
          sentAt: messageSentAt,
        },
      });

      report.details.push({
        leadId: lead.id,
        customerName: lead.customerName,
        pageName: lead.page.name,
        recipientPsid: lead.psid,
        success: false,
        error: sendResult.error,
        mode: sendResult.mode,
        dripDelayApplied: appliedDelaySec,
        messageSent: personalizedText,
        step: lead.followUpCount + 1,
      });
    }
  }

  // Update campaign lastRunAt
  if (campaign) {
    await prisma.followUpCampaign.update({
      where: { id: campaign.id },
      data: { lastRunAt: now },
    });
  }

  return report;
}
