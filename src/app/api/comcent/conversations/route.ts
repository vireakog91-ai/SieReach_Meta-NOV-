import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminAuth } from "@/lib/auth";
import { DEFAULT_RULES, ResponseRuleItem } from "@/app/api/response-rules/route";
import { DEFAULT_TEMPLATES, ResponseTemplateItem } from "@/app/api/response-templates/route";
import { INITIAL_LEADS, INITIAL_PAGES } from "@/lib/mockData";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export interface ComcentMessageItem {
  id: string;
  sender: "customer" | "bot" | "commander";
  text?: string;
  templateId?: string;
  templateName?: string;
  templateFormat?: string;
  templatePayload?: any;
  attachmentType?: "none" | "image" | "audio" | "file";
  attachmentUrl?: string;
  attachmentName?: string;
  timestamp: string;
  isAutomated?: boolean;
  ruleBadge?: string;
}

export interface ComcentTakeoverInfo {
  isTakenOver: boolean;
  mode: "2h" | "7d" | "forever";
  expiresAt: string | null; // ISO string, or null if forever
  takenOverAt: string;
}

export interface ComcentConversationItem {
  id: string;
  pageId: string;
  pageName: string;
  businessName: string;
  psid: string;
  customerName: string;
  customerAvatar?: string;
  adSource?: string;
  lastMessage: string;
  lastMessageAt: string;
  status: "AWAITING_CUSTOMER" | "FOLLOWED_UP" | "REPLIED" | "CONVERTED" | "ATTENTION_NEEDED" | "NEEDS_COMMANDER";
  qualification: {
    isQualified: boolean;
    ruleId?: string;
    ruleName?: string;
    ruleType?: string;
    badgeText: string;
    badgeColor: "emerald" | "blue" | "purple" | "rose" | "amber" | "slate";
    needsCommander: boolean;
  };
  takeover?: ComcentTakeoverInfo;
  messages: ComcentMessageItem[];
  unreadCount: number;
}

export function isConversationTakenOver(conv?: ComcentConversationItem | null): boolean {
  if (!conv || !conv.takeover?.isTakenOver) return false;
  if (!conv.takeover.expiresAt) return true; // forever
  return new Date(conv.takeover.expiresAt).getTime() > Date.now();
}

const SETTING_KEY_CONVERSATIONS = "COMCENT_LIVE_CONVERSATIONS";

