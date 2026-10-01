import { NextRequest, NextResponse } from "next/server";
import { scanInactiveLeads } from "@/lib/scanner";
import { requireAdminAuth } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const unauthorized = await requireAdminAuth(req);
  if (unauthorized) return unauthorized;

  try {
    const body = await req.json().catch(() => ({}));
    const thresholdHours = parseFloat(body.thresholdHours || "24.0");
    const pageId = body.pageId || null;

    // Run inactive scan
    const scanResult = await scanInactiveLeads(thresholdHours, pageId);

    return NextResponse.json({
      success: true,
      message: `Scanned ${scanResult.totalPages} pages and ${scanResult.totalLeads} conversations.`,
      summary: {
        totalLeads: scanResult.totalLeads,
        unresponsiveCount: scanResult.unresponsiveCount,
        urgent24hCount: scanResult.urgent24hCount,
        expired24hCount: scanResult.expired24hCount,
      },
      data: scanResult,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
