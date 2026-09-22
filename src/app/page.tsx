"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Radar,
  Bot,
  Layers,
  History,
  Settings,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Send,
  Sparkles,
  BarChart3,
  Building2,
  Briefcase,
  Plus,
  Check,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { StatsCards } from "@/components/StatsCards";
import { ScannerTab } from "@/components/ScannerTab";
import { BotSetupTab } from "@/components/BotSetupTab";
import { ReportDashboardTab } from "@/components/ReportDashboardTab";
import { PagesManagerTab } from "@/components/PagesManagerTab";
import { BlastLogsTab } from "@/components/BlastLogsTab";
import { SettingsTab } from "@/components/SettingsTab";
import { LiveBlastModal, LiveBlastStep } from "@/components/LiveBlastModal";
import { CreatePortfolioModal } from "@/components/CreatePortfolioModal";
import { AdminPinGate } from "@/components/AdminPinGate";
import { AnalyzedLead, ScannerSummary } from "@/lib/scanner";

function getShortPageName(pageName: string, businessName?: string): string {
  if (!pageName) return "";

  // Strip business brand name if within a dedicated portfolio
  if (businessName && businessName !== "ALL") {
    const firstWord = businessName.split(/[\s-]+/)[0];
    if (firstWord && firstWord.length >= 3) {
      const regex = new RegExp(`^${firstWord}\\s*[-–—•:]?\\s*`, "i");
      if (regex.test(pageName)) {
        const stripped = pageName.replace(regex, "").trim();
        if (stripped.length > 0) return stripped;
      }
    }
  }

  // Also strip common known brand prefixes
  const commonPrefixes = ["SieLab", "Moew"];
  for (const pfx of commonPrefixes) {
    const regex = new RegExp(`^${pfx}\\s*[-–—•:]?\\s*`, "i");
    if (regex.test(pageName)) {
      const stripped = pageName.replace(regex, "").trim();
      if (stripped.length > 0) return stripped;
    }
  }

  return pageName;
}

