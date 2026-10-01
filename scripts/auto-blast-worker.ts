import { prisma } from "../src/lib/prisma";
import { runAutoBlastSweep } from "../src/app/api/cron/auto-blast/route";

const SWEEP_INTERVAL_MS = 30_000; // Poll every 30 seconds

async function runSweep() {
  const now = new Date();
  const timeStr = now.toLocaleTimeString();

  try {
    const sweepReport = await runAutoBlastSweep();

    if (sweepReport.totalDelivered > 0) {
      console.log(
        `[${timeStr}] [Auto-Blast Daemon] Sweep complete: Delivered ${sweepReport.totalDelivered} automated message(s) across ${sweepReport.campaignsChecked} campaign(s).`
      );
      for (const res of sweepReport.results) {
        if (res.delivered > 0) {
          for (const d of res.dispatchedCustomers || []) {
            console.log(
              `  ✓ Dispatched to ${d.name} on ${d.page} (drip delay: +${d.dripDelay}s)`
            );
          }
        }
      }
    } else {
      console.log(
        `[${timeStr}] [Auto-Blast Daemon] Idle: Checked ${sweepReport.campaignsChecked} campaign(s). No new leads reached threshold.`
      );
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
