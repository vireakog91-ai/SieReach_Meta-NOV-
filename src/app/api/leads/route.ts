import { NextRequest, NextResponse } from "next/server";
import { scanInactiveLeads } from "@/lib/scanner";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const thresholdHours = parseFloat(searchParams.get("thresholdHours") || "24.0");
    const pageId = searchParams.get("pageId") || null;

    const result = await scanInactiveLeads(thresholdHours, pageId);

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