export default function SieReachDashboard() {
  const [activeTab, setActiveTab] = useState<
    "scanner" | "bot-setup" | "reports" | "pages" | "logs" | "settings"
  >("scanner");

  // Authentication State (Admin PIN Access Gate)
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    async function checkSession() {
      try {
        const res = await fetch("/api/auth/session");
        const data = await res.json();
        setIsAuthenticated(Boolean(data.authenticated));
      } catch {
        setIsAuthenticated(false);
      }
    }
    checkSession();
  }, []);

  const handleLockWorkspace = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      setIsAuthenticated(false);
    }
  };

  // Business Portfolio State (Executive Admin Profile Switcher)
  const [selectedBusiness, setSelectedBusiness] = useState<string>("SieLab Retail Group");
  const [portfolios, setPortfolios] = useState<any[]>([]);
  const [isCreatePortfolioOpen, setIsCreatePortfolioOpen] = useState(false);

  // App State
  const [isMockMode, setIsMockMode] = useState(true);
  const [thresholdHours, setThresholdHours] = useState(24.0);
  const [selectedPageId, setSelectedPageId] = useState("ALL");

  // Data State
  const [scannerData, setScannerData] = useState<ScannerSummary>({
    totalPages: 5,
    totalLeads: 0,
    awaitingCustomer: 0,
    unresponsiveCount: 0,
    urgent24hCount: 0,
    expired24hCount: 0,
    followedUpCount: 0,
    leads: [],
  });

  const [pages, setPages] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [logStats, setLogStats] = useState({ totalDelivered: 0, totalFailed: 0 });

  // Loading States
  const [isLoading, setIsLoading] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [isBlasting, setIsBlasting] = useState(false);
  const [isSavingCampaign, setIsSavingCampaign] = useState(false);
  const [blastFeedback, setBlastFeedback] = useState<{
    show: boolean;
    title: string;
    message: string;
    count: number;
  } | null>(null);

  // Fetch all data
  const fetchData = useCallback(async () => {
    try {
      // 0. Fetch Portfolios
      try {
        const portRes = await fetch("/api/portfolios");
        const portJson = await portRes.json();
        if (portJson.success) setPortfolios(portJson.portfolios || []);
      } catch (portErr) {
        console.error("Failed to fetch portfolios:", portErr);
      }

      // 1. Fetch Pages
      const pagesRes = await fetch("/api/pages");
      const pagesJson = await pagesRes.json();
      if (pagesJson.success) setPages(pagesJson.pages || []);

      // 2. Fetch Leads with threshold
      const pageParam = selectedPageId !== "ALL" ? `&pageId=${selectedPageId}` : "";
      const leadsRes = await fetch(
        `/api/leads?thresholdHours=${thresholdHours}${pageParam}`
      );
      const leadsJson = await leadsRes.json();
      if (leadsJson.success) setScannerData(leadsJson.data);

      // 3. Fetch Campaigns
      const campRes = await fetch("/api/campaigns");
      const campJson = await campRes.json();
      if (campJson.success) setCampaigns(campJson.campaigns || []);

      // 4. Fetch Logs
      const logsRes = await fetch("/api/logs");
      const logsJson = await logsRes.json();
      if (logsJson.success) {
        setLogs(logsJson.logs || []);
        setLogStats({
          totalDelivered: logsJson.stats.totalDelivered,
          totalFailed: logsJson.stats.totalFailed,
        });
      }

      // 5. Fetch Settings
      const setRes = await fetch("/api/settings");
      const setJson = await setRes.json();
      if (setJson.success && setJson.settings) {
        setIsMockMode(setJson.settings.MOCK_MODE === "true");
      }
    } catch (err) {
      console.error("Failed to load SieReach data:", err);
    } finally {
      setIsLoading(false);
      setIsScanning(false);
    }
  }, [selectedPageId, thresholdHours]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Scoped Pages according to active Business Portfolio
  const scopedPages = React.useMemo(() => {
    if (selectedBusiness === "ALL") return pages;
    return pages.filter(
      (p) => (p.businessName || "SieLab Retail Group") === selectedBusiness
    );
  }, [pages, selectedBusiness]);

  const scopedPageIds = React.useMemo(() => {
    return new Set(scopedPages.map((p) => p.pageId));
  }, [scopedPages]);

  // Scoped Scanner Leads & Metrics ("Zero Mix-Up" Isolation)
  const scopedScannerSummary: ScannerSummary = React.useMemo(() => {
    let filtered = scannerData.leads.filter((l) => scopedPageIds.has(l.pageId));
    if (selectedPageId !== "ALL") {
      filtered = filtered.filter((l) => l.pageId === selectedPageId);
    }
    return {
      totalPages: selectedPageId !== "ALL" ? 1 : scopedPages.length,
      totalLeads: filtered.length,
      awaitingCustomer: filtered.filter((l) => l.status === "AWAITING_CUSTOMER").length,
      unresponsiveCount: filtered.filter((l) => l.isEligibleForFollowUp).length,
      urgent24hCount: filtered.filter((l) => l.policyStatus === "APPROACHING_DEADLINE").length,
      expired24hCount: filtered.filter((l) => !l.within24h).length,
      followedUpCount: filtered.filter((l) => l.followUpCount > 0).length,
      leads: filtered,
    };
  }, [scannerData, scopedPages.length, scopedPageIds, selectedPageId]);

  // Scoped Campaigns (Strict Dedicated Business Portfolio Isolation)
  const scopedCampaigns = React.useMemo(() => {
    let filtered = campaigns;
    if (selectedBusiness !== "ALL") {
      filtered = filtered.filter(
        (c) => (c.businessName || "SieLab Retail Group") === selectedBusiness
      );
    }
    if (selectedPageId !== "ALL") {
      filtered = filtered.filter((c) => !c.pageId || c.pageId === selectedPageId);
    }
    return filtered;
  }, [campaigns, selectedBusiness, selectedPageId]);

  // Scoped Logs
  const scopedLogs = React.useMemo(() => {
    let filtered = logs.filter((l) => scopedPageIds.has(l.pageId));
    if (selectedPageId !== "ALL") {
      filtered = filtered.filter((l) => l.pageId === selectedPageId);
    }
    return filtered;
  }, [logs, scopedPageIds, selectedPageId]);

  const scopedLogStats = React.useMemo(() => {
    return {
      totalDelivered: scopedLogs.filter((l) => l.status === "DELIVERED").length,
      totalFailed: scopedLogs.filter((l) => l.status === "FAILED").length,
    };
  }, [scopedLogs]);

  const activePortfolio = React.useMemo(() => {
    if (selectedBusiness === "ALL") return null;
    return portfolios.find((p) => p.name === selectedBusiness);
  }, [portfolios, selectedBusiness]);

  // Ensure selectedPageId remains valid when scopedPages changes
  useEffect(() => {
    if (selectedPageId !== "ALL") {
      const exists = scopedPages.some((p) => p.pageId === selectedPageId);
      if (!exists) {
        setSelectedPageId("ALL");
      }
    }
  }, [scopedPages, selectedPageId]);

  // Recurring Background Auto-Blast Poller (Every 30 seconds)
  useEffect(() => {
    const hasAutoBlast = campaigns.some((c) => c.autoBlast && c.isActive);
    if (!hasAutoBlast) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch("/api/cron/auto-blast");
        const json = await res.json();
        if (json.success && json.data?.totalDelivered > 0) {
          // If automated messages were dispatched, refresh dashboard data
          fetchData();
        }
      } catch (err) {
        console.error("Auto-blast poller error:", err);
      }
    }, 30_000);

    return () => clearInterval(interval);
  }, [campaigns, fetchData]);

  // Handler: Re-scan
  const handleRefreshScan = async () => {
    setIsScanning(true);
    await fetchData();
  };

  // Handler: Reset Demo Data
  const handleResetDemoData = async () => {
    setIsScanning(true);
    try {
      const res = await fetch("/api/seed", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setBlastFeedback({
          show: true,
          title: "Demo Data Reset",
          message: "All 5 Facebook pages and ad click-through leads have been restored with fresh timers.",
          count: 0,
        });
        setTimeout(() => setBlastFeedback(null), 4000);
        await fetchData();
      }
    } catch (err) {
      console.error("Reset error:", err);
    } finally {
      setIsScanning(false);
    }
  };

  // Handler: Toggle Mock Mode
  const handleToggleMockMode = async () => {
    const nextMode = !isMockMode;
    setIsMockMode(nextMode);
    await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ MOCK_MODE: nextMode ? "true" : "false" }),
    });
  };

  // Live Blast State
  const [isLiveBlastOpen, setIsLiveBlastOpen] = useState(false);
  const [liveBlastTotal, setLiveBlastTotal] = useState(0);
  const [liveBlastCurrent, setLiveBlastCurrent] = useState(0);
  const [liveBlastStatus, setLiveBlastStatus] = useState("");
  const [liveCountdown, setLiveCountdown] = useState(0);
  const [liveSteps, setLiveSteps] = useState<LiveBlastStep[]>([]);
  const [isLiveFinished, setIsLiveFinished] = useState(false);
  const stopBlastRef = React.useRef(false);

  // Sequential Drip Blaster with live visual countdown
  const runSequentialBlast = async (leadsToBlast: AnalyzedLead[], campaignId?: string) => {
    if (leadsToBlast.length === 0) return;

    stopBlastRef.current = false;
    setIsLiveBlastOpen(true);
    setLiveBlastTotal(leadsToBlast.length);
    setLiveBlastCurrent(0);
    setLiveSteps([]);
    setIsLiveFinished(false);
    setLiveCountdown(0);
    setIsBlasting(true);

    const activeCamp = campaigns.find((c) => c.id === campaignId) || campaigns[0];
    const minDelay = activeCamp?.dripMinSeconds ?? 3.0;
    const maxDelay = activeCamp?.dripMaxSeconds ?? 5.0;

    let previousDelaySec: number | undefined = undefined;

    for (let i = 0; i < leadsToBlast.length; i++) {
      if (stopBlastRef.current) break;

      const lead = leadsToBlast[i];
      setLiveBlastStatus(`Dispatching to ${lead.customerName} (${i + 1} of ${leadsToBlast.length})...`);

      // 1. Send this single lead
      try {
        const res = await fetch("/api/blast", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            campaignId: activeCamp?.id,
            leadIds: [lead.id],
            customThresholdHours: thresholdHours,
            messageTag: "HUMAN_AGENT",
            excludePast24h: activeCamp?.excludePast24h ?? true,
          }),
        });

        const data = await res.json();
        const success = data?.report?.successful > 0;
        const stepTime = new Date().toLocaleTimeString();

        setLiveSteps((prev) => [
          {
            customerName: lead.customerName,
            pageName: lead.pageName,
            status: success ? "DELIVERED" : "FAILED",
            delaySeconds: previousDelaySec,
            time: stepTime,
          },
          ...prev,
        ]);
      } catch (err) {
        console.error(err);
      }

      setLiveBlastCurrent(i + 1);

      // 2. If there are more leads in queue, perform live drip countdown
      if (i < leadsToBlast.length - 1 && !stopBlastRef.current) {
        const delay = Number((minDelay + Math.random() * (maxDelay - minDelay)).toFixed(1));
        previousDelaySec = delay;

        setLiveBlastStatus(`Drip Pacing: Pausing ${delay}s before next customer...`);

        let remaining = delay;
        setLiveCountdown(remaining);

        while (remaining > 0 && !stopBlastRef.current) {
          await new Promise((r) => setTimeout(r, 100));
          remaining = Math.max(0, Number((remaining - 0.1).toFixed(1)));
          setLiveCountdown(remaining);
        }
      }
    }

    setIsLiveFinished(true);
    setIsBlasting(false);
    setLiveCountdown(0);
    await fetchData();
  };

  // Handler: Trigger Blast to selected leads
  const handleTriggerBlast = async (leadIds: string[]) => {
    if (leadIds.length === 0) return;
    const leadsToBlast = scopedScannerSummary.leads.filter((l) => leadIds.includes(l.id));
    await runSequentialBlast(leadsToBlast);
  };

  // Handler: Campaign Save
  const handleSaveCampaign = async (campaignData: any) => {
    setIsSavingCampaign(true);
    try {
      const method = campaignData.id ? "PUT" : "POST";
      const payload = {
        ...campaignData,
        businessName:
          campaignData.businessName ||
          (selectedBusiness !== "ALL"
            ? selectedBusiness
            : scopedPages[0]?.businessName || "SieLab Retail Group"),
      };
      const res = await fetch("/api/campaigns", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to save campaign rule");
      }
      await fetchData();
      setBlastFeedback({
        show: true,
        title: "Rule Saved Successfully!",
        message: `Updated settings for "${data.campaign.name}" (${data.campaign.inactiveHoursThreshold}h inactivity, ${data.campaign.dripMinSeconds}s-${data.campaign.dripMaxSeconds}s drip).`,
        count: 0,
      });
      setTimeout(() => setBlastFeedback(null), 4000);
      return data.campaign;
    } catch (err: any) {
      console.error("Save campaign error:", err);
      setBlastFeedback({
        show: true,
        title: "Failed to Save Rule",
        message: err.message || "An unexpected error occurred while saving the rule.",
        count: 0,
      });
      throw err;
    } finally {
      setIsSavingCampaign(false);
    }
  };

  // Handler: Campaign Delete
  const handleDeleteCampaign = async (campaignId: string) => {
    try {
      const res = await fetch(`/api/campaigns?id=${campaignId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to delete campaign rule");
      }
      await fetchData();
      setBlastFeedback({
        show: true,
        title: "Rule Deleted",
        message: "The follow-up bot rule has been removed successfully.",
        count: 0,
      });
      setTimeout(() => setBlastFeedback(null), 3500);
      return true;
    } catch (err: any) {
      console.error("Delete campaign error:", err);
      setBlastFeedback({
        show: true,
        title: "Failed to Delete Rule",
        message: err.message || "An unexpected error occurred while deleting the rule.",
        count: 0,
      });
      throw err;
    }
  };

  // Handler: Campaign Blast All
  const handleExecuteCampaignBlast = async (campaignId: string) => {
    const activeCamp = campaigns.find((c) => c.id === campaignId) || campaigns[0];
    const threshold = activeCamp?.inactiveHoursThreshold ?? thresholdHours;
    const exclude24 = activeCamp?.excludePast24h ?? true;
    const maxFollowUps = activeCamp?.maxFollowUps ?? 1;
    const cooldownHours = activeCamp?.cooldownHours ?? 3.0;

    const leadsToBlast = scopedScannerSummary.leads.filter((l) => {
      if (l.status === "REPLIED" || l.status === "CONVERTED" || l.status === "CLOSED") return false;
      if (l.followUpCount >= maxFollowUps) return false;
      if (exclude24 && !l.within24h) return false;

      if (l.followUpCount === 0) {
        if (l.status !== "AWAITING_CUSTOMER") return false;
        return l.hoursUnresponsive >= threshold;
      } else {
        // Step 2+: Must satisfy cooldown period since last follow-up
        return (l.hoursSinceLastFollowUp ?? 0) >= cooldownHours;
      }
    });

    if (leadsToBlast.length === 0) {
      setBlastFeedback({
        show: true,
        title: "No Eligible Leads",
        message: `All leads are currently up to date or excluded by 24h Tag Safety.`,
        count: 0,
      });
      setTimeout(() => setBlastFeedback(null), 4000);
      return;
    }

    await runSequentialBlast(leadsToBlast, campaignId);
  };

  // Handler: Add Page
  const handleAddPage = async (pageData: any) => {
    await fetch("/api/pages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(pageData),
    });
    await fetchData();
  };

  // Handler: Toggle Page Active
  const handleTogglePageActive = async (pageId: string, isActive: boolean) => {
    await fetch("/api/pages", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pageId, isActive }),
    });
    await fetchData();
  };

  // Handler: Delete Page
  const handleDeletePage = async (pageId: string) => {
    if (!confirm("Are you sure you want to disconnect this Facebook Page?")) return;
    await fetch(`/api/pages?pageId=${pageId}`, { method: "DELETE" });
    await fetchData();
  };

  // Handler: Sync Page Profile
  const handleSyncProfile = async (pageId: string) => {
    try {
      const res = await fetch("/api/pages", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageId, syncProfile: true }),
      });
      const data = await res.json();
      if (data.success) {
        setBlastFeedback({
          show: true,
          title: "Page Profile Synced!",
          message: `Updated profile picture and details from Meta for "${data.page?.name}".`,
          count: 0,
        });
        setTimeout(() => setBlastFeedback(null), 3500);
      }
      await fetchData();
    } catch (err) {
      console.error("Sync profile error:", err);
    }
  };

  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center space-y-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-sky-500 flex items-center justify-center text-white font-bold shadow-lg shadow-blue-500/25 animate-pulse">
          SL
        </div>
        <p className="text-xs text-slate-400 font-medium tracking-wide">Checking Admin Session...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AdminPinGate onAuthenticated={() => setIsAuthenticated(true)} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col transition-colors duration-200">
      {/* Top Navbar */}
      <Navbar
        isMockMode={isMockMode}
        onToggleMockMode={handleToggleMockMode}
        onResetDemoData={handleResetDemoData}
        isRefreshing={isScanning}
        pages={pages}
        portfolios={portfolios}
        selectedBusiness={selectedBusiness}
        onSelectBusiness={(biz) => {
          setSelectedBusiness(biz);
          setSelectedPageId("ALL");
        }}
        onOpenCreatePortfolio={() => setIsCreatePortfolioOpen(true)}
        onNavigateToPages={() => setActiveTab("pages")}
        onLockWorkspace={handleLockWorkspace}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Blast Feedback Banner */}
        {blastFeedback && (
          <div className="bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-500/50 rounded-2xl p-4 flex items-center justify-between shadow-md dark:shadow-2xl animate-in slide-in-from-top duration-300">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">{blastFeedback.title}</h4>
                <p className="text-xs text-emerald-700 dark:text-emerald-300/90">{blastFeedback.message}</p>
              </div>
            </div>
            <button
              onClick={() => setBlastFeedback(null)}
              className="text-xs text-slate-400 hover:text-slate-700 dark:text-emerald-400 dark:hover:text-white px-2 py-1"
            >
              ✕
            </button>
          </div>
        )}

        {/* Active Business Portfolio & Facebook Page Filter Strip */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-2.5 shadow-2xs">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 max-w-full [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="flex items-center space-x-2 shrink-0 pr-3 border-r border-slate-200 dark:border-slate-800">
              <span className="text-base">{activePortfolio?.icon || (selectedBusiness === "ALL" ? "🌐" : "🏢")}</span>
              <span className="text-xs font-bold text-slate-900 dark:text-white">
                {selectedBusiness === "ALL" ? "All Portfolios" : selectedBusiness}
              </span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-mono font-medium">
                {scopedPages.length}p
              </span>
            </div>

            <div className="flex items-center space-x-1.5 shrink-0">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-blue-500" />
                <span>Page:</span>
              </span>

              {/* All Pages Button */}
              <button
                onClick={() => setSelectedPageId("ALL")}
                className={`px-2.5 py-1 rounded-lg text-xs transition shrink-0 flex items-center gap-1 cursor-pointer ${
                  selectedPageId === "ALL"
                    ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-bold shadow-xs"
                    : "bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-medium"
                }`}
              >
                <span>All ({scopedPages.length})</span>
              </button>

              {/* Individual Page Chips (Prefix Stripped for Clean Compact Fit) */}
              {scopedPages.map((pg) => {
                const isPageActive = selectedPageId === pg.pageId;
                const leadCount = scannerData.leads.filter((l) => l.pageId === pg.pageId).length;
                const displayName = getShortPageName(pg.name, selectedBusiness);
                return (
                  <button
                    key={pg.pageId}
                    onClick={() => setSelectedPageId(pg.pageId)}
                    className={`px-2.5 py-1 rounded-lg text-xs transition shrink-0 flex items-center gap-1.5 cursor-pointer shadow-2xs ${
                      isPageActive
                        ? "bg-blue-600 text-white font-bold shadow-xs border border-blue-600 dark:bg-blue-600 dark:border-blue-500"
                        : "bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-medium"
                    }`}
                    title={`Filter by ${pg.name}`}
                  >
                    {pg.pictureUrl ? (
                      <img
                        src={pg.pictureUrl}
                        alt={pg.name}
                        className="w-3.5 h-3.5 rounded-full object-cover shrink-0"
                      />
                    ) : (
                      <span className="text-xs shrink-0">📄</span>
                    )}
                    <span className="truncate max-w-[150px] sm:max-w-[220px]">{displayName}</span>
                    {leadCount > 0 && (
                      <span
                        className={`text-[9px] px-1.5 py-0.2 rounded-full font-mono ${
                          isPageActive
                            ? "bg-blue-700 text-white font-bold"
                            : "bg-slate-200 dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-medium"
                        }`}
                      >
                        {leadCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {selectedPageId !== "ALL" && (
            <button
              onClick={() => setSelectedPageId("ALL")}
              className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 shrink-0 cursor-pointer ml-auto font-medium"
            >
              <span>Reset Page Filter</span>
              <span className="text-xs">✕</span>
            </button>
          )}
        </div>

        {/* Dashboard Top Overview Stats */}
        <StatsCards
          totalPages={selectedPageId !== "ALL" ? 1 : scopedPages.length}
          totalLeads={scopedScannerSummary.totalLeads}
          awaitingCount={scopedScannerSummary.awaitingCustomer}
          unresponsiveCount={scopedScannerSummary.unresponsiveCount}
          urgent24hCount={scopedScannerSummary.urgent24hCount}
          followedUpCount={scopedScannerSummary.followedUpCount}
          thresholdHours={thresholdHours}
          onNavigateToPages={() => setActiveTab("pages")}
        />

        {/* Navigation Tabs Bar */}
        <div className="flex items-center space-x-1 border-b border-slate-200 dark:border-slate-800 pb-2 overflow-x-auto">
          {[
            {
              id: "scanner",
              label: "Inactive Lead Scanner",
              icon: Radar,
              badge: scopedScannerSummary.unresponsiveCount > 0 ? scopedScannerSummary.unresponsiveCount : null,
            },
            {
              id: "bot-setup",
              label: "Follow-Up Bot Setup",
              icon: Bot,
              badge: null,
            },
            {
              id: "reports",
              label: "Bot Performance & ROI",
              icon: BarChart3,
              badge: "ROI",
            },
            {
              id: "pages",
              label: "Facebook Pages",
              icon: Layers,
              badge: scopedPages.length,
            },
            {
              id: "logs",
              label: "Blast Delivery Logs",
              icon: History,
              badge: scopedLogs.length > 0 ? scopedLogs.length : null,
            },
            {
              id: "settings",
              label: "API & Webhook Settings",
              icon: Settings,
              badge: null,
            },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition shrink-0 ${
                  isActive
                    ? "bg-white text-blue-600 shadow-sm border border-slate-200 dark:bg-slate-800 dark:text-white dark:border-slate-700"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-900"
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-blue-600 dark:text-blue-400" : "text-slate-400 dark:text-slate-500"}`} />
                <span>{tab.label}</span>
                {tab.badge !== null && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold transition ${
                      isActive
                        ? "bg-blue-600 text-white"
                        : "bg-slate-200 text-slate-700 border border-slate-300 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700"
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Tab Content Rendering */}
        <div className="pt-2">
          {activeTab === "scanner" && (
            <ScannerTab
              leads={scopedScannerSummary.leads}
              thresholdHours={thresholdHours}
              onThresholdChange={setThresholdHours}
              onRefreshScan={handleRefreshScan}
              isScanning={isScanning}
              onTriggerBlast={handleTriggerBlast}
              isBlasting={isBlasting}
            />
          )}

          {activeTab === "bot-setup" && (
            <BotSetupTab
              campaigns={scopedCampaigns}
              pages={scopedPages}
              activeBusiness={selectedBusiness}
              onSaveCampaign={handleSaveCampaign}
              onDeleteCampaign={handleDeleteCampaign}
              onExecuteCampaignBlast={handleExecuteCampaignBlast}
              isSaving={isSavingCampaign}
              isBlasting={isBlasting}
            />
          )}

          {activeTab === "reports" && (
            <ReportDashboardTab pages={scopedPages} />
          )}

          {activeTab === "pages" && (
            <PagesManagerTab
              pages={scopedPages}
              portfolios={portfolios}
              activeBusiness={selectedBusiness}
              onSelectBusiness={(biz) => {
                setSelectedBusiness(biz);
                setSelectedPageId("ALL");
              }}
              onOpenCreatePortfolio={() => setIsCreatePortfolioOpen(true)}
              onAddPage={handleAddPage}
              onTogglePageActive={handleTogglePageActive}
              onDeletePage={handleDeletePage}
              onSyncProfile={handleSyncProfile}
              isMockMode={isMockMode}
            />
          )}

          {activeTab === "logs" && (
            <BlastLogsTab
              logs={scopedLogs}
              totalDelivered={scopedLogStats.totalDelivered}
              totalFailed={scopedLogStats.totalFailed}
              onRefreshLogs={fetchData}
              isLoading={isLoading}
            />
          )}

          {activeTab === "settings" && (
            <SettingsTab
              isMockMode={isMockMode}
              onToggleMockMode={handleToggleMockMode}
            />
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800/80 py-4 mt-12 bg-white/80 dark:bg-slate-950/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
          <div className="flex items-center space-x-2">
            <span className="font-semibold text-slate-400">SieReach Meta for Facebook</span>
            <span>•</span>
            <span>Empowering business sales recovery across Facebook Business Pages</span>
          </div>
          <div className="flex items-center space-x-3">
            <span>Meta Graph API v21.0 Ready</span>
            <span>•</span>
            <span className="text-emerald-400">Status: Healthy</span>
          </div>
        </div>
      </footer>

      {/* Live Blast Real-time Progress & Countdown Modal */}
      <LiveBlastModal
        isOpen={isLiveBlastOpen}
        onClose={() => setIsLiveBlastOpen(false)}
        total={liveBlastTotal}
        current={liveBlastCurrent}
        currentStepStatus={liveBlastStatus}
        countdown={liveCountdown}
        steps={liveSteps}
        isFinished={isLiveFinished}
        onStop={() => {
          stopBlastRef.current = true;
          setIsLiveFinished(true);
        }}
      />

      {/* Create Business Portfolio Modal */}
      <CreatePortfolioModal
        isOpen={isCreatePortfolioOpen}
        onClose={() => setIsCreatePortfolioOpen(false)}
        onCreated={(newPort) => {
          fetchData();
          if (newPort && newPort.name) {
            setSelectedBusiness(newPort.name);
            setSelectedPageId("ALL");
          }
        }}
      />
    </div>
  );
}
