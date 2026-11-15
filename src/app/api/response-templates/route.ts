import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export interface ResponseTemplateItem {
  id: string;
  name: string;
  description: string;
  format: "button" | "generic_card" | "voice_note" | "quick_replies" | "image_text" | "custom_json";
  jsonPayload: string;
  businessName?: string;
  updatedAt: string;
}

// Initial Rich Default Templates
export const DEFAULT_TEMPLATES: ResponseTemplateItem[] = [
  {
    id: "tmpl_price_khmer",
    name: "Price & Catalog Card (តម្លៃទំនិញ)",
    description: "Instant response for price inquiries in English and Khmer with direct order link",
    format: "generic_card",
    jsonPayload: JSON.stringify(
      {
        message: {
          attachment: {
            type: "template",
            payload: {
              template_type: "generic",
              elements: [
                {
                  title: "Signature Heavyweight Hoodie ($28 / 112,000៛)",
                  image_url:
                    "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=800&auto=format&fit=crop&q=80",
                  subtitle: "100% Premium Cotton. Promotion: Free delivery in Phnom Penh today!",
                  buttons: [
                    {
                      type: "web_url",
                      url: "https://sielab.shop/hoodie",
                      title: "Order Online",
                    },
                    {
                      type: "postback",
                      title: "Check Sizes (M-XXL)",
                      payload: "CHECK_SIZES",
                    },
                  ],
                },
              ],
            },
          },
        },
      },
      null,
      2
    ),
    businessName: "SieLab Retail Group",
    updatedAt: new Date().toISOString(),
  },
  {
    id: "tmpl_payment_slip",
    name: "Payment Slip Acknowledged (វិក្កយបត្រ)",
    description: "Triggered automatically when customer uploads payment receipt or ABA QR slip",
    format: "button",
    jsonPayload: JSON.stringify(
      {
        message: {
          attachment: {
            type: "template",
            payload: {
              template_type: "button",
              text: "✅ អរគុណច្រើនបង! យើងខ្ញុំបានទទួលរូបភាពវិក្កយបត្រ / Payment Slip រួចរាល់ហើយ។ ក្រុមការងារកំពុងផ្ទៀងផ្ទាត់ និងរៀបចំឥវ៉ាន់ជូនបងភ្លាមៗ!",
              buttons: [
                {
                  type: "web_url",
                  url: "https://sielab.shop/orders/tracking",
                  title: "Track Delivery Status",
                },
                {
                  type: "phone_number",
                  title: "📞 Call Urgent Desk",
                  payload: "+85512888999",
                },
              ],
            },
          },
        },
      },
      null,
      2
    ),
    businessName: "SieLab Retail Group",
    updatedAt: new Date().toISOString(),
  },
  {
    id: "tmpl_voice_memo",
    name: "Founder Welcome Voice Note",
    description: "Native playable voice note played when voice memo or VIP greeting is needed",
    format: "voice_note",
    jsonPayload: JSON.stringify(
      {
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
      null,
      2
    ),
    businessName: "SieLab Retail Group",
    updatedAt: new Date().toISOString(),
  },
  {
    id: "tmpl_location_khmer",
    name: "Store Location & Hours (ទីតាំងហាង)",
    description: "Triggered when audience asks for address, Google Map or branch location",
    format: "button",
    jsonPayload: JSON.stringify(
      {
        message: {
          attachment: {
            type: "template",
            payload: {
              template_type: "button",
              text: "📍 ទីតាំងហាងយើងខ្ញុំ៖ មហាវិថីព្រះមុនីវង្ស រាជធានីភ្នំពេញ (បើកពីម៉ោង 9:00 AM - 9:00 PM រៀងរាល់ថ្ងៃ)។ បងអាចចុចមើលទីតាំងលើ Google Maps បាន៖",
              buttons: [
                {
                  type: "web_url",
                  url: "https://maps.google.com/?q=Phnom+Penh",
                  title: "🗺️ Open Google Maps",
                },
                {
                  type: "phone_number",
                  title: "📞 Call Store Branch",
                  payload: "+85512888999",
                },
              ],
            },
          },
        },
      },
      null,
      2
    ),
    businessName: "SieLab Retail Group",
    updatedAt: new Date().toISOString(),
  },
  {
    id: "tmpl_click_cooldown",
    name: "Click Fatigue Postpone Notice",
    description: "Sent when customer clicks repeatedly without text, notifying of human review",
    format: "quick_replies",
    jsonPayload: JSON.stringify(
      {
        message: {
          text: "We noticed you might be looking for something specific! Our team specialist has been notified and will assist you shortly. In the meantime, how can we help?",
          quick_replies: [
            {
              content_type: "text",
              title: "💬 Chat with Human",
              payload: "URGENT_AGENT",
            },
            {
              content_type: "text",
              title: "📞 Request Call Back",
              payload: "REQUEST_CALL",
            },
          ],
        },
      },
      null,
      2
    ),
    businessName: "SieLab Retail Group",
    updatedAt: new Date().toISOString(),
  },
];

export async function GET(req: NextRequest) {
  const unauthorized = await requireAdminAuth(req);
  if (unauthorized) return unauthorized;

  try {
    const { searchParams } = new URL(req.url);
    const business = searchParams.get("businessName") || "SieLab Retail Group";
    const settingKey = `response_templates_${business.replace(/[^a-zA-Z0-9_-]/g, "_")}`;

    const setting = await prisma.systemSetting.findUnique({
      where: { key: settingKey },
    });

    let templates: ResponseTemplateItem[] = DEFAULT_TEMPLATES;
    if (setting && setting.value) {
      try {
        const parsed = JSON.parse(setting.value);
        if (Array.isArray(parsed) && parsed.length > 0) {
          templates = parsed;
        }
      } catch {}
    } else {
      // Seed default templates to system settings for future edits
      await prisma.systemSetting.upsert({
        where: { key: settingKey },
        update: { value: JSON.stringify(DEFAULT_TEMPLATES) },
        create: {
          key: settingKey,
          value: JSON.stringify(DEFAULT_TEMPLATES),
          description: `Response Templates for ${business}`,
        },
      });
    }

    return NextResponse.json({
      success: true,
      templates,
    });
  } catch (err: any) {
    console.error("GET response templates error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to fetch templates" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const unauthorized = await requireAdminAuth(req);
  if (unauthorized) return unauthorized;

  try {
    const body = await req.json();
    const template: ResponseTemplateItem = body.template;
    const business = body.businessName || template?.businessName || "SieLab Retail Group";
    const settingKey = `response_templates_${business.replace(/[^a-zA-Z0-9_-]/g, "_")}`;

    if (!template || !template.name) {
      return NextResponse.json(
        { success: false, error: "Template data and name are required." },
        { status: 400 }
      );
    }

    const setting = await prisma.systemSetting.findUnique({
      where: { key: settingKey },
    });

    let list: ResponseTemplateItem[] = DEFAULT_TEMPLATES;
    if (setting && setting.value) {
      try {
        list = JSON.parse(setting.value);
      } catch {}
    }

    const templateToSave = {
      ...template,
      id: template.id || `tmpl_${Date.now()}`,
      updatedAt: new Date().toISOString(),
    };

    const existingIndex = list.findIndex((t) => t.id === templateToSave.id);
    if (existingIndex >= 0) {
      list[existingIndex] = templateToSave;
    } else {
      list.unshift(templateToSave);
    }

    await prisma.systemSetting.upsert({
      where: { key: settingKey },
      update: { value: JSON.stringify(list) },
      create: {
        key: settingKey,
        value: JSON.stringify(list),
        description: `Response Templates for ${business}`,
      },
    });

    return NextResponse.json({
      success: true,
      template: templateToSave,
      templates: list,
    });
  } catch (err: any) {
    console.error("POST response template error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to save template" },
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
    const settingKey = `response_templates_${business.replace(/[^a-zA-Z0-9_-]/g, "_")}`;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Template ID is required for deletion." },
        { status: 400 }
      );
    }

    const setting = await prisma.systemSetting.findUnique({
      where: { key: settingKey },
    });

    let list: ResponseTemplateItem[] = DEFAULT_TEMPLATES;
    if (setting && setting.value) {
      try {
        list = JSON.parse(setting.value);
      } catch {}
    }

    list = list.filter((t) => t.id !== id);

    await prisma.systemSetting.upsert({
      where: { key: settingKey },
      update: { value: JSON.stringify(list) },
      create: {
        key: settingKey,
        value: JSON.stringify(list),
        description: `Response Templates for ${business}`,
      },
    });

    return NextResponse.json({
      success: true,
      templates: list,
    });
  } catch (err: any) {
    console.error("DELETE response template error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to delete template" },
      { status: 500 }
    );
  }
}
