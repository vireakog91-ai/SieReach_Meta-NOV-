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
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex flex-col justify-between hover:border-blue-400 dark:hover:border-blue-500/50 transition cursor-pointer group shadow-xs dark:shadow-sm"
      >
        <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
          <span className="text-xs font-bold uppercase tracking-wider group-hover:text-blue-600 dark:group-hover:text-blue-400 transition">
            Connected Pages
          </span>
          <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
            <Layers className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="flex items-baseline space-x-2">
          <span className="text-2xl font-black text-slate-900 dark:text-white">{totalPages}</span>
          <span className="text-xs text-slate-500 dark:text-slate-400">active Facebook pages</span>
        </div>
        <div className="mt-2 text-xs text-blue-600 dark:text-blue-400 font-medium group-hover:underline flex items-center justify-between">
          <span>Manage / Add Pages →</span>
        </div>
      </div>

      {/* 2. Total Inbound Leads */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex flex-col justify-between hover:border-indigo-400 dark:hover:border-indigo-500/50 transition shadow-xs dark:shadow-sm">
        <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
          <span className="text-xs font-bold uppercase tracking-wider">Inbound Ad Leads</span>
          <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <Users className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="flex items-baseline space-x-2">
          <span className="text-2xl font-black text-slate-900 dark:text-white">{totalLeads}</span>
          <span className="text-xs text-slate-500 dark:text-slate-400">conversations</span>
        </div>
        <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
          <span className="text-indigo-600 dark:text-indigo-400 font-bold">{awaitingCount}</span> awaiting customer
        </div>
      </div>

      {/* 3. Non-responsive (>= threshold hours) */}
      <div className="bg-amber-50/70 dark:bg-slate-900 border border-amber-200 dark:border-amber-500/30 rounded-2xl p-4 flex flex-col justify-between hover:border-amber-400 dark:hover:border-amber-500/50 transition relative overflow-hidden shadow-xs dark:shadow-sm">
        <div className="absolute top-0 right-0 w-16 h-16 bg-amber-500/10 rounded-full blur-xl pointer-events-none" />
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
            Silent ≥ {thresholdHours}h
          </span>
          <div className="w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 flex items-center justify-center">
            <Clock className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="flex items-baseline space-x-2">
          <span className="text-2xl font-black text-amber-700 dark:text-amber-300">{unresponsiveCount}</span>
          <span className="text-xs text-amber-800/80 dark:text-slate-400">drop-offs detected</span>
        </div>
        <div className="mt-2 text-xs text-amber-700 dark:text-amber-400 font-semibold">
          Awaiting follow-up review
        </div>
      </div>

      {/* 4. Urgent 24h Meta Window */}
      <div className="bg-rose-50/70 dark:bg-slate-900 border border-rose-200 dark:border-rose-500/30 rounded-2xl p-4 flex flex-col justify-between hover:border-rose-400 dark:hover:border-rose-500/50 transition relative overflow-hidden shadow-xs dark:shadow-sm">
        <div className="absolute top-0 right-0 w-16 h-16 bg-rose-500/10 rounded-full blur-xl pointer-events-none" />
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400">
            24h Window &lt;6h Left
          </span>
          <div className="w-7 h-7 rounded-lg bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-400 flex items-center justify-center">
            <AlertTriangle className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="flex items-baseline space-x-2">
          <span className="text-2xl font-black text-rose-700 dark:text-red-400">{urgent24hCount}</span>
          <span className="text-xs text-rose-800/80 dark:text-slate-400">leads urgent</span>
        </div>
        <div className="mt-2 text-xs text-rose-700 dark:text-rose-400/90 font-semibold">
          Standard window closing
        </div>
      </div>

      {/* 5. Followed Up & Recovered */}
      <div className="bg-emerald-50/70 dark:bg-slate-900 border border-emerald-200 dark:border-emerald-500/30 rounded-2xl p-4 flex flex-col justify-between hover:border-emerald-400 dark:hover:border-emerald-500/50 transition shadow-xs dark:shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
            Re-engaged / Sent
          </span>
          <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 flex items-center justify-center">
            <CheckCircle2 className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="flex items-baseline space-x-2">
          <span className="text-2xl font-black text-emerald-700 dark:text-emerald-400">{followedUpCount}</span>
          <span className="text-xs text-emerald-800/80 dark:text-slate-400">followed up</span>
        </div>
        <div className="mt-2 text-xs text-emerald-700 dark:text-emerald-400 font-semibold">
          {totalLeads > 0
            ? `${Math.round((followedUpCount / totalLeads) * 100)}% coverage`
            : "0%"}
        </div>
      </div>
    </div>
  );
}
