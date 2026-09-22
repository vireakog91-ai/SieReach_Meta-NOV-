import { NextRequest, NextResponse } from "next/server";
import { scanInactiveLeads } from "@/lib/scanner";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const thresholdHours = parseFloat(searchParams.get("thresholdHours") || "24.0");
    const pageId = searchParams.get("pageId") || null;
    const sync = searchParams.get("sync") === "true";

    // By default, query database directly for instant sub-50ms dashboard loading.
    // Full external Graph API crawl only runs on sync=true or manual scan.
    const result = await scanInactiveLeads(thresholdHours, pageId, !sync);

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
