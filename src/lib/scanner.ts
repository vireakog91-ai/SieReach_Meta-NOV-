import { prisma } from "./prisma";

export interface AnalyzedLead {
  id: string;
  pageId: string;
  pageName: string;
  pageAvatar?: string | null;
  businessName?: string;
  psid: string;
  customerName: string;
  customerAvatar?: string | null;
  adSource?: string | null;
  lastCustomerMessage: string;
  lastCustomerMessageAt: Date;
  lastAgentMessage: string;
  lastAgentMessageAt: Date;
  status: string;
  followUpCount: number;
  lastFollowedUpAt?: Date | null;
  // Computed metrics
  hoursSinceCustomer: number;
  hoursSinceAgent: number;
  hoursUnresponsive: number;
  hoursSinceLastFollowUp?: number | null;
  isCooldownActive?: boolean;
  within24h: boolean;
  windowRemainingHours: number;
  isEligibleForFollowUp: boolean;
  policyStatus: "VALID_24H" | "APPROACHING_DEADLINE" | "EXPIRED_REQUIRES_TAG";
}

export interface ScannerSummary {
  totalPages: number;
  totalLeads: number;
  awaitingCustomer: number;
  unresponsiveCount: number;
  urgent24hCount: number;
  expired24hCount: number;
  followedUpCount: number;
  leads: AnalyzedLead[];
}

/**
 * Sync live conversations from Meta Graph API for connected pages
 */
