import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  publishFacebookPostComment,
  sendFacebookPrivateReply,
} from "@/lib/facebook";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      postId,
      targetPageId,
      commenterName = "Sarah Jenkins",
      commentText = "PM price and details please! 🙏",
    } = body;

    if (!postId) {
      return NextResponse.json(
        { success: false, error: "Post ID is required." },
        { status: 400 }
      );
    }

    // 1. Fetch Post and Target
    const post = await prisma.cdcPost.findUnique({
      where: { id: postId },
      include: {
        targets: {
          include: {
            page: true,
          },
        },
      },
    });

    if (!post) {
      return NextResponse.json(
        { success: false, error: "Post not found." },
        { status: 404 }
      );
    }

    let target = post.targets.find((t) => t.pageId === targetPageId);
    if (!target && post.targets.length > 0) {
      target = post.targets[0];
    }

    if (!target) {
      return NextResponse.json(
        { success: false, error: "No target page found for this post." },
        { status: 400 }
      );
    }

    if (!post.enableCommentToDm) {
      return NextResponse.json({
        success: false,
        error: "Comment-to-DM lead funnel is not enabled on this post.",
        postTitle: post.title,
      });
    }

    const keyword = (post.commentToDmKeyword || "ALL").trim().toLowerCase();
    const cleanComment = (commentText || "").trim();
    const isMatched = keyword === "all" || cleanComment.toLowerCase().includes(keyword);

    if (!isMatched) {
      return NextResponse.json({
        success: true,
        matched: false,
        message: `Comment "${cleanComment}" did not match trigger keyword "${post.commentToDmKeyword}".`,
        keyword: post.commentToDmKeyword,
        commentText: cleanComment,
      });
    }

    // Prepare personalized copies
    const replacer = (tmpl: string) =>
      tmpl
        .replace(/\{\{name\}\}/gi, commenterName)
        .replace(/\{\{page_name\}\}/gi, target.page.name)
        .replace(/\{\{business_name\}\}/gi, post.businessName);

    const publicReplyText = post.commentToDmReply ? replacer(post.commentToDmReply) : null;
    const privateDmText = post.commentToDmMiniBlast ? replacer(post.commentToDmMiniBlast) : null;

    const mockPsid = `sim_${Date.now().toString().slice(-6)}`;
    const mockCommentId = `mock_comm_${Date.now()}`;
    const now = new Date();

    let publicReplyResult = null;
    let privateDmResult = null;

    // If live post target exists, attempt actual Meta calls, otherwise mock cleanly
    const isMock = !target.metaPostId || target.metaPostId.startsWith("mock_");

    if (publicReplyText) {
      publicReplyResult = await publishFacebookPostComment({
        postId: target.metaPostId || mockCommentId,
        pageAccessToken: target.page.accessToken,
        message: publicReplyText,
        isMockMode: isMock,
      });
    }

    if (privateDmText) {
      privateDmResult = await sendFacebookPrivateReply({
        commentId: mockCommentId,
        pageAccessToken: target.page.accessToken,
        message: privateDmText,
        isMockMode: isMock,
      });
    }

    // Upsert into Lead CRM pipeline
    const lead = await prisma.leadConversation.upsert({
      where: {
        pageId_psid: {
          pageId: target.page.pageId,
          psid: mockPsid,
        },
      },
      update: {
        customerName: commenterName,
        lastCustomerMessage: `[Post Comment: "${cleanComment}"]`,
        lastCustomerMessageAt: now,
        lastAgentMessage: privateDmText ? `[Auto DM: "${privateDmText}"]` : "Automated Comment Reply",
        lastAgentMessageAt: now,
        status: "FOLLOWED_UP",
      },
      create: {
        pageId: target.page.pageId,
        psid: mockPsid,
        customerName: commenterName,
        adSource: `CDC Post: ${post.title || "Social Post"}`,
        lastCustomerMessage: `[Post Comment: "${cleanComment}"]`,
        lastCustomerMessageAt: now,
        lastAgentMessage: privateDmText ? `[Auto DM: "${privateDmText}"]` : "Automated Comment Reply",
        lastAgentMessageAt: now,
        status: "FOLLOWED_UP",
      },
    });

    return NextResponse.json({
      success: true,
      matched: true,
      pageName: target.page.name,
      pageId: target.page.pageId,
      commenterName,
      commentText: cleanComment,
      keyword: post.commentToDmKeyword,
      publicReply: publicReplyText,
      publicReplyResult,
      privateDm: privateDmText,
      privateDmResult,
      leadCreated: lead,
      message: "Comment-to-DM simulation succeeded! Customer captured as lead and automated replies dispatched.",
    });
  } catch (error: any) {
    console.error("Simulation error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Simulation failed" },
      { status: 500 }
    );
  }
}
