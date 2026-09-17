"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  TrendingUp,
  BarChart3,
  RefreshCw,
  CheckCircle2,
  Users,
  Send,
  Clock,
  DollarSign,
  Zap,
  Layers,
  ArrowUpRight,
  ShieldCheck,
  AlertCircle,
  HelpCircle,
  Flame,
  MessageSquare,
  Sparkles,
  Calendar,
  X,
  Check,
} from "lucide-react";

interface ReportDashboardTabProps {
  pages: Array<{ pageId: string; name: string }>;
}

export function ReportDashboardTab({ pages }: ReportDashboardTabProps) {
  const [selectedPageId, setSelectedPageId] = useState<string>("ALL");
  const [selectedDays, setSelectedDays] = useState<string>("all");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
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

  // Load server-persisted AOV on mount if localStorage is empty
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
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchReport = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const queryParams = new URLSearchParams({
        pageId: selectedPageId,
        aov: aov.toString(),
      });

      if (startDate || endDate) {
        if (startDate) queryParams.set("startDate", startDate);
        if (endDate) queryParams.set("endDate", endDate);
      } else if (selectedDays !== "all") {
        queryParams.set("days", selectedDays);
      }

      const res = await fetch(`/api/reports/bot-performance?${queryParams.toString()}`);
      if (!res.ok) throw new Error(`Report API failed with status ${res.status}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to load report");
      setData(json);
    } catch (err: any) {
      setError(err.message || "Failed to load analytics");
    } finally {
      setIsLoading(false);
    }
  }, [selectedPageId, selectedDays, startDate, endDate, aov]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

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

  const summary = data?.summary;
  const pageBreakdown = data?.pageBreakdown || [];
  const recentRecoveries = data?.recentRecoveries || [];

  return (
    <div className="space-y-6">
      {/* Header & Filter Toolbar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg backdrop-blur-sm">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                <BarChart3 className="w-5 h-5" />
              </span>
              <div>
                <h2 className="text-lg font-bold text-white tracking-tight">
                  Bot Performance & Recovery Report
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Evaluate follow-up conversions, Step 1 vs Step 2 response yield, and page-by-page business ROI.
                </p>
              </div>
            </div>

            {/* Active Date Window Indicator */}
            <div className="flex items-center space-x-2 text-[11px] text-slate-500 dark:text-slate-400 mt-2.5">
              <span className="font-medium">Active Date Window:</span>
              {startDate && endDate ? (
                <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 font-semibold">
                  <Calendar className="w-3 h-3 text-blue-500" />
                  <span>{startDate} to {endDate}</span>
                </span>
              ) : startDate ? (
                <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 font-semibold">
                  <Calendar className="w-3 h-3 text-blue-500" />
                  <span>From {startDate}</span>
                </span>
              ) : endDate ? (
                <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 font-semibold">
                  <Calendar className="w-3 h-3 text-blue-500" />
                  <span>Until {endDate}</span>
                </span>
              ) : (
                <span className="text-slate-400 font-medium">All recorded interactions (Lifetime)</span>
              )}
            </div>
          </div>

          {/* Interactive Filters */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Page Filter */}
            <div className="flex items-center space-x-1.5 bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 text-xs">
              <Layers className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
              <select
                value={selectedPageId}
                onChange={(e) => setSelectedPageId(e.target.value)}
                className="bg-transparent text-slate-900 dark:text-slate-200 font-medium focus:outline-none cursor-pointer pr-2"
              >
                <option value="ALL">
                  All Facebook Pages ({pages.length})
                </option>
                {pages.map((p) => (
                  <option key={p.pageId} value={p.pageId}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Date Range Presets */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-1 text-xs">
              {[
                { id: "all", label: "All Time" },
                { id: "today", label: "Today" },
                { id: "7", label: "7 Days" },
                { id: "30", label: "30 Days" },
              ].map((period) => (
                <button
                  key={period.id}
                  onClick={() => handleSelectPreset(period.id)}
                  className={`px-2.5 py-1 rounded-lg font-medium transition ${
                    selectedDays === period.id && !startDate && !endDate
                      ? "bg-blue-600 text-white shadow"
                      : "text-slate-700 hover:text-slate-950 dark:text-slate-400 dark:hover:text-slate-200"
                  }`}
                >
                  {period.label}
                </button>
              ))}
            </div>

            {/* Calendar Date Picker Filter */}
            <div
              className={`flex items-center space-x-1.5 bg-slate-100 dark:bg-slate-950 border rounded-xl px-2.5 py-1 text-xs transition ${
                startDate || endDate
                  ? "border-blue-500/70 ring-2 ring-blue-500/20"
                  : "border-slate-200 dark:border-slate-800"
              }`}
            >
              <Calendar className="w-3.5 h-3.5 text-blue-500 shrink-0" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setSelectedDays("custom");
                }}
                className="bg-transparent text-slate-900 dark:text-slate-200 font-medium text-xs focus:outline-none cursor-pointer"
                title="Filter Start Date"
              />
              <span className="text-slate-500 font-semibold px-0.5">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setSelectedDays("custom");
                }}
                className="bg-transparent text-slate-900 dark:text-slate-200 font-medium text-xs focus:outline-none cursor-pointer"
                title="Filter End Date"
              />
              {(startDate || endDate) && (
                <button
                  type="button"
                  onClick={handleClearCalendar}
                  title="Clear calendar date filter"
                  className="text-slate-400 hover:text-rose-500 p-0.5 rounded transition"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* AOV Adjuster with Automated Save Indicator */}
            <div className="flex items-center space-x-1.5 bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-700 dark:text-slate-300">
              <span className="text-slate-500 font-medium">AOV:</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold">$</span>
              <input
                type="number"
                min="1"
                max="10000"
                value={aov}
                onChange={(e) => handleAovChange(parseInt(e.target.value) || 1)}
                className="w-12 bg-white dark:bg-slate-900 text-center text-slate-900 dark:text-white rounded border border-slate-300 dark:border-slate-700 px-1 py-0.5 focus:outline-none font-medium text-xs"
                title="Average Order Value (Automatically saved)"
              />
              {aovSaveStatus === "saving" && (
                <span className="text-[10px] text-blue-500 font-medium animate-pulse">
                  Saving...
                </span>
              )}
              {aovSaveStatus === "saved" && (
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center space-x-0.5">
                  <Check className="w-3 h-3 text-emerald-500 inline" />
                  <span>Saved</span>
                </span>
              )}
            </div>

            {/* Refresh Button */}
            <button
              onClick={fetchReport}
              disabled={isLoading}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-blue-400" : ""}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>Error loading report: {error}</span>
        </div>
      )}

      {/* Top 4 Executive KPI Hero Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Overall Recovery Rate */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between hover:border-slate-700 transition">
          <div>
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Overall Lead Recovery
              </span>
              <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <CheckCircle2 className="w-4 h-4" />
              </span>
            </div>
            <div className="flex items-baseline space-x-2">
              <span className="text-3xl font-extrabold text-white">
                {summary?.overallRecoveryRate ?? 0}%
              </span>
              <span className="text-xs font-medium text-emerald-400">
                ({summary?.totalResponses ?? 0} / {summary?.totalTargetedLeads ?? 0} leads)
              </span>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
            <span className="text-slate-400">Total Blasts Sent:</span>
            <span className="font-semibold text-slate-200">
              {summary?.totalBlasts ?? 0} ({summary?.blastEfficiencyRate ?? 0}% yield)
            </span>
          </div>
        </div>

        {/* KPI 2: Step 1 Recovery Rate */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between hover:border-sky-500/30 transition">
          <div>
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-sky-400">
                1st Blast Recovery
              </span>
              <span className="p-1.5 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20">
                <Send className="w-4 h-4" />
              </span>
            </div>
            <div className="flex items-baseline space-x-2">
              <span className="text-3xl font-extrabold text-white">
                {summary?.step1ResponseRate ?? 0}%
              </span>
              <span className="text-xs font-medium text-sky-400">
                ({summary?.step1Responses ?? 0} replies)
              </span>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
            <span className="text-slate-400">Avg Reply Time:</span>
            <span className="font-semibold text-sky-300 flex items-center">
              <Clock className="w-3 h-3 mr-1 text-sky-400" />
              ~{summary?.avgResponseTimeStep1 ?? 45}m
            </span>
          </div>
        </div>

        {/* KPI 3: Step 2 Recovery Rate */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between hover:border-indigo-500/30 transition">
          <div>
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400">
                2nd Blast Recovery
              </span>
              <span className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                <Zap className="w-4 h-4" />
              </span>
            </div>
            <div className="flex items-baseline space-x-2">
              <span className="text-3xl font-extrabold text-white">
                {summary?.step2ResponseRate ?? 0}%
              </span>
              <span className="text-xs font-medium text-indigo-400">
                ({summary?.step2Responses ?? 0} / {summary?.step2Blasts ?? 0} sent)
              </span>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
            <span className="text-slate-400">Avg Reply Time:</span>
            <span className="font-semibold text-indigo-300 flex items-center">
              <Clock className="w-3 h-3 mr-1 text-indigo-400" />
              ~{summary?.avgResponseTimeStep2 ?? 60}m
            </span>
          </div>
        </div>

        {/* KPI 4: Recovered Pipeline / Revenue */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between hover:border-amber-500/30 transition">
          <div>
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-amber-400">
                Est. Recovered Revenue
              </span>
              <span className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <DollarSign className="w-4 h-4" />
              </span>
            </div>
            <div className="flex items-baseline space-x-2">
              <span className="text-3xl font-extrabold text-white">
                ${summary?.estimatedRecoveredRevenue ?? 0}
              </span>
              <span className="text-xs text-slate-400 font-medium">
                @ ${aov}/order
              </span>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
            <span className="text-slate-400">Recovered Buyers:</span>
            <span className="font-semibold text-emerald-400">
              +{summary?.totalResponses ?? 0} customers
            </span>
          </div>
        </div>
      </div>

      {/* Decision Card: "Is Step 2 Follow-Up Necessary?" */}
      <div className="bg-gradient-to-r from-white via-white to-indigo-50/70 dark:from-slate-900 dark:via-slate-900 dark:to-indigo-950/40 border border-indigo-200 dark:border-indigo-500/30 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 relative z-10">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center space-x-2">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                <Sparkles className="w-3 h-3 mr-1 text-indigo-400" />
                Step 2 Necessity Evaluator
              </span>
              <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                {summary?.step2Recommendation?.verdict || "Strongly Recommended (High ROI)"}
              </span>
            </div>
            <h3 className="text-base font-bold text-slate-950 dark:text-white">
              Does sending a 2nd follow-up actually drive meaningful business impact?
            </h3>
            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-normal">
              {summary?.step2Recommendation?.description ||
                `Step 2 follow-ups contribute ${summary?.step2IncrementalLift ?? 0}% of all recovered buyers with a ${summary?.step2ResponseRate ?? 0}% conversion rate. Disabling Step 2 would forfeit valuable orders.`}
            </p>
          </div>

          {/* Quick Comparison Metrics */}
          <div className="flex items-center space-x-4 bg-indigo-50/50 dark:bg-slate-950/80 border border-indigo-100 dark:border-slate-800/80 rounded-xl p-4 shrink-0 shadow-sm">
            <div className="text-center px-3 border-r border-indigo-200/80 dark:border-slate-800">
              <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Step 1 Share</div>
              <div className="text-xl font-bold text-sky-600 dark:text-sky-400">
                {summary?.totalResponses > 0
                  ? Number(((summary.step1Responses / summary.totalResponses) * 100).toFixed(0))
                  : 0}
                %
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">
                {summary?.step1Responses ?? 0} recoveries
              </div>
            </div>

            <div className="text-center px-3">
              <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Step 2 Incremental Lift</div>
              <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <ArrowUpRight className="w-4 h-4 mr-0.5" />
                +{summary?.step2IncrementalLift ?? 0}%
              </div>
              <div className="text-[10px] text-emerald-700 dark:text-emerald-400/80 mt-0.5 font-medium">
                +{summary?.step2Responses ?? 0} extra orders
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Per-Page Performance Breakdown */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Layers className="w-4 h-4 text-blue-400" />
            <h3 className="text-sm font-bold text-white">
              Facebook Pages Comparison Breakdown
            </h3>
            <span className="text-xs text-slate-500 font-normal">
              (Comparing response rates after 1st blast vs 2nd blast across pages)
            </span>
          </div>
          <span className="text-xs text-slate-400 font-medium">
            {pageBreakdown.length} Active Connected Pages
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider text-[10px] bg-slate-950/60">
                <th className="py-3 px-4">Facebook Business Page</th>
                <th className="py-3 px-3 text-center">Step 1 (1st Blast)</th>
                <th className="py-3 px-3 text-center">Step 2 (2nd Blast)</th>
                <th className="py-3 px-3 text-center">Total Blasts vs Replied</th>
                <th className="py-3 px-3 text-center">Step 2 Lift</th>
                <th className="py-3 px-3 text-right">Est. Revenue</th>
                <th className="py-3 px-4 text-right">Efficiency Tier</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {pageBreakdown.map((page: any) => (
                <tr key={page.pageId} className="hover:bg-slate-800/30 transition">
                  {/* Page Info */}
                  <td className="py-3.5 px-4">
                    <div className="flex items-center space-x-3">
                      <img
                        src={
                          page.avatarUrl ||
                          "https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=100&auto=format&fit=crop&q=80"
                        }
                        alt={page.pageName}
                        className="w-8 h-8 rounded-lg object-cover ring-1 ring-slate-700"
                      />
                      <div>
                        <div className="font-semibold text-white">{page.pageName}</div>
                        <div className="text-[10px] text-slate-500">{page.pageCategory}</div>
                      </div>
                    </div>
                  </td>

                  {/* Step 1 Performance */}
                  <td className="py-3.5 px-3 text-center">
                    <div className="font-bold text-sky-400 text-sm">
                      {page.step1ResponseRate}%
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {page.step1Responses} / {page.step1Blasts} replied
                    </div>
                  </td>

                  {/* Step 2 Performance */}
                  <td className="py-3.5 px-3 text-center">
                    <div className="font-bold text-indigo-400 text-sm">
                      {page.step2ResponseRate}%
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {page.step2Responses} / {page.step2Blasts} replied
                    </div>
                  </td>

                  {/* Total Funnel Recovery */}
                  <td className="py-3.5 px-3 text-center">
                    <div className="font-bold text-emerald-400 text-sm">
                      {page.overallRecoveryRate}%
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {page.totalResponses} replied ({page.totalBlasts} blasts)
                    </div>
                  </td>

                  {/* Step 2 Lift */}
                  <td className="py-3.5 px-3 text-center">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                        page.step2IncrementalLift > 0
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : "bg-slate-800 text-slate-400"
                      }`}
                    >
                      +{page.step2IncrementalLift}%
                    </span>
                  </td>

                  {/* Est Revenue */}
                  <td className="py-3.5 px-3 text-right font-bold text-amber-300">
                    ${page.estimatedRevenue}
                  </td>

                  {/* Efficiency Tier Badge */}
                  <td className="py-3.5 px-4 text-right">
                    <span
                      className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-[10px] font-bold ${
                        page.efficiencyTier === "Top Performer"
                          ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/20"
                          : page.efficiencyTier === "Healthy"
                          ? "bg-blue-500/10 text-blue-300 border border-blue-500/20"
                          : "bg-amber-500/10 text-amber-300 border border-amber-500/20"
                      }`}
                    >
                      <span>{page.efficiencyTier}</span>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Recovered Customer Replies Feed */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <MessageSquare className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-white">
              Recent Recovered Customer Conversations
            </h3>
          </div>
          <span className="text-xs text-slate-500">Live Inbound Conversions</span>
        </div>

        {recentRecoveries.length === 0 ? (
          <div className="text-center py-8 text-slate-500 text-xs">
            No customer responses recorded yet. Once leads reply to follow-ups, their quotes will appear here.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {recentRecoveries.map((lead: any) => (
              <div
                key={lead.id}
                className="bg-slate-950/80 border border-slate-800/90 rounded-xl p-3.5 flex flex-col justify-between hover:border-slate-700 transition"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2.5">
                      <img
                        src={
                          lead.customerAvatar ||
                          "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80"
                        }
                        alt={lead.customerName}
                        className="w-7 h-7 rounded-full object-cover ring-1 ring-slate-700"
                      />
                      <div>
                        <div className="font-semibold text-white text-xs">
                          {lead.customerName}
                        </div>
                        <div className="text-[10px] text-slate-500">{lead.pageName}</div>
                      </div>
                    </div>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                        lead.repliedAfterStep === 2
                          ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                          : "bg-sky-500/20 text-sky-300 border border-sky-500/30"
                      }`}
                    >
                      {lead.repliedAfterStep === 2 ? "Recovered @ Step 2" : "Recovered @ Step 1"}
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 italic bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/60">
                    &ldquo;{lead.lastCustomerMessage}&rdquo;
                  </p>
                </div>

                {lead.adSource && (
                  <div className="mt-2 text-[10px] text-indigo-400 truncate">
                    📢 {lead.adSource}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
