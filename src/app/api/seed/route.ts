import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { INITIAL_PAGES, INITIAL_LEADS, INITIAL_AD_CREATIVE_INSIGHTS } from "@/lib/mockData";
import { evaluateAdvanceScan } from "@/lib/advanceScan";
import { requireAdminAuth } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const unauthorized = await requireAdminAuth(req);
  if (unauthorized) return unauthorized;

  try {
    // Clear and reset data
    await prisma.blastLog.deleteMany({});
    await prisma.adCreativeInsight.deleteMany({});
    await prisma.leadConversation.deleteMany({});
    await prisma.followUpCampaign.deleteMany({});
    await prisma.facebookPage.deleteMany({});
    await prisma.businessPortfolio.deleteMany({});

    // Seed Initial Portfolios
    await prisma.businessPortfolio.createMany({
      data: [
        {
          name: "SieLab Retail Group",
          industry: "Retail & Multi-Brand E-Commerce",
          icon: "🏢",
          description: "Enterprise multi-brand retail portfolio overseeing fashion, tech gadgets, organic cosmetics, and home essentials.",
        },
        {
          name: "Moew Hospitality",
          industry: "Artisan F&B & Hospitality",
          icon: "☕",
          description: "Specialty coffee, artisan bakery, VIP table reservations, and pastry catering.",
        },
      ],
    });

    // Seed 5 pages
    for (const page of INITIAL_PAGES) {
      await prisma.facebookPage.create({
        data: {
          pageId: page.pageId,
          name: page.name,
          category: page.category,
          businessName: page.businessName || (page.pageId === "fb_page_05" ? "Moew Hospitality" : "SieLab Retail Group"),
          avatarUrl: page.avatarUrl,
          accessToken: page.accessToken,
          isActive: true,
        },
      });
    }

    // Seed campaigns
    await prisma.followUpCampaign.create({
      data: {
        name: "24-Hour Inactive Customer Blast Recovery",
        businessName: "SieLab Retail Group",
        inactiveHoursThreshold: 24.0,
        messageTemplate:
          "Hello {{customer_name}}! 👋 We noticed you checked in with {{page_name}} regarding {{ad_source}}. We wanted to follow up and offer you an exclusive 15% OFF fast-action voucher! Would you like us to assist you with ordering?",
        imageUrl:
          "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=800&auto=format&fit=crop&q=80",
        messageTag: "HUMAN_AGENT",
        autoBlast: false,
        isActive: true,
      },
    });

    await prisma.followUpCampaign.create({
      data: {
        name: "Quick 6-Hour Golden Window Reminder",
        businessName: "SieLab Retail Group",
        inactiveHoursThreshold: 6.0,
        messageTemplate:
          "Hi {{first_name}}, just checking if you still needed details on {{ad_source}}? Our team is available right now if you have any questions!",
        imageUrl:
          "https://images.unsplash.com/photo-1556742049-0a67c5574f73?w=800&auto=format&fit=crop&q=80",
        messageTag: "HUMAN_AGENT",
        autoBlast: false,
        isActive: true,
      },
    });

    // 3rd Campaign: Moew Cafe Specialty Table & Reservation Re-engagement (Single-Page Business)
    await prisma.followUpCampaign.create({
      data: {
        name: "Moew Cafe VIP Table & Brunch Follow-Up",
        businessName: "Moew Hospitality",
        pageId: "fb_page_05",
        inactiveHoursThreshold: 12.0,
        messageTemplate:
          "Hi {{first_name}}! ☕ Following up from Moew Specialty Cafe regarding your inquiry about {{ad_source}}. We would love to reserve your table and offer a complimentary signature pastry on your visit! Shall we confirm for you?",
        imageUrl:
          "https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=800&auto=format&fit=crop&q=80",
        messageTag: "HUMAN_AGENT",
        autoBlast: false,
        isActive: true,
      },
    });

    // Seed leads with fresh relative timestamps
    const now = Date.now();
    for (const lead of INITIAL_LEADS) {
      const custMsAgo = lead.lastCustomerMessageHoursAgo * 60 * 60 * 1000;
      const agentMsAgo = lead.lastAgentMessageHoursAgo * 60 * 60 * 1000;

      const followUpCount =
        lead.followUpCount !== undefined
          ? lead.followUpCount
          : lead.status === "FOLLOWED_UP"
          ? 1
          : 0;

      const firstFollowedUpAt = lead.firstFollowedUpHoursAgo
        ? new Date(now - lead.firstFollowedUpHoursAgo * 60 * 60 * 1000)
        : lead.status === "FOLLOWED_UP"
        ? new Date(now - 12 * 60 * 60 * 1000)
        : null;

      const secondFollowedUpAt = lead.secondFollowedUpHoursAgo
        ? new Date(now - lead.secondFollowedUpHoursAgo * 60 * 60 * 1000)
        : null;

      const lastFollowedUpAt = secondFollowedUpAt || firstFollowedUpAt;

      const repliedAt =
        lead.status === "REPLIED" && lead.repliedAfterStep
          ? new Date(now - custMsAgo)
          : null;

      const scanEval = evaluateAdvanceScan(
        [{ sender: "customer", text: lead.lastCustomerMessage }],
        {
          lastCustomerMessage: lead.lastCustomerMessage,
          detectedPhone: lead.detectedPhone,
          voiceCount: lead.voiceCount,
          textCount: lead.textCount,
          orderValue: lead.orderValue,
        }
      );

      const createdLead = await prisma.leadConversation.create({
        data: {
          pageId: lead.pageId,
          psid: lead.psid,
          customerName: lead.customerName,
          customerAvatar: lead.customerAvatar,
          adSource: lead.adSource,
          lastCustomerMessage: lead.lastCustomerMessage,
          lastCustomerMessageAt: new Date(now - custMsAgo),
          lastAgentMessage: lead.lastAgentMessage,
          lastAgentMessageAt: new Date(now - agentMsAgo),
          status: lead.status,
          followUpCount,
          lastFollowedUpAt,
          firstFollowedUpAt,
          secondFollowedUpAt,
          repliedAt,
          repliedAfterStep: lead.repliedAfterStep || null,
          isConverted: Boolean(lead.isConverted),
          orderValue: lead.orderValue || null,
          detectedPhone: lead.detectedPhone || scanEval.detectedPhone,
          detectedPhoneSnippet: lead.detectedPhoneSnippet || scanEval.detectedPhoneSnippet,
          voiceCount: lead.voiceCount !== undefined ? lead.voiceCount : scanEval.voiceCount,
          textCount: lead.textCount !== undefined ? lead.textCount : scanEval.textCount,
          scanCategory: lead.scanCategory || scanEval.scanCategory,
          scanFlags: JSON.stringify(scanEval.scanFlags),
          isQualified: Boolean(lead.isQualified || (lead.detectedPhone && lead.isConverted)),
          qualificationReason: lead.qualificationReason || null,
          customerAddress: lead.customerAddress || null,
          advanceScanAt: new Date(),
        },
      });

      // Create realistic BlastLogs for reporting and audit trail
      if (firstFollowedUpAt) {
        await prisma.blastLog.create({
          data: {
            pageId: lead.pageId,
            leadId: createdLead.id,
            recipientPsid: lead.psid,
            recipientName: lead.customerName,
            messageSent: `Step 1 Follow-Up: Hello ${lead.customerName}! Checking if you had any questions regarding ${lead.adSource || "our offer"}.`,
            status: "DELIVERED",
            step: 1,
            sentAt: firstFollowedUpAt,
            respondedAt: lead.repliedAfterStep === 1 ? repliedAt : null,
          },
        });
      }

      if (secondFollowedUpAt) {
        const isBotFailure = lead.psid === "psid_bot_01";
        await prisma.blastLog.create({
          data: {
            pageId: lead.pageId,
            leadId: createdLead.id,
            recipientPsid: lead.psid,
            recipientName: lead.customerName,
            messageSent: `Step 2 Final Follow-Up: Exclusive VIP voucher for you ${lead.customerName}!`,
            status: isBotFailure ? "FAILED" : "DELIVERED",
            errorMessage: isBotFailure ? "Meta Graph API Error #551: This person is not available on Messenger right now (Deactivated/Fake Account)." : null,
            step: 2,
            sentAt: secondFollowedUpAt,
            respondedAt: lead.repliedAfterStep === 2 ? repliedAt : null,
          },
        });
      }
    }

    // Seed Ad Creative Insights taxonomy
    await prisma.adCreativeInsight.createMany({
      data: INITIAL_AD_CREATIVE_INSIGHTS,
    });

    return NextResponse.json({
      success: true,
      message: "Successfully reset and reloaded demo data with fresh timestamps!",
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