// Helper to determine Inbound Rule qualification
export function qualifyInboundMessage(
  text: string,
  attachmentType: "none" | "image" | "audio" | "video" = "none",
  rules: ResponseRuleItem[] = DEFAULT_RULES
): {
  isQualified: boolean;
  ruleId?: string;
  ruleName?: string;
  ruleType?: string;
  badgeText: string;
  badgeColor: "emerald" | "blue" | "purple" | "rose" | "amber" | "slate";
  needsCommander: boolean;
} {
  const norm = text.toLowerCase().trim();

  // 1. Check attachment rules
  if (attachmentType !== "none") {
    const attachRule = rules.find(
      (r) => r.isActive && r.triggerType === "ATTACHMENT" && r.attachmentTypes.includes(attachmentType as any)
    );
    if (attachRule) {
      return {
        isQualified: true,
        ruleId: attachRule.id,
        ruleName: attachRule.name,
        ruleType: "ATTACHMENT",
        badgeText: `Qualified: ${attachRule.name}`,
        badgeColor: "purple",
        needsCommander: false,
      };
    }
  }

  // 2. Check keyword catch (English & Khmer from custom rules)
  for (const rule of rules.filter((r) => r.isActive && r.triggerType === "KEYWORD")) {
    for (const kw of rule.keywords) {
      const kwNorm = kw.toLowerCase().trim();
      if (rule.keywordMatchType === "exact" ? norm === kwNorm : norm.includes(kwNorm)) {
        return {
          isQualified: true,
          ruleId: rule.id,
          ruleName: rule.name,
          ruleType: "KEYWORD",
          badgeText: `Qualified: ${rule.name.split("(")[0].trim()}`,
          badgeColor: "blue",
          needsCommander: false,
        };
      }
    }
  }

  // 3. Built-in Inbound Qualifications for Cambodian Commerce
  // A. Payment & KHQR
  if (["aba", "bakong", "khqr", "payment", "pay", "transfer", "bank", "លុយ", "បង់លុយ", "កុងធនាគារ"].some((k) => norm.includes(k))) {
    return {
      isQualified: true,
      ruleName: "Payment & ABA Transfer",
      ruleType: "KEYWORD",
      badgeText: "Qualified: Payment & QR",
      badgeColor: "emerald",
      needsCommander: false,
    };
  }

  // B. Delivery & Provinces
  if (["delivery", "shipping", "deliver", "ship", "courier", "ដឹក", "ផ្ញើ", "ដឹកជញ្ជូន", "ខេត្ត"].some((k) => norm.includes(k))) {
    return {
      isQualified: true,
      ruleName: "Delivery & Shipping",
      ruleType: "KEYWORD",
      badgeText: "Qualified: Delivery & Courier",
      badgeColor: "blue",
      needsCommander: false,
    };
  }

  // C. Stock, Color & Size
  if (["stock", "available", "color", "size", "មានអត់", "មានឥវ៉ាន់", "ខ្នាត", "ពណ៌"].some((k) => norm.includes(k))) {
    return {
      isQualified: true,
      ruleName: "Stock & Availability",
      ruleType: "KEYWORD",
      badgeText: "Qualified: Stock & Size",
      badgeColor: "purple",
      needsCommander: false,
    };
  }

  // 4. Fallback or Silent Bot Attention
  const fallbackRule = rules.find((r) => r.isActive && r.triggerType === "DEFAULT_FALLBACK");
  if (fallbackRule) {
    return {
      isQualified: true,
      ruleId: fallbackRule.id,
      ruleName: fallbackRule.name,
      ruleType: "DEFAULT_FALLBACK",
      badgeText: "Qualified: Catch-All Fallback",
      badgeColor: "emerald",
      needsCommander: false,
    };
  }

  return {
    isQualified: false,
    badgeText: "Awaiting Commander (Silent Bot)",
    badgeColor: "amber",
    needsCommander: true,
  };
}

