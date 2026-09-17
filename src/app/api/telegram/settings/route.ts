import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const settings = await prisma.systemSetting.findMany();
    const settingsMap: Record<string, string> = {};
    settings.forEach((s) => {
      settingsMap[s.key] = s.value;
    });

    // Defaults if not set
    if (settingsMap["sandbox_mode"] === undefined) {
      settingsMap["sandbox_mode"] = "true";
    }
    if (settingsMap["timezone"] === undefined) {
      settingsMap["timezone"] = "Asia/Phnom_Penh";
    }

    return NextResponse.json({ success: true, settings: settingsMap });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Iterate through key-values and upsert
    for (const [key, value] of Object.entries(body)) {
      if (typeof value === "string" || typeof value === "boolean") {
        await prisma.systemSetting.upsert({
          where: { key },
          update: { value: String(value) },
          create: { key, value: String(value) },
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: "Settings updated successfully.",
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
