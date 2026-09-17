"use client";

import React, { useState, useEffect } from "react";
import {
  Clock,
  CheckCircle2,
  AlertTriangle,
  Tv,
  Repeat,
  ArrowUpRight,
  Sparkles,
  Users,
} from "lucide-react";

interface StatsCardsProps {
  stats: {
    totalScheduled: number;
    totalPublished: number;
    totalFailed: number;
    totalRecurring: number;
    totalDrafts: number;
    sentTodayCount: number;
    totalSuccessLogs: number;
    totalFailedLogs: number;
    successRate: number;
    totalChannels: number;
    totalAudience: number;
  };
  nextPost?: {
    title: string;
    scheduledAt: string;
    targets?: Array<{ channel: { title: string } }>;
  } | null;
  onNavigateToTab: (tab: string) => void;
}

export function StatsCards({
  stats,
  nextPost,
  onNavigateToTab,
}: StatsCardsProps) {
  // Countdown to next post
  const [timeLeft, setTimeLeft] = useState<string>("");

  useEffect(() => {
    if (!nextPost?.scheduledAt) {
      setTimeLeft("");
      return;
    }

    const updateCountdown = () => {
      const target = new Date(nextPost.scheduledAt).getTime();
      const now = new Date().getTime();
      const diff = target - now;

      if (diff <= 0) {
        setTimeLeft("Due now / Processing");
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      if (hours > 24) {
        const days = Math.floor(hours / 24);
        setTimeLeft(`in ${days}d ${hours % 24}h`);
      } else if (hours > 0) {
        setTimeLeft(`in ${hours}h ${minutes}m`);
      } else {
        setTimeLeft(`in ${minutes}m ${seconds}s`);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [nextPost?.scheduledAt]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. Scheduled Queue */}
      <div
        onClick={() => onNavigateToTab("queue")}
        className="group cursor-pointer rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 p-5 shadow-sm hover:border-blue-500/50 hover:shadow-blue-500/10 transition-all"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Scheduled Queue
          </span>
          <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform">
            <Clock className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            {stats.totalScheduled}
          </span>
          <span className="text-xs text-slate-500 dark:text-slate-400">upcoming posts</span>
        </div>
        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
          <span className="text-slate-600 dark:text-slate-400 truncate max-w-[150px]">
            {nextPost ? `Next: "${nextPost.title}"` : "No posts in queue"}
          </span>
          {timeLeft && (
            <span className="px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 font-mono font-medium text-[11px] whitespace-nowrap">
              {timeLeft}
            </span>
          )}
        </div>
      </div>

      {/* 2. Delivered Today & Cumulative */}
      <div
        onClick={() => onNavigateToTab("queue")}
        className="group cursor-pointer rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 p-5 shadow-sm hover:border-emerald-500/50 hover:shadow-emerald-500/10 transition-all"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Delivered Today
          </span>
          <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            {stats.sentTodayCount}
          </span>
          <span className="text-xs text-slate-500 dark:text-slate-400">broadcasts</span>
        </div>
        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
          <span className="text-slate-600 dark:text-slate-400">All-time delivered</span>
          <span className="text-emerald-600 dark:text-emerald-400 font-semibold font-mono">
            {stats.totalSuccessLogs} posts
          </span>
        </div>
      </div>

      {/* 3. Channels & Audience */}
      <div
        onClick={() => onNavigateToTab("channels")}
        className="group cursor-pointer rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 p-5 shadow-sm hover:border-sky-500/50 hover:shadow-sky-500/10 transition-all"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Connected Channels
          </span>
          <div className="p-2 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 group-hover:scale-110 transition-transform">
            <Tv className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            {stats.totalChannels}
          </span>
          <span className="text-xs text-slate-500 dark:text-slate-400">destinations</span>
        </div>
        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1 text-slate-600 dark:text-slate-400">
            <Users className="w-3.5 h-3.5 text-sky-500 dark:text-sky-400" />
            <span>Audience Reach</span>
          </div>
          <span className="text-sky-600 dark:text-sky-400 font-semibold font-mono">
            {stats.totalAudience.toLocaleString()}
          </span>
        </div>
      </div>

      {/* 4. Delivery Success Rate */}
      <div
        onClick={() => onNavigateToTab("logs")}
        className="group cursor-pointer rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 p-5 shadow-sm hover:border-purple-500/50 hover:shadow-purple-500/10 transition-all"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Delivery Health
          </span>
          <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 group-hover:scale-110 transition-transform">
            <Repeat className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            {stats.successRate}%
          </span>
          <span className="text-xs text-slate-500 dark:text-slate-400">success rate</span>
        </div>
        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
          <span className="text-slate-600 dark:text-slate-400">Recurring rules</span>
          <span className="text-purple-600 dark:text-purple-400 font-semibold font-mono">
            {stats.totalRecurring} active
          </span>
        </div>
      </div>
    </div>
  );
}
