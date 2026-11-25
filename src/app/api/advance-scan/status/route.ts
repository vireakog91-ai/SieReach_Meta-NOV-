import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function PUT(req: NextRequest) {
  const unauthorized = await requireAdminAuth(req);
  if (unauthorized) return unauthorized;

  try {
    const body = await req.json();
    const {
      leadId,
      action, // "MARK_QUALIFIED" | "MARK_CONVERTED" | "RESET_STATUS" | "DISMISS"
      orderValue,
      customerAddress,
      notes,
      detectedPhone,
      qualificationReason,
    } = body;

    if (!leadId) {
      return NextResponse.json(
        { success: false, error: "Missing leadId" },
        { status: 400 }
      );
    }

    const existingLead = await prisma.leadConversation.findUnique({
      where: { id: leadId },
    });

    if (!existingLead) {
      return NextResponse.json(
        { success: false, error: "Lead not found" },
        { status: 404 }
      );
    }

    const now = new Date();
    let updateData: any = {};

    switch (action) {
      case "MARK_QUALIFIED": {
        updateData = {
          isQualified: true,
          qualifiedAt: now,
          qualificationReason:
            qualificationReason ||
            (existingLead.detectedPhone
              ? `Page Manager verified customer mobile number (${existingLead.detectedPhone})`
              : "Page Manager verified high purchase intent"),
          notes: notes !== undefined ? notes : existingLead.notes,
          customerAddress: customerAddress !== undefined ? customerAddress : existingLead.customerAddress,
          detectedPhone: detectedPhone !== undefined ? detectedPhone : existingLead.detectedPhone,
        };
        break;
      }
      case "MARK_CONVERTED": {
        const val = typeof orderValue === "number" ? orderValue : parseFloat(orderValue || "45.0");
        updateData = {
          isConverted: true,
          status: "CONVERTED",
          convertedAt: now,
          isQualified: true,
          qualifiedAt: existingLead.qualifiedAt || now,
          orderValue: isNaN(val) ? 45.0 : val,
          customerAddress: customerAddress !== undefined ? customerAddress : existingLead.customerAddress,
          notes: notes !== undefined ? notes : existingLead.notes,
          detectedPhone: detectedPhone !== undefined ? detectedPhone : existingLead.detectedPhone,
        };
        break;
      }
      case "RESET_STATUS": {
        updateData = {
          isQualified: false,
          isConverted: false,
          status: "AWAITING_CUSTOMER",
          qualifiedAt: null,
          convertedAt: null,
          orderValue: null,
        };
        break;
      }
      case "DISMISS": {
        updateData = {
          status: "CLOSED",
          notes: notes || "Dismissed by Page Manager during Advance Scan review",
        };
        break;
      }
      default: {
        // Generic update
        if (orderValue !== undefined) updateData.orderValue = Number(orderValue);
        if (customerAddress !== undefined) updateData.customerAddress = customerAddress;
        if (notes !== undefined) updateData.notes = notes;
        if (detectedPhone !== undefined) updateData.detectedPhone = detectedPhone;
        break;
      }
    }

    const updatedLead = await prisma.leadConversation.update({
      where: { id: leadId },
      data: updateData,
      include: { page: true },
    });

    return NextResponse.json({
      success: true,
      message:
        action === "MARK_CONVERTED"
          ? `Marked "${updatedLead.customerName}" as Converted (Revenue: $${updatedLead.orderValue || 0})!`
          : action === "MARK_QUALIFIED"
          ? `Marked "${updatedLead.customerName}" as Qualified!`
          : "Lead status updated successfully.",
      lead: updatedLead,
    });
  } catch (err: any) {
    console.error("Advance Scan status update error:", err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