// Generate rich default seed conversations from mock leads
export function generateSeedConversations(): ComcentConversationItem[] {
  return INITIAL_LEADS.map((lead, idx) => {
    const page = INITIAL_PAGES.find((p) => p.pageId === lead.pageId) || INITIAL_PAGES[0];
    const qual = qualifyInboundMessage(lead.lastCustomerMessage, idx === 1 ? "image" : "none");

    // Realistic status
    let convStatus: "AWAITING_CUSTOMER" | "NEEDS_COMMANDER" | "QUALIFIED" | "REPLIED" = "QUALIFIED";
    if (qual.needsCommander) {
      convStatus = "NEEDS_COMMANDER";
    } else if (idx === 0) {
      // First conversation: Commander has engaged and dispatched template
      convStatus = "REPLIED";
    } else {
      convStatus = "AWAITING_CUSTOMER";
    }

    const customerMsg: ComcentMessageItem = {
      id: `msg_cust_${idx}_1`,
      sender: "customer",
      text: lead.lastCustomerMessage,
      timestamp: new Date(Date.now() - lead.lastCustomerMessageHoursAgo * 3600 * 1000).toISOString(),
      attachmentType: idx === 1 ? "image" : "none",
      attachmentUrl:
        idx === 1
          ? "https://images.unsplash.com/photo-1554415707-9e49fe832807?w=600&auto=format&fit=crop&q=80"
          : undefined,
    };

    const msgs: ComcentMessageItem[] = [customerMsg];

    if (idx === 0) {
      // First conversation: Saphua Meng: show clean conversation flow
      msgs.push({
        id: `msg_cmd_${idx}_1`,
        sender: "commander",
        text: "Hello Saphua! Yes, black in 1010 is in stock. Would you like me to reserve one for your order today?",
        timestamp: new Date(Date.now() - (lead.lastCustomerMessageHoursAgo - 0.2) * 3600 * 1000).toISOString(),
        isAutomated: false,
      });

      // Sample generic card template message with full payload
      msgs.push({
        id: `msg_tmpl_${idx}_2`,
        sender: "commander",
        text: "",
        templateId: "tmpl_price_khmer",
        templateName: "Price & Catalog Card (High-top)",
        templatePayload: {
          message: {
            attachment: {
              type: "template",
              payload: {
                template_type: "generic",
                elements: [
                  {
                    title: "Saphua Heavyweight Hoodie (Soft / 100% Wool)",
                    subtitle: "100% Premium Cotton. Free delivery to Phnom Penh today.",
                    image_url: "https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=600&auto=format&fit=crop&q=80",
                    buttons: [
                      { type: "postback", title: "Order ($38)", payload: "ORDER_HOODIE_38" },
                      { type: "postback", title: "Check Sizes (M & XL)", payload: "CHECK_SIZES" },
                    ],
                  },
                ],
              },
            },
          },
        },
        timestamp: new Date(Date.now() - (lead.lastCustomerMessageHoursAgo - 0.4) * 3600 * 1000).toISOString(),
        isAutomated: false,
        ruleBadge: "1-Click Template",
      });
    } else if (idx === 2) {
      // Third conversation: Jessica Taylor: Show Commander voice dispatch flow
      convStatus = "REPLIED";
      msgs.push({
        id: `msg_cmd_${idx}_1`,
        sender: "commander",
        text: "Hi Jessica! Here is our founder's quick voice greeting and VIP order confirmation:",
        timestamp: new Date(Date.now() - (lead.lastCustomerMessageHoursAgo - 0.2) * 3600 * 1000).toISOString(),
        isAutomated: false,
      });

      msgs.push({
        id: `msg_tmpl_${idx}_2`,
        sender: "commander",
        text: "",
        templateId: "tmpl_voice_memo",
        templateName: "Founder Welcome Voice Note",
        attachmentType: "audio",
        attachmentUrl: "https://actions.google.com/sounds/v1/ambiences/coffee_shop.ogg",
        attachmentName: "Founder Welcome Voice Note (0:15s)",
        templatePayload: {
          message: {
            attachment: {
              type: "audio",
              payload: {
                url: "https://actions.google.com/sounds/v1/ambiences/coffee_shop.ogg",
                is_reusable: true,
              },
            },
          },
        },
        timestamp: new Date(Date.now() - (lead.lastCustomerMessageHoursAgo - 0.4) * 3600 * 1000).toISOString(),
        isAutomated: false,
        ruleBadge: "1-Click Template",
      });
    } else if (!qual.needsCommander) {
      // Bot auto-replied according to Response Rule
      msgs.push({
        id: `msg_bot_${idx}_2`,
        sender: "bot",
        text: lead.lastAgentMessage,
        timestamp: new Date(Date.now() - (lead.lastCustomerMessageHoursAgo - 0.1) * 3600 * 1000).toISOString(),
        isAutomated: true,
        ruleBadge: qual.ruleName,
      });
    }
    // If qual.needsCommander, bot stayed SILENT! Only customer message exists.

    const lastMsg = msgs[msgs.length - 1];
    let lastMsgText = lastMsg?.text || "";
    if (!lastMsgText) {
      if (lastMsg?.attachmentType === "audio") {
        lastMsgText = `[🎙️ Voice Note: ${lastMsg.attachmentName || lastMsg.templateName || "Voice Memo"}]`;
      } else if (lastMsg?.templateName) {
        lastMsgText = `[Dispatched: ${lastMsg.templateName}]`;
      } else {
        lastMsgText = "[Attachment]";
      }
    }

    return {
      id: `conv_${lead.pageId}_${lead.psid}`,
      pageId: lead.pageId,
      pageName: page.name,
      businessName: page.businessName || "SieLab Retail Group",
      psid: lead.psid,
      customerName: lead.customerName,
      customerAvatar: lead.customerAvatar,
      adSource: lead.adSource,
      lastMessage: lastMsgText,
      lastMessageAt: lastMsg?.timestamp || new Date().toISOString(),
      status: convStatus,
      qualification: {
        ...qual,
        badgeText: convStatus === "REPLIED" ? "✓ Responded (Commander)" : qual.badgeText,
        badgeColor: convStatus === "REPLIED" ? "emerald" : qual.badgeColor,
        needsCommander: convStatus === "NEEDS_COMMANDER",
      },
      messages: msgs,
      unreadCount: convStatus === "NEEDS_COMMANDER" ? 1 : 0,
    };
  });
}

