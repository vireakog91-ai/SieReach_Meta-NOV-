/**
 * SieReach Meta - Google Gemini 2.0 Flash AI Strategic Advisor
 * With Multi-Layered Safety Nets:
 * 1. 15-Minute In-Memory TTL Cache (prevents duplicate API calls on page reloads/tab switching)
 * 2. 2-Minute Rate-Limit Throttling (protects Gemini Free Tier: 15 RPM / 1,500 RPD)
 * 3. 100% Privacy-Preserving (only statistical summaries sent, 0 PII or private chats)
 */

import { prisma } from "@/lib/prisma";
import { HubActionCard, HourlyResponseMetric } from "./advisorEngine";

export interface GeminiAdvisorInput {
  pageId?: string;
  pageName?: string;
  businessName?: string;
  timeRange?: string;
  totalLeads: number;
  ghostedWarmLeads: number;
  avgResponseMinutes: number;
  overallConversionRate: number;
  aov: number;
  dangerHours: HourlyResponseMetric[];
  forceRefresh?: boolean;
}

export interface GeminiAdvisorOutput {
  cards: HubActionCard[];
  isCached: boolean;
  ageMinutes: number;
  ttlMinutes: number;
}

interface CacheEntry {
  timestamp: number;
  cards: HubActionCard[];
}

// In-Memory Multi-Layered API Safety Cache
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes TTL
const THROTTLE_MIN_MS = 2 * 60 * 1000; // Minimum 2 minutes between live API calls per page

const advisorCache = new Map<string, CacheEntry>();
const lastApiCallTimes = new Map<string, number>();

/**
 * Retrieve the active Gemini API key from database or environment
 */
export async function getGeminiApiKey(): Promise<string | null> {
  try {
    const setting = await prisma.systemSetting.findUnique({
      where: { key: "GEMINI_API_KEY" },
    });
    if (setting?.value && setting.value.trim().length > 5) {
      return setting.value.trim();
    }
  } catch (err) {
    // Database read fallback
  }

  if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 5) {
    return process.env.GEMINI_API_KEY.trim();
  }

  return null;
}

/**
 * Generate AI-enhanced strategic action cards using Gemini 2.0 Flash
 * Wrapped in strict rate-limiting and 15-minute caching safety nets.
 */