async function syncLiveConversations(pageIdFilter?: string | null) {
  try {
    const pages = await prisma.facebookPage.findMany({
      where: {
        isActive: true,
        ...(pageIdFilter ? { pageId: pageIdFilter } : {}),
      },
    });

    for (const page of pages) {
      if (!page.accessToken || page.accessToken.startsWith("EAAB_mock_")) continue;

      try {
        const url = `https://graph.facebook.com/v21.0/${page.pageId}/conversations?fields=id,updated_time,participants,messages.limit(10){id,message,from,created_time,attachments}&access_token=${encodeURIComponent(
          page.accessToken
        )}`;
        const res = await fetch(url);
        const data = await res.json();

        // Helper to format messages, attachments, and voice notes
        const formatMessageContent = (msgObj: any, fallback: string): string => {
          if (!msgObj) return fallback;
          if (msgObj.message && msgObj.message.trim()) return msgObj.message.trim();
          if (msgObj.attachments?.data?.length > 0) {
            const att = msgObj.attachments.data[0];
            const mime = att.mime_type || "";
            const name = att.name || "";
            if (mime.startsWith("audio/") || name.includes("audioclip") || name.endsWith(".mp4") || name.endsWith(".m4a")) {
              return "🎙️ Voice message";
            }
            if (mime.startsWith("image/")) {
              return "📷 Photo";
            }
            if (mime.startsWith("video/")) {
              return "🎬 Video";
            }
            return "📎 Attachment";
          }
          return fallback;
        };

        for (const conv of data.data || []) {
          const customer = (conv.participants?.data || []).find((p: any) => p.id !== page.pageId);
          if (!customer) continue;

          const messages = conv.messages?.data || [];
          const customerMsg = messages.find((m: any) => m.from?.id === customer.id);
          const agentMsg = messages.find((m: any) => m.from?.id === page.pageId);

          const custText = formatMessageContent(customerMsg, "No text message");
          const custTime = customerMsg?.created_time
            ? new Date(customerMsg.created_time)
            : new Date(conv.updated_time);
          const hasAgentReplied = Boolean(agentMsg);
          const agentText = formatMessageContent(agentMsg, "Awaiting initial agent response");
          const agentTime = agentMsg?.created_time
            ? new Date(agentMsg.created_time)
            : null;

          const existingLead = await prisma.leadConversation.findUnique({
            where: {
              pageId_psid: {
                pageId: page.pageId,
                psid: customer.id,
              },
            },
          });

          const wasFollowedUp = existingLead ? existingLead.followUpCount > 0 : false;
          const isCurrentlyFollowedUp = wasFollowedUp && !existingLead?.repliedAt;
          const stepReplied = existingLead?.followUpCount ?? null;
          // If we already received a newer customer message via live webhook, preserve it
          const isDbCustNewer =
            existingLead?.lastCustomerMessageAt &&
            existingLead.lastCustomerMessageAt.getTime() > custTime.getTime();
          const effectiveCustTime = isDbCustNewer ? existingLead.lastCustomerMessageAt : custTime;
          const effectiveCustText = isDbCustNewer ? existingLead.lastCustomerMessage : custText;

          // Determine status:
          // 1. If page/agent has never replied yet -> customer is awaiting agent response (AWAITING_AGENT)
          // 2. If customer message is strictly newer than agent message -> customer replied (REPLIED)
          // 3. If customer previously replied to a follow-up:
          //    - If agent has not replied since -> REPLIED
          //    - If human agent replied after customer -> active chat (AWAITING_CUSTOMER)
          // 4. If lead was followed up and hasn't replied yet -> FOLLOWED_UP
          // 5. Otherwise -> AWAITING_CUSTOMER
          let status = "AWAITING_CUSTOMER";
          let customerHasReplied = false;

          const hasCustomerRepliedToBlast = Boolean(
            effectiveCustTime && agentTime && effectiveCustTime.getTime() > agentTime.getTime()
          );

          if (!hasAgentReplied) {
            status = "AWAITING_AGENT";
          } else if (hasCustomerRepliedToBlast) {
            status = "REPLIED";
            customerHasReplied = true;
          } else if (existingLead?.repliedAt) {
            const agentRepliedAfterCustomer = agentTime && agentTime.getTime() > existingLead.repliedAt.getTime();
            status = agentRepliedAfterCustomer ? "AWAITING_CUSTOMER" : "REPLIED";
          } else if (isCurrentlyFollowedUp) {
            status = "FOLLOWED_UP";
          } else {
            status = "AWAITING_CUSTOMER";
          }

          await prisma.leadConversation.upsert({
            where: {
              pageId_psid: {
                pageId: page.pageId,
                psid: customer.id,
              },
            },
            update: {
              customerName: customer.name,
              lastCustomerMessage: effectiveCustText,
              lastCustomerMessageAt: effectiveCustTime,
              lastAgentMessage: agentText,
              lastAgentMessageAt: agentTime || effectiveCustTime,
              status,
              ...(customerHasReplied && wasFollowedUp ? { repliedAt: effectiveCustTime, repliedAfterStep: stepReplied } : {}),
            },
            create: {
              pageId: page.pageId,
              psid: customer.id,
              customerName: customer.name,
              lastCustomerMessage: effectiveCustText,
              lastCustomerMessageAt: effectiveCustTime,
              lastAgentMessage: agentText,
              lastAgentMessageAt: agentTime || effectiveCustTime,
              status,
              ...(customerHasReplied && wasFollowedUp ? { repliedAt: effectiveCustTime, repliedAfterStep: stepReplied } : {}),
            },
          });

          // Mark latest delivered BlastLog with respondedAt if followed-up customer replied
          if (customerHasReplied && wasFollowedUp) {
            const latestLog = await prisma.blastLog.findFirst({
              where: {
                pageId: page.pageId,
                recipientPsid: customer.id,
                status: "DELIVERED",
                respondedAt: null,
              },
              orderBy: { sentAt: "desc" },
            });
            if (latestLog) {
              await prisma.blastLog.update({
                where: { id: latestLog.id },
                data: { respondedAt: custTime },
              });
            }
          }
        }
      } catch (pageErr) {
        console.error(`Error syncing page ${page.pageId}:`, pageErr);
      }
    }
  } catch (err) {
    console.error("Error in syncLiveConversations:", err);
  }
}

/**
 * Scan conversations and detect inactive customers based on configured inactivity threshold
 */
