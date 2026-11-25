"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  TrendingUp,
  AlertTriangle,
  Zap,
  CheckCircle2,
  Clock,
  DollarSign,
  ArrowUpRight,
  RefreshCw,
  Sparkles,
  Bot,
  Target,
  Send,
  Layers,
  ChevronRight,
  Info,
  Calendar,
  Flame,
  MessageSquare,
  Building2,
  ExternalLink,
  ShieldCheck,
  Check,
  ShieldAlert,
  ChevronDown,
  Radar,
} from "lucide-react";
import { HubSummaryResult, HubActionCard, HourlyResponseMetric, PageHealthSummary } from "@/lib/advisorEngine";

interface CentralHubTabProps {
  pages: Array<{ pageId: string; name: string; businessName?: string; accessToken?: string }>;
  selectedPageId: string;
  onSelectPageId: (pageId: string) => void;
  activeBusiness?: string;
  isMockMode?: boolean;
  onNavigateToSettings?: (subTab: "pages" | "api" | "preferences") => void;
  onTriggerBlaster?: (leadCount?: number, suggestedCopy?: string) => void;
  onNavigateToResponseRules?: (rulePreset?: { name: string; template: string }) => void;
  onNavigateToComcent?: () => void;
  onNavigateToAdAttribution?: (options?: { tier?: string; search?: string }) => void;
  onNavigateToAdvanceScan?: () => void;
  onNavigateToCdc?: () => void;
}

