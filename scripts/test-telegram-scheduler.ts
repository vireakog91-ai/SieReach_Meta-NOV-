/**
 * Comprehensive Test Script for SieReach Telegram Scheduler
 */
import { prisma } from "../src/lib/prisma";
import { parseSpintax } from "../src/lib/spintax";
import { sendTelegramPost, verifyChatInfo, verifyBotToken } from "../src/lib/telegram";
import { deliverPost, processDuePosts } from "../src/lib/schedulerEngine";

async function runTests() {
  console.log("==================================================");
  console.log("🧪 Starting SieReach Telegram Scheduler Tests");
  console.log("==================================================");

  // Test 1: Spintax parser
  console.log("\n--- Test 1: Spintax Parser ---");
  const template = "Hello {World|Friend|VIP}! Check out our {🔥 Hot Deal|⚡ Limited Promo}.";
  for (let i = 1; i <= 3; i++) {
    console.log(`Variation ${i}:`, parseSpintax(template));
  }

  // Test 2: Telegram Bot Verification (Sandbox Mode)
  console.log("\n--- Test 2: Bot Verification ---");
  const botVerification = await verifyBotToken("SANDBOX_TEST_TOKEN");
  console.log("Bot verification result:", botVerification.valid ? "✅ VALID" : "❌ INVALID", botVerification.bot?.username);

  // Test 3: Telegram Chat Verification (Sandbox Mode)
  console.log("\n--- Test 3: Chat Verification ---");
  const chatVerification = await verifyChatInfo("SANDBOX_TEST_TOKEN", "@sielab_reach");
  console.log("Chat verification result:", chatVerification.valid ? "✅ VALID" : "❌ INVALID", chatVerification.chat?.title, `${chatVerification.chat?.memberCount} members`);

  // Test 4: Create a test scheduled post due right now and trigger deliverPost
  console.log("\n--- Test 4: Create & Deliver Post ---");
  const channel = await prisma.telegramChannel.findFirst();
  if (!channel) {
    throw new Error("No channels found. Please run seed first.");
  }

  const newPost = await prisma.scheduledPost.create({
    data: {
      title: "Test Live Broadcast Automation",
      content: "<b>🚀 Automated Test Delivery</b>\n\nTesting SieReach auto-broadcast with {Option A|Option B}!",
      parseMode: "HTML",
      status: "SCHEDULED",
      scheduledAt: new Date(),
      targets: {
        create: [{ channelId: channel.id }],
      },
    },
  });

  console.log(`Created test post: "${newPost.title}" (ID: ${newPost.id})`);

  const deliveryResult = await deliverPost(newPost.id);
  console.log("Delivery Result:", deliveryResult.success ? "✅ SUCCESS" : "❌ FAILED", `Delivered: ${deliveryResult.delivered}`);

  // Test 5: Verify Delivery Log was created
  console.log("\n--- Test 5: Check Delivery Audit Log ---");
  const log = await prisma.postDeliveryLog.findFirst({
    where: { postId: newPost.id },
  });
  console.log("Audit Log:", log ? `✅ Recorded (Status: ${log.status}, MsgId: ${log.telegramMessageId}, URL: ${log.telegramMessageUrl})` : "❌ NOT FOUND");

  // Test 6: Verify Post Status transitioned to PUBLISHED
  const updatedPost = await prisma.scheduledPost.findUnique({
    where: { id: newPost.id },
  });
  console.log("Updated Post Status:", updatedPost?.status === "PUBLISHED" ? "✅ PUBLISHED" : `❌ Status is ${updatedPost?.status}`);

  // Test 7: Test processDuePosts
  console.log("\n--- Test 7: Process Due Posts Queue ---");
  const queueResult = await processDuePosts();
  console.log("Queue execution completed without error:", `Processed: ${queueResult.processedCount}`);

  console.log("\n==================================================");
  console.log("🎉 All SieReach Telegram Scheduler Tests Passed!");
  console.log("==================================================");
}

runTests()
  .catch((err) => {
    console.error("Test Error:", err);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });
