"use client";

import React, { useState } from "react";
import {
  Clock,
  Search,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  CheckCircle2,
  ExternalLink,
  ShieldAlert,
  ChevronDown,
  Filter,
  MessageCircle,
  Columns,
  Rows,
  Ban,
  Send,
} from "lucide-react";
import { AnalyzedLead } from "@/lib/scanner";

interface ScannerTabProps {
  leads: AnalyzedLead[];
  thresholdHours?: number;
  onThresholdChange?: (val: number) => void;
  onRefreshScan: () => void;
  isScanning: boolean;
  onTriggerBlast?: (selectedIds: string[]) => void;
  isBlasting?: boolean;
}

function getBusinessBadgeInfo(businessName?: string) {
  const bName = businessName || "SieLab Retail Group";
  const isMoew = bName.toLowerCase().includes("moew") || bName.toLowerCase().includes("hospitality");
  const isRetail = bName.toLowerCase().includes("retail") || bName.toLowerCase().includes("sielab");
  const icon = isMoew ? "☕" : isRetail ? "🏢" : "💼";
  const colorClasses = isMoew
    ? "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800/60"
    : isRetail
    ? "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800/60"
    : "bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-800/60";
  return { bName, icon, colorClasses };
}

export function ScannerTab({
  leads,
  thresholdHours = 24.0,
  onThresholdChange,
  onRefreshScan,
  isScanning,
  onTriggerBlast,
  isBlasting = false,
}: ScannerTabProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE_24H" | "UNRESPONSIVE" | "EXPIRED" | "FOLLOWED_UP">("ALL");
  const [excludeExpired, setExcludeExpired] = useState(false);
  const [viewMode, setViewMode] = useState<"compact" | "standard">("compact");
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);


  // Metrics
  const active24hCount = leads.filter(
    (l) => l.within24h && l.hoursSinceCustomer <= 24
  ).length;
  const unresponsiveActiveCount = leads.filter(
    (l) => l.status === "AWAITING_CUSTOMER" && l.within24h && l.hoursSinceCustomer <= 24
  ).length;
  const expiredCount = leads.filter(
    (l) => !l.within24h || l.hoursSinceCustomer > 24
  ).length;
  const followedUpCount = leads.filter((l) => l.status === "FOLLOWED_UP").length;

  // Filter leads
  const filteredLeads = leads.filter((lead) => {
    const matchesSearch =
      lead.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.pageName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (lead.adSource && lead.adSource.toLowerCase().includes(searchQuery.toLowerCase())) ||
      lead.lastCustomerMessage.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.lastAgentMessage.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    const isPast24h = !lead.within24h || lead.hoursSinceCustomer > 24;
    const isUnresponsiveActive = lead.status === "AWAITING_CUSTOMER" && lead.within24h && lead.hoursSinceCustomer <= 24;

    // Exclude expired leads if toggle is active
    if (excludeExpired && isPast24h) {
      return false;
    }

    if (statusFilter === "ACTIVE_24H") {
      return !isPast24h;
    }
    if (statusFilter === "UNRESPONSIVE") {
      return isUnresponsiveActive;
    }
    if (statusFilter === "EXPIRED") {
      return isPast24h;
    }
    if (statusFilter === "FOLLOWED_UP") {
      return lead.status === "FOLLOWED_UP";
    }

    return true;
  });

  const eligibleFilteredLeads = filteredLeads.filter((l) => l.isEligibleForFollowUp);
  const isAllSelected =
    filteredLeads.length > 0 &&
    filteredLeads.every((l) => selectedLeadIds.includes(l.id));
  const isSomeSelected =
    filteredLeads.some((l) => selectedLeadIds.includes(l.id)) && !isAllSelected;

  const handleToggleAll = (checked: boolean) => {
    if (checked) {
      const allIds = Array.from(new Set([...selectedLeadIds, ...filteredLeads.map((l) => l.id)]));
      setSelectedLeadIds(allIds);
    } else {
      const filteredIdSet = new Set(filteredLeads.map((l) => l.id));
      setSelectedLeadIds(selectedLeadIds.filter((id) => !filteredIdSet.has(id)));
    }
  };

  const handleSelectEligibleOnly = () => {
    const eligibleIds = eligibleFilteredLeads.map((l) => l.id);
    setSelectedLeadIds(eligibleIds);
  };

  const handleToggleLead = (id: string) => {
    setSelectedLeadIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleClearSelection = () => {
    setSelectedLeadIds([]);
  };

  const handleExecuteSelectedBlast = () => {
    if (selectedLeadIds.length === 0 || !onTriggerBlast) return;
    onTriggerBlast(selectedLeadIds);
  };

  return (
    <div className="space-y-6">
      {/* Control Banner: Streamlined Live Scanner Header & Actions */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Live Customer Scanner</h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Real-time monitoring across Facebook Pages to identify unresponsive leads and Meta 24-hour policy windows.
            </p>
          </div>

          {/* View Mode Switcher (Standard vs Compact View) */}
          <div className="flex items-center space-x-2 self-start sm:self-auto">
            <div className="flex items-center bg-slate-100 dark:bg-slate-800/80 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700/80">
              <button
                type="button"
                onClick={() => setViewMode("compact")}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  viewMode === "compact"
                    ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
                title="Compact View: all 4 columns visible without scrolling"
              >
                <Rows className="w-3.5 h-3.5" />
                <span>Compact View</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("standard")}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  viewMode === "standard"
                    ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
                title="Standard View: expanded multi-line conversation with separate status"
              >
                <Columns className="w-3.5 h-3.5" />
                <span>Standard View</span>
              </button>
            </div>
          </div>
        </div>

        {/* Search, Filters, Exclude Expired & Scan Trigger */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 pt-3 border-t border-slate-200 dark:border-slate-800/80">
          <div className="flex flex-wrap items-center gap-2.5 flex-1">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search customer, page, ad, or message..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
              />
            </div>

            {/* Filter Dropdown */}
            <select
              value={statusFilter}
              onChange={(e) => {
                const val = e.target.value as any;
                setStatusFilter(val);
                if (val === "EXPIRED" && excludeExpired) {
                  setExcludeExpired(false);
                }
              }}
              className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-300 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-blue-500 transition cursor-pointer font-medium"
            >
              <option value="ALL">All Statuses ({leads.length})</option>
              <option value="ACTIVE_24H">In 24H Window ({active24hCount})</option>
              <option value="UNRESPONSIVE">
                Unresponsive &lt;24h ({unresponsiveActiveCount})
              </option>
              <option value="EXPIRED">
                Expired &gt;24h ({expiredCount})
              </option>
              <option value="FOLLOWED_UP">Already Followed Up ({followedUpCount})</option>
            </select>

            {/* Exclude Expired Toggle Button */}
            <button
              type="button"
              onClick={() => {
                const nextState = !excludeExpired;
                setExcludeExpired(nextState);
                if (nextState && statusFilter === "EXPIRED") {
                  setStatusFilter("ALL");
                }
              }}
              className={`flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                excludeExpired
                  ? "bg-amber-500/15 border-amber-500/40 text-amber-700 dark:text-amber-300 font-bold shadow-xs"
                  : "bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
              title={
                excludeExpired
                  ? "Currently excluding expired leads (>24h window closed). Click to show all leads."
                  : "Click to exclude expired leads (>24h window closed) and show only active leads"
              }
            >
              <Ban className="w-3.5 h-3.5 text-amber-500" />
              <span>Exclude Expired</span>
              {expiredCount > 0 && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                    excludeExpired
                      ? "bg-amber-500/30 text-amber-800 dark:text-amber-200"
                      : "bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                  }`}
                >
                  {excludeExpired ? `-${expiredCount}` : expiredCount}
                </span>
              )}
            </button>

            {/* Threshold Selector */}
            {onThresholdChange && (
              <div className="flex items-center space-x-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-2.5 py-1.5 text-xs">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-slate-500 dark:text-slate-400 font-medium">Silent:</span>
                <select
                  value={thresholdHours}
                  onChange={(e) => onThresholdChange(parseFloat(e.target.value))}
                  className="bg-transparent text-slate-800 dark:text-slate-200 font-bold focus:outline-none cursor-pointer text-xs"
                  title="Filter leads inactive for at least this many hours"
                >
                  <option value={3}>≥ 3 Hours</option>
                  <option value={6}>≥ 6 Hours</option>
                  <option value={12}>≥ 12 Hours</option>
                  <option value={24}>≥ 24 Hours</option>
                  <option value={48}>≥ 48 Hours</option>
                </select>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center space-x-2">
            <button
              onClick={onRefreshScan}
              disabled={isScanning}
              className="flex items-center space-x-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-2 rounded-xl text-xs font-semibold shadow-sm shadow-blue-600/20 transition disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? "animate-spin" : ""}`} />
              <span>{isScanning ? "Scanning..." : "Rescan Pages"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Leads Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        {viewMode === "compact" ? (
          /* =========================================================================
             COMPACT VIEW (All 4 Columns Visible Without Scrolling)
             ========================================================================= */
          <div className="w-full">
            <table className="w-full table-fixed text-left text-xs text-slate-600 dark:text-slate-300">
              <thead className="bg-slate-50/90 dark:bg-slate-950/70 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 pl-3 pr-1 w-[40px] text-center">
                    <input
                      type="checkbox"
                      aria-label="Select all leads"
                      checked={isAllSelected}
                      ref={(el) => { if (el) el.indeterminate = isSomeSelected; }}
                      onChange={(e) => handleToggleAll(e.target.checked)}
                      className="w-3.5 h-3.5 rounded border-slate-300 dark:border-slate-700 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                  </th>
                  <th className="py-3 pl-2 pr-2 w-[23%]">Customer & Ad Campaign</th>
                  <th className="py-3 px-2 w-[22%]">Facebook Business Page</th>
                  <th className="py-3 px-2 w-[35%]">Conversation Status & Inactivity</th>
                  <th className="py-3 px-3 pr-4 w-[17%] text-right">Meta 24H Window & Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {filteredLeads.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-500">
                      <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-40" />
                      <p className="text-sm font-medium">No leads found matching current filter</p>
                      <p className="text-xs mt-1 text-slate-400">
                        {excludeExpired
                          ? "Expired leads are currently excluded. Click 'Exclude Expired' to view all."
                          : "Try adjusting your search query or status filter."}
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredLeads.map((lead) => {
                    const isPast24h = !lead.within24h || lead.hoursSinceCustomer > 24;
                    const { bName, icon, colorClasses } = getBusinessBadgeInfo(lead.businessName);

                    return (
                      <tr
                        key={lead.id}
                        className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 transition ${
                          selectedLeadIds.includes(lead.id) ? "bg-blue-50/50 dark:bg-blue-950/20" : ""
                        }`}
                      >
                        {/* Checkbox */}
                        <td className="py-2.5 pl-3 pr-1 text-center">
                          <input
                            type="checkbox"
                            aria-label={`Select ${lead.customerName}`}
                            checked={selectedLeadIds.includes(lead.id)}
                            onChange={() => handleToggleLead(lead.id)}
                            className="w-3.5 h-3.5 rounded border-slate-300 dark:border-slate-700 text-blue-600 focus:ring-blue-500 cursor-pointer"
                          />
                        </td>
                        {/* 1. Customer & Ad Campaign */}
                        <td className="py-2.5 pl-4 pr-2">
                          <div className="flex items-center space-x-2.5 min-w-0">
                            <img
                              src={
                                lead.customerAvatar ||
                                "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80"
                              }
                              alt={lead.customerName}
                              className="w-7 h-7 rounded-full object-cover ring-1 ring-slate-200 dark:ring-slate-700 shrink-0"
                            />
                            <div className="min-w-0 flex-1">
                              <div
                                className="font-bold text-slate-900 dark:text-white text-xs truncate"
                                title={lead.customerName}
                              >
                                {lead.customerName}
                              </div>
                              {lead.adSource && (
                                <div
                                  className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium truncate"
                                  title={lead.adSource}
                                >
                                  📢 {lead.adSource}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* 2. Facebook Business Page */}
                        <td className="py-2.5 px-2">
                          <div className="flex items-center space-x-2 min-w-0">
                            {lead.pageAvatar ? (
                              <img
                                src={lead.pageAvatar}
                                alt={lead.pageName}
                                className="w-6 h-6 rounded-md object-cover ring-1 ring-slate-200 dark:ring-slate-700 shrink-0"
                              />
                            ) : (
                              <div className="w-6 h-6 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20 flex items-center justify-center text-[10px] font-bold shrink-0">
                                {lead.pageName.charAt(0)}
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <div
                                className="font-semibold text-slate-900 dark:text-white text-xs truncate"
                                title={lead.pageName}
                              >
                                {lead.pageName}
                              </div>
                              <div className="mt-0.5">
                                <span
                                  className={`inline-flex items-center px-1.5 py-0.2 rounded-full text-[9px] font-semibold border truncate max-w-[135px] ${colorClasses}`}
                                  title={bName}
                                >
                                  <span className="mr-1">{icon}</span>
                                  <span className="truncate">{bName}</span>
                                </span>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* 3. Conversation Status & Inactivity (Shortened) */}
                        <td className="py-2.5 px-2">
                          <div className="space-y-1 min-w-0">
                            {/* Shortened conversation snippet showing both customer inquiry and sales rep reply */}
                            <div className="space-y-0.5 min-w-0">
                              <div
                                className="text-xs truncate cursor-help flex items-center gap-1.5"
                                title={`Customer: "${lead.lastCustomerMessage}"`}
                              >
                                <span className="text-slate-400 font-bold text-[10px] uppercase shrink-0">Cust:</span>
                                <span className="truncate text-slate-700 dark:text-slate-300">“{lead.lastCustomerMessage}”</span>
                              </div>
                              {lead.lastAgentMessage && lead.lastAgentMessage !== "Awaiting initial agent response" && (
                                <div
                                  className="text-[11px] truncate cursor-help flex items-center gap-1.5 text-slate-500 dark:text-slate-400"
                                  title={`Sales Rep: "${lead.lastAgentMessage}"`}
                                >
                                  <span className="text-blue-500 font-bold text-[10px] uppercase shrink-0">Rep:</span>
                                  <span className="truncate text-blue-600 dark:text-blue-400 font-medium">
                                    {lead.lastAgentMessage.startsWith("🎙️") || lead.lastAgentMessage.startsWith("📷") || lead.lastAgentMessage.startsWith("🎬")
                                      ? lead.lastAgentMessage
                                      : `“${lead.lastAgentMessage}”`}
                                  </span>
                                </div>
                              )}
                            </div>

                            {/* Shortened inactivity badge */}
                            <div>
                              {lead.status === "AWAITING_AGENT" ? (
                                <span
                                  className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/30"
                                  title={`${lead.hoursSinceCustomer}h customer inquiry • awaiting sales rep response`}
                                >
                                  <Clock className="w-2.5 h-2.5 mr-1 text-amber-600 dark:text-amber-400" />
                                  {lead.hoursSinceCustomer}h inquiry • needs reply
                                </span>
                              ) : lead.status === "AWAITING_CUSTOMER" ? (
                                <span
                                  className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                    isPast24h
                                      ? "bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-500/20 dark:text-rose-300 dark:border-rose-500/30"
                                      : "bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/30"
                                  }`}
                                  title={`Customer has been silent for ${lead.hoursUnresponsive}h since sales rep replied`}
                                >
                                  {isPast24h ? (
                                    <AlertCircle className="w-2.5 h-2.5 mr-1 text-rose-600 dark:text-rose-400" />
                                  ) : (
                                    <Clock className="w-2.5 h-2.5 mr-1 text-amber-600 dark:text-amber-400" />
                                  )}
                                  {lead.hoursUnresponsive}h silent
                                </span>
                              ) : lead.status === "REPLIED" ? (
                                <span
                                  className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-500/20 dark:text-indigo-300 dark:border-indigo-500/30"
                                  title={`Customer replied ${lead.hoursSinceCustomer}h ago`}
                                >
                                  <CheckCircle className="w-2.5 h-2.5 mr-1 text-indigo-600 dark:text-indigo-400" />
                                  Replied {lead.hoursSinceCustomer}h ago
                                </span>
                              ) : (
                                <span
                                  className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30"
                                  title={
                                    lead.followUpCount >= 2
                                      ? `Followed Up (${lead.followUpCount}/2 Max)`
                                      : isPast24h
                                      ? `Followed Up (${lead.followUpCount}/2 - Expired)`
                                      : lead.isCooldownActive
                                      ? `Followed Up (${lead.followUpCount}/2 - In 3h Cooldown)`
                                      : `Followed Up (${lead.followUpCount}/2 - Ready for Step 2)`
                                  }
                                >
                                  <CheckCircle className="w-2.5 h-2.5 mr-1 text-emerald-600 dark:text-emerald-400" />
                                  Followed Up ({lead.followUpCount}/2)
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* 4. Meta 24H Window & Status (Sign-Only Expire with Tooltip) */}
                        <td className="py-2.5 px-3 pr-4 text-right">
                          <div className="flex items-center justify-end space-x-1.5">
                            {lead.status === "FOLLOWED_UP" ? (
                              <span
                                className="inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 dark:text-emerald-400 dark:bg-emerald-500/10 dark:border-emerald-500/20 cursor-help"
                                title={`Followed Up (${lead.followUpCount}/2)${isPast24h ? " - 24h window closed" : ""}`}
                              >
                                <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600 dark:text-emerald-400" />
                                <span>Followed Up ({lead.followUpCount})</span>
                              </span>
                            ) : lead.within24h ? (
                              <span
                                className="inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 dark:text-emerald-300 dark:bg-emerald-500/10 dark:border-emerald-500/20 cursor-help"
                                title={`In Meta 24h Window: ${lead.windowRemainingHours}h remaining to send free-form message`}
                              >
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse mr-1.5" />
                                <span>{lead.windowRemainingHours}h left</span>
                              </span>
                            ) : (
                              /* Expired Window: Just the warning sign icon & elapsed time, NO word "Expired" */
                              <div className="inline-flex items-center space-x-1.5">
                                <span
                                  className="inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 dark:text-rose-300 dark:bg-rose-500/15 dark:border-rose-500/30 cursor-help transition hover:scale-105"
                                  title={`Expired: Meta 24-hour messaging window closed ${lead.hoursSinceCustomer}h ago. Requires HUMAN_AGENT tag to follow up.`}
                                >
                                  <AlertCircle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                                  <span className="ml-1 text-[11px] font-mono">+{lead.hoursSinceCustomer}h</span>
                                </span>
                                <span
                                  className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-800 cursor-help"
                                  title="Requires Meta HUMAN_AGENT message tag"
                                >
                                  HUMAN_AGENT
                                </span>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        ) : (
          /* =========================================================================
             STANDARD VIEW (Full 5 Columns with Detailed Multi-Line Dialogue)
             ========================================================================= */
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
              <thead className="bg-slate-50/90 dark:bg-slate-950/70 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3.5 pl-3 pr-1 w-[40px] text-center">
                    <input
                      type="checkbox"
                      aria-label="Select all leads"
                      checked={isAllSelected}
                      ref={(el) => { if (el) el.indeterminate = isSomeSelected; }}
                      onChange={(e) => handleToggleAll(e.target.checked)}
                      className="w-3.5 h-3.5 rounded border-slate-300 dark:border-slate-700 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                  </th>
                  <th className="py-3.5 pl-2 pr-3 min-w-[220px]">Customer & Ad Campaign</th>
                  <th className="py-3.5 px-3 min-w-[210px]">Facebook Business Page</th>
                  <th className="py-3.5 px-3 min-w-[320px]">Conversation Status & Inactivity</th>
                  <th className="py-3.5 px-3 min-w-[150px]">Meta 24h Window</th>
                  <th className="py-3.5 px-3 text-right pr-4 min-w-[170px]">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {filteredLeads.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-500">
                      <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-40" />
                      <p className="text-sm font-medium">No leads found matching current filter</p>
                      <p className="text-xs mt-1 text-slate-400">
                        {excludeExpired
                          ? "Expired leads are currently excluded. Click 'Exclude Expired' to view all."
                          : "Try adjusting your search query or status filter."}
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredLeads.map((lead) => {
                    const isPast24h = !lead.within24h || lead.hoursSinceCustomer > 24;
                    const { bName, icon, colorClasses } = getBusinessBadgeInfo(lead.businessName);

                    return (
                      <tr
                        key={lead.id}
                        className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 transition ${
                          selectedLeadIds.includes(lead.id) ? "bg-blue-50/50 dark:bg-blue-950/20" : ""
                        }`}
                      >
                        {/* Checkbox */}
                        <td className="py-3.5 pl-3 pr-1 text-center">
                          <input
                            type="checkbox"
                            aria-label={`Select ${lead.customerName}`}
                            checked={selectedLeadIds.includes(lead.id)}
                            onChange={() => handleToggleLead(lead.id)}
                            className="w-3.5 h-3.5 rounded border-slate-300 dark:border-slate-700 text-blue-600 focus:ring-blue-500 cursor-pointer"
                          />
                        </td>
                        {/* Customer & Ad Source */}
                        <td className="py-3.5 pl-4 pr-3 min-w-[220px]">
                          <div className="flex items-center space-x-3">
                            <img
                              src={
                                lead.customerAvatar ||
                                "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80"
                              }
                              alt={lead.customerName}
                              className="w-9 h-9 rounded-full object-cover ring-1 ring-slate-200 dark:ring-slate-700 shrink-0"
                            />
                            <div className="min-w-0">
                              <div className="font-bold text-slate-900 dark:text-white text-xs leading-tight">
                                {lead.customerName}
                              </div>
                              {lead.adSource && (
                                <div
                                  className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium truncate max-w-[180px] mt-0.5"
                                  title={lead.adSource}
                                >
                                  📢 {lead.adSource}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Connected Facebook Page */}
                        <td className="py-3.5 px-3 min-w-[210px]">
                          <div className="flex items-center space-x-2.5">
                            {lead.pageAvatar ? (
                              <img
                                src={lead.pageAvatar}
                                alt={lead.pageName}
                                className="w-8 h-8 rounded-lg object-cover ring-1 ring-slate-200 dark:ring-slate-700 shrink-0"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20 flex items-center justify-center text-xs font-bold shrink-0">
                                {lead.pageName.charAt(0)}
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <div
                                className="font-semibold text-slate-900 dark:text-white text-xs truncate max-w-[170px]"
                                title={lead.pageName}
                              >
                                {lead.pageName}
                              </div>
                              <div className="mt-1">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border whitespace-nowrap ${colorClasses}`}>
                                  {icon} {bName}
                                </span>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Conversation Details & Inactivity */}
                        <td className="py-3.5 px-3 min-w-[320px]">
                          <div className="space-y-1.5 max-w-lg">
                            {/* Last customer question */}
                            <div className="text-slate-600 dark:text-slate-400 text-xs truncate" title={lead.lastCustomerMessage}>
                              <span className="text-slate-500 dark:text-slate-400 font-semibold">Customer: </span>
                              &ldquo;{lead.lastCustomerMessage}&rdquo;
                            </div>

                            {/* Last sales agent response */}
                            <div className="text-slate-800 dark:text-slate-200 text-xs truncate" title={lead.lastAgentMessage}>
                              <span className="text-blue-600 dark:text-blue-400 font-semibold">Sales Rep: </span>
                              &ldquo;{lead.lastAgentMessage}&rdquo;
                            </div>

                            {/* Inactive time badge */}
                            <div className="flex items-center space-x-2 pt-0.5">
                              {lead.status === "AWAITING_AGENT" ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/30">
                                  <Clock className="w-3 h-3 mr-1 text-amber-600 dark:text-amber-400" />
                                  {lead.hoursSinceCustomer}h customer inquiry • awaiting agent reply
                                </span>
                              ) : lead.status === "AWAITING_CUSTOMER" ? (
                                <span
                                  className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                    isPast24h
                                      ? "bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-500/20 dark:text-rose-300 dark:border-rose-500/30"
                                      : "bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/30"
                                  }`}
                                >
                                  {isPast24h ? (
                                    <AlertCircle className="w-3 h-3 mr-1 text-rose-600 dark:text-rose-400" />
                                  ) : (
                                    <Clock className="w-3 h-3 mr-1 text-amber-600 dark:text-amber-400" />
                                  )}
                                  {lead.hoursUnresponsive}h silent since sales response
                                </span>
                              ) : lead.status === "REPLIED" ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-500/20 dark:text-indigo-300 dark:border-indigo-500/30">
                                  <CheckCircle className="w-3 h-3 mr-1 text-indigo-600 dark:text-indigo-400" />
                                  Customer replied {lead.hoursSinceCustomer}h ago
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30">
                                  <CheckCircle className="w-3 h-3 mr-1 text-emerald-600 dark:text-emerald-400" />
                                  {lead.followUpCount >= 2
                                    ? `Followed Up (${lead.followUpCount}/2 Max)`
                                    : isPast24h
                                    ? `Followed Up (${lead.followUpCount}/2 - Expired)`
                                    : lead.isCooldownActive
                                    ? `Followed Up (${lead.followUpCount}/2 - In 3h Cooldown)`
                                    : `Followed Up (${lead.followUpCount}/2 - Ready for Step 2)`}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Meta 24-hour Window Status */}
                        <td className="py-3.5 px-3 min-w-[150px] whitespace-nowrap">
                          {lead.within24h ? (
                            <div className="space-y-1">
                              <div className="flex items-center space-x-1.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                <span>In 24H Window</span>
                              </div>
                              <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                                {lead.windowRemainingHours}h remaining
                              </div>
                              {/* Progress bar */}
                              <div className="w-24 bg-slate-200 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                                <div
                                  className={`h-full ${
                                    lead.windowRemainingHours < 6
                                      ? "bg-amber-500"
                                      : "bg-emerald-500"
                                  }`}
                                  style={{
                                    width: `${Math.min(
                                      100,
                                      (lead.windowRemainingHours / 24) * 100
                                    )}%`,
                                  }}
                                />
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-1">
                              <div className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-500/20 dark:text-purple-300 dark:border-purple-500/30">
                                <ShieldAlert className="w-3 h-3 mr-1 text-purple-600 dark:text-purple-400" />
                                HUMAN_AGENT
                              </div>
                              <div className="text-[10px] text-slate-500 dark:text-slate-400">
                                24h window closed ({lead.hoursSinceCustomer}h ago)
                              </div>
                            </div>
                          )}
                        </td>

                        {/* Customer Status */}
                        <td className="py-3.5 px-3 text-right pr-4 min-w-[170px] whitespace-nowrap">
                          {lead.status === "FOLLOWED_UP" ? (
                            lead.followUpCount >= 2 ? (
                              <span className="inline-flex items-center space-x-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 dark:text-emerald-400 dark:bg-emerald-500/10 dark:border-emerald-500/20 px-2.5 py-1 rounded-lg">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                                <span>Followed up (2/2 Max)</span>
                              </span>
                            ) : isPast24h ? (
                              <span className="inline-flex items-center space-x-1.5 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 dark:text-rose-400 dark:bg-rose-500/10 dark:border-rose-500/20 px-2.5 py-1 rounded-lg">
                                <AlertCircle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                                <span>Followed up (1/2, Expired)</span>
                              </span>
                            ) : lead.isCooldownActive ? (
                              <span className="inline-flex items-center space-x-1.5 text-xs font-semibold text-teal-700 bg-teal-50 border border-teal-200 dark:text-teal-400 dark:bg-teal-500/10 dark:border-teal-500/20 px-2.5 py-1 rounded-lg">
                                <Clock className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                                <span>Followed up (1/2, Cooldown)</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center space-x-1.5 text-xs font-semibold text-sky-700 bg-sky-50 border border-sky-200 dark:text-sky-400 dark:bg-sky-500/10 dark:border-sky-500/20 px-2.5 py-1 rounded-lg">
                                <CheckCircle2 className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                                <span>Followed up (1/2, Ready)</span>
                              </span>
                            )
                          ) : lead.status === "AWAITING_CUSTOMER" ? (
                            isPast24h ? (
                              <span className="inline-flex items-center space-x-1.5 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 dark:text-rose-400 dark:bg-rose-500/10 dark:border-rose-500/20 px-2.5 py-1 rounded-lg">
                                <AlertCircle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                                <span>Expired</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center space-x-1.5 text-xs font-semibold text-amber-800 bg-amber-50 border border-amber-200 dark:text-amber-300 dark:bg-amber-500/10 dark:border-amber-500/20 px-2.5 py-1 rounded-lg">
                                <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                                <span>Unresponsive ({lead.hoursUnresponsive}h)</span>
                              </span>
                            )
                          ) : lead.status === "REPLIED" ? (
                            <span className="inline-flex items-center space-x-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 dark:text-indigo-300 dark:bg-indigo-500/10 dark:border-indigo-500/20 px-2.5 py-1 rounded-lg">
                              <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                              <span>Customer Replied</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-700 bg-slate-100 border border-slate-200 dark:text-slate-400 dark:bg-slate-800 dark:border-slate-700">
                              {lead.status}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Floating Batch Action Toolbar */}
      {selectedLeadIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-slate-900/95 dark:bg-slate-950/95 text-white border border-slate-700/80 rounded-2xl p-3 px-5 shadow-2xl backdrop-blur-md flex flex-wrap items-center gap-3 animate-in slide-in-from-bottom-5">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
            <span className="text-xs font-bold text-slate-200">
              <span className="text-blue-400 font-extrabold text-sm">{selectedLeadIds.length}</span> lead{selectedLeadIds.length > 1 ? "s" : ""} selected
            </span>
          </div>

          <div className="h-4 w-px bg-slate-700 hidden sm:block" />

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handleSelectEligibleOnly}
              className="text-[11px] font-semibold text-slate-300 hover:text-white px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 transition cursor-pointer"
              title="Select only leads that qualify for follow-up"
            >
              Select Inactive Only ({eligibleFilteredLeads.length})
            </button>
            <button
              type="button"
              onClick={handleClearSelection}
              className="text-[11px] font-semibold text-slate-400 hover:text-slate-200 px-2.5 py-1.5 rounded-lg hover:bg-slate-800 transition cursor-pointer"
            >
              Clear
            </button>
          </div>

          {onTriggerBlast && (
            <button
              type="button"
              onClick={handleExecuteSelectedBlast}
              disabled={isBlasting}
              className="flex items-center space-x-1.5 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-lg shadow-blue-600/30 transition disabled:opacity-50 cursor-pointer ml-auto"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isBlasting ? "Blasting..." : `Trigger Follow-Up Blast (${selectedLeadIds.length})`}</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
