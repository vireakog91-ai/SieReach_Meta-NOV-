import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  publishFacebookPagePost,
  publishFacebookPostComment,
  renderCdcPostTemplate,
} from "@/lib/facebook";

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET || "sielab_cron_secret_key";

    // Allow basic security check if configured
    if (authHeader && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();

    // Find posts that are SCHEDULED or PARTIALLY_PUBLISHED with pending targets due
    const duePosts = await prisma.cdcPost.findMany({
      where: {
        status: { in: ["SCHEDULED", "PARTIALLY_PUBLISHED"] },
        targets: {
          some: {
            status: "PENDING",
            OR: [
              { scheduledAt: { lte: now } },
              { scheduledAt: null }
            ],
          },
        },
      },
      include: {
        targets: {
          include: {
            page: true,
          },
        },
      },
      take: 15,
    });

    if (duePosts.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No scheduled posts or targets due for dispatch.",
        processedCount: 0,
      });
    }

    let totalTargetsProcessed = 0;

    for (const post of duePosts) {
      let parsedMediaUrls: string[] = [];
      try {
        parsedMediaUrls = post.mediaUrls ? JSON.parse(post.mediaUrls) : [];
      } catch {
        parsedMediaUrls = [];
      }

      for (const target of post.targets) {
        if (target.status !== "PENDING") {
          continue;
        }

        // Check if this specific target is due
        const dueTime = target.scheduledAt || post.scheduledAt;
        if (dueTime && dueTime > now) {
          // Still scheduled for later
          continue;
        }

        const personalizedMessage = renderCdcPostTemplate(post.content, {
          pageName: target.page.name,
          businessName: post.businessName,
        });

        try {
          const result = await publishFacebookPagePost({
            pageId: target.page.pageId,
            pageAccessToken: target.page.accessToken,
            message: personalizedMessage,
            mediaType: post.mediaType as any,
            mediaUrls: parsedMediaUrls,
            callToActionType: (post.callToActionType as any) || undefined,
            callToActionTitle: post.callToActionTitle || undefined,
            callToActionUrl: post.callToActionUrl || undefined,
            isMockMode: false,
          });

          if (result.success) {
            let firstCommentId: string | null = null;

            // Auto First-Comment Dispatch
            if (post.enableFirstComment && post.firstComment && post.firstComment.trim() && result.postId) {
              const personalizedComment = renderCdcPostTemplate(post.firstComment, {
                pageName: target.page.name,
                businessName: post.businessName,
              });

              try {
                const commentRes = await publishFacebookPostComment({
                  postId: result.postId,
                  pageAccessToken: target.page.accessToken,
                  message: personalizedComment,
                  isMockMode: false,
                });
                if (commentRes.success && commentRes.commentId) {
                  firstCommentId = commentRes.commentId;
                }
              } catch (cErr) {
                console.warn(`[CDC Scheduler] First comment dispatch failed for target ${target.id}:`, cErr);
              }
            }

            await prisma.cdcPostTarget.update({
              where: { id: target.id },
              data: {
                status: "PUBLISHED",
                metaPostId: result.postId,
                firstCommentId,
                publishedAt: new Date(),
                customText: personalizedMessage,
                errorMessage: null,
              },
            });
          } else {
            await prisma.cdcPostTarget.update({
              where: { id: target.id },
              data: {
                status: "FAILED",
                errorMessage: result.error || "Meta publishing failed",
                customText: personalizedMessage,
              },
            });
          }
        } catch (err: any) {
          await prisma.cdcPostTarget.update({
            where: { id: target.id },
            data: {
              status: "FAILED",
              errorMessage: err.message,
            },
          });
        }

        totalTargetsProcessed++;
      }

      // Re-evaluate post status across all targets
      const allTargets = await prisma.cdcPostTarget.findMany({
        where: { postId: post.id },
      });

      const hasPending = allTargets.some((t) => t.status === "PENDING");
      const hasPublished = allTargets.some((t) => t.status === "PUBLISHED");
      const hasFailed = allTargets.some((t) => t.status === "FAILED");

      let newStatus = post.status;
      if (!hasPending) {
        if (hasPublished && !hasFailed) {
          newStatus = "PUBLISHED";
        } else if (hasPublished && hasFailed) {
          newStatus = "PARTIALLY_FAILED";
        } else if (!hasPublished && hasFailed) {
          newStatus = "FAILED";
        }
      } else {
        newStatus = hasPublished ? "PARTIALLY_PUBLISHED" : "SCHEDULED";
      }

      await prisma.cdcPost.update({
        where: { id: post.id },
        data: {
          status: newStatus,
          publishedAt: hasPublished ? (post.publishedAt || new Date()) : null,
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: `Successfully processed ${totalTargetsProcessed} targets.`,
      processedCount: totalTargetsProcessed,
    });
  } catch (error: any) {
    console.error("CDC Scheduler Cron error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "CDC Scheduler error" },
      { status: 500 }
    );
  }
}
