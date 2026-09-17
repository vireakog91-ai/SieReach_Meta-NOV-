"use client";

import React, { useState } from "react";
import {
  History,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  RefreshCw,
  Search,
  Filter,
  ArrowUpRight,
  Tv,
} from "lucide-react";

interface DeliveryLogsTabProps {
  logs: any[];
  onRetryPost: (postId: string) => Promise<void>;
  isLoading: boolean;
  onRefresh: () => void;
}

export function DeliveryLogsTab({
  logs,
  onRetryPost,
  isLoading,
  onRefresh,
}: DeliveryLogsTabProps) {
  const [filterStatus, setFilterStatus] = useState<"ALL" | "SUCCESS" | "FAILED">("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [retryingId, setRetryingId] = useState<string | null>(null);

  const filteredLogs = logs.filter((log) => {
    if (filterStatus === "SUCCESS") {
      if (log.status !== "SUCCESS" && log.status !== "SIMULATED") return false;
    } else if (filterStatus === "FAILED") {
      if (log.status !== "FAILED") return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchChannel = log.channelTitle?.toLowerCase().includes(q);
      const matchChatId = log.chatId?.toLowerCase().includes(q);
      const matchPostTitle = log.post?.title?.toLowerCase().includes(q);
      const matchError = log.errorMessage?.toLowerCase().includes(q);
      if (!matchChannel && !matchChatId && !matchPostTitle && !matchError) return false;
    }

    return true;
  });

  const handleRetry = async (logId: string, postId: string) => {
    setRetryingId(logId);
    try {
      await onRetryPost(postId);
    } finally {
      setRetryingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-slate-900 border border-slate-800">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <History className="w-5 h-5 text-blue-400" />
            <span>Delivery Logs & Failure Monitor</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Real-time audit log of every Telegram broadcast attempt with exact API response diagnostics.
          </p>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2">
          <div className="flex items-center space-x-1 p-1 bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 text-xs shadow-sm">
            <button
              onClick={() => setFilterStatus("ALL")}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                filterStatus === "ALL"
                  ? "bg-blue-600 text-white"
                  : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              }`}
            >
              All ({logs.length})
            </button>
            <button
              onClick={() => setFilterStatus("SUCCESS")}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                filterStatus === "SUCCESS"
                  ? "bg-emerald-600 text-white"
                  : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              }`}
            >
              Delivered
            </button>
            <button
              onClick={() => setFilterStatus("FAILED")}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                filterStatus === "FAILED"
                  ? "bg-rose-600 text-white"
                  : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              }`}
            >
              Failed
            </button>
          </div>

          <div className="relative w-48">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400 dark:text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter logs..."
              className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-blue-500 shadow-sm"
            />
          </div>

          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="p-2 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white shadow-sm transition-colors"
            title="Refresh logs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Logs Table / Card List */}
      {filteredLogs.length === 0 ? (
        <div className="rounded-2xl bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 p-12 text-center shadow-sm">
          <History className="w-8 h-8 text-slate-400 dark:text-slate-600 mx-auto mb-2" />
          <p className="text-xs text-slate-600 dark:text-slate-400">No delivery logs found matching the filter.</p>
        </div>
      ) : (
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-semibold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Target Channel</th>
                  <th className="py-3 px-4">Associated Post</th>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Delivery Result / Diagnostics</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800/80">
                {filteredLogs.map((log) => {
                  const isSuccess = log.status === "SUCCESS" || log.status === "SIMULATED";
                  const isRetrying = retryingId === log.id;
                  const date = new Date(log.sentAt);

                  return (
                    <tr
                      key={log.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      {/* Status */}
                      <td className="py-3 px-4">
                        {isSuccess ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>{log.status === "SIMULATED" ? "SIMULATED" : "DELIVERED"}</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20">
                            <AlertCircle className="w-3 h-3" />
                            <span>FAILED</span>
                          </span>
                        )}
                      </td>

                      {/* Target Channel */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900 dark:text-white truncate max-w-[160px]">
                          {log.channelTitle}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          {log.chatId}
                        </div>
                      </td>

                      {/* Post Title */}
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-800 dark:text-slate-200 truncate max-w-[200px]">
                          {log.post?.title || "Scheduled Broadcast"}
                        </div>
                      </td>

                      {/* Timestamp */}
                      <td className="py-3 px-4 whitespace-nowrap text-slate-400 font-mono text-[11px]">
                        {date.toLocaleDateString()} {date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                      </td>

                      {/* Diagnostic / Error Message */}
                      <td className="py-3 px-4">
                        {isSuccess ? (
                          <div className="flex items-center gap-1.5 text-slate-400">
                            <span className="text-[11px] font-mono">Message ID: #{log.telegramMessageId || "OK"}</span>
                            {log.telegramMessageUrl && (
                              <a
                                href={log.telegramMessageUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-sky-400 hover:underline inline-flex items-center gap-0.5 text-[10px]"
                              >
                                <span>t.me</span>
                                <ExternalLink className="w-2.5 h-2.5" />
                              </a>
                            )}
                          </div>
                        ) : (
                          <div
                            className="text-rose-600 dark:text-rose-400 font-medium text-[11px] max-w-[320px] truncate cursor-help"
                            title={log.errorMessage}
                          >
                            {log.errorMessage || "Unknown error"}
                          </div>
                        )}
                      </td>

                      {/* Action */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        {!isSuccess && log.postId && (
                          <button
                            onClick={() => handleRetry(log.id, log.postId)}
                            disabled={isRetrying}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-600/20 hover:bg-rose-600 border border-rose-500/30 text-rose-300 hover:text-white text-xs font-semibold transition-colors disabled:opacity-50"
                          >
                            <RefreshCw className={`w-3 h-3 ${isRetrying ? "animate-spin" : ""}`} />
                            <span>Retry</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
