import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Facebook Messenger Webhook verification endpoint (GET)
 * Meta calls this with hub.mode, hub.verify_token, and hub.challenge
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  const setting = await prisma.systemSetting.findUnique({
    where: { key: "WEBHOOK_VERIFY_TOKEN" },
  });
  const expectedToken = setting?.value || "sielab_reach_verify_token_2026";

  if (mode === "subscribe" && token === expectedToken) {
    console.log("Meta Webhook verified successfully!");
    return new NextResponse(challenge, { status: 200 });
  }

  return new NextResponse("Forbidden - Verification Token Mismatch", { status: 403 });
}

/**
 * Facebook Messenger Webhook event receiver (POST)
 * Receives incoming customer messages, postbacks, deliveries
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (body.object === "page") {
      for (const entry of body.entry) {
        const pageId = entry.id;

        if (entry.messaging) {
          for (const event of entry.messaging) {
            const senderPsid = event.sender?.id;

            // Helper to determine message text or media type
            const resolveEventText = (msg: any): string => {
              if (msg.text && msg.text.trim()) return msg.text.trim();
              if (msg.attachments && msg.attachments.length > 0) {
                const attType = msg.attachments[0]?.type;
                if (attType === "audio") return "🎙️ Voice message";
                if (attType === "image") return "📷 Photo";
                if (attType === "video") return "🎬 Video";
                return "📎 Attachment";
              }
              return "No text message";
            };

            // Inbound message from customer
            if (event.message && !event.message.is_echo) {
              const text = resolveEventText(event.message);

              const now = new Date();
              const existingLead = await prisma.leadConversation.findUnique({
                where: {
                  pageId_psid: {
                    pageId,
                    psid: senderPsid,
                  },
                },
              });

              const wasFollowedUp = existingLead && existingLead.followUpCount > 0;
              const stepReplied = wasFollowedUp ? existingLead.followUpCount : null;

              // Update lead conversation
              await prisma.leadConversation.upsert({
                where: {
                  pageId_psid: {
                    pageId,
                    psid: senderPsid,
                  },
                },
                update: {
                  lastCustomerMessage: text,
                  lastCustomerMessageAt: now,
                  status: "REPLIED",
                  ...(wasFollowedUp ? { repliedAt: now, repliedAfterStep: stepReplied } : {}),
                },
                create: {
                  pageId,
                  psid: senderPsid,
                  customerName: `Customer (${senderPsid.slice(-4)})`,
                  lastCustomerMessage: text,
                  lastCustomerMessageAt: now,
                  lastAgentMessage: "Awaiting initial agent response",
                  lastAgentMessageAt: now,
                  status: "AWAITING_CUSTOMER",
                },
              });

              // Mark latest delivered BlastLog with respondedAt
              if (wasFollowedUp) {
                const latestLog = await prisma.blastLog.findFirst({
                  where: {
                    pageId,
                    recipientPsid: senderPsid,
                    status: "DELIVERED",
                    respondedAt: null,
                  },
                  orderBy: { sentAt: "desc" },
                });
                if (latestLog) {
                  await prisma.blastLog.update({
                    where: { id: latestLog.id },
                    data: { respondedAt: now },
                  });
                }
              }
            } else if (event.message && event.message.is_echo) {
              // Outbound reply sent by human sales rep or automated agent from Meta Business Suite / Messenger
              const recipientPsid = event.recipient?.id;
              if (recipientPsid) {
                const agentText = resolveEventText(event.message);
                const now = new Date();

                await prisma.leadConversation.updateMany({
                  where: {
                    pageId,
                    psid: recipientPsid,
                  },
                  data: {
                    lastAgentMessage: agentText,
                    lastAgentMessageAt: now,
                    status: "AWAITING_CUSTOMER",
                  },
                });
              }
            }
          }
        }
      }

      return NextResponse.json({ status: "EVENT_RECEIVED" });
    }

    return new NextResponse("Not Found", { status: 404 });
  } catch (err: any) {
    console.error("Webhook processing error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
