import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const settingsList = await prisma.systemSetting.findMany();
    const settings: Record<string, string> = {};
    for (const item of settingsList) {
      settings[item.key] = item.value;
    }

    return NextResponse.json({
      success: true,
      settings: {
        MOCK_MODE: settings["MOCK_MODE"] ?? "true",
        META_APP_ID: settings["META_APP_ID"] ?? "",
        META_APP_SECRET: settings["META_APP_SECRET"] ?? "",
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
