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

export function ScannerTab({
  leads,
  onRefreshScan,
  isScanning,
}: ScannerTabProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "UNRESPONSIVE" | "EXPIRED" | "FOLLOWED_UP">("ALL");

  // Filter leads
  const filteredLeads = leads.filter((lead) => {
    const matchesSearch =
      lead.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.pageName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (lead.adSource && lead.adSource.toLowerCase().includes(searchQuery.toLowerCase())) ||
      lead.lastCustomerMessage.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    const isExpired = lead.status === "AWAITING_CUSTOMER" && (!lead.within24h || lead.hoursSinceCustomer > 24);
    const isUnresponsiveActive = lead.status === "AWAITING_CUSTOMER" && lead.within24h && lead.hoursSinceCustomer <= 24;

    if (statusFilter === "UNRESPONSIVE") {
      return isUnresponsiveActive;
    }
    if (statusFilter === "EXPIRED") {
      return isExpired;
    }
    if (statusFilter === "FOLLOWED_UP") {
      return lead.status === "FOLLOWED_UP";
    }

    return true;
  });

  // Metrics
  const unresponsiveActiveCount = leads.filter(
    (l) => l.status === "AWAITING_CUSTOMER" && l.within24h && l.hoursSinceCustomer <= 24
  ).length;
  const expiredCount = leads.filter(
    (l) => l.status === "AWAITING_CUSTOMER" && (!l.within24h || l.hoursSinceCustomer > 24)
  ).length;
  const followedUpCount = leads.filter((l) => l.status === "FOLLOWED_UP").length;

  return (
    <div className="space-y-6">
      {/* Control Banner: Streamlined Live Scanner Header & Actions */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <h2 className="text-lg font-semibold text-white">Live Customer Scanner</h2>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Real-time monitoring across Facebook Pages to identify unresponsive leads and Meta 24-hour policy windows.
            </p>
          </div>
        </div>

        {/* Search, Status Filter & Scan Trigger */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3 border-t border-slate-800/80">
          <div className="flex flex-1 items-center space-x-3">
            {/* Search Input */}
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search customer, page, or ad campaign..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
              />
            </div>

            {/* Filter Dropdown */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-slate-800 dark:text-slate-300 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-blue-500 transition cursor-pointer"
            >
              <option value="ALL">All Statuses ({leads.length})</option>
              <option value="UNRESPONSIVE">
                Unresponsive &lt;24h ({unresponsiveActiveCount})
              </option>
              <option value="EXPIRED">
                Expired &gt;24h ({expiredCount})
              </option>
              <option value="FOLLOWED_UP">Already Followed Up ({followedUpCount})</option>
            </select>
          </div>

          {/* Action buttons */}
          <div className="flex items-center space-x-2">
            <button
              onClick={onRefreshScan}
              disabled={isScanning}
              className="flex items-center space-x-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-2 rounded-xl text-xs font-semibold shadow-sm shadow-blue-600/20 transition disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? "animate-spin" : ""}`} />
              <span>{isScanning ? "Scanning..." : "Rescan Pages"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Leads Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/70 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3.5 pl-4 pr-3">Customer & Ad Campaign</th>
                <th className="py-3.5 px-3">Facebook Business Page</th>
                <th className="py-3.5 px-3">Conversation Status & Inactivity</th>
                <th className="py-3.5 px-3">Meta 24h Window</th>
                <th className="py-3.5 px-3 text-right pr-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-500">
                    <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="text-sm font-medium">No leads found matching current filter</p>
                    <p className="text-xs mt-1 text-slate-600">
                      Try adjusting your search query or status filter.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredLeads.map((lead) => {
                  const isPast24h = !lead.within24h || lead.hoursSinceCustomer > 24;

                  return (
                    <tr
                      key={lead.id}
                      className="hover:bg-slate-800/40 transition"
                    >
                      {/* Customer & Ad Source */}
                      <td className="py-3.5 pl-4 pr-3">
                        <div className="flex items-center space-x-3">
                          <img
                            src={
                              lead.customerAvatar ||
                              "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80"
                            }
                            alt={lead.customerName}
                            className="w-8 h-8 rounded-full object-cover ring-1 ring-slate-700"
                          />
                          <div>
                            <div className="font-semibold text-white">{lead.customerName}</div>
                            {lead.adSource && (
                              <div className="text-[10px] text-indigo-400 font-medium truncate max-w-xs">
                                📢 {lead.adSource}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Connected Facebook Page */}
                      <td className="py-3.5 px-3">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 shadow-xs">
                          {lead.pageName}
                        </span>
                      </td>

                      {/* Conversation Details & Inactivity */}
                      <td className="py-3.5 px-3">
                        <div className="space-y-1 max-w-md">
                          {/* Last customer question */}
                          <div className="text-slate-400 truncate">
                            <span className="text-slate-500 font-medium">Customer: </span>
                            &ldquo;{lead.lastCustomerMessage}&rdquo;
                          </div>

                          {/* Last sales agent response */}
                          <div className="text-slate-300 truncate">
                            <span className="text-blue-400 font-medium">Sales Rep: </span>
                            &ldquo;{lead.lastAgentMessage}&rdquo;
                          </div>

                          {/* Inactive time badge */}
                          <div className="flex items-center space-x-2 pt-0.5">
                            {lead.status === "AWAITING_AGENT" ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                <Clock className="w-3 h-3 mr-1 text-amber-400" />
                                {lead.hoursSinceCustomer}h customer inquiry • awaiting agent reply
                              </span>
                            ) : lead.status === "AWAITING_AGENT" ? (
                          <span className="inline-flex items-center space-x-1.5 text-xs font-semibold text-amber-300 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20">
                            <Clock className="w-3.5 h-3.5 text-amber-400" />
                            <span>New Inquiry ({lead.hoursSinceCustomer}h)</span>
                          </span>
                        ) : lead.status === "AWAITING_CUSTOMER" ? (
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                                  isPast24h
                                    ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                                    : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                                }`}
                              >
                                {isPast24h ? (
                                  <AlertCircle className="w-3 h-3 mr-1 text-rose-400" />
                                ) : (
                                  <Clock className="w-3 h-3 mr-1 text-amber-400" />
                                )}
                                {lead.hoursUnresponsive}h silent since sales response
                              </span>
                            ) : lead.status === "REPLIED" ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                                <CheckCircle className="w-3 h-3 mr-1 text-indigo-400" />
                                Customer replied {lead.hoursSinceCustomer}h ago
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                <CheckCircle className="w-3 h-3 mr-1" />
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
                      <td className="py-3.5 px-3">
                        {lead.within24h ? (
                          <div className="space-y-1">
                            <div className="flex items-center space-x-1.5 text-[11px] font-semibold text-emerald-400">
                              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                              <span>In 24H Windows</span>
                            </div>
                            <div className="text-[10px] text-slate-400">
                              {lead.windowRemainingHours}h remaining
                            </div>
                            {/* Progress bar */}
                            <div className="w-24 bg-slate-800 rounded-full h-1.5 overflow-hidden">
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
                          <div className="space-y-0.5">
                            <div className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                              <ShieldAlert className="w-3 h-3 mr-1" />
                              HUMAN_AGENT
                            </div>
                            <div className="text-[10px] text-slate-500">
                              24h window closed ({lead.hoursSinceCustomer}h ago)
                            </div>
                          </div>
                        )}
                      </td>

                      {/* Customer Status */}
                      <td className="py-3.5 px-3 text-right pr-4">
                        {lead.status === "FOLLOWED_UP" ? (
                          lead.followUpCount >= 2 ? (
                            <span className="inline-flex items-center space-x-1.5 text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Followed up (2/2 Max)</span>
                            </span>
                          ) : isPast24h ? (
                            <span className="inline-flex items-center space-x-1.5 text-xs font-semibold text-rose-400 bg-rose-500/10 px-2.5 py-1 rounded-lg border border-rose-500/20">
                              <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                              <span>Followed up (1/2, Expired)</span>
                            </span>
                          ) : lead.isCooldownActive ? (
                            <span className="inline-flex items-center space-x-1.5 text-xs font-semibold text-teal-400 bg-teal-500/10 px-2.5 py-1 rounded-lg border border-teal-500/20">
                              <Clock className="w-3.5 h-3.5" />
                              <span>Followed up (1/2, Cooldown)</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center space-x-1.5 text-xs font-semibold text-sky-400 bg-sky-500/10 px-2.5 py-1 rounded-lg border border-sky-500/20">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Followed up (1/2, Ready)</span>
                            </span>
                          )
                        ) : lead.status === "AWAITING_CUSTOMER" ? (
                          isPast24h ? (
                            <span className="inline-flex items-center space-x-1.5 text-xs font-semibold text-rose-400 bg-rose-500/10 px-2.5 py-1 rounded-lg border border-rose-500/20">
                              <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                              <span>Expired</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center space-x-1.5 text-xs font-semibold text-amber-300 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20">
                              <Clock className="w-3.5 h-3.5 text-amber-400" />
                              <span>Unresponsive ({lead.hoursUnresponsive}h)</span>
                            </span>
                          )
                        ) : lead.status === "REPLIED" ? (
                          <span className="inline-flex items-center space-x-1.5 text-xs font-semibold text-indigo-300 bg-indigo-500/10 px-2.5 py-1 rounded-lg border border-indigo-500/20">
                            <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" />
                            <span>Customer Replied</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-400 bg-slate-800 border border-slate-700">
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
      </div>
    </div>
  );
}
