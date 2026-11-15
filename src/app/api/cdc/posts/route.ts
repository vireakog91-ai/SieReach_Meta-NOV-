import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  publishFacebookPagePost,
  publishFacebookPostComment,
  renderCdcPostTemplate,
} from "@/lib/facebook";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const businessName = searchParams.get("businessName");
    const status = searchParams.get("status");

    let whereClause: any = {};
    if (businessName && businessName !== "ALL") {
      whereClause.businessName = businessName;
    }
    if (status && status !== "ALL") {
      whereClause.status = status;
    }

    const posts = await prisma.cdcPost.findMany({
      where: whereClause,
      include: {
        targets: {
          include: {
            page: {
              select: {
                id: true,
                pageId: true,
                name: true,
                avatarUrl: true,
                category: true,
                businessName: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, posts });
  } catch (error: any) {
    console.error("Error fetching CDC posts:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to load CDC posts" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      businessName = "SieLab Retail Group",
      title,
      content,
      mediaType = "none",
      mediaUrls = [],
      targetPageIds = [],
      action = "PUBLISH_NOW", // "PUBLISH_NOW" | "SCHEDULE" | "DRAFT"
      scheduledAt,
      targetSchedules = {}, // { [pageId: string]: string (ISO) }
      // High-Growth & Lead Conversion Fields
      enableFirstComment = false,
      firstComment = "",
      callToActionType = "NONE",
      callToActionTitle = "Direct Messenger Inquiry",
      callToActionUrl = "",
      enableCommentToDm = false,
      commentToDmKeyword = "ALL",
      commentToDmReply = "",
      commentToDmMiniBlast = "",
      isMockMode = false,
    } = body;

    if (!content || !content.trim()) {
      return NextResponse.json(
        { success: false, error: "Content caption cannot be empty." },
        { status: 400 }
      );
    }

    if (action !== "DRAFT" && (!targetPageIds || targetPageIds.length === 0)) {
      return NextResponse.json(
        { success: false, error: "Please select at least one target Facebook page." },
        { status: 400 }
      );
    }

    // Determine initial status & master scheduled date
    let initialStatus = "DRAFT";
    let masterScheduledDate: Date | null = null;

    if (action === "SCHEDULE") {
      let earliestTargetDate: Date | null = null;

      if (targetSchedules && typeof targetSchedules === "object") {
        for (const pid of targetPageIds) {
          const tDateStr = targetSchedules[pid];
          if (tDateStr) {
            const dt = new Date(tDateStr);
            if (!isNaN(dt.getTime())) {
              if (!earliestTargetDate || dt < earliestTargetDate) {
                earliestTargetDate = dt;
              }
            }
          }
        }
      }

      if (scheduledAt) {
        const parsed = new Date(scheduledAt);
        if (!isNaN(parsed.getTime())) {
          masterScheduledDate = parsed;
        }
      } else if (earliestTargetDate) {
        masterScheduledDate = earliestTargetDate;
      }

      if (!masterScheduledDate) {
        return NextResponse.json(
          { success: false, error: "Scheduled date and time are required." },
          { status: 400 }
        );
      }

      initialStatus = "SCHEDULED";
    } else if (action === "PUBLISH_NOW") {
      initialStatus = "PUBLISHING";
    }

    // 1. Create Master CdcPost with High-Growth fields
    const cdcPost = await prisma.cdcPost.create({
      data: {
        businessName,
        title: title?.trim() || null,
        content: content.trim(),
        mediaType,
        mediaUrls: Array.isArray(mediaUrls) ? JSON.stringify(mediaUrls) : mediaUrls || "[]",
        status: initialStatus,
        scheduledAt: masterScheduledDate,
        enableFirstComment: Boolean(enableFirstComment),
        firstComment: firstComment?.trim() || null,
        callToActionType: callToActionType || "NONE",
        callToActionTitle: callToActionTitle?.trim() || null,
        callToActionUrl: callToActionUrl?.trim() || null,
        enableCommentToDm: Boolean(enableCommentToDm),
        commentToDmKeyword: commentToDmKeyword?.trim() || "ALL",
        commentToDmReply: commentToDmReply?.trim() || null,
        commentToDmMiniBlast: commentToDmMiniBlast?.trim() || null,
      },
    });

    // 2. Create Targets with optional per-page scheduled times
    const targetsToCreate = (targetPageIds as string[]).map((pageId) => {
      let targetScheduledDate: Date | null = null;
      if (action === "SCHEDULE") {
        if (targetSchedules && targetSchedules[pageId]) {
          const parsed = new Date(targetSchedules[pageId]);
          if (!isNaN(parsed.getTime())) {
            targetScheduledDate = parsed;
          }
        }
        if (!targetScheduledDate && masterScheduledDate) {
          targetScheduledDate = masterScheduledDate;
        }
      }

      return {
        postId: cdcPost.id,
        pageId,
        status: "PENDING",
        scheduledAt: targetScheduledDate,
      };
    });

    if (targetsToCreate.length > 0) {
      await prisma.cdcPostTarget.createMany({
        data: targetsToCreate,
      });
    }

    // If DRAFT or SCHEDULED, return immediately
    if (action !== "PUBLISH_NOW") {
      const createdPost = await prisma.cdcPost.findUnique({
        where: { id: cdcPost.id },
        include: {
          targets: {
            include: {
              page: true,
            },
          },
        },
      });

      return NextResponse.json({
        success: true,
        action,
        post: createdPost,
      });
    }

    // 3. Action is PUBLISH_NOW -> Execute parallel publishing to selected pages
    const pages = await prisma.facebookPage.findMany({
      where: {
        pageId: { in: targetPageIds },
      },
    });

    const parsedMediaUrls = Array.isArray(mediaUrls) ? mediaUrls : [];
    let successCount = 0;
    let failureCount = 0;
    const targetResults: any[] = [];

    for (const page of pages) {
      const personalizedMessage = renderCdcPostTemplate(content, {
        pageName: page.name,
        businessName,
      });

      try {
        const publishResult = await publishFacebookPagePost({
          pageId: page.pageId,
          pageAccessToken: page.accessToken,
          message: personalizedMessage,
          mediaType: mediaType as any,
          mediaUrls: parsedMediaUrls,
          callToActionType: callToActionType as any,
          callToActionTitle: callToActionTitle || null,
          callToActionUrl: callToActionUrl || null,
          isMockMode,
        });

        if (publishResult.success && publishResult.postId) {
          successCount++;
          let firstCommentId: string | null = null;

          // Dispatch Auto First-Comment if enabled
          if (enableFirstComment && firstComment && firstComment.trim()) {
            const personalizedComment = renderCdcPostTemplate(firstComment, {
              pageName: page.name,
              businessName,
            });

            try {
              const commentResult = await publishFacebookPostComment({
                postId: publishResult.postId,
                pageAccessToken: page.accessToken,
                message: personalizedComment,
                isMockMode,
              });

              if (commentResult.success && commentResult.commentId) {
                firstCommentId = commentResult.commentId;
              }
            } catch (commentErr) {
              console.warn(`Failed to dispatch first comment for ${page.name}:`, commentErr);
            }
          }

          await prisma.cdcPostTarget.updateMany({
            where: {
              postId: cdcPost.id,
              pageId: page.pageId,
            },
            data: {
              status: "PUBLISHED",
              metaPostId: publishResult.postId,
              firstCommentId,
              publishedAt: new Date(),
              customText: personalizedMessage,
            },
          });

          targetResults.push({
            pageId: page.pageId,
            pageName: page.name,
            success: true,
            metaPostId: publishResult.postId,
            permalinkUrl: publishResult.permalinkUrl,
            firstCommentId,
          });
        } else {
          failureCount++;
          await prisma.cdcPostTarget.updateMany({
            where: {
              postId: cdcPost.id,
              pageId: page.pageId,
            },
            data: {
              status: "FAILED",
              errorMessage: publishResult.error || "Meta Graph API rejected post",
              customText: personalizedMessage,
            },
          });
          targetResults.push({
            pageId: page.pageId,
            pageName: page.name,
            success: false,
            error: publishResult.error,
          });
        }
      } catch (err: any) {
        failureCount++;
        await prisma.cdcPostTarget.updateMany({
          where: {
            postId: cdcPost.id,
            pageId: page.pageId,
          },
          data: {
            status: "FAILED",
            errorMessage: err.message || "Unexpected execution error",
          },
        });
        targetResults.push({
          pageId: page.pageId,
          pageName: page.name,
          success: false,
          error: err.message,
        });
      }
    }

    // Determine final master status
    let finalMasterStatus = "PUBLISHED";
    if (failureCount > 0 && successCount > 0) {
      finalMasterStatus = "PARTIALLY_FAILED";
    } else if (failureCount > 0 && successCount === 0) {
      finalMasterStatus = "FAILED";
    }

    const updatedPost = await prisma.cdcPost.update({
      where: { id: cdcPost.id },
      data: {
        status: finalMasterStatus,
        publishedAt: new Date(),
      },
      include: {
        targets: {
          include: {
            page: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      action: "PUBLISH_NOW",
      post: updatedPost,
      report: {
        total: targetPageIds.length,
        successCount,
        failureCount,
        targets: targetResults,
      },
    });
  } catch (error: any) {
    console.error("Error creating/publishing CDC post:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to process CDC post" },
      { status: 500 }
    );
  }
}
