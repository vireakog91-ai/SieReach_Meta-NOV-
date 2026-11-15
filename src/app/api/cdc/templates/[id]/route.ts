import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const {
      title,
      category,
      content,
      mediaType,
      mediaUrls,
      tags,
      isPinned,
      businessName,
      enableFirstComment,
      firstComment,
      callToActionType,
      callToActionTitle,
      callToActionUrl,
      enableCommentToDm,
      commentToDmKeyword,
      commentToDmReply,
      commentToDmMiniBlast,
    } = body;

    const data: any = {};
    if (title !== undefined) data.title = title;
    if (category !== undefined) data.category = category;
    if (content !== undefined) data.content = content;
    if (mediaType !== undefined) data.mediaType = mediaType;
    if (mediaUrls !== undefined) {
      data.mediaUrls = Array.isArray(mediaUrls) ? JSON.stringify(mediaUrls) : mediaUrls;
    }
    if (tags !== undefined) {
      data.tags = Array.isArray(tags) ? JSON.stringify(tags) : tags;
    }
    if (isPinned !== undefined) data.isPinned = Boolean(isPinned);
    if (businessName !== undefined) data.businessName = businessName;
    if (enableFirstComment !== undefined) data.enableFirstComment = Boolean(enableFirstComment);
    if (firstComment !== undefined) data.firstComment = firstComment;
    if (callToActionType !== undefined) data.callToActionType = callToActionType;
    if (callToActionTitle !== undefined) data.callToActionTitle = callToActionTitle;
    if (callToActionUrl !== undefined) data.callToActionUrl = callToActionUrl;
    if (enableCommentToDm !== undefined) data.enableCommentToDm = Boolean(enableCommentToDm);
    if (commentToDmKeyword !== undefined) data.commentToDmKeyword = commentToDmKeyword;
    if (commentToDmReply !== undefined) data.commentToDmReply = commentToDmReply;
    if (commentToDmMiniBlast !== undefined) data.commentToDmMiniBlast = commentToDmMiniBlast;

    const updated = await prisma.cdcPostTemplate.update({
      where: { id },
      data,
    });

    return NextResponse.json({ success: true, template: updated });
  } catch (error: any) {
    console.error("Error updating CDC template:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update template" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.cdcPostTemplate.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, deletedId: id });
  } catch (error: any) {
    console.error("Error deleting CDC template:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to delete template" },
      { status: 500 }
    );
  }
}