export async function scanInactiveLeads(
  thresholdHours: number = 24.0,
  pageIdFilter?: string | null,
  skipSync: boolean = false
): Promise<ScannerSummary> {
  // Sync latest live conversations from Meta Graph API if active pages exist and not skipped
  if (!skipSync) {
    await syncLiveConversations(pageIdFilter);
  }

  const now = new Date();

  // Fetch leads with their corresponding page
  const leads = await prisma.leadConversation.findMany({
    where: {
      ...(pageIdFilter ? { pageId: pageIdFilter } : {}),
    },
    include: {
      page: true,
    },
    orderBy: {
      lastAgentMessageAt: "asc", // longest waiting first
    },
  });

  const totalPages = await prisma.facebookPage.count({
    where: { isActive: true },
  });

  let awaitingCustomer = 0;
  let unresponsiveCount = 0;
  let urgent24hCount = 0;
  let expired24hCount = 0;
  let followedUpCount = 0;

  const analyzedLeads: AnalyzedLead[] = leads.map((lead) => {
    const custTime = new Date(lead.lastCustomerMessageAt).getTime();
    const agentTime = new Date(lead.lastAgentMessageAt).getTime();
    const currentTime = now.getTime();

    // Elapsed hours
    const hoursSinceCustomer = Math.max(0, (currentTime - custTime) / (1000 * 60 * 60));
    const hoursSinceAgent = Math.max(0, (currentTime - agentTime) / (1000 * 60 * 60));
    
    // Unresponsive duration is the time elapsed since the sales rep replied and customer stayed quiet
    const hoursUnresponsive = hoursSinceAgent;

    // 24h Meta Window checks
    const within24h = hoursSinceCustomer <= 24.0;
    const windowRemainingHours = Math.max(0, 24.0 - hoursSinceCustomer);

    // Is the lead awaiting customer response?
    const isAwaiting = lead.status === "AWAITING_CUSTOMER";
    if (isAwaiting) awaitingCustomer++;
    if (lead.status === "FOLLOWED_UP") followedUpCount++;

    // Check if unresponsive matches or exceeds threshold
    const isOverThreshold = hoursUnresponsive >= thresholdHours;
    if (isAwaiting && isOverThreshold) {
      unresponsiveCount++;
    }

    // Check Meta 24-hour urgency
    let policyStatus: "VALID_24H" | "APPROACHING_DEADLINE" | "EXPIRED_REQUIRES_TAG" = "VALID_24H";
    if (!within24h) {
      policyStatus = "EXPIRED_REQUIRES_TAG";
      if (isAwaiting) expired24hCount++;
    } else if (windowRemainingHours <= 6) {
      policyStatus = "APPROACHING_DEADLINE";
      if (isAwaiting) urgent24hCount++;
    }

    // Lead is eligible if they haven't replied, exceed threshold, and are still AWAITING_CUSTOMER
    const isEligibleForFollowUp = isAwaiting && isOverThreshold;

    return {
      id: lead.id,
      pageId: lead.pageId,
      pageName: lead.page.name,
      pageAvatar: lead.page.avatarUrl,
      businessName: lead.page.businessName || (lead.pageId === "fb_page_05" ? "Moew Hospitality" : "SieLab Retail Group"),
      psid: lead.psid,
      customerName: lead.customerName,
      customerAvatar: lead.customerAvatar,
      adSource: lead.adSource,
      lastCustomerMessage: lead.lastCustomerMessage,
      lastCustomerMessageAt: lead.lastCustomerMessageAt,
      lastAgentMessage: lead.lastAgentMessage,
      lastAgentMessageAt: lead.lastAgentMessageAt,
      status: lead.status,
      followUpCount: lead.followUpCount,
      lastFollowedUpAt: lead.lastFollowedUpAt,
      hoursSinceCustomer: Number(hoursSinceCustomer.toFixed(1)),
      hoursSinceAgent: Number(hoursSinceAgent.toFixed(1)),
      hoursUnresponsive: Number(hoursUnresponsive.toFixed(1)),
      hoursSinceLastFollowUp: lead.lastFollowedUpAt
        ? Number(Math.max(0, (currentTime - new Date(lead.lastFollowedUpAt).getTime()) / (1000 * 60 * 60)).toFixed(1))
        : null,
      isCooldownActive: lead.lastFollowedUpAt
        ? (currentTime - new Date(lead.lastFollowedUpAt).getTime()) / (1000 * 60 * 60) < 3.0
        : false,
      within24h,
      windowRemainingHours: Number(windowRemainingHours.toFixed(1)),
      isEligibleForFollowUp,
      policyStatus,
    };
  });

  return {
    totalPages,
    totalLeads: leads.length,
    awaitingCustomer,
    unresponsiveCount,
    urgent24hCount,
    expired24hCount,
    followedUpCount,
    leads: analyzedLeads,
  };
}
