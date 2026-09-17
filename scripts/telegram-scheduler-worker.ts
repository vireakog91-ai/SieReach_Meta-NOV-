/**
 * SieReach Telegram Scheduler - Background Worker Process
 * Runs a continuous heartbeat loop checking for posts due for delivery.
 *
 * Run with: npx tsx scripts/telegram-scheduler-worker.ts
 */

import { processDuePosts } from "../src/lib/schedulerEngine";

const INTERVAL_MS = 15000; // 15 seconds

console.log("==================================================");
console.log("🚀 SieReach Telegram Scheduler Worker Started");
console.log(`⏱️  Polling Interval: ${INTERVAL_MS / 1000}s`);
console.log("==================================================");

async function tick() {
  try {
    const timestamp = new Date().toLocaleTimeString();
    const result = await processDuePosts();

    if (result.processedCount > 0) {
      console.log(
        `[${timestamp}] ⚡ Processed ${result.processedCount} due post(s): ${result.successCount} succeeded, ${result.failedCount} failed.`
      );
      result.details.forEach((d) => {
        console.log(
          `   - "${d.title}" -> ${d.success ? "✅ Delivered" : "❌ Failed"}`
        );
        if (d.errors && d.errors.length > 0) {
          console.log(`     Errors: ${d.errors.join("; ")}`);
        }
      });
    }
  } catch (error: any) {
    console.error(`[Worker Error]: ${error.message}`);
  }
}

// Initial run immediately
tick();

// Schedule heartbeat
setInterval(tick, INTERVAL_MS);
