/**
 * Automated Verification & Diagnostic Test Suite for SieReach Meta Central Hub
 */
import {
  calculateHealthScore,
  generateMockHubSummary,
  generateHeuristicActionCards,
} from "../src/lib/advisorEngine";

import {
  generateGeminiActionCards,
  getGeminiApiKey,
} from "../src/lib/geminiAdvisor";

async function runTests() {
  console.log("=================================================");
  console.log("🚀 STARTING CENTRAL HUB AUTOMATED TEST SUITE");
  console.log("=================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, desc: string) {
    if (condition) {
      console.log(`✅ PASS: ${desc}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${desc}`);
      failed++;
    }
  }

  // --- TEST SUITE 1: Health Score & Math Formulas ---
  console.log("--- TEST SUITE 1: Math Engine & Formulas ---");
  const perfectHealth = calculateHealthScore({
    conversionRate: 25,
    avgResponseMinutes: 3,
    followUpCoverageRate: 95,
    ghostRate: 15,
  });
  assert(perfectHealth.score >= 85, `High efficiency leads to EXCELLENT score (got ${perfectHealth.score})`);
  assert(perfectHealth.label === "EXCELLENT", `Label is EXCELLENT (got ${perfectHealth.label})`);

  const criticalHealth = calculateHealthScore({
    conversionRate: 2,
    avgResponseMinutes: 90,
    followUpCoverageRate: 10,
    ghostRate: 75,
  });
  assert(criticalHealth.score <= 45, `Low efficiency leads to CRITICAL score (got ${criticalHealth.score})`);
  assert(criticalHealth.label === "CRITICAL", `Label is CRITICAL (got ${criticalHealth.label})`);

  // --- TEST SUITE 2: Lost Pipeline Calculation ---
  console.log("\n--- TEST SUITE 2: Lost Pipeline & Funnel ---");
  const aov45 = generateMockHubSummary(45, "ALL");
  assert(
    aov45.lostPipelineRevenue === aov45.ghostedWarmLeads * 45,
    `Lost pipeline revenue matches ($45 AOV): ${aov45.lostPipelineRevenue} == ${aov45.ghostedWarmLeads * 45}`
  );

  const aov100 = generateMockHubSummary(100, "ALL");
  assert(
    aov100.lostPipelineRevenue === aov100.ghostedWarmLeads * 100,
    `Lost pipeline scales with custom AOV ($100 AOV): ${aov100.lostPipelineRevenue}`
  );

  assert(aov45.funnel.length === 4, `Funnel has exactly 4 progression stages (got ${aov45.funnel.length})`);
  assert(aov45.hourlyActivity.length === 24, `Hourly activity has 24 hour buckets (got ${aov45.hourlyActivity.length})`);

  // --- TEST SUITE 3: Page Scoping & Comparisons ---
  console.log("\n--- TEST SUITE 3: Page-Centric Scoping & Comparisons ---");
  assert(
    Array.isArray(aov45.pageComparisons) && aov45.pageComparisons.length === 2,
    `ALL Pages view produces page comparisons array (got ${aov45.pageComparisons?.length} pages)`
  );

  const singlePage = generateMockHubSummary(45, "page_123", "Beauty & Skin Care");
  assert(
    singlePage.pageComparisons === undefined,
    `Single page view does NOT output redundant page comparison strip`
  );
  assert(
    singlePage.selectedPageName === "Beauty & Skin Care",
    `Single page correctly records selectedPageName`
  );
  assert(
    singlePage.actionCards[0].title.includes("Beauty & Skin Care"),
    `Action cards are page-scoped: "${singlePage.actionCards[0].title}"`
  );

  // --- TEST SUITE 4: Action Cards & Deep Links ---
  console.log("\n--- TEST SUITE 4: Action Cards & Tool Routing ---");
  const cards = aov45.actionCards;
  assert(cards.length >= 2, `Generates at least 2 actionable sales cards (got ${cards.length})`);

  const priceCard = cards.find((c) => c.id.startsWith("action-price-recovery"));
  assert(priceCard !== undefined, `Generates 'Price Recovery' action card`);
  assert(priceCard?.targetTool === "blaster", `Price Recovery targets 'blaster' tool`);
  assert(typeof priceCard?.suggestedCopy === "string" && priceCard.suggestedCopy.length > 20, `Provides psychology-backed message template`);

  const eveningCard = cards.find((c) => c.id.startsWith("action-evening-bot"));
  assert(eveningCard !== undefined, `Generates 'Evening Triage Bot' action card`);
  assert(eveningCard?.targetTool === "response", `Evening Bot targets 'response' tool`);

  // --- TEST SUITE 5: Gemini AI Advisor Safety Nets & Fallbacks ---
  console.log("\n--- TEST SUITE 5: API Safety Nets & Caching ---");
  const key = await getGeminiApiKey();
  assert(key === null || typeof key === "string", `getGeminiApiKey handles missing DB record gracefully without crashing`);

  const fallbackResult = await generateGeminiActionCards({
    totalLeads: 100,
    ghostedWarmLeads: 25,
    avgResponseMinutes: 15,
    overallConversionRate: 18,
    aov: 45,
    dangerHours: [],
  });
  assert(fallbackResult === null, `When no key is configured, Gemini advisor safely returns null with zero errors`);

  // --- TEST SUITE 6: Meta Ads Advisor Intelligence & Deep Linking ---
  console.log("\n--- TEST SUITE 6: Ads Advisor Intelligence & Deep Linking ---");
  const adsData = aov45.adsAdvisor;
  assert(adsData !== undefined, "Ads Advisor summary object exists on Hub output");
  assert((adsData?.trackedCreativesCount ?? 0) > 0, `Tracked creatives counted (${adsData?.trackedCreativesCount})`);
  assert(adsData?.topWinner !== null && adsData?.topWinner?.adSource === "Summer-Reel-Review-01", `Identifies top ROAS winner (${adsData?.topWinner?.adSource})`);
  assert(adsData?.worstWaster !== null && adsData?.worstWaster?.adSource === "Broad-Interest-Promo-V2", `Identifies budget bleeder (${adsData?.worstWaster?.adSource})`);

  const adWinnerCard = cards.find((c) => c.id.startsWith("action-ad-winner"));
  assert(adWinnerCard !== undefined, "Generates 'Scale Winning Ad' action card");
  assert(adWinnerCard?.targetTool === "ad-attribution", "Scale Winning Ad card targets 'ad-attribution'");
  assert(adWinnerCard?.metadata?.filterType === "SCALE_WINNER", "Winner card metadata includes filterType SCALE_WINNER");
  assert(adWinnerCard?.metadata?.adSource === "Summer-Reel-Review-01", "Winner card metadata passes specific adSource");

  const adBleederCard = cards.find((c) => c.id.startsWith("action-ad-waster"));
  assert(adBleederCard !== undefined, "Generates 'Pause Budget Bleeder' action card");
  assert(adBleederCard?.targetTool === "ad-attribution", "Budget Bleeder card targets 'ad-attribution'");
  assert(adBleederCard?.metadata?.filterType === "BUDGET_BLEEDER", "Bleeder card metadata includes filterType BUDGET_BLEEDER");
  assert(adBleederCard?.metadata?.adSource === "Broad-Interest-Promo-V2", "Bleeder card metadata passes specific adSource");

  console.log("\n=================================================");
  console.log(`🏁 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log("=================================================");
}

runTests().catch(console.error);
