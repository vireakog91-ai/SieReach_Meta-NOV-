import { NextRequest, NextResponse } from "next/server";
import { deliverPost } from "@/lib/schedulerEngine";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await deliverPost(id, { force: true });

    return NextResponse.json({
      success: result.success,
      delivered: result.delivered,
      failed: result.failed,
      errors: result.errors,
      message: result.success
        ? `Successfully broadcast to ${result.delivered} channel(s)!`
        : `Failed to deliver post: ${result.errors.join(", ")}`,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
