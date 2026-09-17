import { prisma } from "../src/lib/prisma";
import { scanInactiveLeads } from "../src/lib/scanner";
import { executeFollowUpBlast } from "../src/lib/blaster";

async function runVerification() {
  console.log("🚀 Starting SieReach Workflow Verification...");

  // 1. Verify Pages
  const pages = await prisma.facebookPage.findMany();
  console.log(`✓ Detected ${pages.length} Connected Facebook Pages in DB.`);
  if (pages.length !== 5) {
    throw new Error(`Expected 5 pages, found ${pages.length}`);
  }

  // 2. Verify 24-hour scan
  console.log("\n--- Testing 24h Inactive Customer Detection ---");
  const scan24 = await scanInactiveLeads(24.0);
  console.log(`✓ Total Leads: ${scan24.totalLeads}`);
  console.log(`✓ Awaiting Customer Response: ${scan24.awaitingCustomer}`);
  console.log(`✓ Inactive >= 24h: ${scan24.unresponsiveCount}`);
  console.log(`✓ Urgent (<6h left in 24h window): ${scan24.urgent24hCount}`);
  console.log(`✓ Expired 24h (Requires HUMAN_AGENT tag): ${scan24.expired24hCount}`);

  if (scan24.unresponsiveCount === 0) {
    throw new Error("Expected at least one lead inactive for >= 24h");
  }

  // 3. Verify 6-hour scan
  console.log("\n--- Testing 6h Inactivity Threshold ---");
  const scan6 = await scanInactiveLeads(6.0);
  console.log(`✓ Inactive >= 6h: ${scan6.unresponsiveCount}`);
  if (scan6.unresponsiveCount <= scan24.unresponsiveCount) {
    throw new Error("A 6-hour threshold should capture more or equal inactive leads than 24h");
  }

  // 4. Test Follow-Up Blast Execution (Message + Image)
  console.log("\n--- Testing Follow-Up Blast Execution ---");
  const targetLead = scan24.leads.find((l) => l.isEligibleForFollowUp);
  if (!targetLead) {
    throw new Error("No eligible lead found for blast test");
  }

  console.log(`Targeting Customer: "${targetLead.customerName}" on Page: "${targetLead.pageName}"`);
  console.log(`Initial Status: ${targetLead.status}, Inactive for: ${targetLead.hoursUnresponsive}h`);

  const blastReport = await executeFollowUpBlast({
    leadIds: [targetLead.id],
    customMessageTemplate:
      "Hi {{first_name}}! We saw you reached out to {{page_name}} regarding {{ad_source}}. Here is an exclusive 15% discount for you!",
    customImageUrl:
      "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=800&auto=format&fit=crop&q=80",
    messageTag: "HUMAN_AGENT",
    excludePast24h: false, // allow target lead for single test
    dripMinSeconds: 3.0,
    dripMaxSeconds: 5.0,
  });

  console.log(`✓ Blast Report: Targeted=${blastReport.totalTargeted}, Success=${blastReport.successful}, Failed=${blastReport.failed}`);
  console.log(`✓ Drip Pacing Active: ${blastReport.dripPacing.minSeconds}s - ${blastReport.dripPacing.maxSeconds}s randomized interval`);
  if (blastReport.successful !== 1) {
    throw new Error("Expected 1 successful blast delivery");
  }

  // Test Tag Safety Exclusion
  console.log("\n--- Testing Tag Safety Exclusion (>24h Safe Mode) ---");
  const tagSafeReport = await executeFollowUpBlast({
    customThresholdHours: 6.0,
    excludePast24h: true, // Tag Safety Active
    dripMinSeconds: 3.0,
    dripMaxSeconds: 5.0,
  });
  console.log(`✓ Tag Safety Enabled: Excluded ${tagSafeReport.excludedPast24hCount} leads that exceeded 24 hours.`);
  console.log(`✓ Safe In-Window Leads Targeted: ${tagSafeReport.totalTargeted}`);

  // 5. Verify Database Updates
  const updatedLead = await prisma.leadConversation.findUnique({
    where: { id: targetLead.id },
  });

  console.log(`✓ Updated Lead Status: ${updatedLead?.status}`);
  console.log(`✓ Follow-Up Count: ${updatedLead?.followUpCount}`);
  if (updatedLead?.status !== "FOLLOWED_UP" || updatedLead?.followUpCount !== 1) {
    throw new Error("Lead status or follow-up count did not update correctly");
  }

  // 6. Verify Blast Log Created
  const latestLog = await prisma.blastLog.findFirst({
    where: { recipientPsid: targetLead.psid },
    orderBy: { sentAt: "desc" },
  });

  console.log(`✓ Created Blast Log: ID=${latestLog?.id}`);
  console.log(`✓ Delivered Message: "${latestLog?.messageSent}"`);
  console.log(`✓ Attached Image: "${latestLog?.imageUrl}"`);
  console.log(`✓ Log Status: ${latestLog?.status}`);

  if (!latestLog || latestLog.status !== "DELIVERED" || !latestLog.imageUrl) {
    throw new Error("BlastLog was not created with correct status or image");
  }

  console.log("\n🎉 ALL VERIFICATION CHECKS PASSED SUCCESSFULLY!");
}

runVerification()
  .catch((err) => {
    console.error("Verification failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
