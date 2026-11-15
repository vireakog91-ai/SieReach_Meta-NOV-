import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  publishFacebookPagePost,
  renderCdcPostTemplate,
} from "@/lib/facebook";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const post = await prisma.cdcPost.findUnique({
      where: { id },
      include: {
        targets: {
          include: {
            page: true,
          },
        },
      },
    });

    if (!post) {
      return NextResponse.json({ success: false, error: "Post not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, post });
  } catch (error: any) {
    console.error("Error fetching CDC post:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch post" },
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
    await prisma.cdcPost.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, deletedId: id });
  } catch (error: any) {
    console.error("Error deleting CDC post:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to delete post" },
      { status: 500 }
    );
  }
}

// POST to retry or trigger instant publish for scheduled/failed post
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const { isMockMode = false, targetPageIds } = body;

    const post = await prisma.cdcPost.findUnique({
      where: { id },
      include: {
        targets: {
          include: {
            page: true,
          },
        },
      },
    });

    if (!post) {
      return NextResponse.json({ success: false, error: "Post not found" }, { status: 404 });
    }

    // Filter targets to publish
    const targetsToPublish = post.targets.filter((t) => {
      if (targetPageIds && Array.isArray(targetPageIds)) {
        return targetPageIds.includes(t.pageId);
      }
      return t.status !== "PUBLISHED";
    });

    let parsedMediaUrls: string[] = [];
    try {
      parsedMediaUrls = post.mediaUrls ? JSON.parse(post.mediaUrls) : [];
    } catch {
      parsedMediaUrls = [];
    }

    let successCount = 0;
    let failureCount = 0;

    for (const target of targetsToPublish) {
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
          isMockMode,
        });

        if (result.success) {
          successCount++;
          await prisma.cdcPostTarget.update({
            where: { id: target.id },
            data: {
              status: "PUBLISHED",
              metaPostId: result.postId,
              publishedAt: new Date(),
              customText: personalizedMessage,
              errorMessage: null,
            },
          });
        } else {
          failureCount++;
          await prisma.cdcPostTarget.update({
            where: { id: target.id },
            data: {
              status: "FAILED",
              errorMessage: result.error || "Meta API error",
              customText: personalizedMessage,
            },
          });
        }
      } catch (err: any) {
        failureCount++;
        await prisma.cdcPostTarget.update({
          where: { id: target.id },
          data: {
            status: "FAILED",
            errorMessage: err.message,
          },
        });
      }
    }

    // Recalculate post status
    const allTargets = await prisma.cdcPostTarget.findMany({
      where: { postId: id },
    });

    const anyFailed = allTargets.some((t) => t.status === "FAILED");
    const allPublished = allTargets.every((t) => t.status === "PUBLISHED");
    const anyPublished = allTargets.some((t) => t.status === "PUBLISHED");

    let newStatus = post.status;
    if (allPublished) {
      newStatus = "PUBLISHED";
    } else if (anyPublished && anyFailed) {
      newStatus = "PARTIALLY_FAILED";
    } else if (anyFailed && !anyPublished) {
      newStatus = "FAILED";
    }

    const updatedPost = await prisma.cdcPost.update({
      where: { id },
      data: {
        status: newStatus,
        publishedAt: allPublished || anyPublished ? new Date() : post.publishedAt,
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
      post: updatedPost,
      report: {
        attempted: targetsToPublish.length,
        successCount,
        failureCount,
      },
    });
  } catch (error: any) {
    console.error("Error retrying/publishing CDC post:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to publish CDC post" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { scheduledAt, targetSchedules, title, content } = body;

    const existingPost = await prisma.cdcPost.findUnique({
      where: { id },
      include: { targets: true },
    });

    if (!existingPost) {
      return NextResponse.json({ success: false, error: "Post not found" }, { status: 404 });
    }

    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (content !== undefined) updateData.content = content;

    if (scheduledAt !== undefined) {
      if (scheduledAt) {
        const parsed = new Date(scheduledAt);
        if (!isNaN(parsed.getTime())) {
          updateData.scheduledAt = parsed;
          if (existingPost.status === "DRAFT" || existingPost.status === "FAILED") {
            updateData.status = "SCHEDULED";
          }
        }
      } else {
        updateData.scheduledAt = null;
      }
    }

    // Update Master Post
    await prisma.cdcPost.update({
      where: { id },
      data: updateData,
    });

    // Update targets
    if (updateData.scheduledAt) {
      await prisma.cdcPostTarget.updateMany({
        where: {
          postId: id,
          status: "PENDING",
        },
        data: {
          scheduledAt: updateData.scheduledAt,
        },
      });
    }

    if (targetSchedules && typeof targetSchedules === "object") {
      for (const [pageId, sched] of Object.entries(targetSchedules)) {
        if (sched) {
          const tDate = new Date(sched as string);
          if (!isNaN(tDate.getTime())) {
            await prisma.cdcPostTarget.updateMany({
              where: {
                postId: id,
                pageId,
                status: "PENDING",
              },
              data: {
                scheduledAt: tDate,
              },
            });
          }
        }
      }
    }

    const fullUpdatedPost = await prisma.cdcPost.findUnique({
      where: { id },
      include: {
        targets: {
          include: {
            page: true,
          },
        },
      },
    });

    return NextResponse.json({ success: true, post: fullUpdatedPost });
  } catch (error: any) {
    console.error("Error updating/rescheduling post:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update post" },
      { status: 500 }
    );
  }
}
