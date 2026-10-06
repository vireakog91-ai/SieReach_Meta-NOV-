import { NextRequest, NextResponse } from "next/server";
import { scanInactiveLeads } from "@/lib/scanner";
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
    const thresholdHours = parseFloat(searchParams.get("thresholdHours") || "24.0");
    const pageId = searchParams.get("pageId") || null;
    const sync = searchParams.get("sync") === "true";

    // By default, query database directly for instant sub-50ms dashboard loading.
    // Full external Graph API crawl only runs on sync=true or manual scan.
    const result = await scanInactiveLeads(thresholdHours, pageId, !sync);

    return NextResponse.json(
      {
        success: true,
        data: result,
      },
      { headers: noCacheHeaders }
    );
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500, headers: noCacheHeaders }
    );
  }
}
