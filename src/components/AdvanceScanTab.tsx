"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
  Radar,
  Phone,
  Mic,
  MessageSquare,
  CheckCircle2,
  AlertCircle,
  Clock,
  Search,
  Filter,
  RefreshCw,
  ExternalLink,
  ChevronDown,
  Sparkles,
  ShoppingBag,
  DollarSign,
  UserCheck,
  Volume2,
  Copy,
  Check,
  X,
  Sliders,
  ChevronRight,
  Send,
  Zap,
  Building2,
  MapPin,
  FileText,
  Play,
  Pause,
  ShieldCheck,
  ShieldAlert,
  Database,
  AlertTriangle,
} from "lucide-react";
import { AdvanceScannedLead, AdvanceScanSummary } from "@/lib/advanceScan";

interface AdvanceScanTabProps {
  pages: Array<{ pageId: string; name: string; businessName?: string; avatarUrl?: string | null }>;
  activeBusiness?: string;
  selectedPageId?: string;
  onSelectPageId?: (pageId: string) => void;
  onNavigateToComcent?: () => void;
}

export function AdvanceScanTab({
  pages,
  activeBusiness = "ALL",
  selectedPageId = "ALL",
  onSelectPageId,
  onNavigateToComcent,
}: AdvanceScanTabProps) {
  const [data, setData] = useState<AdvanceScanSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<
    "ALL" | "PHONE_DETECTED" | "MULTI_VOICE" | "HIGH_TEXT" | "QUALIFIED" | "CONVERTED" | "PENDING"
  >("ALL");

  // Threshold configurations
  const [minVoiceCount, setMinVoiceCount] = useState<number>(2);
  const [minTextCount, setMinTextCount] = useState<number>(4);
  const [showConfigModal, setShowConfigModal] = useState(false);

  // Quick Action Modal / Drawer
  const [selectedLead, setSelectedLead] = useState<AdvanceScannedLead | null>(null);
  const [convertModalLead, setConvertModalLead] = useState<AdvanceScannedLead | null>(null);
  const [orderValueInput, setOrderValueInput] = useState<string>("45.0");
  const [addressInput, setAddressInput] = useState<string>("");
  const [notesInput, setNotesInput] = useState<string>("");
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);

  // Copy feedback state
  const [copiedPhoneId, setCopiedPhoneId] = useState<string | null>(null);

  // Simulated Voice Clip Player
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);

  // Notification Toast
  const [toastMessage, setToastMessage] = useState<{ text: string; type: "success" | "info" } | null>(null);

  // Historical Deep Scan Safe Gate State
  const [isDeepScanModalOpen, setIsDeepScanModalOpen] = useState(false);
  const [deepScanLookbackDays, setDeepScanLookbackDays] = useState<number>(180); // Default: 6 months
  const [deepScanTargetPageId, setDeepScanTargetPageId] = useState<string>("ALL");
  const [safetyGateCheckbox, setSafetyGateCheckbox] = useState(false);
  const [isDeepScanning, setIsDeepScanning] = useState(false);
  const [deepScanResult, setDeepScanResult] = useState<any | null>(null);

  const handleExecuteDeepScan = async () => {
    if (!safetyGateCheckbox) return;
    setIsDeepScanning(true);
    setDeepScanResult(null);

    try {
      const res = await fetch("/api/advance-scan/deep-scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pageId: deepScanTargetPageId !== "ALL" ? deepScanTargetPageId : (selectedPageId !== "ALL" ? selectedPageId : undefined),
          businessName: activeBusiness !== "ALL" ? activeBusiness : undefined,
          lookbackDays: deepScanLookbackDays,
          maxBatches: 35,
          throttleMs: 250,
          safetyGateConfirmed: true,
        }),
      });

      const json = await res.json();
      if (json.success && json.data) {
        setDeepScanResult(json.data);
        showToast(`Deep scan complete! Extracted ${json.data.phoneNumbersExtracted} customer phone numbers.`, "success");
        await fetchScanData(false);
      } else {
        alert(json.error || "Historical deep scan failed.");
      }
    } catch (err: any) {
      console.error("Historical deep scan failed:", err);
      alert(err.message || "Failed to execute historical deep scan.");
    } finally {
      setIsDeepScanning(false);
    }
  };

  const showToast = (text: string, type: "success" | "info" = "success") => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Fetch scan data
  const fetchScanData = async (forceRescan = false) => {
    if (forceRescan) setIsScanning(true);
    else setIsLoading(true);

    try {
      const pageParam = selectedPageId !== "ALL" ? `&pageId=${selectedPageId}` : "";
      const bizParam = activeBusiness !== "ALL" ? `&business=${encodeURIComponent(activeBusiness)}` : "";
      const threshParam = `&minVoiceCount=${minVoiceCount}&minTextCount=${minTextCount}`;

      const url = `/api/advance-scan?_t=${Date.now()}${pageParam}${bizParam}${threshParam}`;
      const method = forceRescan ? "POST" : "GET";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        ...(forceRescan
          ? {
              body: JSON.stringify({
                pageId: selectedPageId !== "ALL" ? selectedPageId : undefined,
                businessName: activeBusiness !== "ALL" ? activeBusiness : undefined,
                minVoiceCount,
                minTextCount,
              }),
            }
          : {}),
      });

      const json = await res.json();
      if (json.success && json.data) {
        setData(json.data);
        if (forceRescan) {
          showToast(json.message || "Advance Scan complete!");
        }
      }
    } catch (err: any) {
      console.error("Failed to fetch advance scan data:", err);
    } finally {
      setIsLoading(false);
      setIsScanning(false);
    }
  };

  useEffect(() => {
    fetchScanData();
  }, [selectedPageId, activeBusiness, minVoiceCount, minTextCount]);

  // Handle Status Update (Qualify / Convert / Reset)
  const handleUpdateLeadStatus = async (
    leadId: string,
    action: "MARK_QUALIFIED" | "MARK_CONVERTED" | "RESET_STATUS" | "DISMISS",
    extraData: { orderValue?: number; customerAddress?: string; notes?: string; qualificationReason?: string } = {}
  ) => {
    setIsSubmittingAction(true);
    try {
      const res = await fetch("/api/advance-scan/status", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId,
          action,
          ...extraData,
        }),
      });

      const json = await res.json();
      if (json.success) {
        showToast(json.message || "Status updated!");
        // Refresh local data
        await fetchScanData();
        if (selectedLead?.id === leadId) {
          setSelectedLead((prev) => (prev ? { ...prev, ...json.lead } : null));
        }
        setConvertModalLead(null);
      } else {
        alert(json.error || "Failed to update lead status");
      }
    } catch (err: any) {
      console.error("Status update error:", err);
      alert(err.message || "Error updating lead");
    } finally {
      setIsSubmittingAction(false);
    }
  };

  const handleCopyPhone = (phone: string, id: string) => {
    navigator.clipboard.writeText(phone);
    setCopiedPhoneId(id);
    setTimeout(() => setCopiedPhoneId(null), 2000);
  };

  // Scoped & Filtered Leads
  const filteredLeads = useMemo(() => {
    if (!data?.leads) return [];
    return data.leads.filter((lead) => {
      // 1. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = lead.customerName.toLowerCase().includes(q);
        const matchesPhone = lead.detectedPhone?.toLowerCase().includes(q);
        const matchesMsg = lead.lastCustomerMessage.toLowerCase().includes(q);
        const matchesPage = lead.pageName.toLowerCase().includes(q);
        const matchesAd = lead.adSource?.toLowerCase().includes(q);
        if (!matchesName && !matchesPhone && !matchesMsg && !matchesPage && !matchesAd) {
          return false;
        }
      }

      // 2. Category Filter
      if (selectedCategory === "PHONE_DETECTED") {
        return Boolean(lead.detectedPhone);
      }
      if (selectedCategory === "MULTI_VOICE") {
        return lead.voiceCount >= minVoiceCount;
      }
      if (selectedCategory === "HIGH_TEXT") {
        return lead.textCount >= minTextCount;
      }
      if (selectedCategory === "QUALIFIED") {
        return lead.isQualified && !lead.isConverted;
      }
      if (selectedCategory === "CONVERTED") {
        return lead.isConverted;
      }
      if (selectedCategory === "PENDING") {
        return !lead.isQualified && !lead.isConverted;
      }

      return true;
    });
  }, [data?.leads, searchQuery, selectedCategory, minVoiceCount, minTextCount]);

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white dark:bg-emerald-600 px-4 py-3 rounded-xl shadow-2xl flex items-center space-x-2 animate-in slide-in-from-bottom duration-200">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 dark:text-white shrink-0" />
          <span className="text-xs font-semibold">{toastMessage.text}</span>
        </div>
      )}

      {/* Top Header Card */}
      <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-700 rounded-3xl p-6 sm:p-7 text-white shadow-xl shadow-emerald-500/10 flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
        {/* Background Decorative Rings */}
        <div className="absolute -right-10 -bottom-10 w-60 h-60 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -left-10 -top-10 w-48 h-48 bg-teal-400/20 rounded-full blur-xl pointer-events-none" />

        <div className="space-y-2 max-w-2xl relative z-10">
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center font-bold text-white shadow-inner">
              <Radar className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight">Chat Advance Scan</h1>
                <span className="px-2 py-0.5 rounded-full bg-emerald-400/25 border border-white/30 text-[10px] font-extrabold uppercase tracking-wider text-emerald-100">
                  Story 1 • Inbound Triage
                </span>
              </div>
              <p className="text-xs sm:text-sm text-emerald-100/90 font-medium">
                Automated phone number extraction for purchase confirmations & multi-voice inquiry classification.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5 relative z-10">
          <button
            onClick={() => {
              setDeepScanResult(null);
              setSafetyGateCheckbox(false);
              setIsDeepScanModalOpen(true);
            }}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-amber-950 font-extrabold text-xs transition shadow-md shadow-black/10 cursor-pointer"
            title="Historical Deep Scan: Safely extract customer phone numbers from past 6 months (Safe Gate Guarded)"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-amber-900" />
            <span>⚡ 6-Month Deep Scan</span>
          </button>

          <button
            onClick={() => setShowConfigModal(true)}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-white/15 hover:bg-white/25 border border-white/20 text-xs font-bold transition shadow-xs cursor-pointer backdrop-blur-md"
            title="Configure detection thresholds"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Scan Thresholds</span>
          </button>

          <button
            onClick={() => fetchScanData(true)}
            disabled={isScanning}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-white text-emerald-900 hover:bg-emerald-50 text-xs font-extrabold transition shadow-lg shadow-black/10 cursor-pointer disabled:opacity-60"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? "animate-spin text-emerald-600" : ""}`} />
            <span>{isScanning ? "Scanning Chats..." : "Advance Scan Now"}</span>
          </button>
        </div>
      </div>

      {/* KPI Overview Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {/* 1. Total Scanned */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium">
            <span>Inbound Chats</span>
            <MessageSquare className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-2">
            {isLoading ? "..." : data?.totalScanned || 0}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Across connected pages</div>
        </div>

        {/* 2. Phone Numbers Detected (Purchase Confirmation) */}
        <button
          onClick={() => setSelectedCategory("PHONE_DETECTED")}
          className={`text-left p-4 rounded-2xl border transition shadow-2xs cursor-pointer ${
            selectedCategory === "PHONE_DETECTED"
              ? "bg-emerald-50 dark:bg-emerald-950/50 border-emerald-500 ring-2 ring-emerald-500/20"
              : "bg-white dark:bg-slate-900 border-emerald-200/80 dark:border-emerald-800/60 hover:bg-emerald-50/50"
          }`}
        >
          <div className="flex items-center justify-between text-emerald-700 dark:text-emerald-400 text-xs font-bold">
            <span className="flex items-center gap-1">
              <Phone className="w-3.5 h-3.5" />
              <span>Phones Found</span>
            </span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
          </div>
          <div className="text-2xl font-black text-emerald-700 dark:text-emerald-400 mt-2">
            {isLoading ? "..." : data?.phoneDetectedCount || 0}
          </div>
          <div className="text-[10px] text-emerald-600 dark:text-emerald-300 font-semibold mt-1">
            Purchase Confirmations
          </div>
        </button>

        {/* 3. Multi-Voice Notes */}
        <button
          onClick={() => setSelectedCategory("MULTI_VOICE")}
          className={`text-left p-4 rounded-2xl border transition shadow-2xs cursor-pointer ${
            selectedCategory === "MULTI_VOICE"
              ? "bg-purple-50 dark:bg-purple-950/50 border-purple-500 ring-2 ring-purple-500/20"
              : "bg-white dark:bg-slate-900 border-purple-200/80 dark:border-purple-800/60 hover:bg-purple-50/50"
          }`}
        >
          <div className="flex items-center justify-between text-purple-700 dark:text-purple-400 text-xs font-bold">
            <span className="flex items-center gap-1">
              <Mic className="w-3.5 h-3.5" />
              <span>Multi-Voice</span>
            </span>
            <span className="text-[10px] px-1 rounded bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300">
              ≥{minVoiceCount}
            </span>
          </div>
          <div className="text-2xl font-black text-purple-700 dark:text-purple-400 mt-2">
            {isLoading ? "..." : data?.multiVoiceCount || 0}
          </div>
          <div className="text-[10px] text-purple-600 dark:text-purple-300 font-semibold mt-1">Audio Inquiries</div>
        </button>

        {/* 4. High Text Volume */}
        <button
          onClick={() => setSelectedCategory("HIGH_TEXT")}
          className={`text-left p-4 rounded-2xl border transition shadow-2xs cursor-pointer ${
            selectedCategory === "HIGH_TEXT"
              ? "bg-sky-50 dark:bg-sky-950/50 border-sky-500 ring-2 ring-sky-500/20"
              : "bg-white dark:bg-slate-900 border-sky-200/80 dark:border-sky-800/60 hover:bg-sky-50/50"
          }`}
        >
          <div className="flex items-center justify-between text-sky-700 dark:text-sky-400 text-xs font-bold">
            <span className="flex items-center gap-1">
              <MessageSquare className="w-3.5 h-3.5" />
              <span>High Texts</span>
            </span>
            <span className="text-[10px] px-1 rounded bg-sky-100 dark:bg-sky-900 text-sky-700 dark:text-sky-300">
              ≥{minTextCount}
            </span>
          </div>
          <div className="text-2xl font-black text-sky-700 dark:text-sky-400 mt-2">
            {isLoading ? "..." : data?.highTextCount || 0}
          </div>
          <div className="text-[10px] text-sky-600 dark:text-sky-300 font-semibold mt-1">Engaged Dialogue</div>
        </button>

        {/* 5. Qualified Prospects */}
        <button
          onClick={() => setSelectedCategory("QUALIFIED")}
          className={`text-left p-4 rounded-2xl border transition shadow-2xs cursor-pointer ${
            selectedCategory === "QUALIFIED"
              ? "bg-blue-50 dark:bg-blue-950/50 border-blue-500 ring-2 ring-blue-500/20"
              : "bg-white dark:bg-slate-900 border-blue-200/80 dark:border-blue-800/60 hover:bg-blue-50/50"
          }`}
        >
          <div className="flex items-center justify-between text-blue-700 dark:text-blue-400 text-xs font-bold">
            <span className="flex items-center gap-1">
              <UserCheck className="w-3.5 h-3.5" />
              <span>Qualified</span>
            </span>
          </div>
          <div className="text-2xl font-black text-blue-700 dark:text-blue-400 mt-2">
            {isLoading ? "..." : data?.qualifiedCount || 0}
          </div>
          <div className="text-[10px] text-blue-600 dark:text-blue-300 font-semibold mt-1">Verified Hot Leads</div>
        </button>

        {/* 6. Converted Orders & Revenue */}
        <button
          onClick={() => setSelectedCategory("CONVERTED")}
          className={`text-left p-4 rounded-2xl border transition shadow-2xs cursor-pointer ${
            selectedCategory === "CONVERTED"
              ? "bg-amber-50 dark:bg-amber-950/50 border-amber-500 ring-2 ring-amber-500/20"
              : "bg-white dark:bg-slate-900 border-amber-200/80 dark:border-amber-800/60 hover:bg-amber-50/50"
          }`}
        >
          <div className="flex items-center justify-between text-amber-700 dark:text-amber-400 text-xs font-bold">
            <span className="flex items-center gap-1">
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>Converted</span>
            </span>
            <span className="text-[10px] font-mono font-bold text-amber-600 dark:text-amber-400">
              ${data?.totalOrderRevenue || 0}
            </span>
          </div>
          <div className="text-2xl font-black text-amber-700 dark:text-amber-400 mt-2">
            {isLoading ? "..." : data?.convertedCount || 0}
          </div>
          <div className="text-[10px] text-amber-600 dark:text-amber-300 font-semibold mt-1">Orders Closed</div>
        </button>
      </div>

      {/* Control Strip & Filters */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by customer name, phone number (e.g. 012), or message..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
              >
                ✕
              </button>
            )}
          </div>

          {/* Quick Page Selector */}
          <div className="flex items-center space-x-2 shrink-0">
            <span className="text-xs text-slate-500 font-medium">Page:</span>
            <select
              value={selectedPageId}
              onChange={(e) => onSelectPageId?.(e.target.value)}
              className="px-3 py-1.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-medium cursor-pointer"
            >
              <option value="ALL">All Connected Pages ({pages.length})</option>
              {pages.map((p) => (
                <option key={p.pageId} value={p.pageId}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden pt-1">
          {[
            { id: "ALL", label: "All Scanned", count: data?.totalScanned || 0 },
            { id: "PHONE_DETECTED", label: "📱 Phone Numbers", count: data?.phoneDetectedCount || 0 },
            { id: "MULTI_VOICE", label: "🎙️ Multi-Voice", count: data?.multiVoiceCount || 0 },
            { id: "HIGH_TEXT", label: "💬 High Texts", count: data?.highTextCount || 0 },
            { id: "PENDING", label: "⏳ Pending Review", count: data?.pendingReviewCount || 0 },
            { id: "QUALIFIED", label: "⭐ Qualified", count: data?.qualifiedCount || 0 },
            { id: "CONVERTED", label: "🎉 Converted", count: data?.convertedCount || 0 },
          ].map((cat) => {
            const isActive = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition shrink-0 cursor-pointer ${
                  isActive
                    ? "bg-slate-900 text-white dark:bg-emerald-600 dark:text-white shadow-xs"
                    : "bg-slate-100 hover:bg-slate-200/70 text-slate-600 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300"
                }`}
              >
                <span>{cat.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    isActive ? "bg-white/20 text-white" : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300"
                  }`}
                >
                  {cat.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Scanned Leads List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs text-slate-500 px-1">
          <span className="font-semibold text-slate-700 dark:text-slate-300">
            Showing {filteredLeads.length} conversation{filteredLeads.length === 1 ? "" : "s"}
          </span>
          <span className="text-[11px]">Click any conversation to inspect or 1-click Qualify/Convert</span>
        </div>

        {filteredLeads.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center mx-auto">
              <Radar className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">No Conversations Match Criteria</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Try adjusting the filter category, changing search keywords, or clicking &quot;Advance Scan Now&quot; to inspect all incoming chats.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {filteredLeads.map((lead) => {
              const isPhoneFound = Boolean(lead.detectedPhone);
              const isMultiVoice = lead.voiceCount >= minVoiceCount;
              const isHighText = lead.textCount >= minTextCount;

              return (
                <div
                  key={lead.id}
                  className={`bg-white dark:bg-slate-900 border rounded-2xl p-4 sm:p-5 transition shadow-2xs hover:shadow-md ${
                    lead.isConverted
                      ? "border-amber-300 dark:border-amber-800/80 bg-amber-50/20 dark:bg-amber-950/10"
                      : lead.isQualified
                      ? "border-blue-300 dark:border-blue-800/80 bg-blue-50/20 dark:bg-blue-950/10"
                      : isPhoneFound
                      ? "border-emerald-300 dark:border-emerald-700/80 ring-1 ring-emerald-500/10"
                      : "border-slate-200 dark:border-slate-800"
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Left: Customer Info, Badges, Detected Phone */}
                    <div className="flex items-start space-x-3.5 flex-1 min-w-0">
                      {/* Avatar */}
                      <div className="relative shrink-0">
                        {lead.customerAvatar ? (
                          <img
                            src={lead.customerAvatar}
                            alt={lead.customerName}
                            className="w-11 h-11 rounded-2xl object-cover ring-2 ring-slate-100 dark:ring-slate-800"
                          />
                        ) : (
                          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold flex items-center justify-center text-sm shadow-sm">
                            {lead.customerName.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        {/* Status Marker */}
                        {lead.isConverted ? (
                          <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-amber-500 text-white text-[10px] flex items-center justify-center shadow-xs font-bold">
                            $
                          </span>
                        ) : lead.isQualified ? (
                          <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] flex items-center justify-center shadow-xs font-bold">
                            ★
                          </span>
                        ) : isPhoneFound ? (
                          <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 text-white text-[10px] flex items-center justify-center shadow-xs font-bold">
                            ✓
                          </span>
                        ) : null}
                      </div>

                      {/* Name & Content */}
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                            {lead.customerName}
                          </h4>

                          {/* Page Pill */}
                          <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-medium">
                            {lead.pageName}
                          </span>

                          {/* Classification Tag Badges */}
                          {isPhoneFound && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-700 font-extrabold flex items-center gap-1">
                              <Phone className="w-2.5 h-2.5" />
                              <span>Phone Confirmed</span>
                            </span>
                          )}

                          {isMultiVoice && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 dark:bg-purple-950/70 dark:text-purple-400 border border-purple-300 dark:border-purple-700 font-extrabold flex items-center gap-1">
                              <Mic className="w-2.5 h-2.5" />
                              <span>{lead.voiceCount} Voices</span>
                            </span>
                          )}

                          {isHighText && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 dark:bg-sky-950/70 dark:text-sky-400 border border-sky-300 dark:border-sky-700 font-bold flex items-center gap-1">
                              <MessageSquare className="w-2.5 h-2.5" />
                              <span>{lead.textCount} Texts</span>
                            </span>
                          )}

                          {lead.isConverted && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 dark:bg-amber-950/70 dark:text-amber-400 border border-amber-300 dark:border-amber-700 font-black">
                              Converted • ${lead.orderValue || 0}
                            </span>
                          )}

                          {lead.isQualified && !lead.isConverted && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950/70 dark:text-blue-400 border border-blue-300 dark:border-blue-700 font-bold">
                              Qualified Lead
                            </span>
                          )}
                        </div>

                        {/* High-Visibility Extracted Mobile Number Box */}
                        {isPhoneFound && (
                          <div className="flex items-center space-x-2 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 rounded-xl px-3 py-1.5 w-fit">
                            <Phone className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                            <span className="text-xs font-mono font-extrabold text-emerald-900 dark:text-emerald-200">
                              {lead.detectedPhone}
                            </span>
                            <button
                              onClick={() => handleCopyPhone(lead.detectedPhone!, lead.id)}
                              className="text-[11px] text-emerald-700 hover:text-emerald-900 dark:text-emerald-400 dark:hover:text-emerald-200 ml-1.5 flex items-center gap-0.5 font-medium cursor-pointer"
                              title="Copy mobile number"
                            >
                              {copiedPhoneId === lead.id ? (
                                <>
                                  <Check className="w-3 h-3 text-emerald-600" />
                                  <span className="text-[10px]">Copied</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3" />
                                  <span className="text-[10px]">Copy</span>
                                </>
                              )}
                            </button>
                            <a
                              href={`tel:${lead.detectedPhone!.replace(/\s/g, "")}`}
                              className="text-[10px] px-2 py-0.5 rounded bg-emerald-600 text-white font-bold hover:bg-emerald-700 transition"
                            >
                              Call
                            </a>
                          </div>
                        )}

                        {/* Customer Message Context Snippet */}
                        <p className="text-xs text-slate-700 dark:text-slate-300 line-clamp-2 italic">
                          &quot;{lead.lastCustomerMessage}&quot;
                        </p>

                        {/* Customer Audio Preview Player if multi-voice */}
                        {isMultiVoice && (
                          <div className="flex items-center space-x-2 bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 rounded-xl px-3 py-1.5 w-fit">
                            <button
                              onClick={() =>
                                setPlayingVoiceId((prev) => (prev === lead.id ? null : lead.id))
                              }
                              className="w-6 h-6 rounded-full bg-purple-600 text-white flex items-center justify-center shrink-0 cursor-pointer hover:bg-purple-700 transition"
                            >
                              {playingVoiceId === lead.id ? (
                                <Pause className="w-3 h-3" />
                              ) : (
                                <Play className="w-3 h-3 ml-0.5" />
                              )}
                            </button>
                            <div className="flex items-center space-x-1">
                              <span className="w-1 h-3 bg-purple-400 rounded-full animate-pulse"></span>
                              <span className="w-1 h-4 bg-purple-600 rounded-full animate-pulse"></span>
                              <span className="w-1 h-2 bg-purple-300 rounded-full animate-pulse"></span>
                              <span className="w-1 h-5 bg-purple-600 rounded-full animate-pulse"></span>
                            </div>
                            <span className="text-[11px] font-medium text-purple-900 dark:text-purple-300">
                              {playingVoiceId === lead.id ? "Playing Voice Clip (0:14s)..." : "Listen to Customer Voice Note"}
                            </span>
                          </div>
                        )}

                        {/* Meta info & elapsed time */}
                        <div className="flex items-center gap-3 text-[11px] text-slate-400">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>{lead.hoursSinceCustomer}h ago</span>
                          </span>
                          {lead.adSource && (
                            <span className="truncate max-w-[200px]" title={lead.adSource}>
                              🎯 {lead.adSource}
                            </span>
                          )}
                          {lead.qualificationReason && (
                            <span className="text-blue-600 dark:text-blue-400 font-medium">
                              ★ {lead.qualificationReason}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right: Page Manager 1-Click Action Buttons */}
                    <div className="flex items-center gap-2 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100 dark:border-slate-800/80">
                      {/* 1-Click Qualify Button */}
                      {!lead.isQualified && !lead.isConverted && (
                        <button
                          onClick={() =>
                            handleUpdateLeadStatus(lead.id, "MARK_QUALIFIED", {
                              qualificationReason: isPhoneFound
                                ? `Mobile number detected (${lead.detectedPhone})`
                                : "High engagement advance scan",
                            })
                          }
                          disabled={isSubmittingAction}
                          className="flex items-center space-x-1 px-3 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 text-xs font-bold border border-blue-200 dark:border-blue-800 transition cursor-pointer disabled:opacity-50"
                          title="1-Click Mark as Qualified Prospect"
                        >
                          <UserCheck className="w-3.5 h-3.5" />
                          <span>Qualify</span>
                        </button>
                      )}

                      {/* 1-Click Convert Button (Opens quick confirmation modal) */}
                      {!lead.isConverted && (
                        <button
                          onClick={() => {
                            setConvertModalLead(lead);
                            setOrderValueInput(lead.orderValue ? String(lead.orderValue) : "45.0");
                            setAddressInput(lead.customerAddress || "");
                            setNotesInput(lead.notes || "");
                          }}
                          className="flex items-center space-x-1 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold shadow-sm shadow-emerald-600/20 transition cursor-pointer"
                          title="Record Purchase & Mark Converted"
                        >
                          <ShoppingBag className="w-3.5 h-3.5" />
                          <span>Convert ($)</span>
                        </button>
                      )}

                      {/* If already converted, show Reset option */}
                      {lead.isConverted && (
                        <button
                          onClick={() => handleUpdateLeadStatus(lead.id, "RESET_STATUS")}
                          className="text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 px-2 py-1"
                        >
                          Reset
                        </button>
                      )}

                      {/* Detail Drawer Review Button */}
                      <button
                        onClick={() => setSelectedLead(lead)}
                        className="flex items-center space-x-1 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold transition cursor-pointer"
                        title="Review full chat conversation"
                      >
                        <span>Review</span>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Convert Purchase Modal */}
      {convertModalLead && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                  <ShoppingBag className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Confirm Customer Conversion</h3>
                  <p className="text-xs text-slate-500">Record order value for {convertModalLead.customerName}</p>
                </div>
              </div>
              <button
                onClick={() => setConvertModalLead(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white text-xs font-bold"
              >
                ✕
              </button>
            </div>

            {convertModalLead.detectedPhone && (
              <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl p-3 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-400 uppercase tracking-wide">
                    Confirmed Mobile
                  </span>
                  <div className="text-sm font-mono font-black text-emerald-900 dark:text-emerald-200">
                    {convertModalLead.detectedPhone}
                  </div>
                </div>
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-600 text-white">Verified</span>
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Order Conversion Value ($ USD)
                </label>
                <div className="relative">
                  <DollarSign className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="number"
                    step="0.5"
                    value={orderValueInput}
                    onChange={(e) => setOrderValueInput(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 rounded-xl text-sm font-mono font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-slate-100"
                    placeholder="45.00"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Delivery Destination / Address (Optional)
                </label>
                <input
                  type="text"
                  value={addressInput}
                  onChange={(e) => setAddressInput(e.target.value)}
                  placeholder="e.g. #124 St 51, BKK1, Phnom Penh"
                  className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Manager Review Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  value={notesInput}
                  onChange={(e) => setNotesInput(e.target.value)}
                  placeholder="e.g. Paid via ABA KHQR, express shipping requested."
                  className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setConvertModalLead(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() =>
                  handleUpdateLeadStatus(convertModalLead.id, "MARK_CONVERTED", {
                    orderValue: parseFloat(orderValueInput || "45.0"),
                    customerAddress: addressInput,
                    notes: notesInput,
                  })
                }
                disabled={isSubmittingAction}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold shadow-md transition disabled:opacity-50 cursor-pointer"
              >
                {isSubmittingAction ? "Saving..." : "Mark as Converted"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Threshold Configuration Modal */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center space-x-2">
                <Sliders className="w-5 h-5 text-emerald-600" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Advance Scan Heuristics</h3>
              </div>
              <button
                onClick={() => setShowConfigModal(false)}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  <span>Minimum Voice Notes Threshold</span>
                  <span className="text-purple-600 font-mono font-black">{minVoiceCount} clips</span>
                </label>
                <input
                  type="range"
                  min="1"
                  max="6"
                  value={minVoiceCount}
                  onChange={(e) => setMinVoiceCount(parseInt(e.target.value, 10))}
                  className="w-full accent-purple-600 cursor-pointer"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Categorizes chats with at least this many voice messages under &quot;Multi-Voice Inquiries&quot;.
                </p>
              </div>

              <div>
                <label className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  <span>Minimum Customer Text Count</span>
                  <span className="text-sky-600 font-mono font-black">{minTextCount} messages</span>
                </label>
                <input
                  type="range"
                  min="2"
                  max="10"
                  value={minTextCount}
                  onChange={(e) => setMinTextCount(parseInt(e.target.value, 10))}
                  className="w-full accent-sky-600 cursor-pointer"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Flags rapid back-and-forth customer inquiries as &quot;High Text Dialogue&quot;.
                </p>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-3 border border-slate-200 dark:border-slate-700 text-xs space-y-1">
                <span className="font-bold text-slate-800 dark:text-slate-200">📱 Mobile Phone Sensitivity:</span>
                <p className="text-[11px] text-slate-500">
                  Pre-configured with Smart, Cellcard, Metfone 8-10 digit standard formats and international (+855) patterns.
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => {
                  setShowConfigModal(false);
                  fetchScanData(true);
                }}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold shadow-md cursor-pointer"
              >
                Apply & Rescan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detailed Side Review Drawer */}
      {selectedLead && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex justify-end">
          <div className="bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 w-full max-w-lg h-full overflow-y-auto p-6 space-y-6 shadow-2xl animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center space-x-3">
                {selectedLead.customerAvatar ? (
                  <img
                    src={selectedLead.customerAvatar}
                    alt={selectedLead.customerName}
                    className="w-12 h-12 rounded-2xl object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold flex items-center justify-center text-base">
                    {selectedLead.customerName.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                    {selectedLead.customerName}
                  </h3>
                  <p className="text-xs text-slate-500">{selectedLead.pageName}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedLead(null)}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Extracted Phone Number Focus Card */}
            {selectedLead.detectedPhone ? (
              <div className="bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-700 rounded-2xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold text-emerald-800 dark:text-emerald-300 uppercase tracking-wide flex items-center gap-1">
                    <Phone className="w-3 h-3" />
                    <span>Detected Customer Mobile Number</span>
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-600 text-white">
                    {selectedLead.purchaseIntentConfidence}% Intent
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xl font-mono font-black text-emerald-950 dark:text-emerald-100">
                    {selectedLead.detectedPhone}
                  </span>
                  <div className="flex items-center space-x-1.5">
                    <button
                      onClick={() => handleCopyPhone(selectedLead.detectedPhone!, selectedLead.id)}
                      className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-emerald-200 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200 text-xs font-bold hover:bg-emerald-100 transition flex items-center gap-1 cursor-pointer"
                    >
                      <Copy className="w-3 h-3" />
                      <span>Copy</span>
                    </button>
                    <a
                      href={`tel:${selectedLead.detectedPhone.replace(/\s/g, "")}`}
                      className="px-3 py-1 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition"
                    >
                      Call
                    </a>
                  </div>
                </div>
                {selectedLead.detectedPhoneSnippet && (
                  <p className="text-[11px] text-emerald-800/80 dark:text-emerald-300/80 italic pt-1 border-t border-emerald-200/60 dark:border-emerald-800/60">
                    Context: &quot;{selectedLead.detectedPhoneSnippet}&quot;
                  </p>
                )}
              </div>
            ) : (
              <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 text-xs text-slate-500">
                <span>No direct mobile phone number detected in message text.</span>
              </div>
            )}

            {/* Conversation Flow Excerpt */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                Chat Conversation History
              </h4>

              {/* Customer message */}
              <div className="bg-slate-100 dark:bg-slate-800/90 rounded-2xl p-3.5 space-y-1">
                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <span className="font-bold text-slate-700 dark:text-slate-300">{selectedLead.customerName}</span>
                  <span>{selectedLead.hoursSinceCustomer}h ago</span>
                </div>
                <p className="text-xs text-slate-800 dark:text-slate-200">{selectedLead.lastCustomerMessage}</p>
              </div>

              {/* Agent message */}
              <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 rounded-2xl p-3.5 space-y-1 ml-4">
                <div className="flex items-center justify-between text-[10px] text-blue-500">
                  <span className="font-bold">{selectedLead.pageName} (Sales Rep)</span>
                  <span>Replied</span>
                </div>
                <p className="text-xs text-slate-800 dark:text-slate-200">{selectedLead.lastAgentMessage}</p>
              </div>
            </div>

            {/* Details & Delivery Info */}
            <div className="space-y-3 bg-slate-50 dark:bg-slate-800/40 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-200/60 dark:border-slate-700/60">
                <span className="text-slate-400">Status</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{selectedLead.status}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60 dark:border-slate-700/60">
                <span className="text-slate-400">Ad Referral</span>
                <span className="font-bold text-slate-800 dark:text-slate-200 truncate max-w-[200px]">
                  {selectedLead.adSource || "Direct Messenger"}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60 dark:border-slate-700/60">
                <span className="text-slate-400">Voice Clips Count</span>
                <span className="font-mono font-bold text-purple-600">{selectedLead.voiceCount}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60 dark:border-slate-700/60">
                <span className="text-slate-400">Inbound Messages</span>
                <span className="font-mono font-bold text-sky-600">{selectedLead.textCount}</span>
              </div>
              {selectedLead.orderValue && (
                <div className="flex justify-between py-1 border-b border-slate-200/60 dark:border-slate-700/60">
                  <span className="text-slate-400">Revenue Recorded</span>
                  <span className="font-mono font-black text-emerald-600 dark:text-emerald-400">
                    ${selectedLead.orderValue}
                  </span>
                </div>
              )}
            </div>

            {/* Page Manager Actions Bar in Drawer */}
            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">Page Manager Actions</h4>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    handleUpdateLeadStatus(selectedLead.id, "MARK_QUALIFIED", {
                      qualificationReason: selectedLead.detectedPhone
                        ? `Mobile number confirmed (${selectedLead.detectedPhone})`
                        : "Verified during chat review",
                    });
                  }}
                  className="px-3 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center justify-center space-x-1.5 transition cursor-pointer"
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>Mark Qualified</span>
                </button>

                <button
                  onClick={() => {
                    setConvertModalLead(selectedLead);
                    setOrderValueInput(selectedLead.orderValue ? String(selectedLead.orderValue) : "45.0");
                    setAddressInput(selectedLead.customerAddress || "");
                    setNotesInput(selectedLead.notes || "");
                  }}
                  className="px-3 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold flex items-center justify-center space-x-1.5 shadow-sm transition cursor-pointer"
                >
                  <ShoppingBag className="w-3.5 h-3.5" />
                  <span>Convert ($)</span>
                </button>
              </div>

              {onNavigateToComcent && (
                <button
                  onClick={() => {
                    setSelectedLead(null);
                    onNavigateToComcent();
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center justify-center space-x-1 transition cursor-pointer"
                >
                  <span>Open in COMCENT Live Dispatch</span>
                  <ExternalLink className="w-3 h-3 text-slate-400" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* HISTORICAL DEEP SCAN SAFE GATE MODAL */}
      {isDeepScanModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full shadow-2xl p-6 space-y-4">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3.5">
              <div className="flex items-center space-x-2.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold shrink-0">
                  <ShieldCheck className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white flex items-center gap-1.5">
                    <span>Historical Deep Scan</span>
                    <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 text-[10px] font-extrabold uppercase">
                      Safe Gate Guarded
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Crawl historical Messenger chats to extract customer phone numbers & purchase intent.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!isDeepScanning) setIsDeepScanModalOpen(false);
                }}
                disabled={isDeepScanning}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 cursor-pointer disabled:opacity-40"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Results Card if Finished */}
            {deepScanResult ? (
              <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
                <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-700/60 text-emerald-950 dark:text-emerald-100 space-y-3">
                  <div className="flex items-center space-x-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <div>
                      <h4 className="font-black text-sm text-emerald-900 dark:text-emerald-200">
                        Deep Scan Successfully Completed!
                      </h4>
                      <p className="text-[11px] text-emerald-700 dark:text-emerald-300/80">
                        Historical chats analyzed & phone numbers permanently saved to local database.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-1 border-t border-emerald-200 dark:border-emerald-800/60 text-center">
                    <div className="p-2 rounded-xl bg-white/60 dark:bg-slate-900/60 border border-emerald-200/60 dark:border-emerald-800/40">
                      <div className="text-base font-black text-slate-900 dark:text-white">
                        {deepScanResult.totalConversationsCrawled}
                      </div>
                      <div className="text-[10px] text-slate-500">Chats Crawled</div>
                    </div>
                    <div className="p-2 rounded-xl bg-white/60 dark:bg-slate-900/60 border border-emerald-200/60 dark:border-emerald-800/40">
                      <div className="text-base font-black text-amber-600 dark:text-amber-400 font-mono">
                        {deepScanResult.phoneNumbersExtracted}
                      </div>
                      <div className="text-[10px] text-slate-500">Phones Found</div>
                    </div>
                    <div className="p-2 rounded-xl bg-white/60 dark:bg-slate-900/60 border border-emerald-200/60 dark:border-emerald-800/40">
                      <div className="text-base font-black text-purple-600 dark:text-purple-400">
                        {deepScanResult.multiVoiceDetected}
                      </div>
                      <div className="text-[10px] text-slate-500">Voice Notes</div>
                    </div>
                  </div>

                  <div className="text-[10px] text-emerald-800 dark:text-emerald-300 font-mono flex items-center justify-between">
                    <span>Lookback: {deepScanResult.lookbackDays} Days (6 Months)</span>
                    <span>Elapsed: {(deepScanResult.executionTimeMs / 1000).toFixed(1)}s</span>
                  </div>
                </div>

                <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => {
                      setIsDeepScanModalOpen(false);
                      setSelectedCategory("PHONE_DETECTED");
                    }}
                    className="w-full py-2.5 px-4 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-500 text-white transition shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>View Extracted Phone Numbers ({deepScanResult.phoneNumbersExtracted})</span>
                  </button>
                </div>
              </div>
            ) : (
              /* Config & Safety Gate Authorization Form */
              <div className="space-y-4">
                {/* Safe Gate Guarantees Badge List */}
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-2">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-400 block">
                    Safety Gate Guarantees & Protections
                  </span>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex items-start space-x-2 text-slate-700 dark:text-slate-300">
                      <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                      <div>
                        <strong className="text-slate-900 dark:text-white">100% Read-Only Extraction:</strong> Zero messages, automated follow-ups, or notifications are sent to customers.
                      </div>
                    </div>
                    <div className="flex items-start space-x-2 text-slate-700 dark:text-slate-300">
                      <Clock className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                      <div>
                        <strong className="text-slate-900 dark:text-white">Anti-Throttle Protection:</strong> Requests are throttled with 250ms delays between batches to keep API usage under 1% of your Meta quota.
                      </div>
                    </div>
                    <div className="flex items-start space-x-2 text-slate-700 dark:text-slate-300">
                      <Database className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                      <div>
                        <strong className="text-slate-900 dark:text-white">Permanent Local Storage:</strong> All extracted phone numbers and delivery locations are saved to your local database for instant filtering.
                      </div>
                    </div>
                  </div>
                </div>

                {/* Target Scope & Lookback Selector */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Historical Lookback Window
                    </label>
                    <select
                      value={deepScanLookbackDays}
                      onChange={(e) => setDeepScanLookbackDays(parseInt(e.target.value, 10))}
                      disabled={isDeepScanning}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-amber-500 cursor-pointer"
                    >
                      <option value={30}>Last 30 Days (~500 chats)</option>
                      <option value={90}>Last 90 Days / 3 Months (~1,500 chats)</option>
                      <option value={180}>Last 180 Days / 6 Months (~3,000 chats) - Recommended</option>
                      <option value={365}>Last 365 Days / 1 Year (~6,000 chats)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Target Facebook Page
                    </label>
                    <select
                      value={deepScanTargetPageId}
                      onChange={(e) => setDeepScanTargetPageId(e.target.value)}
                      disabled={isDeepScanning}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-amber-500 cursor-pointer"
                    >
                      <option value="ALL">All Connected Pages ({pages.length})</option>
                      {pages.map((p) => (
                        <option key={p.pageId} value={p.pageId}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Safety Authorization Checkbox */}
                <label className="flex items-start space-x-3 p-3.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/40 border border-amber-300/80 dark:border-amber-700/60 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={safetyGateCheckbox}
                    onChange={(e) => setSafetyGateCheckbox(e.target.checked)}
                    disabled={isDeepScanning}
                    className="mt-0.5 rounded text-amber-600 focus:ring-amber-500 w-4 h-4 cursor-pointer"
                  />
                  <span className="text-xs text-amber-950 dark:text-amber-200 font-medium leading-relaxed">
                    I authorize this read-only deep scan of historical Messenger conversations to extract customer phone numbers into the local CRM without contacting any customers.
                  </span>
                </label>

                {/* Action Controls */}
                <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsDeepScanModalOpen(false)}
                    disabled={isDeepScanning}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer disabled:opacity-40"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleExecuteDeepScan}
                    disabled={!safetyGateCheckbox || isDeepScanning}
                    className="px-4 py-2 rounded-xl text-xs font-extrabold bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-amber-950 transition shadow-sm flex items-center gap-1.5 cursor-pointer"
                  >
                    <ShieldCheck className={`w-3.5 h-3.5 ${isDeepScanning ? "animate-spin" : ""}`} />
                    <span>{isDeepScanning ? "Crawling & Extracting Phones..." : "Execute Safe Deep Scan"}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
