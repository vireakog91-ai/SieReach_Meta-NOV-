import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import {
  publishFacebookPostComment,
  sendFacebookPrivateReply,
} from "@/lib/facebook";
import { evaluateAdvanceScan, isVoiceMessage } from "@/lib/advanceScan";

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
 * Receives incoming customer messages, postbacks, deliveries.
 * Validates x-hub-signature-256 with META_APP_SECRET when configured.
 */
export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();

    // Verify Meta HMAC-SHA256 signature if App Secret is configured
    const settingSecret = await prisma.systemSetting.findUnique({
      where: { key: "META_APP_SECRET" },
    });
    const appSecret = settingSecret?.value || process.env.META_APP_SECRET;

    if (appSecret && appSecret.trim()) {
      const signatureHeader = req.headers.get("x-hub-signature-256");
      if (!signatureHeader || !signatureHeader.startsWith("sha256=")) {
        console.warn("Meta Webhook rejected: missing x-hub-signature-256 header");
        return new NextResponse("Forbidden: Missing Signature", { status: 403 });
      }

      const receivedSig = signatureHeader.substring(7);
      const expectedSig = crypto
        .createHmac("sha256", appSecret.trim())
        .update(rawBody)
        .digest("hex");

      try {
        const isMatch = crypto.timingSafeEqual(
          Buffer.from(receivedSig, "hex"),
          Buffer.from(expectedSig, "hex")
        );
        if (!isMatch) {
          console.warn("Meta Webhook rejected: invalid x-hub-signature-256 HMAC");
          return new NextResponse("Forbidden: Invalid Signature", { status: 403 });
        }
      } catch {
        return new NextResponse("Forbidden: Malformed Signature", { status: 403 });
      }
    }

    const body = JSON.parse(rawBody);

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

              // Extract ad referral data if lead arrived from a Meta Click-to-Messenger Ad
              const referral = event.referral || event.postback?.referral;
              const extractedAdSource =
                referral?.ads_context_data?.ad_title ||
                (referral?.ad_id ? `Meta Ad #${referral.ad_id}` : referral?.ref) ||
                null;

              // Evaluate Advance Scan: Phone Detection & Multi-Voice triggers
              const isVoice = isVoiceMessage(text) || event.message.attachments?.some((a: any) => a.type === "audio");
              const currentVoiceCount = (existingLead?.voiceCount || 0) + (isVoice ? 1 : 0);
              const currentTextCount = (existingLead?.textCount || 0) + (!isVoice ? 1 : 0);
              const advanceScanResult = evaluateAdvanceScan(
                [{ sender: "customer", text, attachmentType: isVoice ? "audio" : "none" }],
                {
                  lastCustomerMessage: text,
                  detectedPhone: existingLead?.detectedPhone,
                  voiceCount: currentVoiceCount,
                  textCount: currentTextCount,
                  orderValue: existingLead?.orderValue,
                }
              );

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
                  detectedPhone: advanceScanResult.detectedPhone,
                  detectedPhoneSnippet: advanceScanResult.detectedPhoneSnippet,
                  voiceCount: currentVoiceCount,
                  textCount: currentTextCount,
                  scanCategory: advanceScanResult.scanCategory,
                  scanFlags: JSON.stringify(advanceScanResult.scanFlags),
                  advanceScanAt: now,
                  ...(extractedAdSource && !existingLead?.adSource ? { adSource: extractedAdSource } : {}),
                  ...(wasFollowedUp ? { repliedAt: now, repliedAfterStep: stepReplied } : {}),
                },
                create: {
                  pageId,
                  psid: senderPsid,
                  customerName: `Customer (${senderPsid.slice(-4)})`,
                  adSource: extractedAdSource || "Meta Messenger Ad",
                  lastCustomerMessage: text,
                  lastCustomerMessageAt: now,
                  lastAgentMessage: "Awaiting initial agent response",
                  lastAgentMessageAt: now,
                  status: "AWAITING_CUSTOMER",
                  detectedPhone: advanceScanResult.detectedPhone,
                  detectedPhoneSnippet: advanceScanResult.detectedPhoneSnippet,
                  voiceCount: currentVoiceCount,
                  textCount: currentTextCount,
                  scanCategory: advanceScanResult.scanCategory,
                  scanFlags: JSON.stringify(advanceScanResult.scanFlags),
                  advanceScanAt: now,
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

        // Handle Feed changes (e.g. comments on posts for Comment-to-DM funnels)
        if (entry.changes && Array.isArray(entry.changes)) {
          for (const change of entry.changes) {
            if (
              change.field === "feed" &&
              change.value?.item === "comment" &&
              change.value?.verb === "add"
            ) {
              const commentVal = change.value;
              const commenterId = commentVal.from?.id;
              const commenterName = commentVal.from?.name || "Customer";
              const commentMessage = (commentVal.message || "").trim();
              const commentId = commentVal.comment_id;
              const rawPostId = commentVal.post_id;

              // Ignore if comment is made by the page itself (e.g. First-Comment)
              if (!commenterId || commenterId === pageId) {
                continue;
              }

              // Find associated CDC Post Target by metaPostId
              const matchingTargets = await prisma.cdcPostTarget.findMany({
                where: {
                  pageId,
                  OR: [
                    { metaPostId: rawPostId },
                    { metaPostId: rawPostId.includes("_") ? rawPostId.split("_")[1] : rawPostId },
                    { metaPostId: `${pageId}_${rawPostId}` },
                  ],
                },
                include: {
                  post: true,
                  page: true,
                },
              });

              const target = matchingTargets[0];
              if (!target || !target.post || !target.post.enableCommentToDm) {
                continue;
              }

              const requiredKeyword = (target.post.commentToDmKeyword || "ALL").trim().toLowerCase();
              const isMatch =
                requiredKeyword === "all" ||
                commentMessage.toLowerCase().includes(requiredKeyword);

              if (isMatch) {
                const now = new Date();
                const replacer = (tmpl: string) =>
                  tmpl
                    .replace(/\{\{name\}\}/gi, commenterName)
                    .replace(/\{\{page_name\}\}/gi, target.page.name)
                    .replace(/\{\{business_name\}\}/gi, target.post.businessName);

                // 1. Dispatch Public Reply to user comment if configured
                if (target.post.commentToDmReply && target.post.commentToDmReply.trim()) {
                  const replyText = replacer(target.post.commentToDmReply);
                  try {
                    await publishFacebookPostComment({
                      postId: commentId,
                      pageAccessToken: target.page.accessToken,
                      message: replyText,
                      isMockMode: false,
                    });
                  } catch (replyErr) {
                    console.warn(`[CDC Webhook] Failed to publish comment reply:`, replyErr);
                  }
                }

                // 2. Dispatch Private DM (Messenger) via recipient.comment_id if configured
                let sentDmText = "";
                if (target.post.commentToDmMiniBlast && target.post.commentToDmMiniBlast.trim()) {
                  sentDmText = replacer(target.post.commentToDmMiniBlast);
                  try {
                    await sendFacebookPrivateReply({
                      commentId,
                      pageAccessToken: target.page.accessToken,
                      message: sentDmText,
                      isMockMode: false,
                    });
                  } catch (dmErr) {
                    console.warn(`[CDC Webhook] Failed to send private reply DM:`, dmErr);
                  }
                }

                // 3. Upsert lead into LeadConversation CRM pipeline
                await prisma.leadConversation.upsert({
                  where: {
                    pageId_psid: {
                      pageId,
                      psid: commenterId,
                    },
                  },
                  update: {
                    customerName: commenterName,
                    lastCustomerMessage: `[Post Comment: "${commentMessage}"]`,
                    lastCustomerMessageAt: now,
                    lastAgentMessage: sentDmText ? `[Auto DM: "${sentDmText}"]` : "Automated Comment Reply",
                    lastAgentMessageAt: now,
                    status: "FOLLOWED_UP",
                  },
                  create: {
                    pageId,
                    psid: commenterId,
                    customerName: commenterName,
                    adSource: `CDC Post: ${target.post.title || "Social Post"}`,
                    lastCustomerMessage: `[Post Comment: "${commentMessage}"]`,
                    lastCustomerMessageAt: now,
                    lastAgentMessage: sentDmText ? `[Auto DM: "${sentDmText}"]` : "Automated Comment Reply",
                    lastAgentMessageAt: now,
                    status: "FOLLOWED_UP",
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
