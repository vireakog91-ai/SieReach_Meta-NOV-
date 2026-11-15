"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Target,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  DollarSign,
  Layers,
  Calendar,
  X,
  Check,
  RefreshCw,
  Sparkles,
  ArrowUpRight,
  Search,
  Filter,
  Eye,
  Clock,
  Send,
  MessageSquare,
  Zap,
  Flame,
  Info,
  ShieldAlert,
  ShieldCheck,
  Download,
  Bot,
  UserX,
  UserCheck,
} from "lucide-react";
import { AdCreativeMetric } from "@/app/api/reports/ad-attribution/route";

interface AdAttributionTabProps {
  pages: Array<{ pageId: string; name: string; businessName?: string; avatarUrl?: string }>;
  activeBusiness?: string;
  selectedPageId?: string;
  initialTierFilter?: string;
  initialSearchQuery?: string;
  onTriggerBlast?: (leadIds: string[]) => void;
}

export function AdAttributionTab({
  pages,
  activeBusiness = "ALL",
  selectedPageId: initialSelectedPageId = "ALL",
  initialTierFilter = "ALL",
  initialSearchQuery = "",
  onTriggerBlast,
}: AdAttributionTabProps) {
  const [selectedPageId, setSelectedPageId] = useState<string>(initialSelectedPageId);
  const [selectedDays, setSelectedDays] = useState<string>("all");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>(initialSearchQuery);
  const [tierFilter, setTierFilter] = useState<string>(initialTierFilter);
  const [sortBy, setSortBy] = useState<"revenue" | "recovery" | "ghosting" | "fake" | "leads">("revenue");

  // Inspected ad creative for drill-down modal
  const [inspectedCreative, setInspectedCreative] = useState<AdCreativeMetric | null>(null);
  const [modalFilter, setModalFilter] = useState<"ALL" | "HUMAN_ONLY" | "SUSPICIOUS_ONLY">("ALL");

  // Keep selectedPageId in sync if parent changes
  useEffect(() => {
    setSelectedPageId(initialSelectedPageId);
  }, [initialSelectedPageId]);

  // Keep tierFilter & searchQuery in sync when navigated from Central Hub
  useEffect(() => {
    if (initialTierFilter) setTierFilter(initialTierFilter);
  }, [initialTierFilter]);

  useEffect(() => {
    if (initialSearchQuery !== undefined) setSearchQuery(initialSearchQuery);
  }, [initialSearchQuery]);

  // AOV Adjuster with auto-save
  const [aov, setAov] = useState<number>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("sielab_aov");
      if (saved && !isNaN(parseInt(saved))) {
        return parseInt(saved);
      }
    }
    return 45;
  });
  const [aovSaveStatus, setAovSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const aovSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Keep selectedPageId in sync if parent changes
  useEffect(() => {
    setSelectedPageId(initialSelectedPageId);
  }, [initialSelectedPageId]);

  // Load AOV from settings if available
  useEffect(() => {
    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.settings?.REPORT_AOV) {
          const serverAov = parseInt(data.settings.REPORT_AOV);
          if (!isNaN(serverAov)) {
            const local = typeof window !== "undefined" ? localStorage.getItem("sielab_aov") : null;
            if (!local) {
              setAov(serverAov);
              if (typeof window !== "undefined") {
                localStorage.setItem("sielab_aov", serverAov.toString());
              }
            }
          }
        }
      })
      .catch(() => {});
  }, []);

  const handleAovChange = (val: number) => {
    const nextVal = Math.max(1, Math.min(10000, val));
    setAov(nextVal);
    if (typeof window !== "undefined") {
      localStorage.setItem("sielab_aov", nextVal.toString());
    }

    setAovSaveStatus("saving");
    if (aovSaveTimerRef.current) clearTimeout(aovSaveTimerRef.current);
    aovSaveTimerRef.current = setTimeout(async () => {
      try {
        await fetch("/api/settings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ REPORT_AOV: nextVal.toString() }),
        });
        setAovSaveStatus("saved");
        setTimeout(() => setAovSaveStatus("idle"), 2500);
      } catch (err) {
        console.error("Failed to auto-save AOV:", err);
        setAovSaveStatus("idle");
      }
    }, 600);
  };

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [reportData, setReportData] = useState<{
    summary: any;
    creatives: AdCreativeMetric[];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchAttributionData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const queryParams = new URLSearchParams({
        pageId: selectedPageId,
        businessName: activeBusiness,
        aov: aov.toString(),
      });

      if (startDate || endDate) {
        if (startDate) queryParams.set("startDate", startDate);
        if (endDate) queryParams.set("endDate", endDate);
      } else if (selectedDays !== "all") {
        queryParams.set("days", selectedDays);
      }

      const res = await fetch(`/api/reports/ad-attribution?${queryParams.toString()}`);
      if (!res.ok) throw new Error(`Attribution API failed with status ${res.status}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to load attribution report");
      setReportData(json);
    } catch (err: any) {
      setError(err.message || "Failed to load ad attribution report");
    } finally {
      setIsLoading(false);
    }
  }, [selectedPageId, activeBusiness, selectedDays, startDate, endDate, aov]);

  useEffect(() => {
    fetchAttributionData();
  }, [fetchAttributionData]);

  const handleSelectPreset = (preset: string) => {
    if (preset === "all") {
      setSelectedDays("all");
      setStartDate("");
      setEndDate("");
    } else if (preset === "today") {
      const todayStr = new Date().toISOString().split("T")[0];
      setSelectedDays("today");
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === "7") {
      const endStr = new Date().toISOString().split("T")[0];
      const startStr = new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0];
      setSelectedDays("7");
      setStartDate(startStr);
      setEndDate(endStr);
    } else if (preset === "30") {
      const endStr = new Date().toISOString().split("T")[0];
      const startStr = new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0];
      setSelectedDays("30");
      setStartDate(startStr);
      setEndDate(endStr);
    }
  };

  const handleClearCalendar = () => {
    setStartDate("");
    setEndDate("");
    setSelectedDays("all");
  };

  const summary = reportData?.summary;
  const rawCreatives = reportData?.creatives || [];

  // CSV Export Handler
  const handleExportCSV = () => {
    if (!rawCreatives.length) return;
    const headers = [
      "Ad Creative",
      "Facebook Page",
      "Business Portfolio",
      "Total Leads",
      "Ghosted Leads",
      "Ghosting Rate (%)",
      "Fake / Bot Leads",
      "Fake Account Rate (%)",
      "Est. Wasted Ad Spend ($)",
      "Bot Fraud Risk",
      "Step 1 Blasts",
      "Step 1 Recoveries",
      "Step 1 Yield (%)",
      "Step 2 Blasts",
      "Step 2 Recoveries",
      "Step 2 Lift (%)",
      "Overall Recovery Rate (%)",
      "Estimated Revenue ($)",
      "Creative Health Tier",
      "Recommendation",
    ];

    const rows = rawCreatives.map((c) => [
      `"${c.adSource.replace(/"/g, '""')}"`,
      `"${c.pageName.replace(/"/g, '""')}"`,
      `"${c.businessName.replace(/"/g, '""')}"`,
      c.totalLeads,
      c.ghostedLeads,
      `${c.ghostingRate}%`,
      c.fakeLeadsCount,
      `${c.fakeLeadRate}%`,
      `$${c.estimatedWastedSpend}`,
      `"${c.fraudTier}"`,
      c.step1Blasts,
      c.step1Recoveries,
      `${c.step1RecoveryRate}%`,
      c.step2Blasts,
      c.step2Recoveries,
      `${c.step2IncrementalLift}%`,
      `${c.overallRecoveryRate}%`,
      `$${c.estimatedRevenue}`,
      `"${c.healthTier}"`,
      `"${c.recommendation.replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `siereach_meta_ad_attribution_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Trigger targeted follow-up blast to ghosted leads of an ad (filtering out confirmed fakes)
  const handleBlastCreativeLeads = (creative: AdCreativeMetric) => {
    if (!onTriggerBlast) return;
    // Exclude confirmed fake/deactivated accounts from blast
    const eligibleLeadIds = creative.leads
      .filter((l) => {
        if (l.status === "REPLIED" || l.repliedAt) return false;
        if (l.authenticityStatus === "CONFIRMED_FAKE") return false;
        return true;
      })
      .map((l) => l.id);

    if (eligibleLeadIds.length === 0) {
      alert("No eligible human leads found to blast for this ad (leads either already replied or are confirmed fake).");
      return;
    }

    onTriggerBlast(eligibleLeadIds);
  };

  // Filter & sort creatives
  const filteredCreatives = rawCreatives
    .filter((c) => {
      const matchesSearch =
        c.adSource.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.pageName.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;

      if (tierFilter === "BOT_ALERT") {
        return c.fraudTier === "Critical Bot Fraud" || c.fraudTier === "High Bot Concentration";
      }

      if (tierFilter !== "ALL" && c.healthTier !== tierFilter) {
        return false;
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === "revenue") return b.estimatedRevenue - a.estimatedRevenue;
      if (sortBy === "recovery") return b.overallRecoveryRate - a.overallRecoveryRate;
      if (sortBy === "ghosting") return b.ghostingRate - a.ghostingRate;
      if (sortBy === "fake") return b.fakeLeadRate - a.fakeLeadRate;
      if (sortBy === "leads") return b.totalLeads - a.totalLeads;
      return 0;
    });

  const getTierBadge = (tier: AdCreativeMetric["healthTier"]) => {
    switch (tier) {
      case "Scale Winner":
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
            <Sparkles className="w-3 h-3 text-emerald-500" />
            <span>Scale Winner</span>
          </span>
        );
      case "Ghosting Alert":
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20">
            <AlertTriangle className="w-3 h-3 text-rose-500" />
            <span>Ghosting Alert</span>
          </span>
        );
      case "Step 2 Dependent":
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/20">
            <Zap className="w-3 h-3 text-indigo-500" />
            <span>Step 2 Dependent</span>
          </span>
        );
      case "Healthy":
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20">
            <CheckCircle2 className="w-3 h-3 text-blue-500" />
            <span>Healthy</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
            <span>Underperforming</span>
          </span>
        );
    }
  };

  const getFraudBadge = (tier: AdCreativeMetric["fraudTier"], rate: number) => {
    switch (tier) {
      case "Critical Bot Fraud":
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300 border border-red-300 dark:border-red-600/50">
            <Bot className="w-3 h-3 text-red-600 dark:text-red-400" />
            <span>Critical Fake ({rate}%)</span>
          </span>
        );
      case "High Bot Concentration":
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-orange-100 text-orange-800 dark:bg-orange-950/60 dark:text-orange-300 border border-orange-300 dark:border-orange-500/40">
            <AlertTriangle className="w-3 h-3 text-orange-600 dark:text-orange-400" />
            <span>High Fake ({rate}%)</span>
          </span>
        );
      case "Moderate Risk":
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
            <span>Moderate ({rate}%)</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
            <ShieldCheck className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
            <span>Clean Traffic</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Unified Hero Banner */}
      <div className="tool-hero-banner ads-hero-banner bg-gradient-to-r from-purple-50 via-indigo-50/50 to-white dark:from-purple-950 dark:via-indigo-950 dark:to-slate-900 border border-purple-200/80 dark:border-purple-800/40 rounded-3xl p-6 sm:p-7 text-slate-900 dark:text-white shadow-sm dark:shadow-xl relative overflow-hidden transition-all">
        <div className="absolute -right-16 -top-16 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-40 -bottom-10 w-48 h-48 bg-indigo-500/15 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div>
            <div className="flex items-center space-x-2.5">
              <span className="ads-badge-pill px-2.5 py-0.5 rounded-full bg-purple-100 dark:bg-purple-500/20 text-purple-800 dark:text-purple-300 border border-purple-300 dark:border-purple-400/30 text-[11px] font-bold uppercase tracking-wider">
                Attribution Hub
              </span>
              <span className="text-xs text-slate-600 dark:text-purple-200/70 font-medium">
                Portfolio: <strong className="text-slate-900 dark:text-white font-bold">{activeBusiness === "ALL" ? "All Portfolios" : activeBusiness}</strong>
              </span>
              <span className="text-xs text-slate-600 dark:text-purple-200/70 font-medium">
                Connected Pages: <strong className="text-slate-900 dark:text-white font-bold">{pages.length}</strong>
              </span>
            </div>

            <h1 className="tool-heading text-2xl sm:text-3xl font-extrabold tracking-tight mt-2 text-slate-900 dark:text-white flex items-center gap-2">
              <Target className="w-7 h-7 text-purple-600 dark:text-purple-400" />
              Meta Ads Advisor & Attribution Matrix
            </h1>
            <p className="tool-desc text-sm text-slate-600 dark:text-purple-100/80 mt-1 max-w-2xl leading-relaxed">
              Track real customer recovery, identify fake/bot accounts, and eliminate wasted ad spend across Meta ad campaigns.
            </p>
          </div>

          {/* SubTab / Presets Switcher */}
          <div className="tool-subtab-container flex flex-wrap items-center p-1.5 bg-white/90 dark:bg-black/40 backdrop-blur-md rounded-2xl border border-slate-200 dark:border-white/10 shrink-0 self-start md:self-auto shadow-xs gap-1.5">
            {/* Page Filter */}
            <div className="flex items-center space-x-1.5 px-2.5 py-1 text-xs text-slate-700 dark:text-slate-300 font-bold border-r border-slate-200 dark:border-slate-800 pr-2">
              <Layers className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
              <select
                value={selectedPageId}
                onChange={(e) => setSelectedPageId(e.target.value)}
                className="bg-transparent text-slate-800 dark:text-slate-200 font-bold focus:outline-none cursor-pointer max-w-[130px] truncate"
              >
                <option value="ALL">All Pages ({pages.length})</option>
                {pages.map((p) => (
                  <option key={p.pageId} value={p.pageId}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Presets */}
            {[
              { id: "all", label: "All Time" },
              { id: "today", label: "Today" },
              { id: "7", label: "7 Days" },
              { id: "30", label: "30 Days" },
            ].map((period) => (
              <button
                key={period.id}
                onClick={() => handleSelectPreset(period.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  selectedDays === period.id && !startDate && !endDate
                    ? "bg-purple-600 text-white shadow-md shadow-purple-600/25"
                    : "tool-subtab-btn-inactive text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5"
                }`}
              >
                {period.label}
              </button>
            ))}

            {/* CSV Export Button */}
            <button
              onClick={handleExportCSV}
              disabled={rawCreatives.length === 0}
              className="p-1.5 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition cursor-pointer disabled:opacity-40"
              title="Export Full Ad Attribution Report to CSV"
            >
              <Download className="w-3.5 h-3.5" />
            </button>

            {/* Refresh Button */}
            <button
              onClick={fetchAttributionData}
              disabled={isLoading}
              className="p-1.5 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition cursor-pointer disabled:opacity-40"
              title="Refresh Attribution Data"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-purple-500" : ""}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Date Range & AOV Secondary Filter Toolbar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Custom Range:</span>
          {/* Calendar Range Picker */}
          <div
            className={`flex items-center space-x-1.5 bg-slate-50 dark:bg-slate-950 border rounded-xl px-2.5 py-1 text-xs transition ${
              startDate || endDate
                ? "border-purple-500/70 ring-2 ring-purple-500/20"
                : "border-slate-200 dark:border-slate-800"
            }`}
          >
            <Calendar className="w-3.5 h-3.5 text-purple-500 shrink-0" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setSelectedDays("custom");
              }}
              className="bg-transparent text-slate-800 dark:text-slate-200 font-medium text-xs focus:outline-none cursor-pointer"
              title="Start Date"
            />
            <span className="text-slate-400 dark:text-slate-500 font-semibold px-0.5">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setSelectedDays("custom");
              }}
              className="bg-transparent text-slate-800 dark:text-slate-200 font-medium text-xs focus:outline-none cursor-pointer"
              title="End Date"
            />
            {(startDate || endDate) && (
              <button
                type="button"
                onClick={handleClearCalendar}
                title="Clear calendar filter"
                className="text-slate-400 hover:text-rose-500 p-0.5 rounded transition cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* AOV Adjuster */}
        <div className="flex items-center space-x-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-2.5 py-1 text-xs text-slate-700 dark:text-slate-300">
          <span className="text-slate-500 font-medium">AOV:</span>
          <span className="text-emerald-600 dark:text-emerald-400 font-semibold">$</span>
          <input
            type="number"
            min="1"
            max="10000"
            value={aov}
            onChange={(e) => handleAovChange(parseInt(e.target.value) || 1)}
            className="w-12 bg-white dark:bg-slate-900 text-center text-slate-900 dark:text-white rounded border border-slate-300 dark:border-slate-700 px-1 py-0.5 focus:outline-none font-medium text-xs"
            title="Average Order Value"
          />
          {aovSaveStatus === "saving" && (
            <span className="text-[10px] text-blue-500 font-medium animate-pulse">Saving...</span>
          )}
          {aovSaveStatus === "saved" && (
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center space-x-0.5">
              <Check className="w-3 h-3 text-emerald-500 inline" />
              <span>Saved</span>
            </span>
          )}
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs flex items-center space-x-2">
          <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
          <span>Error loading ad attribution: {error}</span>
        </div>
      )}

      {/* Top 4 KPI Hero Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Top Converting Creative */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex flex-col justify-between hover:border-emerald-500/40 transition shadow-2xs">
          <div>
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Top Converting Ad</span>
              </span>
              <span className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
                <TrendingUp className="w-4 h-4" />
              </span>
            </div>
            {summary?.topPerformingAd ? (
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate" title={summary.topPerformingAd.adSource}>
                  {summary.topPerformingAd.adSource}
                </h4>
                <div className="flex items-baseline space-x-2 mt-1">
                  <span className="text-2xl font-extrabold text-slate-900 dark:text-white">
                    {summary.topPerformingAd.recoveryRate}%
                  </span>
                  <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                    ({summary.topPerformingAd.totalRecoveries} recovered buyers)
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-500">No ad recovery recorded yet</p>
            )}
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-500 dark:text-slate-400">Recovered Revenue:</span>
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
              ${summary?.topPerformingAd?.revenue ?? 0}
            </span>
          </div>
        </div>

        {/* KPI 2: Bot Traffic & Fake Account Concentration */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex flex-col justify-between hover:border-red-500/40 transition shadow-2xs">
          <div>
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-red-600 dark:text-red-400 flex items-center gap-1">
                <Bot className="w-3.5 h-3.5" />
                <span>Fake / Bot Traffic</span>
              </span>
              <span className="p-1.5 rounded-lg bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/20">
                <UserX className="w-4 h-4" />
              </span>
            </div>
            <div>
              <div className="flex items-baseline space-x-2">
                <span className="text-2xl font-extrabold text-slate-900 dark:text-white">
                  {summary?.avgFakeRate ?? 0}%
                </span>
                <span className="text-xs text-red-600 dark:text-red-400 font-medium">
                  ({summary?.totalFakeLeads ?? 0} bot / fake accounts)
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 truncate">
                Highest on: <strong className="text-slate-800 dark:text-slate-200">{summary?.highestFraudAd?.adSource || "None"}</strong>
              </p>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-500 dark:text-slate-400">Wasted Ad Budget:</span>
            <span className="font-semibold text-red-600 dark:text-red-400">
              ${summary?.totalWastedAdSpend ?? 0}
            </span>
          </div>
        </div>

        {/* KPI 3: Attributed Recovered Revenue */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex flex-col justify-between hover:border-amber-500/40 transition shadow-2xs">
          <div>
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1">
                <DollarSign className="w-3.5 h-3.5" />
                <span>Attributed Revenue</span>
              </span>
              <span className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20">
                <DollarSign className="w-4 h-4" />
              </span>
            </div>
            <div className="flex items-baseline space-x-2">
              <span className="text-3xl font-extrabold text-slate-900 dark:text-white">
                ${summary?.totalAttributedRevenue ?? 0}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">@ ${aov}/order</span>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-500 dark:text-slate-400">Recovered Buyers:</span>
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
              +{summary?.totalAttributedRecoveries ?? 0} verified orders
            </span>
          </div>
        </div>

        {/* KPI 4: Average Portfolio Benchmarks */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex flex-col justify-between hover:border-indigo-500/40 transition shadow-2xs">
          <div>
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                Creative Benchmark
              </span>
              <span className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/20">
                <Zap className="w-4 h-4" />
              </span>
            </div>
            <div className="flex items-baseline space-x-2">
              <span className="text-3xl font-extrabold text-slate-900 dark:text-white">
                {summary?.avgRecoveryRate ?? 0}%
              </span>
              <span className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">Avg Recovery</span>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-500 dark:text-slate-400">Average Ghosting Rate:</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              {summary?.avgGhostingRate ?? 0}% across {summary?.totalTrackedCreatives ?? 0} ads
            </span>
          </div>
        </div>
      </div>

      {/* Strategic Media Buyer & Ads Advisor Insights Panel */}
      <div className="bg-gradient-to-r from-indigo-50/50 via-white to-slate-50 dark:from-slate-900 dark:via-slate-900 dark:to-indigo-950/40 border border-indigo-200 dark:border-indigo-500/30 rounded-2xl p-5 shadow-xs relative overflow-hidden transition-colors space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-indigo-100 dark:border-indigo-950 pb-3">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-500/20 border border-indigo-200 dark:border-indigo-500/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Meta Ads Strategy & Decision Advisor</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 font-mono font-medium">
                  Live Attribution Heuristics
                </span>
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Prescriptive optimization advice connecting Meta ad clicks to real Messenger sales and bot detection across {rawCreatives.length} creatives.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          {/* Strategy 1: Top ROAS Winner */}
          {summary?.topPerformingAd ? (
            <div className="flex flex-col justify-between bg-emerald-50/60 dark:bg-slate-950/60 p-3.5 rounded-xl border border-emerald-200 dark:border-emerald-900/40 space-y-2.5">
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-emerald-800 dark:text-emerald-300 flex items-center space-x-1.5">
                    <span>🏆</span>
                    <span>Scale Winner (+25% Budget)</span>
                  </span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-200/60 dark:bg-emerald-900/60 text-emerald-900 dark:text-emerald-200">
                    {summary.topPerformingAd.recoveryRate}% Conversion
                  </span>
                </div>
                <h4 className="font-bold text-slate-900 dark:text-white text-xs mt-1 truncate" title={summary.topPerformingAd.adSource}>
                  &ldquo;{summary.topPerformingAd.adSource}&rdquo;
                </h4>
                <p className="text-slate-600 dark:text-slate-300 text-[11px] mt-1 leading-snug">
                  High purchase intent with <strong>${summary.topPerformingAd.revenue.toLocaleString()}</strong> in sales. Recommended: Increase daily budget in Ads Manager by +20% to +30%.
                </p>
              </div>
              <button
                onClick={() => {
                  setTierFilter("Scale Winner");
                  setSearchQuery(summary.topPerformingAd?.adSource || "");
                }}
                className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-[11px] transition cursor-pointer flex items-center justify-center space-x-1"
              >
                <span>Focus Winner Creative</span>
                <ArrowUpRight className="w-3 h-3" />
              </button>
            </div>
          ) : null}

          {/* Strategy 2: Worst Ghosting Bleeder */}
          {summary?.worstGhostingAd ? (
            <div className="flex flex-col justify-between bg-amber-50/60 dark:bg-slate-950/60 p-3.5 rounded-xl border border-amber-200 dark:border-amber-900/40 space-y-2.5">
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-amber-800 dark:text-amber-300 flex items-center space-x-1.5">
                    <span>🛑</span>
                    <span>Budget Bleeder Alert</span>
                  </span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-200/60 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200">
                    {summary.worstGhostingAd.ghostingRate}% Ghosted
                  </span>
                </div>
                <h4 className="font-bold text-slate-900 dark:text-white text-xs mt-1 truncate" title={summary.worstGhostingAd.adSource}>
                  &ldquo;{summary.worstGhostingAd.adSource}&rdquo;
                </h4>
                <p className="text-slate-600 dark:text-slate-300 text-[11px] mt-1 leading-snug">
                  {summary.worstGhostingAd.totalLeads} leads inquired but ghosted before buying. Re-check the initial price greeting or pause this creative to stop ad bleed.
                </p>
              </div>
              <button
                onClick={() => {
                  setTierFilter("Underperforming");
                  setSearchQuery(summary.worstGhostingAd?.adSource || "");
                }}
                className="w-full py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-bold text-[11px] transition cursor-pointer flex items-center justify-center space-x-1"
              >
                <span>Inspect Bleeder Ad</span>
                <ArrowUpRight className="w-3 h-3" />
              </button>
            </div>
          ) : null}

          {/* Strategy 3: Bot Fraud & Audience Network Shield */}
          {summary?.highestFraudAd ? (
            <div className="flex flex-col justify-between bg-rose-50/60 dark:bg-slate-950/60 p-3.5 rounded-xl border border-rose-200 dark:border-rose-900/40 space-y-2.5">
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-rose-800 dark:text-rose-300 flex items-center space-x-1.5">
                    <span>🚨</span>
                    <span>Bot Fraud Shield</span>
                  </span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-200/60 dark:bg-rose-900/60 text-rose-900 dark:text-rose-200">
                    {summary.highestFraudAd.fakeRate}% Bots
                  </span>
                </div>
                <h4 className="font-bold text-slate-900 dark:text-white text-xs mt-1 truncate" title={summary.highestFraudAd.adSource}>
                  &ldquo;{summary.highestFraudAd.adSource}&rdquo;
                </h4>
                <p className="text-slate-600 dark:text-slate-300 text-[11px] mt-1 leading-snug">
                  ~${summary.highestFraudAd.wastedSpend} wasted on fake/bot profiles. Action: Disable <strong>Meta Audience Network</strong> placements in Ads Manager.
                </p>
              </div>
              <button
                onClick={() => {
                  setTierFilter("BOT_ALERT");
                  setSearchQuery(summary.highestFraudAd?.adSource || "");
                }}
                className="w-full py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg font-bold text-[11px] transition cursor-pointer flex items-center justify-center space-x-1"
              >
                <span>Isolate Bot Leads</span>
                <ArrowUpRight className="w-3 h-3" />
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {/* Creative Attribution Matrix Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs transition-colors">
        {/* Tier 1: Title, Search, and Sort Controls */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white dark:bg-slate-900">
          <div className="flex items-center space-x-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/60 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
              <Target className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-2 flex-wrap">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white whitespace-nowrap">
                  Ad Creative Performance Matrix
                </h3>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                  {filteredCreatives.length} of {rawCreatives.length} ads
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate hidden sm:block">
                Attribution breakdown by creative angle, ghost rate, bot fraud risk, and true revenue.
              </p>
            </div>
          </div>

          {/* Search Box & Sort Controls aligned cleanly on the right */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Search Box */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search ad title or page..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-8 pr-7 py-1.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-purple-500 w-48 sm:w-56 transition"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white text-xs cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Sort Dropdown */}
            <div className="flex items-center space-x-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-2.5 py-1.5 text-xs shrink-0">
              <span className="text-slate-400 font-medium">Sort:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-transparent text-slate-800 dark:text-slate-200 font-semibold focus:outline-none cursor-pointer"
              >
                <option value="revenue">Revenue (High to Low)</option>
                <option value="recovery">Recovery Rate (High to Low)</option>
                <option value="fake">Bot / Fake Rate (High to Low)</option>
                <option value="ghosting">Ghosting Rate (High to Low)</option>
                <option value="leads">Total Leads (High to Low)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Tier 2: Dedicated Horizontal Filter Pill Strip */}
        <div className="px-4 py-2.5 bg-slate-50/70 dark:bg-slate-950/40 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 overflow-x-auto [scrollbar-width:none]">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1 shrink-0">
              Filter:
            </span>
            {[
              { id: "ALL", label: "All Creatives", count: rawCreatives.length },
              { id: "Scale Winner", label: "Winners 🏆", count: rawCreatives.filter((c) => c.healthTier === "Scale Winner").length },
              { id: "Underperforming", label: "Bleeders 🛑", count: rawCreatives.filter((c) => c.healthTier === "Underperforming").length },
              { id: "Ghosting Alert", label: "Ghosting 👻", count: rawCreatives.filter((c) => c.healthTier === "Ghosting Alert").length },
              { id: "BOT_ALERT", label: "Bot Alerts 🤖", count: rawCreatives.filter((c) => c.fraudTier === "Critical Bot Fraud" || c.fraudTier === "High Bot Concentration").length },
              { id: "Step 2 Dependent", label: "Step 2 🔄", count: rawCreatives.filter((c) => c.healthTier === "Step 2 Dependent").length },
            ].map((f) => {
              const isSelected = tierFilter === f.id;
              return (
                <button
                  key={f.id}
                  onClick={() => setTierFilter(f.id)}
                  className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer shrink-0 ${
                    isSelected
                      ? "bg-purple-600 text-white shadow-xs"
                      : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:border-slate-300 dark:hover:border-slate-700"
                  }`}
                >
                  <span>{f.label}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                      isSelected
                        ? "bg-white/20 text-white"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
                    }`}
                  >
                    {f.count}
                  </span>
                </button>
              );
            })}
          </div>

          {(tierFilter !== "ALL" || searchQuery) && (
            <button
              onClick={() => {
                setTierFilter("ALL");
                setSearchQuery("");
              }}
              className="text-[11px] text-purple-600 dark:text-purple-400 hover:underline font-semibold shrink-0 cursor-pointer ml-auto"
            >
              Reset Filters
            </button>
          )}
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider text-[10px] bg-slate-50 dark:bg-slate-950/60">
                <th className="py-3 px-4 min-w-[280px]">Meta Ad Creative / Headline</th>
                <th className="py-3 px-3 text-center w-20">Inquiries</th>
                <th className="py-3 px-3 text-center w-28">Ghosting Rate</th>
                <th className="py-3 px-3 text-center w-32">Bot / Fake Risk</th>
                <th className="py-3 px-3 text-center w-24">Step 1 Recovery</th>
                <th className="py-3 px-3 text-center w-24">Step 2 Lift</th>
                <th className="py-3 px-3 text-center w-28">Recovery Yield</th>
                <th className="py-3 px-3 text-right w-24">Attributed Sales</th>
                <th className="py-3 px-3 text-center w-28">Status</th>
                <th className="py-3 px-4 text-right w-24">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {filteredCreatives.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-10 text-center text-slate-500 text-xs">
                    No ad creatives found matching the current search or filters.
                  </td>
                </tr>
              ) : (
                filteredCreatives.map((creative) => (
                  <tr key={creative.adSource} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition">
                    {/* Creative Name & Page Info */}
                    <td className="py-3.5 px-4 min-w-[280px]">
                      <div className="flex items-start space-x-3">
                        <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/60 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 mt-0.5">
                          <Target className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-slate-900 dark:text-white text-xs truncate" title={creative.adSource}>
                            {creative.adSource}
                          </div>
                          <div className="flex items-center space-x-1.5 mt-0.5 text-[10px] text-slate-500">
                            <span className="truncate font-medium">{creative.pageName}</span>
                            <span>•</span>
                            <span className="text-slate-400 truncate">{creative.businessName}</span>
                          </div>
                          <div className="mt-1 flex items-start space-x-1 text-[11px] text-slate-600 dark:text-slate-400">
                            <span className="text-amber-500 shrink-0">💡</span>
                            <span className="leading-tight line-clamp-2" title={creative.recommendation}>
                              {creative.recommendation}
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Total Leads */}
                    <td className="py-3.5 px-3 text-center whitespace-nowrap">
                      <span className="font-bold text-slate-900 dark:text-white text-xs">
                        {creative.totalLeads}
                      </span>
                      <span className="block text-[9px] text-slate-400">leads</span>
                    </td>

                    {/* Ghosting Rate */}
                    <td className="py-3.5 px-3 text-center whitespace-nowrap">
                      <span className={`font-bold text-xs ${
                        creative.ghostingRate > 65
                          ? "text-rose-600 dark:text-rose-400"
                          : creative.ghostingRate > 40
                          ? "text-amber-600 dark:text-amber-400"
                          : "text-emerald-600 dark:text-emerald-400"
                      }`}>
                        {creative.ghostingRate}%
                      </span>
                      <div className="w-14 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full mx-auto mt-1 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            creative.ghostingRate > 65
                              ? "bg-rose-500"
                              : creative.ghostingRate > 40
                              ? "bg-amber-500"
                              : "bg-emerald-500"
                          }`}
                          style={{ width: `${Math.min(100, creative.ghostingRate)}%` }}
                        />
                      </div>
                      <span className="block text-[9px] text-slate-400 mt-0.5">
                        {creative.ghostedLeads} ghosted
                      </span>
                    </td>

                    {/* Fake / Bot Rate */}
                    <td className="py-3.5 px-3 text-center whitespace-nowrap">
                      <div className="flex flex-col items-center">
                        {getFraudBadge(creative.fraudTier, creative.fakeLeadRate)}
                        <span className="text-[9px] text-slate-400 mt-0.5">
                          {creative.fakeLeadsCount > 0 ? (
                            <span className="text-rose-600 dark:text-rose-400 font-semibold">
                              {creative.fakeLeadsCount} bot(s) (${creative.estimatedWastedSpend} lost)
                            </span>
                          ) : (
                            "0 bot(s) ($0 lost)"
                          )}
                        </span>
                      </div>
                    </td>

                    {/* Step 1 Recovery */}
                    <td className="py-3.5 px-3 text-center whitespace-nowrap">
                      <span className="font-bold text-sky-600 dark:text-sky-400 text-xs">
                        {creative.step1RecoveryRate}%
                      </span>
                      <span className="block text-[9px] text-slate-400">
                        {creative.step1Recoveries} replied
                      </span>
                    </td>

                    {/* Step 2 Lift */}
                    <td className="py-3.5 px-3 text-center whitespace-nowrap">
                      <span className="font-bold text-indigo-600 dark:text-indigo-400 text-xs">
                        {creative.step2RecoveryRate}%
                      </span>
                      {creative.step2IncrementalLift > 0 ? (
                        <span className="inline-flex items-center text-[9px] font-bold text-emerald-600 dark:text-emerald-400">
                          +{creative.step2IncrementalLift}% lift
                        </span>
                      ) : (
                        <span className="block text-[9px] text-slate-400">0% lift</span>
                      )}
                    </td>

                    {/* Overall Recovery */}
                    <td className="py-3.5 px-3 text-center whitespace-nowrap">
                      <span className="font-extrabold text-emerald-600 dark:text-emerald-400 text-sm">
                        {creative.overallRecoveryRate}%
                      </span>
                      <span className="block text-[9px] text-slate-400">
                        {creative.totalRecoveries} of {creative.totalLeads} buyers
                      </span>
                    </td>

                    {/* Est. Revenue */}
                    <td className="py-3.5 px-3 text-right whitespace-nowrap font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                      ${creative.estimatedRevenue.toLocaleString()}
                    </td>

                    {/* Creative Status Badge */}
                    <td className="py-3.5 px-3 text-center whitespace-nowrap">
                      {getTierBadge(creative.healthTier)}
                    </td>

                    {/* Actions: Inspect Leads */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end">
                        <button
                          onClick={() => setInspectedCreative(creative)}
                          className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 text-xs font-semibold border border-slate-200 dark:border-slate-700 transition cursor-pointer shadow-2xs hover:border-slate-300 dark:hover:border-slate-600"
                          title="Inspect leads from this ad"
                        >
                          <Eye className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                          <span>Inspect</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Drill-Down Inspection Modal */}
      {inspectedCreative && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/40">
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <span className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/20">
                    <Target className="w-4 h-4" />
                  </span>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Ad Creative Lead Inspector</h3>
                  {getTierBadge(inspectedCreative.healthTier)}
                </div>
                <p className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">
                  {inspectedCreative.adSource}
                </p>
                <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400">
                  <span>Page: <strong className="text-slate-900 dark:text-white">{inspectedCreative.pageName}</strong></span>
                  <span>•</span>
                  <span>Recovery Rate: <strong className="text-emerald-600 dark:text-emerald-400">{inspectedCreative.overallRecoveryRate}%</strong></span>
                  <span>•</span>
                  <span>Bot Concentration: <strong className="text-red-600 dark:text-red-400">{inspectedCreative.fakeLeadRate}% ({inspectedCreative.fakeLeadsCount} fakes)</strong></span>
                  <span>•</span>
                  <span>Revenue: <strong className="text-amber-600 dark:text-amber-400">${inspectedCreative.estimatedRevenue}</strong></span>
                </div>
              </div>

              <button
                onClick={() => setInspectedCreative(null)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Sub-toolbar inside Modal: Filter Human vs Suspicious */}
            <div className="px-5 py-2.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 flex items-center justify-between text-xs">
              <div className="flex items-center space-x-2">
                <span className="text-slate-500 font-medium">Filter Leads:</span>
                <button
                  onClick={() => setModalFilter("ALL")}
                  className={`px-2 py-0.5 rounded-md font-medium cursor-pointer ${
                    modalFilter === "ALL" ? "bg-slate-800 text-white dark:bg-white dark:text-slate-900" : "text-slate-500 hover:text-slate-800 dark:hover:text-white"
                  }`}
                >
                  All ({inspectedCreative.leads.length})
                </button>
                <button
                  onClick={() => setModalFilter("HUMAN_ONLY")}
                  className={`px-2 py-0.5 rounded-md font-medium cursor-pointer ${
                    modalFilter === "HUMAN_ONLY" ? "bg-emerald-600 text-white" : "text-emerald-600 hover:underline"
                  }`}
                >
                  Human Buyers ({inspectedCreative.leads.filter((l) => l.authenticityStatus === "VERIFIED_HUMAN").length})
                </button>
                <button
                  onClick={() => setModalFilter("SUSPICIOUS_ONLY")}
                  className={`px-2 py-0.5 rounded-md font-medium cursor-pointer ${
                    modalFilter === "SUSPICIOUS_ONLY" ? "bg-red-600 text-white" : "text-red-600 hover:underline"
                  }`}
                >
                  Fake/Bot Leads ({inspectedCreative.leads.filter((l) => l.authenticityStatus !== "VERIFIED_HUMAN").length})
                </button>
              </div>
            </div>

            {/* Modal Leads List */}
            <div className="p-5 overflow-y-auto space-y-3 divide-y divide-slate-100 dark:divide-slate-800/60">
              {inspectedCreative.leads
                .filter((l) => {
                  if (modalFilter === "HUMAN_ONLY") return l.authenticityStatus === "VERIFIED_HUMAN";
                  if (modalFilter === "SUSPICIOUS_ONLY") return l.authenticityStatus !== "VERIFIED_HUMAN";
                  return true;
                })
                .map((lead) => {
                  const isReplied = lead.status === "REPLIED" || lead.repliedAt !== null;
                  return (
                    <div key={lead.id} className="pt-3 flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="flex items-start space-x-3">
                        <img
                          src={
                            lead.customerAvatar ||
                            "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80"
                          }
                          alt={lead.customerName}
                          className="w-9 h-9 rounded-full object-cover ring-1 ring-slate-200 dark:ring-slate-700 shrink-0 mt-0.5"
                        />
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <span className="font-bold text-slate-900 dark:text-white text-xs">{lead.customerName}</span>
                            
                            {/* Authenticity Pill */}
                            {lead.authenticityStatus === "CONFIRMED_FAKE" ? (
                              <span className="text-[9px] px-2 py-0.2 rounded-full font-bold bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-400 border border-red-200 dark:border-red-600/40 flex items-center gap-1">
                                <UserX className="w-3 h-3" />
                                <span>Confirmed Fake</span>
                              </span>
                            ) : lead.authenticityStatus === "SUSPICIOUS" ? (
                              <span className="text-[9px] px-2 py-0.2 rounded-full font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-200 dark:border-amber-600/40 flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" />
                                <span>Suspicious / Bot</span>
                              </span>
                            ) : (
                              <span className="text-[9px] px-2 py-0.2 rounded-full font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-600/40 flex items-center gap-1">
                                <UserCheck className="w-3 h-3" />
                                <span>Verified Human</span>
                              </span>
                            )}

                            <span
                              className={`text-[9px] px-2 py-0.2 rounded-full font-bold ${
                                lead.status === "REPLIED"
                                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30"
                                  : lead.status === "FOLLOWED_UP"
                                  ? "bg-blue-50 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300 border border-blue-200 dark:border-blue-500/30"
                                  : "bg-amber-50 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300 border border-amber-200 dark:border-amber-500/30"
                              }`}
                            >
                              {lead.status}
                            </span>
                          </div>

                          <p className="text-xs text-slate-700 dark:text-slate-300 italic bg-slate-50 dark:bg-slate-950 p-2 rounded-lg border border-slate-200 dark:border-slate-800 max-w-md">
                            &ldquo;{lead.lastCustomerMessage}&rdquo;
                          </p>

                          {/* Fraud Reasons Subtext */}
                          {lead.authenticityReasons && lead.authenticityReasons.length > 0 && lead.authenticityStatus !== "VERIFIED_HUMAN" && (
                            <p className="text-[10px] text-red-600 dark:text-red-400 font-medium">
                              ⚠️ Risk Signal: {lead.authenticityReasons.join("; ")}
                            </p>
                          )}

                          <div className="flex items-center space-x-3 text-[10px] text-slate-500">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {lead.hoursUnresponsive ?? 0}h silent
                            </span>
                            <span>•</span>
                            <span>Follow-ups sent: {lead.followUpCount}</span>
                          </div>
                        </div>
                      </div>

                      {/* Step indicator */}
                      <div className="sm:text-right shrink-0">
                        {isReplied ? (
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-bold ${
                              lead.repliedAfterStep === 2
                                ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30"
                                : "bg-sky-50 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300 border border-sky-200 dark:border-sky-500/30"
                            }`}
                          >
                            {lead.repliedAfterStep === 2 ? "Recovered @ Step 2" : "Recovered @ Step 1"}
                          </span>
                        ) : lead.authenticityStatus === "CONFIRMED_FAKE" ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] text-red-700 bg-red-100 dark:bg-red-950/60 dark:text-red-300 font-medium">
                            Skip / Unreachable
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800">
                            Pending Recovery
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 flex items-center justify-between">
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Syncs with Meta Graph API, Webhook Referrals & Drip Blaster
              </span>
              <button
                onClick={() => setInspectedCreative(null)}
                className="px-4 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-white text-xs font-semibold transition cursor-pointer"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
