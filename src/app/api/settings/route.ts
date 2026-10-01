import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminAuth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const unauthorized = await requireAdminAuth(req);
  if (unauthorized) return unauthorized;

  try {
    const settingsList = await prisma.systemSetting.findMany();
    const settings: Record<string, string> = {};
    for (const item of settingsList) {
      settings[item.key] = item.value;
    }

    const rawSecret = settings["META_APP_SECRET"] ?? "";
    const maskedSecret = rawSecret ? "••••••••••••••••" : "";

    return NextResponse.json({
      success: true,
      settings: {
        MOCK_MODE: settings["MOCK_MODE"] ?? "true",
        META_APP_ID: settings["META_APP_ID"] ?? "",
        META_APP_SECRET: maskedSecret,
        HAS_APP_SECRET: Boolean(rawSecret),
        WEBHOOK_VERIFY_TOKEN: settings["WEBHOOK_VERIFY_TOKEN"] ?? "sielab_reach_verify_token_2026",
        REPORT_AOV: settings["REPORT_AOV"] ?? "45",
      },
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

    const allowedKeys = [
      "MOCK_MODE",
      "META_APP_ID",
      "META_APP_SECRET",
      "WEBHOOK_VERIFY_TOKEN",
      "REPORT_AOV",
    ];

    for (const key of allowedKeys) {
      if (body[key] !== undefined) {
        // If user submitted the masked placeholder for META_APP_SECRET, skip updating it
        if (key === "META_APP_SECRET" && String(body[key]).includes("••")) {
          continue;
        }

        await prisma.systemSetting.upsert({
          where: { key },
          update: { value: String(body[key]) },
          create: { key, value: String(body[key]) },
        });
      }
    }

    return NextResponse.json({ success: true, message: "Settings saved successfully." });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}

