import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export interface ResponseRuleItem {
  id: string;
  name: string;
  businessName?: string;
  pageId?: string;
  isActive: boolean;
  priority: number;
  triggerType: "KEYWORD" | "ATTACHMENT" | "CLICK_POSTPONE" | "AD_REFERRAL" | "DEFAULT_FALLBACK";

  // 1/ Keyword Catch (English and Khmer)
  keywords: string[];
  keywordMatchType: "contains" | "exact" | "regex";

  // 2/ Attachment Received (Image, VDO, Voice, etc.)
  attachmentTypes: ("image" | "video" | "audio" | "file")[];

  // 3/ Anti-Spam / Click Postpone Rule
  clickPostponeConfig?: {
    maxClicksWithoutResponse: number;
    postponeHours: number;
    actionOnTrigger: "postpone_and_mute" | "postpone_and_notify_agent" | "send_cooldown_message";
    cooldownMessageTemplateId?: string;
  };

  // 4/ Ad Referral Hook
  adSourcePattern?: string;

  // Target Template
  targetTemplateId: string;

  // Execution stats
  triggerCount: number;
  lastTriggeredAt?: string;
  createdAt: string;
}

// Default Out-of-the-Box Response Rules matching user prompt specifications
export const DEFAULT_RULES: ResponseRuleItem[] = [
  {
    id: "rule_keyword_price",
    name: "Price Inquiries (English & Khmer)",
    businessName: "SieLab Retail Group",
    pageId: "ALL",
    isActive: true,
    priority: 1,
    triggerType: "KEYWORD",
    keywords: ["price", "how much", "cost", "តម្លៃ", "ថ្លៃប៉ុន្មាន", "ប៉ុន្មាន", "លក់ប៉ុន្មាន"],
    keywordMatchType: "contains",
    attachmentTypes: [],
    targetTemplateId: "tmpl_price_khmer",
    triggerCount: 42,
    lastTriggeredAt: new Date(Date.now() - 1000 * 60 * 18).toISOString(),
    createdAt: new Date().toISOString(),
  },
  {
    id: "rule_attachment_slip",
    name: "Payment Slip & Photo Received",
    businessName: "SieLab Retail Group",
    pageId: "ALL",
    isActive: true,
    priority: 2,
    triggerType: "ATTACHMENT",
    keywords: [],
    keywordMatchType: "contains",
    attachmentTypes: ["image"],
    targetTemplateId: "tmpl_payment_slip",
    triggerCount: 19,
    lastTriggeredAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    createdAt: new Date().toISOString(),
  },
  {
    id: "rule_click_postpone",
    name: "Anti-Spam Click Fatigue Postpone (3 clicks -> 3h cooldown)",
    businessName: "SieLab Retail Group",
    pageId: "ALL",
    isActive: true,
    priority: 3,
    triggerType: "CLICK_POSTPONE",
    keywords: [],
    keywordMatchType: "contains",
    attachmentTypes: [],
    clickPostponeConfig: {
      maxClicksWithoutResponse: 3,
      postponeHours: 3.0,
      actionOnTrigger: "postpone_and_notify_agent",
      cooldownMessageTemplateId: "tmpl_click_cooldown",
    },
    targetTemplateId: "tmpl_click_cooldown",
    triggerCount: 6,
    lastTriggeredAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    createdAt: new Date().toISOString(),
  },
  {
    id: "rule_attachment_voice",
    name: "Customer Voice Note Received",
    businessName: "SieLab Retail Group",
    pageId: "ALL",
    isActive: true,
    priority: 4,
    triggerType: "ATTACHMENT",
    keywords: [],
    keywordMatchType: "contains",
    attachmentTypes: ["audio"],
    targetTemplateId: "tmpl_voice_memo",
    triggerCount: 8,
    lastTriggeredAt: new Date(Date.now() - 1000 * 60 * 95).toISOString(),
    createdAt: new Date().toISOString(),
  },
  {
    id: "rule_keyword_location",
    name: "Store Location & Branches (ទីតាំងហាង)",
    businessName: "SieLab Retail Group",
    pageId: "ALL",
    isActive: true,
    priority: 5,
    triggerType: "KEYWORD",
    keywords: ["location", "where", "address", "branch", "ទីតាំង", "នៅឯណា", "សាខា", "ផែនទី"],
    keywordMatchType: "contains",
    attachmentTypes: [],
    targetTemplateId: "tmpl_location_khmer",
    triggerCount: 15,
    lastTriggeredAt: new Date(Date.now() - 1000 * 60 * 150).toISOString(),
    createdAt: new Date().toISOString(),
  },
];

