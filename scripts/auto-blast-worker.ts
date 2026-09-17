import { prisma } from "../src/lib/prisma";
import { executeFollowUpBlast } from "../src/lib/blaster";

const SWEEP_INTERVAL_MS = 30_000; // Poll every 30 seconds

async function runSweep() {
  const now = new Date();
  const timeStr = now.toLocaleTimeString();

  try {
    const autoCampaigns = await prisma.followUpCampaign.findMany({
      where: {
        autoBlast: true,
        isActive: true,
      },
    });

    if (autoCampaigns.length === 0) {
      console.log(`[${timeStr}] [Auto-Blast Daemon] Idle: 0 active auto-blast campaigns.`);
      return;
    }

    let totalDelivered = 0;

    for (const campaign of autoCampaigns) {
      const threshold = campaign.inactiveHoursThreshold;

      const candidateLeads = await prisma.leadConversation.findMany({
        where: {
          status: "AWAITING_CUSTOMER",
          followUpCount: 0,
          ...(campaign.pageId ? { pageId: campaign.pageId } : {}),
        },
        include: { page: true },
      });

      const eligibleLeads = candidateLeads.filter((lead) => {
        const agentTime = new Date(lead.lastAgentMessageAt).getTime();
        const hoursInactive = (now.getTime() - agentTime) / (1000 * 60 * 60);
        if (hoursInactive < threshold) return false;

        const custTime = new Date(lead.lastCustomerMessageAt).getTime();
        const hoursSinceCust = (now.getTime() - custTime) / (1000 * 60 * 60);

        if (campaign.excludePast24h && hoursSinceCust > 24.0) return false;
        if (hoursSinceCust > 168.0) return false;

        return true;
      });

      if (eligibleLeads.length > 0) {
        console.log(
          `[${timeStr}] [Auto-Blast Daemon] Found ${eligibleLeads.length} lead(s) for campaign "${campaign.name}" (Threshold: ${threshold}h). Blasting with drip...`
        );

        const leadIds = eligibleLeads.map((l) => l.id);
        const report = await executeFollowUpBlast({
          campaignId: campaign.id,
          leadIds,
          customThresholdHours: threshold,
          excludePast24h: campaign.excludePast24h,
          dripMinSeconds: campaign.dripMinSeconds,
          dripMaxSeconds: campaign.dripMaxSeconds,
          messageTag: campaign.messageTag || "HUMAN_AGENT",
        });

        totalDelivered += report.successful;
        await prisma.followUpCampaign.update({
          where: { id: campaign.id },
          data: { lastRunAt: new Date() },
        });

        for (const item of report.details) {
          console.log(
            `  ✓ Dispatched to ${item.customerName} on ${item.pageName} (drip delay: +${item.dripDelayApplied}s)`
          );
        }
      }
    }

    if (totalDelivered > 0) {
      console.log(`[${timeStr}] [Auto-Blast Daemon] Sweep complete: Delivered ${totalDelivered} automated message(s).`);
    } else {
      console.log(`[${timeStr}] [Auto-Blast Daemon] Sweep complete: Checked ${autoCampaigns.length} campaign(s). No new leads reached threshold.`);
    }
  } catch (err) {
    console.error(`[${timeStr}] [Auto-Blast Daemon] Error in sweep:`, err);
  }
}

async function main() {
  console.log("====================================================");
  console.log("   SieReach Automated Background Daemon Started     ");
  console.log(`   Polling interval: ${SWEEP_INTERVAL_MS / 1000}s   `);
  console.log("====================================================");

  // Run immediately on start
  await runSweep();

  // Set up recurring interval
  const interval = setInterval(runSweep, SWEEP_INTERVAL_MS);

  const shutdown = async () => {
    console.log("\n[Auto-Blast Daemon] Stopping daemon cleanly...");
    clearInterval(interval);
    await prisma.$disconnect();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((err) => {
  console.error("Daemon fatal error:", err);
  process.exit(1);
});
