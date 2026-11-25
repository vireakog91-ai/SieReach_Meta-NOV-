import { NextRequest, NextResponse } from "next/server";
import { deepScanConversations, DeepHistoricalScanOptions } from "@/lib/advanceScan";
import { requireAdminAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const maxDuration = 60;

const noCacheHeaders = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

export async function POST(req: NextRequest) {
  // 1. Safety Gate: Require Admin Authentication
  const unauthorized = await requireAdminAuth(req);
  if (unauthorized) return unauthorized;

  try {
    const body = await req.json().catch(() => ({}));

    // 2. Safety Gate: Require Explicit User Confirmation
    if (body.safetyGateConfirmed !== true) {
      return NextResponse.json(
        {
          success: false,
          error: "Safety Gate Block: You must explicitly authorize the safety gate before initiating historical deep scan.",
        },
        { status: 400, headers: noCacheHeaders }
      );
    }

    const options: DeepHistoricalScanOptions = {
      pageId: body.pageId || null,
      businessName: body.businessName || null,
      lookbackDays: typeof body.lookbackDays === "number" ? body.lookbackDays : 180, // Default: 6 months
      maxBatches: typeof body.maxBatches === "number" ? body.maxBatches : 35, // Default: up to 3,500 conversations
      throttleMs: typeof body.throttleMs === "number" ? body.throttleMs : 250, // Default: 250ms safety throttle
      safetyGateConfirmed: true,
    };

    const result = await deepScanConversations(options);

    return NextResponse.json(
      {
        success: true,
        message: `Historical Deep Scan completed! Crawled ${result.totalConversationsCrawled} conversations over ${result.lookbackDays} days. Extracted ${result.phoneNumbersExtracted} customer phone numbers into local database.`,
        data: result,
      },
      { headers: noCacheHeaders }
    );
  } catch (err: any) {
    console.error("Historical Deep Scan error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to execute historical deep scan" },
      { status: 500, headers: noCacheHeaders }
    );
  }
}