export async function GET(req: NextRequest) {
  const unauthorized = await requireAdminAuth(req);
  if (unauthorized) return unauthorized;

  try {
    const { searchParams } = new URL(req.url);
    const business = searchParams.get("businessName") || "SieLab Retail Group";
    const settingKey = `response_rules_${business.replace(/[^a-zA-Z0-9_-]/g, "_")}`;

    const setting = await prisma.systemSetting.findUnique({
      where: { key: settingKey },
    });

    let rules: ResponseRuleItem[] = DEFAULT_RULES;
    if (setting && setting.value) {
      try {
        const parsed = JSON.parse(setting.value);
        if (Array.isArray(parsed) && parsed.length > 0) {
          rules = parsed;
        }
      } catch {}
    } else {
      await prisma.systemSetting.upsert({
        where: { key: settingKey },
        update: { value: JSON.stringify(DEFAULT_RULES) },
        create: {
          key: settingKey,
          value: JSON.stringify(DEFAULT_RULES),
          description: `Response Rules for ${business}`,
        },
      });
    }

    return NextResponse.json({
      success: true,
      rules,
    });
  } catch (err: any) {
    console.error("GET response rules error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to fetch rules" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const unauthorized = await requireAdminAuth(req);
  if (unauthorized) return unauthorized;

  try {
    const body = await req.json();
    const rule: ResponseRuleItem = body.rule;
    const business = body.businessName || rule?.businessName || "SieLab Retail Group";
    const settingKey = `response_rules_${business.replace(/[^a-zA-Z0-9_-]/g, "_")}`;

    if (!rule || !rule.name) {
      return NextResponse.json(
        { success: false, error: "Rule data and name are required." },
        { status: 400 }
      );
    }

    const setting = await prisma.systemSetting.findUnique({
      where: { key: settingKey },
    });

    let list: ResponseRuleItem[] = DEFAULT_RULES;
    if (setting && setting.value) {
      try {
        list = JSON.parse(setting.value);
      } catch {}
    }

    const ruleToSave: ResponseRuleItem = {
      ...rule,
      id: rule.id || `rule_${Date.now()}`,
      triggerCount: rule.triggerCount || 0,
      createdAt: rule.createdAt || new Date().toISOString(),
    };

    const existingIndex = list.findIndex((r) => r.id === ruleToSave.id);
    if (existingIndex >= 0) {
      list[existingIndex] = ruleToSave;
    } else {
      list.unshift(ruleToSave);
    }

    await prisma.systemSetting.upsert({
      where: { key: settingKey },
      update: { value: JSON.stringify(list) },
      create: {
        key: settingKey,
        value: JSON.stringify(list),
        description: `Response Rules for ${business}`,
      },
    });

    return NextResponse.json({
      success: true,
      rule: ruleToSave,
      rules: list,
    });
  } catch (err: any) {
    console.error("POST response rule error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to save rule" },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  const unauthorized = await requireAdminAuth(req);
  if (unauthorized) return unauthorized;

  try {
    const body = await req.json();
    const { id, isActive, priority, businessName } = body;
    const business = businessName || "SieLab Retail Group";
    const settingKey = `response_rules_${business.replace(/[^a-zA-Z0-9_-]/g, "_")}`;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Rule ID required." },
        { status: 400 }
      );
    }

    const setting = await prisma.systemSetting.findUnique({
      where: { key: settingKey },
    });

    let list: ResponseRuleItem[] = DEFAULT_RULES;
    if (setting && setting.value) {
      try {
        list = JSON.parse(setting.value);
      } catch {}
    }

    list = list.map((r) => {
      if (r.id === id) {
        return {
          ...r,
          ...(isActive !== undefined ? { isActive } : {}),
          ...(priority !== undefined ? { priority } : {}),
        };
      }
      return r;
    });

    await prisma.systemSetting.upsert({
      where: { key: settingKey },
      update: { value: JSON.stringify(list) },
      create: {
        key: settingKey,
        value: JSON.stringify(list),
        description: `Response Rules for ${business}`,
      },
    });

    return NextResponse.json({
      success: true,
      rules: list,
    });
  } catch (err: any) {
    console.error("PUT response rule error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to update rule" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  const unauthorized = await requireAdminAuth(req);
  if (unauthorized) return unauthorized;

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const business = searchParams.get("businessName") || "SieLab Retail Group";
    const settingKey = `response_rules_${business.replace(/[^a-zA-Z0-9_-]/g, "_")}`;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Rule ID is required." },
        { status: 400 }
      );
    }

    const setting = await prisma.systemSetting.findUnique({
      where: { key: settingKey },
    });

    let list: ResponseRuleItem[] = DEFAULT_RULES;
    if (setting && setting.value) {
      try {
        list = JSON.parse(setting.value);
      } catch {}
    }

    list = list.filter((r) => r.id !== id);

    await prisma.systemSetting.upsert({
      where: { key: settingKey },
      update: { value: JSON.stringify(list) },
      create: {
        key: settingKey,
        value: JSON.stringify(list),
        description: `Response Rules for ${business}`,
      },
    });

    return NextResponse.json({
      success: true,
      rules: list,
    });
  } catch (err: any) {
    console.error("DELETE response rule error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to delete rule" },
      { status: 500 }
    );
  }
}