export async function generateGeminiActionCards(
  input: GeminiAdvisorInput
): Promise<GeminiAdvisorOutput | null> {
  const apiKey = await getGeminiApiKey();
  if (!apiKey) return null;

  const pageKey = input.pageId || "ALL";
  const cacheKey = `${pageKey}:${input.businessName || "ALL"}:${input.timeRange || "all"}:${input.totalLeads}:${input.ghostedWarmLeads}`;
  const now = Date.now();

  // Safety Net 1: Check 15-Minute Cache
  const cached = advisorCache.get(cacheKey);
  if (cached && !input.forceRefresh) {
    const ageMs = now - cached.timestamp;
    if (ageMs < CACHE_TTL_MS) {
      return {
        cards: cached.cards,
        isCached: true,
        ageMinutes: Math.floor(ageMs / 60000),
        ttlMinutes: 15,
      };
    }
  }

  // Safety Net 2: Rate-Limit Throttle (Prevent hammering if user clicks refresh repeatedly)
  const lastCall = lastApiCallTimes.get(pageKey) || 0;
  if (now - lastCall < THROTTLE_MIN_MS && cached) {
    // Return existing cached version to stay well within Gemini RPM limits
    const ageMs = now - cached.timestamp;
    return {
      cards: cached.cards,
      isCached: true,
      ageMinutes: Math.floor(ageMs / 60000),
      ttlMinutes: 15,
    };
  }

  try {
    const dangerHourSummary = input.dangerHours.length > 0
      ? input.dangerHours.map((d) => `${d.label} (Delay: ${d.avgResponseMinutes}m)`).join(", ")
      : "None";

    const pageScopeContext = input.pageName
      ? `Specifically for Facebook Page: "${input.pageName}"`
      : `Across all pages in portfolio "${input.businessName || "SieLab Retail"}"`;

    const prompt = `You are an elite Social Commerce & Facebook Messenger Sales Strategist.
${pageScopeContext}
Analyze the following store metrics and output EXACTLY 3 high-impact, actionable recommendations to increase sales:

METRICS:
- Total Inbound Leads: ${input.totalLeads}
- Ghosted / Abandoned Warm Inquiries: ${input.ghostedWarmLeads}
- Average First Response Delay: ${input.avgResponseMinutes} minutes
- Current Conversion Rate: ${input.overallConversionRate}%
- Average Order Value (AOV): $${input.aov}
- High-Volume Bottleneck Hours: ${dangerHourSummary}

RULES:
1. Target tools MUST be one of: "blaster" (bulk follow-ups to ghosted leads), "response" (automated chatbot triage/rules), or "comcent" (live agent inbox triage).
2. For each recommendation, provide:
   - priority: "URGENT" | "HIGH" | "MEDIUM"
   - title: Punchy, results-driven title (under 12 words)
   - badge: Short category tag (e.g., "Pipeline Recovery", "Speed-to-Lead", "VIP Win-Back")
   - diagnostic: Clear 1-2 sentence explanation of the root cause
   - impact: Realistic revenue or conversion uplift estimate (e.g. "Recovers ~$1,200 in stalled orders")
   - targetTool: "blaster" | "response" | "comcent"
   - actionLabel: Action button text (e.g. "Launch Price Recovery Blast")
   - suggestedCopy: A compelling, psychology-backed message template using {{first_name}} and {{ad_source}} placeholders.

Output format MUST be a valid JSON array of objects.`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
    const payload = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.3,
        maxOutputTokens: 1500,
      },
    };

    // Record API dispatch timestamp for rate limiting
    lastApiCallTimes.set(pageKey, now);

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      console.warn("Gemini API call failed with status:", res.status);
      return cached ? { cards: cached.cards, isCached: true, ageMinutes: Math.floor((now - cached.timestamp) / 60000), ttlMinutes: 15 } : null;
    }

    const json = await res.json();
    const rawText = json?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) return cached ? { cards: cached.cards, isCached: true, ageMinutes: Math.floor((now - cached.timestamp) / 60000), ttlMinutes: 15 } : null;

    const parsed = JSON.parse(rawText);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return cached ? { cards: cached.cards, isCached: true, ageMinutes: Math.floor((now - cached.timestamp) / 60000), ttlMinutes: 15 } : null;
    }

    const formattedCards: HubActionCard[] = parsed.slice(0, 3).map((item: any, idx: number) => ({
      id: `ai-action-${input.pageId || "all"}-${idx + 1}-${Date.now()}`,
      priority: ["URGENT", "HIGH", "MEDIUM", "OPPORTUNITY"].includes(item.priority)
        ? item.priority
        : "HIGH",
      title: item.title || "Strategic Sales Opportunity",
      badge: item.badge || "AI Strategy",
      diagnostic: item.diagnostic || "",
      impact: item.impact || "",
      targetTool: ["blaster", "response", "comcent"].includes(item.targetTool)
        ? item.targetTool
        : "blaster",
      actionLabel: item.actionLabel || "Execute Action",
      suggestedCopy: item.suggestedCopy || undefined,
      metadata: {
        pageId: input.pageId,
        pageName: input.pageName,
        filterType: item.targetTool === "blaster" ? "AI_RECOMMENDED" : undefined,
      },
    }));

    // Save to Cache
    advisorCache.set(cacheKey, {
      timestamp: now,
      cards: formattedCards,
    });

    return {
      cards: formattedCards,
      isCached: false,
      ageMinutes: 0,
      ttlMinutes: 15,
    };
  } catch (err) {
    console.warn("Gemini strategic advisor error (falling back to cached/heuristics):", err);
    if (cached) {
      return {
        cards: cached.cards,
        isCached: true,
        ageMinutes: Math.floor((now - cached.timestamp) / 60000),
        ttlMinutes: 15,
      };
    }
    return null;
  }
}
