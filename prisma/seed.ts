import { PrismaClient } from "@prisma/client";
import { INITIAL_PAGES, INITIAL_LEADS, INITIAL_AD_CREATIVE_INSIGHTS } from "../src/lib/mockData";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding SieReach database...");

  // 1. Clear existing data
  await prisma.blastLog.deleteMany({});
  await prisma.adCreativeInsight.deleteMany({});
  await prisma.followUpCampaign.deleteMany({});
  await prisma.leadConversation.deleteMany({});
  await prisma.facebookPage.deleteMany({});
  await prisma.businessPortfolio.deleteMany({});
  await prisma.systemSetting.deleteMany({});

  // 1.5 Create Initial Business Portfolios
  console.log("Creating Business Portfolios...");
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

  // 2. Insert 5 Facebook Business Pages
  console.log(`Creating ${INITIAL_PAGES.length} Facebook Business Pages...`);
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

  // 3. Create Default Follow-Up Campaign
  console.log("Creating default Follow-Up Campaigns...");
  const defaultCampaign = await prisma.followUpCampaign.create({
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

  // Secondary campaign for faster follow-up (e.g., 6 hours)
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

  // 4. Insert Initial Leads with relative timestamps
  console.log(`Creating ${INITIAL_LEADS.length} Ad Click-through Leads...`);
  const now = Date.now();

  for (const lead of INITIAL_LEADS) {
    const custMsAgo = lead.lastCustomerMessageHoursAgo * 60 * 60 * 1000;
    const agentMsAgo = lead.lastAgentMessageHoursAgo * 60 * 60 * 1000;

    await prisma.leadConversation.create({
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
        followUpCount: lead.followUpCount !== undefined ? lead.followUpCount : (lead.status === "FOLLOWED_UP" ? 1 : 0),
        lastFollowedUpAt:
          lead.status === "FOLLOWED_UP" ? new Date(now - 12 * 60 * 60 * 1000) : null,
        repliedAfterStep: lead.repliedAfterStep || null,
        isConverted: Boolean(lead.isConverted),
        orderValue: lead.orderValue || null,
      },
    });
  }

  // 4.5 Seed Initial Ad Creative Insights (Advance Ads Analytics Taxonomy)
  console.log(`Seeding ${INITIAL_AD_CREATIVE_INSIGHTS.length} Ad Creative Insights...`);
  await prisma.adCreativeInsight.createMany({
    data: INITIAL_AD_CREATIVE_INSIGHTS,
  });

  // 5. Initial System Settings
  await prisma.systemSetting.createMany({
    data: [
      {
        key: "MOCK_MODE",
        value: "true",
        description: "Enables simulated Facebook API calls for safe offline testing and demos",
      },
      {
        key: "META_APP_ID",
        value: "",
        description: "Facebook Developer App ID for Live Messenger Integration",
      },
      {
        key: "META_APP_SECRET",
        value: "",
        description: "Facebook Developer App Secret",
      },
      {
        key: "WEBHOOK_VERIFY_TOKEN",
        value: "sielab_reach_verify_token_2026",
        description: "Token for Meta Webhook verification handshake",
      },
    ],
  });

  console.log("✅ SieReach database seeded successfully!");
}

main()
  .catch((e) => {
    console.error("Error during seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
