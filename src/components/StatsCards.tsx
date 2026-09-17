"use client";

import React from "react";
import {
  Layers,
  Clock,
  AlertTriangle,
  Send,
  CheckCircle2,
  Users,
} from "lucide-react";

interface StatsCardsProps {
  totalPages: number;
  totalLeads: number;
  awaitingCount: number;
  unresponsiveCount: number;
  urgent24hCount: number;
  followedUpCount: number;
  thresholdHours: number;
  onNavigateToPages?: () => void;
}

export function StatsCards({
  totalPages,
  totalLeads,
  awaitingCount,
  unresponsiveCount,
  urgent24hCount,
  followedUpCount,
  thresholdHours,
  onNavigateToPages,
}: StatsCardsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      {/* 1. Connected Pages */}
      <div
        onClick={onNavigateToPages}
        className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between hover:border-blue-500/50 transition cursor-pointer group"
      >
        <div className="flex items-center justify-between text-slate-400 mb-2">
          <span className="text-xs font-medium uppercase tracking-wider group-hover:text-blue-400 transition">
            Connected Pages
          </span>
          <Layers className="w-4 h-4 text-blue-400" />
        </div>
        <div className="flex items-baseline space-x-2">
          <span className="text-2xl font-bold text-white">{totalPages}</span>
          <span className="text-xs text-slate-400">active Facebook pages</span>
        </div>
        <div className="mt-2 text-xs text-blue-400 font-medium group-hover:underline flex items-center justify-between">
          <span>Manage / Add Pages →</span>
        </div>
      </div>

      {/* 2. Total Inbound Leads */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between hover:border-slate-700 transition">
        <div className="flex items-center justify-between text-slate-400 mb-2">
          <span className="text-xs font-medium uppercase tracking-wider">Inbound Ad Leads</span>
          <Users className="w-4 h-4 text-indigo-400" />
        </div>
        <div className="flex items-baseline space-x-2">
          <span className="text-2xl font-bold text-white">{totalLeads}</span>
          <span className="text-xs text-slate-400">conversations</span>
        </div>
        <div className="mt-2 text-xs text-slate-400">
          <span className="text-indigo-400 font-semibold">{awaitingCount}</span> awaiting customer
        </div>
      </div>

      {/* 3. Non-responsive (>= threshold hours) */}
      <div className="bg-slate-900 border border-amber-300/80 dark:border-amber-500/30 rounded-xl p-4 flex flex-col justify-between hover:border-amber-500/50 transition relative overflow-hidden">
        <div className="absolute top-0 right-0 w-16 h-16 bg-amber-500/10 rounded-full blur-xl pointer-events-none" />
        <div className="flex items-center justify-between text-slate-400 mb-2">
          <span className="text-xs font-medium uppercase tracking-wider text-amber-300">
            Silent ≥ {thresholdHours}h
          </span>
          <Clock className="w-4 h-4 text-amber-400" />
        </div>
        <div className="flex items-baseline space-x-2">
          <span className="text-2xl font-bold text-amber-300">{unresponsiveCount}</span>
          <span className="text-xs text-slate-400">drop-offs detected</span>
        </div>
        <div className="mt-2 text-xs text-amber-400/90 font-medium">
          Awaiting follow-up review
        </div>
      </div>

      {/* 4. Urgent 24h Meta Window */}
      <div className="bg-slate-900 border border-red-300/80 dark:border-red-500/30 rounded-xl p-4 flex flex-col justify-between hover:border-red-500/50 transition relative overflow-hidden">
        <div className="absolute top-0 right-0 w-16 h-16 bg-red-500/10 rounded-full blur-xl pointer-events-none" />
        <div className="flex items-center justify-between text-slate-400 mb-2">
          <span className="text-xs font-medium uppercase tracking-wider text-red-300">
            24h Window &lt;6h Left
          </span>
          <AlertTriangle className="w-4 h-4 text-red-400" />
        </div>
        <div className="flex items-baseline space-x-2">
          <span className="text-2xl font-bold text-red-400">{urgent24hCount}</span>
          <span className="text-xs text-slate-400">leads urgent</span>
        </div>
        <div className="mt-2 text-xs text-red-400/90 font-medium">Standard window closing</div>
      </div>

      {/* 5. Followed Up & Recovered */}
      <div className="bg-slate-900 border border-emerald-300/80 dark:border-emerald-500/30 rounded-xl p-4 flex flex-col justify-between hover:border-emerald-500/50 transition">
        <div className="flex items-center justify-between text-slate-400 mb-2">
          <span className="text-xs font-medium uppercase tracking-wider text-emerald-400">
            Re-engaged / Sent
          </span>
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
        </div>
        <div className="flex items-baseline space-x-2">
          <span className="text-2xl font-bold text-emerald-400">{followedUpCount}</span>
          <span className="text-xs text-slate-400">followed up</span>
        </div>
        <div className="mt-2 text-xs text-emerald-400/90 font-medium">
          {totalLeads > 0
            ? `${Math.round((followedUpCount / totalLeads) * 100)}% coverage`
            : "0%"}
        </div>
      </div>
    </div>
  );
}