export function CentralHubTab({
  pages,
  selectedPageId,
  onSelectPageId,
  activeBusiness = "ALL",
  isMockMode = true,
  onNavigateToSettings,
  onTriggerBlaster,
  onNavigateToResponseRules,
  onNavigateToComcent,
  onNavigateToAdAttribution,
  onNavigateToAdvanceScan,
  onNavigateToCdc,
}: CentralHubTabProps) {
  const [timeRange, setTimeRange] = useState<"7d" | "30d" | "all">("all");
  const [aov, setAov] = useState<number>(45);
  const [isEditingAov, setIsEditingAov] = useState(false);
  const [tempAov, setTempAov] = useState("45");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [summaryData, setSummaryData] = useState<HubSummaryResult | null>(null);
  const [expandedCardId, setExpandedCardId] = useState<string | null>("action-price-recovery-all");
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // Load AOV from settings or localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("sielab_aov");
      if (saved && !isNaN(parseInt(saved, 10))) {
        setAov(parseInt(saved, 10));
        setTempAov(saved);
      }
    }
  }, []);

  const fetchHubData = useCallback(
    async (forceRefresh = false) => {
      setIsRefreshing(true);
      try {
        const params = new URLSearchParams({
          pageId: selectedPageId,
          timeRange,
          business: activeBusiness,
          aov: aov.toString(),
          refresh: forceRefresh ? "true" : "false",
        });
        const res = await fetch(`/api/analytics/hub-summary?${params.toString()}`, {
          headers: { "Cache-Control": "no-cache" },
        });
        const json = await res.json();
        if (json.success && json.data) {
          setSummaryData(json.data);
        }
      } catch (err) {
        console.error("Failed to load hub analytics summary:", err);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [selectedPageId, timeRange, activeBusiness, aov]
  );

  useEffect(() => {
    fetchHubData();
  }, [fetchHubData]);

  const handleSaveAov = () => {
    const val = parseInt(tempAov, 10);
    if (!isNaN(val) && val > 0) {
      setAov(val);
      if (typeof window !== "undefined") {
        localStorage.setItem("sielab_aov", val.toString());
      }
      setIsEditingAov(false);
    }
  };

  const handleExecuteAction = (card: HubActionCard) => {
    if (card.targetTool === "blaster") {
      setActionNotice(`🚀 Launching Follow-Up Blaster with targeted segment...`);
      setTimeout(() => {
        setActionNotice(null);
        onTriggerBlaster?.(card.metadata?.leadCount, card.suggestedCopy);
      }, 700);
    } else if (card.targetTool === "response") {
      setActionNotice(`⚡ Routing to Response Engine to configure rule...`);
      setTimeout(() => {
        setActionNotice(null);
        onNavigateToResponseRules?.({
          name: card.metadata?.suggestedRuleName || card.title,
          template: card.suggestedCopy || "",
        });
      }, 700);
    } else if (card.targetTool === "comcent") {
      setActionNotice(`🟣 Opening Comcent live triage inbox...`);
      setTimeout(() => {
        setActionNotice(null);
        onNavigateToComcent?.();
      }, 700);
    } else if (card.targetTool === "ad-attribution") {
      setActionNotice(`🎯 Routing to Ads Advisor & Meta Ad Attribution...`);
      setTimeout(() => {
        setActionNotice(null);
        const tier =
          card.metadata?.filterType === "SCALE_WINNER"
            ? "Scale Winner"
            : card.metadata?.filterType === "BUDGET_BLEEDER"
            ? "Underperforming"
            : undefined;
        onNavigateToAdAttribution?.({
          tier,
          search: card.metadata?.adSource,
        });
      }, 700);
    }
  };

  // Check if current page needs an access token
  const currentPage = pages.find((p) => p.pageId === selectedPageId);
  const needsPageToken =
    !isMockMode &&
    currentPage &&
    (!currentPage.accessToken || currentPage.accessToken.trim().length === 0);

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-300">
      {/* Top Notification Toast */}
      {actionNotice && (
        <div className="fixed top-20 right-6 z-50 bg-slate-900 text-white dark:bg-emerald-600 px-4 py-3 rounded-2xl shadow-xl flex items-center space-x-2 border border-slate-700 animate-in slide-in-from-top-4">
          <Sparkles className="w-4 h-4 text-emerald-400 dark:text-white" />
          <span className="text-xs font-bold">{actionNotice}</span>
        </div>
      )}

      {/* Unified Hero Banner */}
      <div className="tool-hero-banner hub-hero-banner bg-gradient-to-r from-emerald-50 via-teal-50/50 to-white dark:from-emerald-950 dark:via-teal-950 dark:to-slate-900 border border-emerald-200/80 dark:border-emerald-800/40 rounded-3xl p-6 sm:p-7 text-slate-900 dark:text-white shadow-sm dark:shadow-xl relative overflow-hidden transition-all">
        <div className="absolute -right-16 -top-16 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-40 -bottom-10 w-48 h-48 bg-teal-500/15 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div>
            <div className="flex items-center space-x-2.5">
              <span className="hub-badge-pill px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-400/30 text-[11px] font-bold uppercase tracking-wider">
                Intelligence Hub
              </span>
              <span className="text-xs text-slate-600 dark:text-emerald-200/70 font-medium">
                Connected Pages: <strong className="text-slate-900 dark:text-white font-bold">{pages.length}</strong>
              </span>
              {summaryData?.aiEnhanced ? (
                <span className="px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-400/30 text-[10px] font-semibold flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> Gemini 2.0 Flash AI
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-semibold flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-500" /> Rule-Based
                </span>
              )}
              {isMockMode && (
                <span className="px-2 py-0.5 rounded-md bg-sky-100 dark:bg-sky-500/20 text-sky-800 dark:text-sky-300 border border-sky-300 dark:border-sky-400/30 text-[10px] font-semibold">
                  Sandbox Active
                </span>
              )}
            </div>

            <h1 className="tool-heading text-2xl sm:text-3xl font-extrabold tracking-tight mt-2 text-slate-900 dark:text-white flex items-center gap-2">
              <Zap className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
              Central Intelligence & Sales Hub
            </h1>
            <p className="tool-desc text-sm text-slate-600 dark:text-emerald-100/80 mt-1 max-w-2xl leading-relaxed">
              Executive diagnostics, page-level bottleneck auditing, and 1-click corrective playbooks across brand portfolios.
            </p>
          </div>

          {/* SubTab / Controls Switcher */}
          <div className="tool-subtab-container flex flex-wrap items-center p-1.5 bg-white/90 dark:bg-black/40 backdrop-blur-md rounded-2xl border border-slate-200 dark:border-white/10 shrink-0 self-start md:self-auto shadow-xs gap-1.5">
            {/* Page Selector */}
            <div className="flex items-center space-x-1.5 px-2.5 py-1 text-xs text-slate-700 dark:text-slate-300 font-bold border-r border-slate-200 dark:border-slate-800 pr-2">
              <Layers className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <select
                value={selectedPageId}
                onChange={(e) => onSelectPageId(e.target.value)}
                className="bg-transparent text-slate-800 dark:text-slate-200 font-bold focus:outline-none cursor-pointer max-w-[130px] truncate"
              >
                <option value="ALL" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                  All Pages
                </option>
                {pages.map((p) => (
                  <option key={p.pageId} value={p.pageId} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Time Filter Pills */}
            <button
              onClick={() => setTimeRange("7d")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                timeRange === "7d"
                  ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/25"
                  : "tool-subtab-btn-inactive text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5"
              }`}
            >
              7 Days
            </button>
            <button
              onClick={() => setTimeRange("30d")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                timeRange === "30d"
                  ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/25"
                  : "tool-subtab-btn-inactive text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5"
              }`}
            >
              30 Days
            </button>
            <button
              onClick={() => setTimeRange("all")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                timeRange === "all"
                  ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/25"
                  : "tool-subtab-btn-inactive text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5"
              }`}
            >
              All Time
            </button>

            {/* Refresh */}
            <button
              type="button"
              onClick={() => fetchHubData(true)}
              disabled={isRefreshing}
              className="p-1.5 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition cursor-pointer"
              title="Refresh Hub Data"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Secondary Toolbar: Safety Net, Cache Status & AOV Setting */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center space-x-2 text-slate-500 dark:text-slate-400">
          <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
          <span>
            {summaryData?.cacheStatus?.isCached ? (
              <>
                Analysis cached <strong>{summaryData.cacheStatus.ageMinutes}m</strong> ago (Rate-limit safe • <strong>0 API calls consumed</strong>)
              </>
            ) : (
              <>
                Live analysis active • Cached for <strong>15 minutes</strong> to protect Meta & Gemini quotas
              </>
            )}
          </span>
        </div>

        <div className="flex items-center space-x-3 shrink-0">
          {selectedPageId !== "ALL" && currentPage && (
            <div className="flex items-center space-x-2">
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                Scoped to: {currentPage.name}
              </span>
              <button
                onClick={() => onSelectPageId("ALL")}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 underline cursor-pointer"
              >
                Switch to All
              </button>
            </div>
          )}

          {/* Average Order Value (AOV) Setting */}
          <div className="flex items-center bg-slate-50 dark:bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
            <span className="text-slate-500 dark:text-slate-400 mr-1.5 font-medium">AOV:</span>
            {isEditingAov ? (
              <div className="flex items-center space-x-1">
                <span className="text-slate-500">$</span>
                <input
                  type="number"
                  value={tempAov}
                  onChange={(e) => setTempAov(e.target.value)}
                  className="w-14 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md px-1.5 py-0.5 text-xs text-slate-900 dark:text-white font-bold"
                  autoFocus
                />
                <button
                  onClick={handleSaveAov}
                  className="bg-emerald-600 text-white rounded p-1 hover:bg-emerald-500"
                >
                  <Check className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsEditingAov(true)}
                className="font-bold text-slate-900 dark:text-white hover:text-emerald-600 dark:hover:text-emerald-400 flex items-center space-x-1 cursor-pointer"
                title="Click to edit Average Order Value"
              >
                <span>${aov}</span>
                <span className="text-[10px] text-slate-400 font-normal">✎</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Token & AI Prompt Banners */}
      {needsPageToken && (
        <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-700/60 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-2 text-amber-800 dark:text-amber-300">
            <ShieldAlert className="w-4 h-4 shrink-0 text-amber-600" />
            <span>
              <strong>Page Token Missing:</strong> Connect the Page Access Token for <strong>{currentPage?.name}</strong> to unlock live Meta Graph API insights.
            </span>
          </div>
          <button
            onClick={() => onNavigateToSettings?.("pages")}
            className="bg-amber-600 hover:bg-amber-500 text-white font-bold px-3 py-1.5 rounded-xl transition shrink-0 cursor-pointer text-xs"
          >
            Add Page Token
          </button>
        </div>
      )}

      {!summaryData?.aiEnhanced && (
        <div className="bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-transparent border border-emerald-500/20 dark:border-emerald-500/30 p-3.5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
          <div className="flex items-center space-x-2 text-slate-700 dark:text-slate-300">
            <Sparkles className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span>
              <strong>Want AI-generated copy & objection analysis?</strong> Connect your free Google Gemini API key to unlock natural language strategic advice.
            </span>
          </div>
          <button
            onClick={() => onNavigateToSettings?.("api")}
            className="text-emerald-700 dark:text-emerald-300 hover:underline font-bold shrink-0 flex items-center space-x-1 cursor-pointer"
          >
            <span>Connect Free Gemini Key</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Advance Scan Incoming Triage Strip */}
      <div className="bg-gradient-to-r from-teal-50 via-emerald-50 to-cyan-50 dark:from-teal-950/40 dark:via-emerald-950/30 dark:to-cyan-950/30 border border-teal-200/80 dark:border-teal-800/60 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-2xs">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-xl bg-teal-600 text-white flex items-center justify-center font-bold shrink-0 shadow-xs">
            <Radar className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-extrabold text-slate-900 dark:text-white">
                Chat Advance Scan Active
              </span>
              <span className="px-1.5 py-0.2 rounded-full bg-teal-100 text-teal-800 dark:bg-teal-900/60 dark:text-teal-300 font-bold text-[10px]">
                Inbound Triage
              </span>
            </div>
            <p className="text-slate-600 dark:text-slate-300 text-[11px] mt-0.5">
              Automated mobile phone detection for purchase confirmations & multi-voice inquiry classification.
            </p>
          </div>
        </div>
        <button
          onClick={onNavigateToAdvanceScan}
          className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-xs transition shrink-0 cursor-pointer"
        >
          <span>Open Advance Scan</span>
          <ArrowUpRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Multi-Page Health Comparison Strip (Rendered when "All Pages" is selected) */}
      {selectedPageId === "ALL" && summaryData?.pageComparisons && summaryData.pageComparisons.length > 0 && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
              <Layers className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>Pages Health Comparison (Identify At-Risk Pages)</span>
            </h3>
            <span className="text-[11px] text-slate-400 font-medium">Click any page to focus audit</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {summaryData.pageComparisons.map((pg) => {
              const isHealthy = pg.healthScore >= 75;
              const isWarning = pg.healthScore >= 50 && pg.healthScore < 75;

              return (
                <div
                  key={pg.pageId}
                  onClick={() => onSelectPageId(pg.pageId)}
                  className="group p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-blue-500 dark:hover:border-blue-500 bg-slate-50/50 dark:bg-slate-950/40 hover:bg-white dark:hover:bg-slate-900 transition cursor-pointer space-y-2.5 shadow-2xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-slate-900 dark:text-white truncate max-w-[150px]">
                      {pg.name}
                    </span>
                    <span
                      className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                        isHealthy
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                          : isWarning
                          ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                          : "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                      }`}
                    >
                      {pg.healthScore}/100
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-1 text-[11px] text-slate-500 dark:text-slate-400 border-t border-slate-200/60 dark:border-slate-800/60 pt-2">
                    <div>
                      <span className="block text-[9px] uppercase font-semibold text-slate-400">Leads</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">{pg.totalLeads}</span>
                    </div>
                    <div>
                      <span className="block text-[9px] uppercase font-semibold text-slate-400">Ghosted</span>
                      <span className="font-bold text-rose-600 dark:text-rose-400">{pg.ghostedWarmLeads}</span>
                    </div>
                    <div>
                      <span className="block text-[9px] uppercase font-semibold text-slate-400">Response</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">{pg.avgResponseMinutes}m</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Top Executive Scorecard Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Health Score */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              {selectedPageId !== "ALL" ? "Page Health Score" : "Pipeline Health Score"}
            </span>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                (summaryData?.healthScore || 0) >= 75
                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                  : (summaryData?.healthScore || 0) >= 50
                  ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                  : "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
              }`}
            >
              {summaryData?.healthScoreLabel || "CALCULATING"}
            </span>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {summaryData?.healthScore ?? "--"}
            </span>
            <span className="text-sm font-semibold text-slate-400">/ 100</span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
            Benchmark rating based on response speed, ghost rate, and follow-up coverage.
          </p>
        </div>

        {/* Metric 2: Lost Pipeline Revenue */}
        <div className="bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900/40 rounded-2xl p-5 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider flex items-center space-x-1">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Lost Pipeline</span>
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300">
              {summaryData?.ghostedWarmLeads ?? 0} Ghosted Leads
            </span>
          </div>
          <div className="mt-3 flex items-baseline space-x-1">
            <span className="text-4xl font-extrabold text-rose-600 dark:text-rose-400 tracking-tight">
              ${(summaryData?.lostPipelineRevenue || 0).toLocaleString()}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
            Estimated revenue stalled in uncompleted conversations (${aov} AOV).
          </p>
        </div>

        {/* Metric 3: Speed-to-Lead Response Delay */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center space-x-1">
              <Clock className="w-3.5 h-3.5" />
              <span>Speed-to-Lead Delay</span>
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
              Target: &lt;15m
            </span>
          </div>
          <div className="mt-3 flex items-baseline space-x-1.5">
            <span className="text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {summaryData?.avgResponseMinutes ?? "--"}
            </span>
            <span className="text-sm font-semibold text-slate-500">minutes</span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
            Average first agent reply latency across active customer inquiries.
          </p>
        </div>

        {/* Metric 4: Lead Conversion Rate */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center space-x-1">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
              <span>Conversion Rate</span>
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
              {summaryData?.totalLeads ?? 0} Inbound Leads
            </span>
          </div>
          <div className="mt-3 flex items-baseline space-x-1">
            <span className="text-4xl font-extrabold text-emerald-600 dark:text-emerald-400 tracking-tight">
              {summaryData?.overallConversionRate ?? "--"}%
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
            {summaryData?.followUpCoverageRate ?? 0}% of abandoned leads received follow-ups.
          </p>
        </div>
      </div>

      {/* Ads & Traffic Intelligence Spotlight */}
      {summaryData?.adsAdvisor && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800/80 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                <Target className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <span>Meta Ads & Traffic Intelligence Advisor</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300">
                  {summaryData.adsAdvisor.trackedCreativesCount} Creatives Tracked
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Connecting Meta ad clicks directly to Messenger sales, ghost rates, and wasted budget detection.
              </p>
            </div>

            <button
              onClick={() => onNavigateToAdAttribution?.()}
              className="inline-flex items-center space-x-1 text-xs font-bold text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 cursor-pointer self-start sm:self-auto"
            >
              <span>Explore Full Ad Attribution</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Top Winner Card */}
            {summaryData.adsAdvisor.topWinner ? (
              <div className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-800/60 bg-gradient-to-br from-emerald-500/5 via-teal-500/5 to-transparent space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wide">
                      Top ROAS Winner
                    </span>
                  </div>
                  <button
                    onClick={() =>
                      onNavigateToAdAttribution?.({
                        tier: "Scale Winner",
                        search: summaryData?.adsAdvisor?.topWinner?.adSource,
                      })
                    }
                    className="text-[10px] font-extrabold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 hover:bg-emerald-200 dark:hover:bg-emerald-900 transition cursor-pointer flex items-center space-x-1"
                    title="Filter to this winning creative in Ad Attribution"
                  >
                    <span>Scale Winner (+25% Budget)</span>
                    <ArrowUpRight className="w-3 h-3" />
                  </button>
                </div>

                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                    "{summaryData.adsAdvisor.topWinner.adSource}"
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Driving highest-intent buyers with low drop-off.
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-2 text-xs border-t border-emerald-200/50 dark:border-emerald-800/50 pt-2">
                  <div>
                    <span className="block text-[9px] uppercase font-semibold text-slate-400">Attributed Sales</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                      ${summaryData.adsAdvisor.topWinner.revenue.toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[9px] uppercase font-semibold text-slate-400">Conversion</span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {summaryData.adsAdvisor.topWinner.recoveryRate}%
                    </span>
                  </div>
                  <div>
                    <span className="block text-[9px] uppercase font-semibold text-slate-400">Ghost Rate</span>
                    <span className="font-bold text-slate-700 dark:text-slate-300">
                      {summaryData.adsAdvisor.topWinner.ghostingRate}%
                    </span>
                  </div>
                </div>
              </div>
            ) : null}

            {/* Worst Budget Bleeder Card */}
            {summaryData.adsAdvisor.worstWaster ? (
              <div className="p-4 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-gradient-to-br from-rose-500/5 via-amber-500/5 to-transparent space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                    <span className="text-xs font-bold text-rose-800 dark:text-rose-300 uppercase tracking-wide">
                      Budget Bleeder Alert
                    </span>
                  </div>
                  <button
                    onClick={() =>
                      onNavigateToAdAttribution?.({
                        tier: "Underperforming",
                        search: summaryData?.adsAdvisor?.worstWaster?.adSource,
                      })
                    }
                    className="text-[10px] font-extrabold px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 hover:bg-rose-200 dark:hover:bg-rose-900 transition cursor-pointer flex items-center space-x-1"
                    title="Inspect this budget bleeder in Ad Attribution"
                  >
                    <span>Pause / Re-target</span>
                    <ArrowUpRight className="w-3 h-3" />
                  </button>
                </div>

                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                    "{summaryData.adsAdvisor.worstWaster.adSource}"
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    High click volume but leads ghost without buying.
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-2 text-xs border-t border-rose-200/50 dark:border-rose-800/50 pt-2">
                  <div>
                    <span className="block text-[9px] uppercase font-semibold text-slate-400">Wasted Spend</span>
                    <span className="font-bold text-rose-600 dark:text-rose-400">
                      ~${summaryData.adsAdvisor.worstWaster.wastedSpend}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[9px] uppercase font-semibold text-slate-400">Ghost Rate</span>
                    <span className="font-bold text-rose-600 dark:text-rose-400">
                      {summaryData.adsAdvisor.worstWaster.ghostingRate}%
                    </span>
                  </div>
                  <div>
                    <span className="block text-[9px] uppercase font-semibold text-slate-400">Bot Risk</span>
                    <span className="font-bold text-amber-600 dark:text-amber-400">
                      {summaryData.adsAdvisor.worstWaster.fakeLeadRate}%
                    </span>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* Main Grid: Action Prescription Feed (Left) & Funnel Visualizer (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Prioritized Action Feed ("What to do next to increase sales") */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                <Target className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>
                  {selectedPageId !== "ALL" && currentPage
                    ? `Prioritized Actions for ${currentPage.name}`
                    : "Prioritized Sales Action Feed"}
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Execute high-conviction actions directly in the appropriate tool with one click.
              </p>
            </div>
          </div>

          {/* Action Cards List */}
          <div className="space-y-3.5">
            {summaryData?.actionCards && summaryData.actionCards.length > 0 ? (
              summaryData.actionCards.map((card) => {
                const isExpanded = expandedCardId === card.id;
                const isUrgent = card.priority === "URGENT";
                const isHigh = card.priority === "HIGH";

                return (
                  <div
                    key={card.id}
                    className={`bg-white dark:bg-slate-900 border rounded-2xl p-5 shadow-xs transition duration-200 ${
                      isUrgent
                        ? "border-rose-300 dark:border-rose-900/60 ring-1 ring-rose-500/10"
                        : isHigh
                        ? "border-amber-300 dark:border-amber-900/60"
                        : "border-slate-200 dark:border-slate-800"
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span
                            className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                              isUrgent
                                ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                                : isHigh
                                ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                                : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                            }`}
                          >
                            {card.priority}
                          </span>
                          <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                            • {card.badge}
                          </span>
                        </div>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                          {card.title}
                        </h3>
                      </div>

                      {/* Execution Action Button */}
                      <button
                        onClick={() => handleExecuteAction(card)}
                        className={`inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold transition shadow-sm cursor-pointer shrink-0 self-start sm:self-auto ${
                          card.targetTool === "blaster"
                            ? "bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/20"
                            : card.targetTool === "response"
                            ? "bg-amber-600 hover:bg-amber-500 text-white shadow-amber-600/20"
                            : card.targetTool === "ad-attribution"
                            ? "bg-purple-600 hover:bg-purple-500 text-white shadow-purple-600/20"
                            : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/20"
                        }`}
                      >
                        <span>{card.actionLabel}</span>
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs bg-slate-50 dark:bg-slate-950/60 p-3 rounded-xl border border-slate-100 dark:border-slate-800/80">
                      <div>
                        <span className="font-semibold text-slate-700 dark:text-slate-300 block mb-0.5">
                          Root Cause Diagnostic:
                        </span>
                        <p className="text-slate-600 dark:text-slate-400">{card.diagnostic}</p>
                      </div>
                      <div>
                        <span className="font-semibold text-emerald-700 dark:text-emerald-400 block mb-0.5">
                          Expected Impact:
                        </span>
                        <p className="text-slate-600 dark:text-slate-400">{card.impact}</p>
                      </div>
                    </div>

                    {/* Expandable Suggested Message Copy */}
                    {card.suggestedCopy && (
                      <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                        <button
                          onClick={() => setExpandedCardId(isExpanded ? null : card.id)}
                          className="text-[11px] font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white flex items-center space-x-1 cursor-pointer"
                        >
                          <span>{isExpanded ? "Hide Suggested Copy" : "Preview Strategy & Message Template"}</span>
                          <span className="text-[10px]">{isExpanded ? "▲" : "▼"}</span>
                        </button>

                        {isExpanded && (
                          <div className="mt-2 p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-mono text-slate-800 dark:text-slate-200 leading-relaxed">
                            {card.suggestedCopy}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs text-slate-500">
                Loading sales diagnosis feed...
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Funnel Drop-Off & Speed-to-Lead Heatmap */}
        <div className="space-y-6">
          {/* Funnel Stage Breakdown */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
              <Layers className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>
                {selectedPageId !== "ALL" && currentPage
                  ? `${currentPage.name} Funnel Drop-Off`
                  : "Conversion Funnel Drop-Off"}
              </span>
            </h3>

            <div className="space-y-3">
              {summaryData?.funnel.map((stage, idx) => (
                <div key={stage.name} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {idx + 1}. {stage.name}
                    </span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">
                      {stage.count} ({stage.percentage}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${stage.color} rounded-full transition-all duration-500`}
                      style={{ width: `${stage.percentage}%` }}
                    />
                  </div>
                  {stage.dropOffRate && (
                    <div className="text-[10px] text-rose-500 font-medium text-right">
                      ↓ {stage.dropOffRate}% drop-off from previous step
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Speed-to-Lead Hourly Response Heatmap */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                <Clock className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <span>
                  {selectedPageId !== "ALL" && currentPage
                    ? `${currentPage.name} 24h Response Lag`
                    : "24-Hour Lead Volume & Response Lag"}
                </span>
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Red indicates danger hours where message volume is high but response latency exceeds 25 mins.
              </p>
            </div>

            {/* Micro-bar chart */}
            <div className="grid grid-cols-12 gap-1 items-end h-28 pt-4">
              {summaryData?.hourlyActivity
                .filter((_, idx) => idx % 2 === 0)
                .map((h) => {
                  const maxVolume = Math.max(
                    ...summaryData.hourlyActivity.map((item) => item.leadCount),
                    1
                  );
                  const barHeightPercent = Math.max(15, Math.round((h.leadCount / maxVolume) * 100));

                  return (
                    <div
                      key={h.hour}
                      className="flex flex-col items-center group relative h-full justify-end"
                      title={`${h.label}: ${h.leadCount} leads, ${h.avgResponseMinutes}m avg delay`}
                    >
                      <div
                        className={`w-full rounded-t-sm transition-all duration-300 ${
                          h.isDangerZone
                            ? "bg-rose-500 hover:bg-rose-400"
                            : h.isPeakHour
                            ? "bg-amber-500 hover:bg-amber-400"
                            : "bg-blue-500 hover:bg-blue-400"
                        }`}
                        style={{ height: `${barHeightPercent}%` }}
                      />
                      <span className="text-[9px] text-slate-400 mt-1">{h.hour}h</span>
                    </div>
                  );
                })}
            </div>

            <div className="flex items-center justify-between text-[10px] text-slate-500 pt-2 border-t border-slate-100 dark:border-slate-800">
              <span className="flex items-center space-x-1">
                <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
                <span>Normal</span>
              </span>
              <span className="flex items-center space-x-1">
                <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
                <span>Peak Volume</span>
              </span>
              <span className="flex items-center space-x-1">
                <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />
                <span>Danger Zone</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
