import { prisma } from "../src/lib/prisma";
import { runAutoBlastSweep } from "../src/app/api/cron/auto-blast/route";

async function runAutoBlastVerification() {
  console.log("====================================================");
  console.log("   SieReach Automated Background Blast Test Suite   ");
  console.log("====================================================\n");

  // 1. Fetch first page
  const page = await prisma.facebookPage.findFirst();
  if (!page) {
    throw new Error("No Facebook Page found in database. Run seed first.");
  }
  console.log(`✓ Using Page: "${page.name}" (${page.pageId})`);

  // 2. Setup 6.0-hour Auto-Blast Campaign
  const testCampaignName = "Automated 6-Hour Golden Window Bot";
  const campaign = await prisma.followUpCampaign.upsert({
    where: { id: "test_auto_campaign_6h" },
    update: {
      name: testCampaignName,
      pageId: page.pageId,
      inactiveHoursThreshold: 6.0,
      autoBlast: true,
      excludePast24h: true,
      dripMinSeconds: 3.0,
      dripMaxSeconds: 3.5,
      isActive: true,
      messageTemplate: "Hello {{customer_name}}, this is an automated 6h follow-up from {{page_name}}! Do you still have questions regarding {{ad_source}}?",
    },
    create: {
      id: "test_auto_campaign_6h",
      name: testCampaignName,
      pageId: page.pageId,
      inactiveHoursThreshold: 6.0,
      autoBlast: true,
      excludePast24h: true,
      dripMinSeconds: 3.0,
      dripMaxSeconds: 3.5,
      isActive: true,
      messageTemplate: "Hello {{customer_name}}, this is an automated 6h follow-up from {{page_name}}! Do you still have questions regarding {{ad_source}}?",
    },
  });
  console.log(`✓ Configured Campaign: "${campaign.name}" with autoBlast=true, threshold=${campaign.inactiveHoursThreshold}h, drip=3.0-3.5s`);

  // 3. Clean up any existing test leads
  await prisma.leadConversation.deleteMany({
    where: {
      psid: { in: ["psid_test_65h", "psid_test_30h"] },
    },
  });

  // 4. Create Test Lead A: 6.5h silent (ELIGIBLE for auto-blast)
  const time65hAgo = new Date(Date.now() - 6.5 * 3600 * 1000);
  const eligibleLead = await prisma.leadConversation.create({
    data: {
      pageId: page.pageId,
      psid: "psid_test_65h",
      customerName: "Tommy Shelby (6.5h Silent)",
      adSource: "Ad #102: Streetwear Jacket",
      lastCustomerMessage: "How much is shipping to Phnom Penh?",
      lastCustomerMessageAt: time65hAgo,
      lastAgentMessage: "Shipping is $2.00. Would you like to order?",
      lastAgentMessageAt: time65hAgo,
      status: "AWAITING_CUSTOMER",
      followUpCount: 0,
    },
  });
  console.log(`✓ Created Eligible Lead: "${eligibleLead.customerName}" (Inactive for 6.5h, AWAITING_CUSTOMER)`);

  // 5. Create Test Lead B: 3.0h silent (CONTROL: SHOULD NOT BE BLASTED)
  const time30hAgo = new Date(Date.now() - 3.0 * 3600 * 1000);
  const controlLead = await prisma.leadConversation.create({
    data: {
      pageId: page.pageId,
      psid: "psid_test_30h",
      customerName: "Grace Burgess (3.0h Silent)",
      adSource: "Ad #102: Streetwear Jacket",
      lastCustomerMessage: "Do you have size L in stock?",
      lastCustomerMessageAt: time30hAgo,
      lastAgentMessage: "Yes, size L is currently in stock!",
      lastAgentMessageAt: time30hAgo,
      status: "AWAITING_CUSTOMER",
      followUpCount: 0,
    },
  });
  console.log(`✓ Created Control Lead: "${controlLead.customerName}" (Inactive for 3.0h, AWAITING_CUSTOMER)`);

  // 6. Execute Auto-Blast Sweep (Simulating the background daemon)
  console.log("\n--- Triggering Background Auto-Blast Sweep ---");
  const sweep1 = await runAutoBlastSweep();
  console.log(`✓ Sweep 1 Result: Campaigns=${sweep1.campaignsChecked}, EligibleFound=${sweep1.totalEligibleFound}, Delivered=${sweep1.totalDelivered}`);

  // 7. Verify Lead A was blasted and Lead B was skipped
  const updatedLeadA = await prisma.leadConversation.findUnique({
    where: { id: eligibleLead.id },
  });
  const updatedLeadB = await prisma.leadConversation.findUnique({
    where: { id: controlLead.id },
  });

  if (updatedLeadA?.status !== "FOLLOWED_UP" || updatedLeadA?.followUpCount !== 1) {
    throw new Error(`FAILURE: Eligible Lead A was not followed up! Status: ${updatedLeadA?.status}, Count: ${updatedLeadA?.followUpCount}`);
  }
  console.log(`✓ VERIFIED: Eligible Lead A (${updatedLeadA.customerName}) was successfully followed up automatically! Status=${updatedLeadA.status}, FollowUpCount=${updatedLeadA.followUpCount}, Timestamp=${updatedLeadA.lastFollowedUpAt?.toISOString()}`);

  if (updatedLeadB?.status !== "AWAITING_CUSTOMER" || updatedLeadB?.followUpCount !== 0) {
    throw new Error(`FAILURE: Control Lead B should NOT have been followed up! Status: ${updatedLeadB?.status}`);
  }
  console.log(`✓ VERIFIED: Control Lead B (${updatedLeadB.customerName}) was correctly IGNORED because 3.0h < 6.0h threshold! Status=${updatedLeadB.status}, FollowUpCount=${updatedLeadB.followUpCount}`);

  // 8. Verify Blast Log was created
  const logA = await prisma.blastLog.findFirst({
    where: { leadId: eligibleLead.id },
    orderBy: { sentAt: "desc" },
  });
  if (!logA || logA.status !== "DELIVERED") {
    throw new Error(`FAILURE: Blast log not found or failed for Lead A!`);
  }
  console.log(`✓ VERIFIED: Blast log recorded in DB with distinct sentAt: ${logA.sentAt.toISOString()}, Text: "${logA.messageSent.substring(0, 45)}..."`);

  // 9. Test Idempotency: Run sweep again immediately
  console.log("\n--- Testing Idempotency (Preventing Duplicate Messages) ---");
  const sweep2 = await runAutoBlastSweep();
  console.log(`✓ Sweep 2 Result: EligibleFound=${sweep2.totalEligibleFound}, Delivered=${sweep2.totalDelivered}`);

  if (sweep2.totalDelivered !== 0) {
    throw new Error("FAILURE: Sweep 2 delivered duplicate messages to already followed up leads!");
  }
  console.log("✓ VERIFIED: Sweep 2 delivered 0 messages. Customers are protected from duplicate spam blasts!");

  // Clean up
  await prisma.leadConversation.deleteMany({
    where: { psid: { in: ["psid_test_65h", "psid_test_30h"] } },
  });
  await prisma.followUpCampaign.delete({ where: { id: "test_auto_campaign_6h" } });

  console.log("\n====================================================");
  console.log("🎉 ALL AUTOMATED BACKGROUND BLAST CHECKS PASSED! 🎉");
  console.log("====================================================");
}

runAutoBlastVerification()
  .catch((err) => {
    console.error("Verification failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
