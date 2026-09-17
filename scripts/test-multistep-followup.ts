import { prisma } from "../src/lib/prisma";
import { executeFollowUpBlast } from "../src/lib/blaster";

async function runMultiStepTest() {
  console.log("====================================================");
  console.log("   SieReach Multi-Step Follow-Up & Cooldown Test    ");
  console.log("====================================================");

  // 1. Ensure isolated test page exists with mock token
  const testPageId = "test_page_multistep";
  let page = await prisma.facebookPage.findFirst({ where: { pageId: testPageId } });
  if (!page) {
    page = await prisma.facebookPage.create({
      data: {
        pageId: testPageId,
        name: "Test Multi-Step Page",
        accessToken: "EAAB_mock_test_token",
      },
    });
  } else {
    page = await prisma.facebookPage.update({
      where: { pageId: testPageId },
      data: { accessToken: "EAAB_mock_test_token" }
    });
  }

  // 2. Create isolated test campaign (autoBlast: false so background worker leaves it alone)
  const campaign = await prisma.followUpCampaign.upsert({
    where: { id: "test_multistep_campaign" },
    update: {
      pageId: page.pageId,
      maxFollowUps: 2,
      cooldownHours: 3.0,
      inactiveHoursThreshold: 2.0,
      autoBlast: false,
      excludePast24h: true,
    },
    create: {
      id: "test_multistep_campaign",
      name: "Multi-Step 2x Follow-Up Test Campaign",
      pageId: page.pageId,
      maxFollowUps: 2,
      cooldownHours: 3.0,
      inactiveHoursThreshold: 2.0,
      messageTemplate: "Hello {{customer_name}}, this is follow-up test from {{page_name}}!",
      autoBlast: false,
      excludePast24h: true,
    },
  });

  console.log(`✓ Campaign configured: maxFollowUps=${campaign.maxFollowUps}, cooldownHours=${campaign.cooldownHours}h`);

  // 3. Create test lead: User A on the isolated test page
  const psid = "test_user_a_" + Date.now();
  const testLead = await prisma.leadConversation.create({
    data: {
      pageId: page.pageId,
      psid,
      customerName: "User A (Test Lead)",
      lastCustomerMessage: "Hi, how much is the hoodie?",
      lastCustomerMessageAt: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4h ago (within 24h)
      lastAgentMessage: "Hello! It is $45 with free delivery.",
      lastAgentMessageAt: new Date(Date.now() - 3.5 * 60 * 60 * 1000), // 3.5h ago (silent > 2h threshold)
      status: "AWAITING_CUSTOMER",
      followUpCount: 0,
    },
  });

  console.log(`✓ Created user_A: status=AWAITING_CUSTOMER, followUpCount=0`);

  // STEP 1: First Blast
  console.log("\n--- Triggering Step 1 Follow-Up Blast ---");
  const blast1 = await executeFollowUpBlast({
    campaignId: campaign.id,
    targetPageId: page.pageId,
    customThresholdHours: 2.0,
    maxFollowUps: 2,
    cooldownHours: 3.0,
  });

  console.log(`✓ Step 1 Blast Result: targeted=${blast1.totalTargeted}, successful=${blast1.successful}`);
  const updatedLead1 = await prisma.leadConversation.findUnique({ where: { id: testLead.id } });
  console.log(`✓ Lead State after Step 1: followUpCount=${updatedLead1?.followUpCount}, status=${updatedLead1?.status}`);

  if (updatedLead1?.followUpCount !== 1) {
    throw new Error(`Expected followUpCount to be 1, got ${updatedLead1?.followUpCount}`);
  }

  // STEP 2: Immediate Blast Attempt (within 3h cooldown)
  console.log("\n--- Testing 3-Hour Cooldown Protection (Immediate follow-up) ---");
  const blastImmediate = await executeFollowUpBlast({
    campaignId: campaign.id,
    targetPageId: page.pageId,
    customThresholdHours: 2.0,
    maxFollowUps: 2,
    cooldownHours: 3.0,
  });

  console.log(`✓ Cooldown Check Result: targeted=${blastImmediate.totalTargeted}, delivered=${blastImmediate.successful}`);
  if (blastImmediate.totalTargeted !== 0) {
    throw new Error(`Expected 0 leads targeted during 3h cooldown, but got ${blastImmediate.totalTargeted}`);
  }
  console.log("✓ VERIFIED: user_A was BLOCKED by 3h cooldown. Anti-spam protection working!");

  // STEP 3: Simulate 3.5 Hours Elapsed
  console.log("\n--- Simulating 3.5 Hours Elapsed (Cooldown expired) ---");
  await prisma.leadConversation.update({
    where: { id: testLead.id },
    data: {
      lastFollowedUpAt: new Date(Date.now() - 3.5 * 60 * 60 * 1000), // 3.5 hours ago
    },
  });

  // STEP 4: Trigger Step 2 Follow-Up Blast
  console.log("--- Triggering Step 2 Follow-Up Blast ---");
  const blast2 = await executeFollowUpBlast({
    campaignId: campaign.id,
    targetPageId: page.pageId,
    customThresholdHours: 2.0,
    maxFollowUps: 2,
    cooldownHours: 3.0,
  });

  console.log(`✓ Step 2 Blast Result: targeted=${blast2.totalTargeted}, successful=${blast2.successful}`);
  const updatedLead2 = await prisma.leadConversation.findUnique({ where: { id: testLead.id } });
  console.log(`✓ Lead State after Step 2: followUpCount=${updatedLead2?.followUpCount}, status=${updatedLead2?.status}`);

  if (updatedLead2?.followUpCount !== 2) {
    throw new Error(`Expected followUpCount to be 2, got ${updatedLead2?.followUpCount}`);
  }

  // STEP 5: Attempt 3rd Blast (Should be blocked by maxFollowUps = 2)
  console.log("\n--- Testing Max Follow-Up Cap (Attempting 3rd follow-up after another 4h) ---");
  await prisma.leadConversation.update({
    where: { id: testLead.id },
    data: {
      lastFollowedUpAt: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
    },
  });

  const blast3 = await executeFollowUpBlast({
    campaignId: campaign.id,
    targetPageId: page.pageId,
    customThresholdHours: 2.0,
    maxFollowUps: 2,
    cooldownHours: 3.0,
  });

  console.log(`✓ Max Cap Check Result: targeted=${blast3.totalTargeted}, delivered=${blast3.successful}`);
  if (blast3.totalTargeted !== 0) {
    throw new Error(`Expected 0 leads targeted because maxFollowUps=2 reached, but got ${blast3.totalTargeted}`);
  }
  console.log("✓ VERIFIED: user_A was BLOCKED from receiving a 3rd follow-up. Max follow-up cap (2) enforced!");

  // Cleanup test records
  await prisma.leadConversation.delete({ where: { id: testLead.id } });
  await prisma.blastLog.deleteMany({ where: { recipientPsid: psid } });
  await prisma.followUpCampaign.delete({ where: { id: "test_multistep_campaign" } });
  await prisma.facebookPage.delete({ where: { pageId: testPageId } });

  console.log("\n🎉 ALL MULTI-STEP FOLLOW-UP & COOLDOWN TESTS PASSED! 🎉");
}

runMultiStepTest()
  .catch((err) => {
    console.error("Test failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
