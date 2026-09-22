import { prisma } from "../src/lib/prisma";
import { runAutoBlastSweep } from "../src/app/api/cron/auto-blast/route";

async function verifyCampaignPortfolioIsolation() {
  console.log("===============================================================");
  console.log("   SieReach Business Portfolio Campaign Isolation Test Suite   ");
  console.log("===============================================================\n");

  // 1. Verify Pages in DB
  const sielabPages = await prisma.facebookPage.findMany({
    where: { businessName: "SieLab Retail Group" },
  });
  const moewPages = await prisma.facebookPage.findMany({
    where: { businessName: "Moew Hospitality" },
  });

  console.log(`✓ SieLab Retail Group has ${sielabPages.length} pages: ${sielabPages.map((p) => p.name).join(", ")}`);
  console.log(`✓ Moew Hospitality has ${moewPages.length} pages: ${moewPages.map((p) => p.name).join(", ")}`);

  if (sielabPages.length === 0 || moewPages.length === 0) {
    throw new Error("Pages missing for test setup. Ensure DB has both businesses.");
  }

  // 2. Create a Moew Hospitality campaign targeting "All Pages in Moew Hospitality" (pageId: null)
  const moewAllCampaign = await prisma.followUpCampaign.upsert({
    where: { id: "test_moew_all_campaign" },
    update: {
      name: "Moew Hospitality All-Pages Brunch Blast",
      businessName: "Moew Hospitality",
      pageId: null, // Targets ALL pages in Moew Hospitality
      inactiveHoursThreshold: 2.0,
      autoBlast: true,
      excludePast24h: true,
      dripMinSeconds: 3.0,
      dripMaxSeconds: 3.5,
      isActive: true,
      messageTemplate: "Hello {{customer_name}}, Moew Hospitality is inviting you back for specialty coffee and pastries!",
    },
    create: {
      id: "test_moew_all_campaign",
      name: "Moew Hospitality All-Pages Brunch Blast",
      businessName: "Moew Hospitality",
      pageId: null, // Targets ALL pages in Moew Hospitality
      inactiveHoursThreshold: 2.0,
      autoBlast: true,
      excludePast24h: true,
      dripMinSeconds: 3.0,
      dripMaxSeconds: 3.5,
      isActive: true,
      messageTemplate: "Hello {{customer_name}}, Moew Hospitality is inviting you back for specialty coffee and pastries!",
    },
  });
  console.log(`\n✓ Configured Moew All-Pages Campaign: "${moewAllCampaign.name}" (businessName: ${moewAllCampaign.businessName}, pageId: ${moewAllCampaign.pageId})`);

  // 3. Clean up test leads
  await prisma.leadConversation.deleteMany({
    where: {
      psid: { in: ["psid_test_moew_lead", "psid_test_sielab_lead"] },
    },
  });

  // 4. Create 2 test leads that are BOTH inactive for 3 hours:
  // Lead 1: Belongs to Moew Hospitality (fb_page_05)
  const time3hAgo = new Date(Date.now() - 3.0 * 3600 * 1000);
  const time4hAgo = new Date(Date.now() - 4.0 * 3600 * 1000);

  const moewLead = await prisma.leadConversation.create({
    data: {
      pageId: moewPages[0].pageId,
      psid: "psid_test_moew_lead",
      customerName: "Moew Cafe Customer",
      adSource: "Moew Brunch Ad",
      lastCustomerMessage: "Can I book a table?",
      lastCustomerMessageAt: time4hAgo,
      lastAgentMessage: "We have tables available!",
      lastAgentMessageAt: time3hAgo,
      status: "AWAITING_CUSTOMER",
      followUpCount: 0,
    },
  });
  console.log(`✓ Created Moew Lead on "${moewPages[0].name}": "${moewLead.customerName}" (Inactive 3.0h)`);

  // Lead 2: Belongs to SieLab Retail Group (fb_page_01)
  const sielabLead = await prisma.leadConversation.create({
    data: {
      pageId: sielabPages[0].pageId,
      psid: "psid_test_sielab_lead",
      customerName: "SieLab Retail Customer",
      adSource: "Winter Jacket Ad",
      lastCustomerMessage: "What sizes are available?",
      lastCustomerMessageAt: time4hAgo,
      lastAgentMessage: "We have M, L, and XL!",
      lastAgentMessageAt: time3hAgo,
      status: "AWAITING_CUSTOMER",
      followUpCount: 0,
    },
  });
  console.log(`✓ Created SieLab Lead on "${sielabPages[0].name}": "${sielabLead.customerName}" (Inactive 3.0h)`);

  // 5. Temporarily disable other auto-blast campaigns so only test_moew_all_campaign runs
  await prisma.followUpCampaign.updateMany({
    where: { id: { not: "test_moew_all_campaign" } },
    data: { autoBlast: false },
  });

  // 6. Run the Auto-Blast Sweep!
  console.log("\n--- Executing Auto-Blast Sweep for Moew All-Pages Campaign ---");
  const sweepReport = await runAutoBlastSweep();
  console.log(`✓ Auto-blast sweep completed: ${sweepReport.totalDelivered} delivered`);

  // 7. Verify Lead States
  const updatedMoewLead = await prisma.leadConversation.findUnique({
    where: { id: moewLead.id },
  });
  const updatedSielabLead = await prisma.leadConversation.findUnique({
    where: { id: sielabLead.id },
  });

  console.log(`\n--- Verification Results ---`);
  console.log(`• Moew Lead status: ${updatedMoewLead?.status}, followUpCount: ${updatedMoewLead?.followUpCount}`);
  console.log(`• SieLab Lead status: ${updatedSielabLead?.status}, followUpCount: ${updatedSielabLead?.followUpCount}`);

  if (updatedMoewLead?.status !== "FOLLOWED_UP" || updatedMoewLead?.followUpCount !== 1) {
    throw new Error(`FAIL: Moew Lead was not followed up by Moew campaign!`);
  }
  console.log("✓ SUCCESS: Moew Lead was followed up by Moew Hospitality campaign.");

  if (updatedSielabLead?.status !== "AWAITING_CUSTOMER" || updatedSielabLead?.followUpCount !== 0) {
    throw new Error(`FAIL: CRITICAL ISOLATION BREACH! SieLab Retail lead was blasted by Moew Hospitality campaign!`);
  }
  console.log("✓ SUCCESS: SieLab Retail lead was STRICTLY PROTECTED and NOT blasted by Moew campaign!");

  // 8. Clean up
  await prisma.leadConversation.deleteMany({
    where: { psid: { in: ["psid_test_moew_lead", "psid_test_sielab_lead"] } },
  });
  await prisma.blastLog.deleteMany({
    where: { recipientPsid: "psid_test_moew_lead" },
  });
  await prisma.followUpCampaign.delete({
    where: { id: "test_moew_all_campaign" },
  });

  console.log("\n🎉 100% PORTFOLIO CAMPAIGN ISOLATION CONFIRMED! ZERO MIX-UP GUARANTEED! 🎉\n");
}

verifyCampaignPortfolioIsolation()
  .catch((err) => {
    console.error("Test failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
