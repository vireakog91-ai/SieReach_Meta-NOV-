import { NextRequest, NextResponse } from "next/server";
import { deliverPost } from "@/lib/schedulerEngine";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Reset status to SCHEDULED before retrying
    await prisma.scheduledPost.update({
      where: { id },
      data: { status: "SCHEDULED" },
    });

    const result = await deliverPost(id, { force: true });

    return NextResponse.json({
      success: result.success,
      delivered: result.delivered,
      failed: result.failed,
      errors: result.errors,
      message: result.success
        ? `Retry succeeded! Broadcast to ${result.delivered} channel(s).`
        : `Retry completed with errors: ${result.errors.join(", ")}`,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
