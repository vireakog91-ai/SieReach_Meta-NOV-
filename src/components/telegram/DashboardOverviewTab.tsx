"use client";

import React from "react";
import {
  Clock,
  CheckCircle2,
  AlertCircle,
  Tv,
  Repeat,
  Sparkles,
  Send,
  Plus,
  ArrowRight,
  ExternalLink,
  Calendar,
} from "lucide-react";
import { StatsCards } from "./StatsCards";

interface DashboardOverviewTabProps {
  stats: any;
  nextPost: any;
  upcomingPosts: any[];
  channels: any[];
  templates: any[];
  recentLogs: any[];
  onOpenNewPost: () => void;
  onNavigateToTab: (tab: string) => void;
  onSendNow: (id: string) => Promise<void>;
  onUseTemplate: (template: any) => void;
}

export function DashboardOverviewTab({
  stats,
  nextPost,
  upcomingPosts,
  channels,
  templates,
  recentLogs,
  onOpenNewPost,
  onNavigateToTab,
  onSendNow,
  onUseTemplate,
}: DashboardOverviewTabProps) {
  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="welcome-hero-banner relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-900/60 via-slate-900 to-sky-950/40 border border-blue-500/20 p-6 sm:p-8 shadow-xl">
        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="hero-badge inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-xs font-semibold text-blue-300">
            <Sparkles className="w-3.5 h-3.5 text-blue-400" />
            <span>Automated Telegram Broadcast Hub</span>
          </div>

          <h1 className="hero-heading text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Deliver Telegram Content <span className="bg-gradient-to-r from-blue-400 to-sky-300 bg-clip-text text-transparent">Effortlessly on Schedule</span>
          </h1>

          <p className="hero-desc text-xs sm:text-sm text-slate-300 leading-relaxed">
            Eliminate manual copy-pasting, post at prime hours consistently, and broadcast across all your Telegram channels and groups from a unified cockpit.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            <button
              onClick={onOpenNewPost}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-500 hover:to-sky-400 text-white font-semibold text-xs shadow-lg shadow-blue-600/30 transition-all active:scale-[0.98]"
            >
              <Send className="w-4 h-4 -rotate-12" />
              <span>Create New Broadcast</span>
            </button>

            <button
              onClick={() => onNavigateToTab("calendar")}
              className="hero-secondary-btn flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700 hover:bg-slate-800 text-slate-200 text-xs font-semibold transition-colors"
            >
              <Calendar className="w-4 h-4 text-sky-400" />
              <span>Open Content Calendar</span>
            </button>
          </div>
        </div>

        {/* Ambient background glow */}
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-blue-500/10 to-transparent pointer-events-none" />
      </div>

      {/* KPI Stats Cards */}
      <StatsCards
        stats={stats}
        nextPost={nextPost}
        onNavigateToTab={onNavigateToTab}
      />

      {/* Main Split: Left (Upcoming Pipeline), Right (Channels & Templates) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Upcoming Pipeline (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>Upcoming Scheduled Pipeline</span>
            </h3>
            <button
              onClick={() => onNavigateToTab("queue")}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-medium"
            >
              <span>View Full Queue</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {upcomingPosts.length === 0 ? (
            <div className="rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 p-8 text-center space-y-2 shadow-sm">
              <Clock className="w-8 h-8 text-slate-400 dark:text-slate-600 mx-auto" />
              <p className="text-xs text-slate-500 dark:text-slate-400">
                No upcoming broadcasts scheduled. Click &quot;Create New Broadcast&quot; to plan ahead!
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingPosts.slice(0, 4).map((post) => {
                const date = new Date(post.scheduledAt);
                return (
                  <div
                    key={post.id}
                    className="p-4 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-sm transition-all flex items-center justify-between gap-4"
                  >
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        {post.isRecurring && (
                          <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-purple-500/10 text-purple-600 dark:text-purple-300 border border-purple-500/20 flex items-center gap-1">
                            <Repeat className="w-3 h-3" />
                            <span>Recurring</span>
                          </span>
                        )}
                        <span className="text-xs font-bold text-slate-900 dark:text-white truncate block">
                          {post.title}
                        </span>
                      </div>

                      <p className="text-xs text-slate-600 dark:text-slate-400 truncate font-sans">
                        {post.content.replace(/<[^>]*>?/gm, "")}
                      </p>

                      <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                        <Calendar className="w-3 h-3" />
                        <span>
                          {date.toLocaleDateString()} at {date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                        <span>•</span>
                        <span>{post.targets?.length || 0} channel(s)</span>
                      </div>
                    </div>

                    <button
                      onClick={() => onSendNow(post.id)}
                      className="px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-600 text-blue-600 hover:text-white border border-blue-200 hover:border-blue-600 dark:bg-blue-600/20 dark:hover:bg-blue-600 dark:text-blue-300 dark:hover:text-white dark:border-blue-500/30 text-xs font-semibold whitespace-nowrap transition-colors"
                      title="Deliver immediately"
                    >
                      Send Now
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Channels Glance & Templates Quick Load (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Quick Channels Glance */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Tv className="w-4 h-4 text-sky-500 dark:text-sky-400" />
                <span>Connected Destinations</span>
              </h3>
              <button
                onClick={() => onNavigateToTab("channels")}
                className="text-xs text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1 font-medium"
              >
                <span>Manage</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-2">
              {channels.slice(0, 3).map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-sm"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-600/20 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden border border-blue-100 dark:border-blue-500/20">
                      {c.avatarUrl ? (
                        <img src={c.avatarUrl} alt="avatar" className="w-full h-full object-cover" />
                      ) : (
                        c.title.charAt(0)
                      )}
                    </div>
                    <div className="truncate">
                      <div className="text-xs font-semibold text-slate-900 dark:text-white truncate">{c.title}</div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400">{c.type} • {c.memberCount.toLocaleString()} members</div>
                    </div>
                  </div>

                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-medium">
                    Ready
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Template Shortcuts */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500 dark:text-amber-400" />
                <span>Quick-Load Campaign Templates</span>
              </h3>
              <button
                onClick={() => onNavigateToTab("templates")}
                className="text-xs text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1 font-medium"
              >
                <span>All Templates</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-2">
              {templates.slice(0, 3).map((t) => (
                <div
                  key={t.id}
                  onClick={() => onUseTemplate(t)}
                  className="p-3 rounded-xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 hover:border-amber-500/40 hover:bg-slate-50 dark:hover:bg-slate-850 cursor-pointer shadow-sm transition-all flex items-center justify-between gap-3 group"
                >
                  <div className="truncate">
                    <span className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors truncate block">
                      {t.title}
                    </span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">{t.category}</span>
                  </div>

                  <span className="text-xs text-blue-600 dark:text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity font-medium shrink-0">
                    Use &rarr;
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
