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
  Zap,
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

  // Visual Interactive Prompt when connecting a page that matches an active campaign
  const [pageTriggerPrompt, setPageTriggerPrompt] = useState<{
    show: boolean;
    pageId: string;
    pageName: string;
    businessName: string;
    leadCount: number;
    campaignName: string;
    campaignId: string;
  } | null>(null);

  // Live Data Sync Timestamp & Relative Time Ticker
  const [lastDataSyncTime, setLastDataSyncTime] = useState<Date | null>(null);
  const [, setSyncTick] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setSyncTick((t) => t + 1), 10_000);
    return () => clearInterval(timer);
  }, []);

  const getRelativeSyncTime = (date: Date | null) => {
    if (!date) return "Just now";
    const diffSec = Math.floor((Date.now() - date.getTime()) / 1000);
    if (diffSec < 10) return "Just now";
    if (diffSec < 60) return `${diffSec}s ago`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  // Fetch all data in parallel for high-speed sub-200ms loading
  const fetchData = useCallback(async () => {
    try {
      const pageParam = selectedPageId !== "ALL" ? `&pageId=${selectedPageId}` : "";

      const [portRes, pagesRes, leadsRes, campRes, logsRes, setRes] = await Promise.all([
        fetch("/api/portfolios").catch(() => null),
        fetch("/api/pages").catch(() => null),
        fetch(`/api/leads?thresholdHours=${thresholdHours}${pageParam}`).catch(() => null),
        fetch("/api/campaigns").catch(() => null),
        fetch("/api/logs").catch(() => null),
        fetch("/api/settings").catch(() => null),
      ]);

      if (portRes?.ok) {
        const portJson = await portRes.json();
        if (portJson.success && portJson.portfolios) {
          setPortfolios(portJson.portfolios);
          setSelectedBusiness((prev) => {
            if (prev === "ALL") return prev;
            if (portJson.portfolios.length > 0 && !portJson.portfolios.some((p: any) => p.name === prev)) {
              return portJson.portfolios[0].name;
            }
            return prev;
          });
        }
      }

      if (pagesRes?.ok) {
        const pagesJson = await pagesRes.json();
        if (pagesJson.success) setPages(pagesJson.pages || []);
      }

      if (leadsRes?.ok) {
        const leadsJson = await leadsRes.json();
        if (leadsJson.success) setScannerData(leadsJson.data);
      }

      if (campRes?.ok) {
        const campJson = await campRes.json();
        if (campJson.success) setCampaigns(campJson.campaigns || []);
      }

      if (logsRes?.ok) {
        const logsJson = await logsRes.json();
        if (logsJson.success) {
          setLogs(logsJson.logs || []);
          setLogStats({
            totalDelivered: logsJson.stats.totalDelivered,
            totalFailed: logsJson.stats.totalFailed,
          });
        }
      }

      if (setRes?.ok) {
        const setJson = await setRes.json();
        if (setJson.success && setJson.settings) {
          setIsMockMode(setJson.settings.MOCK_MODE === "true");
        }
      }
    } catch (err) {
      console.error("Failed to load SieReach data:", err);
    } finally {
      setIsLoading(false);
      setIsScanning(false);
      setLastDataSyncTime(new Date());
    }
  }, [thresholdHours, selectedPageId]);

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

  // Handler: Re-scan (Full Meta Graph API Crawl)
  const handleRefreshScan = async () => {
    setIsScanning(true);
    try {
      await fetch("/api/leads/scan", { method: "POST" });
      await fetchData();
    } catch (err) {
      console.error("Scan error:", err);
    } finally {
      setIsScanning(false);
    }
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

  // Handler: Confirm Immediate Page Blast Trigger with Live Progress Screen
  const handleConfirmTriggerPage = async (pageId?: string) => {
    const promptInfo = pageTriggerPrompt;
    setPageTriggerPrompt(null); // Immediately close prompt modal so user is never blocked

    const targetPageId = pageId || promptInfo?.pageId;
    const targetCampaignId = promptInfo?.campaignId;

    const activeCamp =
      (targetCampaignId ? campaigns.find((c) => c.id === targetCampaignId) : null) ||
      campaigns.find(
        (c) => c.isActive && c.autoBlast && (!c.pageId || c.pageId === targetPageId)
      ) ||
      campaigns.find((c) => c.isActive && c.autoBlast) ||
      campaigns[0];

    const threshold = activeCamp?.inactiveHoursThreshold ?? thresholdHours;
    const exclude24 = activeCamp?.excludePast24h ?? true;
    const maxFollowUps = activeCamp?.maxFollowUps ?? 1;
    const cooldownHours = activeCamp?.cooldownHours ?? 3.0;

    setIsBlasting(true);
    try {
      // 1. Fetch latest leads for target page to ensure freshest scan data
      let pageLeads: AnalyzedLead[] = scannerData.leads;
      if (targetPageId) {
        try {
          const res = await fetch(`/api/leads?thresholdHours=${threshold}&pageId=${targetPageId}`);
          const json = await res.json();
          if (json.success && json.summary?.leads) {
            pageLeads = json.summary.leads;
          }
        } catch (fetchErr) {
          console.warn("Could not refetch single page leads, falling back to summary leads", fetchErr);
        }
      }

      // 2. Filter eligible leads matching campaign criteria
      const leadsToBlast = pageLeads.filter((l: AnalyzedLead) => {
        if (targetPageId && l.pageId !== targetPageId) return false;
        if (l.status === "REPLIED" || l.status === "CONVERTED" || l.status === "CLOSED") return false;
        if (l.followUpCount >= maxFollowUps) return false;
        if (exclude24 && !l.within24h) return false;

        if (l.followUpCount === 0) {
          if (l.status !== "AWAITING_CUSTOMER") return false;
          return l.hoursUnresponsive >= threshold;
        } else {
          return (l.hoursSinceLastFollowUp ?? 0) >= cooldownHours;
        }
      });

      if (leadsToBlast.length === 0) {
        setBlastFeedback({
          show: true,
          title: "No Eligible Leads Right Now",
          message: `Active bot evaluated: 0 leads currently meet the criteria for ${promptInfo?.pageName || "this page"} (leads haven't crossed the ${threshold}h inactivity threshold or are outside Meta's 24h window).`,
          count: 0,
        });
        setTimeout(() => setBlastFeedback(null), 5000);
        setIsBlasting(false);
        return;
      }

      // 3. Launch live progress blast screen with drip countdown & "Close, Run in Background" option
      await runSequentialBlast(leadsToBlast, activeCamp?.id);
    } catch (err: any) {
      console.error("Auto-blast trigger error:", err);
      setBlastFeedback({
        show: true,
        title: "Blast Error",
        message: err?.message || "Failed to trigger auto-blast.",
        count: 0,
      });
      setIsBlasting(false);
      setTimeout(() => setBlastFeedback(null), 5000);
    }
  };

  // Handler: Add Page
  const handleAddPage = async (pageData: any) => {
    setIsScanning(true);
    try {
      const res = await fetch("/api/pages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pageData),
      });
      const data = await res.json();
      await fetchData();
      if (data.success) {
        const leadCount = data.initialScanSummary?.totalLeads ?? 0;
        const pageName = data.page?.name || pageData.name;
        const targetPageId = data.page?.pageId || pageData.pageId;
        const businessName = data.page?.businessName || pageData.businessName || "SieLab Retail Group";

        // Check if there are active auto-blast campaigns governing this business/page
        const activeCamp = campaigns.find(
          (c) =>
            c.isActive &&
            c.autoBlast &&
            (!c.pageId || c.pageId === targetPageId) &&
            (!c.businessName || c.businessName === businessName)
        );

        if (activeCamp) {
          // Open interactive confirmation modal
          setPageTriggerPrompt({
            show: true,
            pageId: targetPageId,
            pageName,
            businessName,
            leadCount,
            campaignName: activeCamp.name,
            campaignId: activeCamp.id,
          });
        } else {
          setBlastFeedback({
            show: true,
            title: "Page Connected & Scanned!",
            message: `Connected "${pageName}" and immediately detected ${leadCount} conversation(s).`,
            count: leadCount,
          });
          setTimeout(() => setBlastFeedback(null), 4000);
        }
      }
    } catch (err: any) {
      console.error("Add page error:", err);
    } finally {
      setIsScanning(false);
    }
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
              campaigns={campaigns}
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
              onTriggerBlastForPage={handleConfirmTriggerPage}
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
      <footer className="border-t border-slate-200 dark:border-slate-800/80 py-5 mt-14 bg-white/90 dark:bg-slate-950/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between text-xs text-slate-500 gap-4">
          {/* Left: System branding & Latest update by info */}
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 text-center md:text-left">
            <span className="font-bold text-slate-900 dark:text-white flex items-center space-x-1.5">
              <span>🚀 SieReach Meta</span>
              <span className="px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400 text-[10px] font-mono border border-blue-200 dark:border-blue-500/30">
                v2.4 Production
              </span>
            </span>
            <span className="text-slate-300 dark:text-slate-700 hidden sm:inline">•</span>
            <span className="text-slate-600 dark:text-slate-400 flex items-center space-x-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>
                Latest update by <strong className="text-slate-800 dark:text-slate-200 font-semibold">SieLab Engineering</strong>
              </span>
            </span>
          </div>

          {/* Center: Live Data Synchronization Status Badge */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => fetchData()}
              disabled={isLoading || isScanning}
              className="px-3 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-850 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 flex items-center space-x-2 transition shadow-2xs group cursor-pointer disabled:opacity-60"
              title="Click to refresh live lead data from Meta"
            >
              <RefreshCw className={`w-3 h-3 text-blue-500 transition-transform ${isLoading || isScanning ? "animate-spin" : "group-hover:rotate-180"}`} />
              <span className="text-[11px] font-medium">
                Last synced: <span className="font-semibold text-slate-900 dark:text-white">{getRelativeSyncTime(lastDataSyncTime)}</span>
              </span>
            </button>
          </div>

          {/* Right: Meta Graph API & Health Indicators */}
          <div className="flex items-center space-x-3 text-[11px]">
            <span className="text-slate-500 dark:text-slate-400">Meta Graph API v21.0</span>
            <span className="text-slate-300 dark:text-slate-700">•</span>
            <span className="inline-flex items-center space-x-1.5 text-emerald-600 dark:text-emerald-400 font-semibold">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>Engine: Healthy & Active</span>
            </span>
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

      {/* Visual Interactive Prompt: Trigger Campaign for Newly Added Page */}
      {pageTriggerPrompt && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-start space-x-3.5">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/20 shadow-xs">
                <Zap className="w-6 h-6 animate-pulse" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[11px] font-bold border border-emerald-500/20 mb-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                  <span>Active Auto-Blast Running</span>
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Trigger Campaign for Newly Connected Page?
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  Connected <span className="font-semibold text-slate-900 dark:text-slate-200">&ldquo;{pageTriggerPrompt.pageName}&rdquo;</span> ({pageTriggerPrompt.leadCount} conversation{pageTriggerPrompt.leadCount === 1 ? "" : "s"} found). 
                  Campaign <span className="font-semibold text-blue-600 dark:text-blue-400">&ldquo;{pageTriggerPrompt.campaignName}&rdquo;</span> is currently active for <span className="font-semibold">{pageTriggerPrompt.businessName}</span>.
                </p>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-950/60 rounded-2xl p-4 border border-slate-200 dark:border-slate-800/80 text-xs space-y-2">
              <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                <span className="font-medium text-slate-500 dark:text-slate-400">Active Rule:</span>
                <span className="font-semibold text-slate-900 dark:text-white">{pageTriggerPrompt.campaignName}</span>
              </div>
              <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                <span className="font-medium text-slate-500 dark:text-slate-400">Target Portfolio:</span>
                <span>{pageTriggerPrompt.businessName}</span>
              </div>
              <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                <span className="font-medium text-slate-500 dark:text-slate-400">Safety Guard:</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-medium">Held idle until you confirm</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => handleConfirmTriggerPage(pageTriggerPrompt.pageId)}
                disabled={isBlasting}
                className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold transition shadow-lg shadow-emerald-600/20 flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
              >
                <Zap className="w-4 h-4" />
                <span>{isBlasting ? "Evaluating & Blasting..." : "🚀 Yes, Trigger & Blast Now"}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const pName = pageTriggerPrompt.pageName;
                  setPageTriggerPrompt(null);
                  setBlastFeedback({
                    show: true,
                    title: "Page Kept Safe (Paused)",
                    message: `Page "${pName}" was connected safely. Auto-blast is paused for this page until you trigger it.`,
                    count: 0,
                  });
                  setTimeout(() => setBlastFeedback(null), 4000);
                }}
                disabled={isBlasting}
                className="w-full sm:w-auto py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold transition cursor-pointer"
              >
                ⏸️ Keep Paused / Not Now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
