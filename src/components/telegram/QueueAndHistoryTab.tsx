"use client";

import React, { useState } from "react";
import {
  Clock,
  CheckCircle2,
  AlertCircle,
  Repeat,
  FileEdit,
  Send,
  Trash2,
  ExternalLink,
  Search,
  Filter,
  RefreshCw,
  Copy,
  Calendar,
  Layers,
  Pause,
  Play,
  ArrowUpRight,
} from "lucide-react";
import { DeleteConfirmModal } from "@/components/common/DeleteConfirmModal";

interface QueueAndHistoryTabProps {
  posts: any[];
  channels: any[];
  onSendNow: (id: string) => Promise<void>;
  onRetry: (id: string) => Promise<void>;
  onEdit: (post: any) => void;
  onDelete: (id: string) => Promise<void>;
  onTogglePause: (post: any) => Promise<void>;
  onDuplicate: (post: any) => void;
  isLoading: boolean;
  onRefresh: () => void;
}

export function QueueAndHistoryTab({
  posts,
  channels,
  onSendNow,
  onRetry,
  onEdit,
  onDelete,
  onTogglePause,
  onDuplicate,
  isLoading,
  onRefresh,
}: QueueAndHistoryTabProps) {
  const [activeSubTab, setActiveSubTab] = useState<
    "scheduled" | "recurring" | "published" | "failed" | "drafts"
  >("scheduled");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedChannelFilter, setSelectedChannelFilter] = useState("ALL");
  const [actionInProgressId, setActionInProgressId] = useState<string | null>(null);
  const [postToDelete, setPostToDelete] = useState<any | null>(null);
  const [isDeletingPost, setIsDeletingPost] = useState(false);

  const handleConfirmDelete = async () => {
    if (!postToDelete) return;
    setIsDeletingPost(true);
    try {
      await onDelete(postToDelete.id);
      setPostToDelete(null);
    } finally {
      setIsDeletingPost(false);
    }
  };

  // Filter posts based on activeSubTab, searchQuery, and channel
  const filteredPosts = posts.filter((post) => {
    // 1. Sub-tab classification
    if (activeSubTab === "scheduled") {
      if (post.status !== "SCHEDULED" || post.isRecurring) return false;
    } else if (activeSubTab === "recurring") {
      if (!post.isRecurring) return false;
    } else if (activeSubTab === "published") {
      if (post.status !== "PUBLISHED") return false;
    } else if (activeSubTab === "failed") {
      if (post.status !== "FAILED") return false;
    } else if (activeSubTab === "drafts") {
      if (post.status !== "DRAFT") return false;
    }

    // 2. Channel filter
    if (selectedChannelFilter !== "ALL") {
      const match = post.targets?.some(
        (t: any) => (t.channelId || t.channel?.id) === selectedChannelFilter
      );
      if (!match) return false;
    }

    // 3. Search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const matchTitle = post.title?.toLowerCase().includes(query);
      const matchContent = post.content?.toLowerCase().includes(query);
      if (!matchTitle && !matchContent) return false;
    }

    return true;
  });

  // Counts for tabs
  const scheduledCount = posts.filter(
    (p) => p.status === "SCHEDULED" && !p.isRecurring
  ).length;
  const recurringCount = posts.filter((p) => p.isRecurring).length;
  const publishedCount = posts.filter((p) => p.status === "PUBLISHED").length;
  const failedCount = posts.filter((p) => p.status === "FAILED").length;
  const draftsCount = posts.filter((p) => p.status === "DRAFT").length;

  const handleAction = async (id: string, actionFn: () => Promise<void>) => {
    setActionInProgressId(id);
    try {
      await actionFn();
    } finally {
      setActionInProgressId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Sub-tabs header & search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Sub-tab pills */}
        <div className="flex items-center space-x-1 p-1 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-x-auto">
          {[
            {
              id: "scheduled",
              label: "Scheduled Queue",
              count: scheduledCount,
              icon: Clock,
              color: "text-blue-500 dark:text-blue-400",
            },
            {
              id: "recurring",
              label: "Recurring Automation",
              count: recurringCount,
              icon: Repeat,
              color: "text-purple-500 dark:text-purple-400",
            },
            {
              id: "published",
              label: "Published History",
              count: publishedCount,
              icon: CheckCircle2,
              color: "text-emerald-500 dark:text-emerald-400",
            },
            {
              id: "failed",
              label: "Needs Attention",
              count: failedCount,
              icon: AlertCircle,
              color: "text-rose-500 dark:text-rose-400",
            },
            {
              id: "drafts",
              label: "Drafts",
              count: draftsCount,
              icon: FileEdit,
              color: "text-slate-500 dark:text-slate-400",
            },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeSubTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveSubTab(tab.id as any)}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                  isActive
                    ? "bg-slate-100 text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white"
                    : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${tab.color}`} />
                <span>{tab.label}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    isActive
                      ? "bg-blue-600 text-white"
                      : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Filters & Refresh */}
        <div className="flex items-center gap-2">
          {/* Channel Selector */}
          <div className="relative">
            <select
              value={selectedChannelFilter}
              onChange={(e) => setSelectedChannelFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-300 focus:outline-none focus:border-blue-500 shadow-sm"
            >
              <option value="ALL">All Channels ({channels.length})</option>
              {channels.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </div>

          {/* Search input */}
          <div className="relative w-48 sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400 dark:text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search posts..."
              className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-blue-500 shadow-sm"
            />
          </div>

          {/* Refresh button */}
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 shadow-sm transition-colors"
            title="Refresh list"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Posts List Cards */}
      {filteredPosts.length === 0 ? (
        <div className="rounded-2xl bg-slate-900/50 border border-slate-800 p-12 text-center">
          <div className="w-12 h-12 rounded-2xl bg-slate-800/80 text-slate-500 flex items-center justify-center mx-auto mb-3">
            <Clock className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-semibold text-white mb-1">
            No posts found in this view
          </h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {activeSubTab === "scheduled" &&
              "You don't have any scheduled posts queued up. Click 'New Post' to schedule one!"}
            {activeSubTab === "recurring" &&
              "No recurring campaigns configured. Set up daily or weekly automated posts to maintain constant audience engagement."}
            {activeSubTab === "published" &&
              "No posts have been published yet."}
            {activeSubTab === "failed" &&
              "Great news! No posts currently have delivery errors."}
            {activeSubTab === "drafts" &&
              "No draft posts found."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredPosts.map((post) => {
            const isProcessing = actionInProgressId === post.id;
            const scheduledDate = new Date(post.scheduledAt);
            const targets = post.targets || [];
            const deliveryLog = post.deliveryLogs?.[0];

            return (
              <div
                key={post.id}
                className="group rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 p-5 hover:border-slate-300 dark:hover:border-slate-700 shadow-sm transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                {/* Left: Info & Content preview */}
                <div className="flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Status Pill */}
                    {post.status === "SCHEDULED" && (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>SCHEDULED</span>
                      </span>
                    )}
                    {post.status === "PUBLISHED" && (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>PUBLISHED</span>
                      </span>
                    )}
                    {post.status === "FAILED" && (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        <span>DELIVERY FAILED</span>
                      </span>
                    )}
                    {post.status === "PAUSED" && (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20 flex items-center gap-1">
                        <Pause className="w-3 h-3" />
                        <span>PAUSED</span>
                      </span>
                    )}
                    {post.status === "DRAFT" && (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-700/50 dark:text-slate-300 border border-slate-200 dark:border-slate-600 flex items-center gap-1">
                        <FileEdit className="w-3 h-3" />
                        <span>DRAFT</span>
                      </span>
                    )}

                    {/* Recurring badge if applicable */}
                    {post.isRecurring && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 dark:bg-purple-500/10 dark:text-purple-300 border border-purple-200 dark:border-purple-500/20 flex items-center gap-1">
                        <Repeat className="w-3 h-3" />
                        <span>
                          {post.recurrenceRule === "daily"
                            ? `Daily at ${post.recurrenceTime || "09:00"}`
                            : post.recurrenceRule === "interval_hours"
                            ? `Every ${post.recurrenceIntervalHours || 6}h`
                            : "Weekly Schedule"}
                        </span>
                      </span>
                    )}

                    {/* Media badge */}
                    {post.mediaType !== "none" && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 capitalize border border-slate-200 dark:border-transparent">
                        📷 {post.mediaType}
                      </span>
                    )}

                    {/* Pinned badge */}
                    {post.isPinned && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border border-blue-200 dark:border-blue-800/40">
                        📌 Pinned
                      </span>
                    )}
                  </div>

                  {/* Title & snippet */}
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {post.title}
                    </h4>
                    <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 mt-1 font-sans">
                      {post.content.replace(/<[^>]*>?/gm, "")}
                    </p>
                  </div>

                  {/* Target Channels & Timing info */}
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400 pt-1">
                    {/* Channels chips */}
                    <div className="flex items-center gap-1">
                      <span className="text-slate-500">Channels:</span>
                      {targets.length > 0 ? (
                        <div className="flex items-center gap-1">
                          {targets.slice(0, 3).map((t: any, i: number) => (
                            <span
                              key={i}
                              className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-[11px] text-slate-700 dark:text-slate-300 font-medium"
                            >
                              {t.channel?.title || "Channel"}
                            </span>
                          ))}
                          {targets.length > 3 && (
                            <span className="text-[11px] text-slate-500">
                              +{targets.length - 3} more
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-rose-500 dark:text-rose-400">None assigned</span>
                      )}
                    </div>

                    <span className="text-slate-300 dark:text-slate-700">•</span>

                    {/* Scheduled / Sent Date */}
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                      <span>
                        {post.status === "PUBLISHED"
                          ? `Delivered: ${scheduledDate.toLocaleDateString()} at ${scheduledDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                          : `Scheduled: ${scheduledDate.toLocaleDateString()} at ${scheduledDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`}
                      </span>
                    </div>

                    {/* Delivery Failure Reason if any */}
                    {post.status === "FAILED" && deliveryLog?.errorMessage && (
                      <div className="w-full mt-1.5 p-2 rounded-lg bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-xs text-rose-700 dark:text-rose-300">
                        <span className="font-semibold">Reason: </span>
                        {deliveryLog.errorMessage}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right: Action Buttons */}
                <div className="flex items-center gap-1.5 self-end md:self-center">
                  {/* Telegram URL Link for published posts */}
                  {deliveryLog?.telegramMessageUrl && (
                    <a
                      href={deliveryLog.telegramMessageUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-sky-600 dark:text-sky-400 transition-colors"
                      title="View on Telegram"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}

                  {/* Retry Button for Failed Posts */}
                  {post.status === "FAILED" && (
                    <button
                      onClick={() => handleAction(post.id, () => onRetry(post.id))}
                      disabled={isProcessing}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-md shadow-rose-600/20 transition-colors disabled:opacity-50"
                      title="Retry post broadcast now"
                    >
                      <RefreshCw
                        className={`w-3.5 h-3.5 ${isProcessing ? "animate-spin" : ""}`}
                      />
                      <span>Retry Delivery</span>
                    </button>
                  )}

                  {/* Send Now Button (if Scheduled or Draft) */}
                  {(post.status === "SCHEDULED" || post.status === "DRAFT") && (
                    <button
                      onClick={() => handleAction(post.id, () => onSendNow(post.id))}
                      disabled={isProcessing}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md shadow-blue-600/20 transition-colors disabled:opacity-50"
                      title="Broadcast immediately"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Send Now</span>
                    </button>
                  )}

                  {/* Pause / Resume for Recurring */}
                  {post.isRecurring && (
                    <button
                      onClick={() => handleAction(post.id, () => onTogglePause(post))}
                      className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
                      title={post.status === "PAUSED" ? "Resume Campaign" : "Pause Campaign"}
                    >
                      {post.status === "PAUSED" ? (
                        <Play className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      ) : (
                        <Pause className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                      )}
                    </button>
                  )}

                  {/* Duplicate post */}
                  <button
                    onClick={() => onDuplicate(post)}
                    className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
                    title="Duplicate content into new post"
                  >
                    <Copy className="w-4 h-4" />
                  </button>

                  {/* Edit Post */}
                  <button
                    onClick={() => onEdit(post)}
                    className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 hover:text-blue-600 dark:text-slate-400 dark:hover:text-white transition-colors"
                    title="Edit post"
                  >
                    <FileEdit className="w-4 h-4" />
                  </button>

                  {/* Delete Post */}
                  <button
                    onClick={() => setPostToDelete(post)}
                    className="p-2 rounded-xl bg-slate-100 hover:bg-rose-50 dark:bg-slate-800 dark:hover:bg-rose-600/20 text-slate-600 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 transition-colors"
                    title="Delete post"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Global Delete Confirmation Popup Card */}
      <DeleteConfirmModal
        isOpen={Boolean(postToDelete)}
        onClose={() => setPostToDelete(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Broadcast Post?"
        itemName={postToDelete?.title || "Untitled Post"}
        itemType="Broadcast Post"
        isDeleting={isDeletingPost}
        details={[
          { label: "Status", value: postToDelete?.status || "SCHEDULED" },
          {
            label: "Schedule Type",
            value: postToDelete?.isRecurring
              ? "Recurring Automation"
              : postToDelete?.status === "PUBLISHED"
              ? "Published"
              : "One-time Broadcast",
          },
          {
            label: "Channels",
            value: `${postToDelete?.targets?.length || 0} destinations`,
          },
          {
            label: "Time",
            value: postToDelete?.scheduledAt
              ? new Date(postToDelete.scheduledAt).toLocaleString()
              : "Immediate",
          },
        ]}
        warningText="Deleting this broadcast removes it permanently from your queue, logs, and scheduled dispatchers."
      />
    </div>
  );
}
