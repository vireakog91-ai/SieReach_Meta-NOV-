import { NextRequest, NextResponse } from "next/server";
import { runAdvanceScan } from "@/lib/advanceScan";
import { requireAdminAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const noCacheHeaders = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

export async function GET(req: NextRequest) {
  const unauthorized = await requireAdminAuth(req);
  if (unauthorized) return unauthorized;

  try {
    const { searchParams } = new URL(req.url);
    const pageId = searchParams.get("pageId") || null;
    const businessName = searchParams.get("business") || null;
    const minVoiceCount = parseInt(searchParams.get("minVoiceCount") || "2", 10);
    const minTextCount = parseInt(searchParams.get("minTextCount") || "4", 10);

    const result = await runAdvanceScan({
      pageId,
      businessName,
      minVoiceCount,
      minTextCount,
      forceRescan: false,
    });

    return NextResponse.json(
      {
        success: true,
        data: result,
      },
      { headers: noCacheHeaders }
    );
  } catch (err: any) {
    console.error("Advance Scan GET error:", err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500, headers: noCacheHeaders }
    );
  }
}

export async function POST(req: NextRequest) {
  const unauthorized = await requireAdminAuth(req);
  if (unauthorized) return unauthorized;

  try {
    const body = await req.json().catch(() => ({}));
    const pageId = body.pageId || null;
    const businessName = body.businessName || null;
    const minVoiceCount = parseInt(body.minVoiceCount || "2", 10);
    const minTextCount = parseInt(body.minTextCount || "4", 10);

    const result = await runAdvanceScan({
      pageId,
      businessName,
      minVoiceCount,
      minTextCount,
      forceRescan: true,
    });

    return NextResponse.json(
      {
        success: true,
        message: `Chat Advance Scan completed! Scanned ${result.totalScanned} incoming conversations. Detected ${result.phoneDetectedCount} mobile phone(s) and ${result.multiVoiceCount} multi-voice inquiries.`,
        data: result,
      },
      { headers: noCacheHeaders }
    );
  } catch (err: any) {
    console.error("Advance Scan POST error:", err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500, headers: noCacheHeaders }
    );
  }
}