async function loadConversations(): Promise<ComcentConversationItem[]> {
  try {
    const record = await prisma.systemSetting.findUnique({
      where: { key: SETTING_KEY_CONVERSATIONS },
    });
    if (record?.value) {
      const parsed = JSON.parse(record.value);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn("Could not load comcent conversations from DB:", err);
  }
  return generateSeedConversations();
}

async function saveConversations(convs: ComcentConversationItem[]): Promise<void> {
  try {
    await prisma.systemSetting.upsert({
      where: { key: SETTING_KEY_CONVERSATIONS },
      create: {
        key: SETTING_KEY_CONVERSATIONS,
        value: JSON.stringify(convs),
        description: "COMCENT Live Customer Communication Stream",
      },
      update: {
        value: JSON.stringify(convs),
      },
    });
  } catch (err) {
    console.error("Failed to save comcent conversations:", err);
  }
}

export async function GET(req: NextRequest) {
  const unauthorized = await requireAdminAuth(req);
  if (unauthorized) return unauthorized;

  try {
    const { searchParams } = new URL(req.url);
    const housePageIdsParam = searchParams.get("pageIds"); // Comma-separated or "ALL"
    const search = searchParams.get("search")?.toLowerCase().trim();

    let convs = await loadConversations();

    // Filter by House pageIds
    if (housePageIdsParam && housePageIdsParam !== "ALL") {
      const allowedPages = housePageIdsParam.split(",").map((p) => p.trim());
      convs = convs.filter((c) => allowedPages.includes(c.pageId));
    }

    // Filter by Search Query
    if (search) {
      convs = convs.filter(
        (c) =>
          c.customerName.toLowerCase().includes(search) ||
          c.lastMessage.toLowerCase().includes(search) ||
          c.pageName.toLowerCase().includes(search)
      );
    }

    return NextResponse.json({
      success: true,
      conversations: convs,
      total: convs.length,
      unreadTotal: convs.reduce((acc, c) => acc + (c.unreadCount > 0 ? 1 : 0), 0),
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const unauthorized = await requireAdminAuth(req);
  if (unauthorized) return unauthorized;

  try {
    const body = await req.json();
    const {
      conversationId,
      action, // "send_commander_message" | "send_template" | "simulate_inbound" | "mark_read"
      text,
      templateId,
      templateName,
      templatePayload,
      attachmentType,
      attachmentUrl,
      attachmentName,
    } = body;

    let convs = await loadConversations();
    const convIdx = convs.findIndex((c) => c.id === conversationId);

    if (convIdx < 0 && action !== "simulate_inbound" && action !== "reset_seed") {
      return NextResponse.json(
        { success: false, error: "Conversation not found" },
        { status: 404 }
      );
    }

    const now = new Date().toISOString();

    if (action === "send_commander_message") {
      // Manual text, file, or voice message sent by human Commander
      const newMsg: ComcentMessageItem = {
        id: `msg_cmd_${Date.now()}`,
        sender: "commander",
        text: text || "",
        attachmentType: attachmentType || "none",
        attachmentUrl: attachmentUrl || undefined,
        attachmentName: attachmentName || undefined,
        timestamp: now,
        isAutomated: false,
      };

      convs[convIdx].messages.push(newMsg);
      convs[convIdx].lastMessage = text || `[Sent ${attachmentType?.toUpperCase() || "Attachment"}]`;
      convs[convIdx].lastMessageAt = now;
      convs[convIdx].status = "REPLIED";
      convs[convIdx].unreadCount = 0;
      if (!isConversationTakenOver(convs[convIdx])) {
        convs[convIdx].qualification = {
          ...convs[convIdx].qualification,
          needsCommander: false,
          badgeText: "✓ Responded (Commander)",
          badgeColor: "emerald",
        };
      }
    } else if (action === "send_template") {
      // 1-Click Pre-setup JSON Template Dispatch from Response
      let resolvedPayload = templatePayload;
      let tmplFormat = "";
      if (templateId) {
        const tmpl = DEFAULT_TEMPLATES.find((t) => t.id === templateId);
        if (tmpl) {
          tmplFormat = tmpl.format;
          if (!resolvedPayload) {
            try {
              resolvedPayload = JSON.parse(tmpl.jsonPayload);
            } catch {
              resolvedPayload = { text: tmpl.description };
            }
          }
        }
      }

      let resolvedAttachmentType: ComcentMessageItem["attachmentType"] = undefined;
      let resolvedAttachmentUrl: string | undefined = undefined;
      let resolvedAttachmentName: string | undefined = undefined;

      const attachType = resolvedPayload?.message?.attachment?.type;
      const attachPayload = resolvedPayload?.message?.attachment?.payload;

      if (attachType === "audio" || tmplFormat === "voice_note" || (attachPayload?.url && String(attachPayload.url).includes(".ogg"))) {
        resolvedAttachmentType = "audio";
        resolvedAttachmentUrl = attachPayload?.url || "https://actions.google.com/sounds/v1/ambiences/coffee_shop.ogg";
        resolvedAttachmentName = templateName || "Founder Welcome Voice Note";
      } else if (attachType === "image" && attachPayload?.url) {
        resolvedAttachmentType = "image";
        resolvedAttachmentUrl = attachPayload.url;
        resolvedAttachmentName = templateName || "Image";
      }

      const templateText = resolvedPayload?.message?.text || resolvedPayload?.text || "";

      const newMsg: ComcentMessageItem = {
        id: `msg_tmpl_${Date.now()}`,
        sender: "commander",
        text: templateText,
        templateId,
        templateName,
        templateFormat: tmplFormat || undefined,
        templatePayload: resolvedPayload || undefined,
        attachmentType: resolvedAttachmentType,
        attachmentUrl: resolvedAttachmentUrl,
        attachmentName: resolvedAttachmentName,
        timestamp: now,
        isAutomated: false,
        ruleBadge: "1-Click Template",
      };

      convs[convIdx].messages.push(newMsg);
      convs[convIdx].lastMessage =
        resolvedAttachmentType === "audio"
          ? `[🎙️ Voice Note: ${templateName || "Voice Memo"}]`
          : tmplFormat === "quick_replies"
          ? `[⚡ Quick Reply: ${templateName || "Options"}]`
          : `[Dispatched: ${templateName || templateId}]`;
      convs[convIdx].lastMessageAt = now;
      convs[convIdx].status = "REPLIED";
      convs[convIdx].unreadCount = 0;
      if (!isConversationTakenOver(convs[convIdx])) {
        convs[convIdx].qualification = {
          ...convs[convIdx].qualification,
          needsCommander: false,
          badgeText: "✓ Responded (Commander)",
          badgeColor: "emerald",
        };
      }
    } else if (action === "set_takeover") {
      const shouldTakeover = Boolean(body.isTakenOver);
      const takeoverMode = (body.mode as "2h" | "7d" | "forever") || "2h";

      let expiresAt: string | null = null;
      if (shouldTakeover) {
        if (takeoverMode === "2h") {
          expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
        } else if (takeoverMode === "7d") {
          expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
        } else {
          expiresAt = null; // forever
        }

        convs[convIdx].takeover = {
          isTakenOver: true,
          mode: takeoverMode,
          expiresAt,
          takenOverAt: now,
        };

        convs[convIdx].qualification = {
          ...convs[convIdx].qualification,
          needsCommander: true,
          badgeText: `👤 Human Mode (${takeoverMode === "forever" ? "Forever" : takeoverMode.toUpperCase()})`,
          badgeColor: "amber",
        };

        convs[convIdx].messages.push({
          id: `msg_sys_takeover_${Date.now()}`,
          sender: "commander",
          text: `👤 Human Commander has taken over this conversation. All Bot Rules are paused (${
            takeoverMode === "2h" ? "for 2 hours" : takeoverMode === "7d" ? "for 7 days" : "indefinitely"
          }).`,
          timestamp: now,
          isAutomated: false,
          ruleBadge: `Bot Paused (${takeoverMode.toUpperCase()})`,
        });
      } else {
        // Resuming bot automation
        convs[convIdx].takeover = {
          isTakenOver: false,
          mode: "2h",
          expiresAt: null,
          takenOverAt: now,
        };

        const lastCustMsg = [...convs[convIdx].messages].reverse().find((m) => m.sender === "customer");
        if (lastCustMsg?.text) {
          convs[convIdx].qualification = qualifyInboundMessage(
            lastCustMsg.text,
            (lastCustMsg.attachmentType as any) || "none"
          );
        } else {
          convs[convIdx].qualification = {
            isQualified: false,
            badgeText: "🤖 Bot Automation Resumed",
            badgeColor: "blue",
            needsCommander: false,
          };
        }

        convs[convIdx].messages.push({
          id: `msg_sys_resume_${Date.now()}`,
          sender: "commander",
          text: `🤖 Human takeover released. Bot rules & automated flows have resumed for this customer.`,
          timestamp: now,
          isAutomated: false,
          ruleBadge: "Bot Resumed",
        });
      }
    } else if (action === "reset_seed") {
      convs = generateSeedConversations();
    } else if (action === "simulate_inbound") {
      // Simulate an incoming customer message to test Live View & Qualification
      const targetPageId = body.pageId || "fb_page_01";
      const targetPage = INITIAL_PAGES.find((p) => p.pageId === targetPageId) || INITIAL_PAGES[0];
      const incomingText = text || "តម្លៃប៉ុន្មានបង? (How much is this?)";
      const incomingAttach = attachmentType || "none";

      const targetConvId = conversationId || `conv_${targetPageId}_psid_live_${Date.now()}`;
      let targetConv = convs.find((c) => c.id === targetConvId);

      const isTakenOver = targetConv ? isConversationTakenOver(targetConv) : false;
      const qual = isTakenOver
        ? {
            isQualified: false,
            badgeText: `👤 Human Mode (${targetConv?.takeover?.mode === "forever" ? "Forever" : targetConv?.takeover?.mode?.toUpperCase()})`,
            badgeColor: "amber" as const,
            needsCommander: true,
          }
        : qualifyInboundMessage(incomingText, incomingAttach);

      const customerMsg: ComcentMessageItem = {
        id: `msg_inbound_${Date.now()}`,
        sender: "customer",
        text: incomingText,
        attachmentType: incomingAttach,
        attachmentUrl,
        timestamp: now,
      };

      if (targetConv) {
        targetConv.messages.push(customerMsg);
        targetConv.lastMessage = incomingText;
        targetConv.lastMessageAt = now;
        targetConv.qualification = qual;
        targetConv.unreadCount += 1;
        targetConv.status = isTakenOver ? "NEEDS_COMMANDER" : "AWAITING_CUSTOMER";
      } else {
        const newConv: ComcentConversationItem = {
          id: targetConvId,
          pageId: targetPageId,
          pageName: targetPage.name,
          businessName: targetPage.businessName || "SieLab Retail Group",
          psid: `psid_live_${Date.now()}`,
          customerName: body.customerName || "Vireak Roth (Live Inbound)",
          customerAvatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80",
          adSource: "Direct Live Messenger",
          lastMessage: incomingText,
          lastMessageAt: now,
          status: "AWAITING_CUSTOMER",
          qualification: qual,
          messages: [customerMsg],
          unreadCount: 1,
        };
        convs.unshift(newConv);
      }
    } else if (action === "mark_read") {
      convs[convIdx].unreadCount = 0;
    }

    await saveConversations(convs);

    return NextResponse.json({
      success: true,
      conversations: convs,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
