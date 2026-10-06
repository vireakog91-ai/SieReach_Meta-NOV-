"use client";

import React, { useState } from "react";
import {
  History,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  ExternalLink,
  Image as ImageIcon,
  MessageSquare,
  Volume2,
  Mic,
} from "lucide-react";

interface LogItem {
  id: string;
  recipientPsid: string;
  recipientName: string;
  messageSent: string;
  imageUrl?: string | null;
  audioUrl?: string | null;
  status: string;
  errorMessage?: string | null;
  sentAt: string | Date;
  page?: {
    name: string;
    avatarUrl?: string | null;
  };
  campaign?: {
    name: string;
  };
}

interface BlastLogsTabProps {
  logs: LogItem[];
  totalDelivered: number;
  totalFailed: number;
  onRefreshLogs: () => void;
  isLoading: boolean;
}

export function BlastLogsTab({
  logs,
  totalDelivered,
  totalFailed,
  onRefreshLogs,
  isLoading,
}: BlastLogsTabProps) {
  const [search, setSearch] = useState("");

  const filteredLogs = logs.filter(
    (log) =>
      log.recipientName.toLowerCase().includes(search.toLowerCase()) ||
      log.messageSent.toLowerCase().includes(search.toLowerCase()) ||
      (log.page && log.page.name.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Header & Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center space-x-2">
            <History className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <span>Follow-Up Blast Delivery Logs</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Real-time audit log of all automated and manual follow-up messages and images sent to customers.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 text-xs">
            <span className="text-emerald-600 dark:text-emerald-400 font-bold">{totalDelivered} Delivered</span>
            <span className="text-slate-400 dark:text-slate-600">|</span>
            <span className="text-red-600 dark:text-red-400 font-bold">{totalFailed} Failed</span>
          </div>

          <button
            onClick={onRefreshLogs}
            disabled={isLoading}
            className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 transition font-medium"
          >
            {isLoading ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative max-w-sm">
        <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Filter by customer name or message..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-blue-500"
        />
      </div>

      {/* Logs Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs dark:shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-slate-950/70 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3.5 pl-4 pr-3">Status</th>
                <th className="py-3.5 px-3">Recipient Customer</th>
                <th className="py-3.5 px-3">Facebook Page</th>
                <th className="py-3.5 px-3">Delivered Message & Attachment</th>
                <th className="py-3.5 px-3">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-500">
                    <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="text-sm font-medium">No blast logs recorded yet</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Execute a blast from the Scanner or Bot Setup tabs to generate records.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition">
                    {/* Status Badge */}
                    <td className="py-3.5 pl-4 pr-3">
                      {log.status === "DELIVERED" ? (
                        <span className="inline-flex items-center space-x-1 bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/30 px-2 py-0.5 rounded-full text-[10px] font-bold">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                          <span>Delivered</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1 bg-rose-50 text-rose-700 border border-rose-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/30 px-2 py-0.5 rounded-full text-[10px] font-bold">
                          <XCircle className="w-3 h-3 text-rose-600 dark:text-red-400" />
                          <span>Failed</span>
                        </span>
                      )}
                    </td>

                    {/* Recipient */}
                    <td className="py-3.5 px-3">
                      <div className="font-semibold text-slate-900 dark:text-white">{log.recipientName}</div>
                      <div className="font-mono text-[10px] text-slate-400 dark:text-slate-500">{log.recipientPsid}</div>
                    </td>

                    {/* Page */}
                    <td className="py-3.5 px-3">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 shadow-xs">
                        {log.page?.name || "Page"}
                      </span>
                    </td>

                    {/* Message & Image preview */}
                    <td className="py-3.5 px-3">
                      <div className="flex items-start space-x-3 max-w-lg">
                        {log.imageUrl && (
                          <img
                            src={log.imageUrl}
                            alt="Attachment"
                            className="w-12 h-12 rounded-lg object-cover ring-1 ring-slate-200 dark:ring-slate-700 shrink-0"
                          />
                        )}
                        <div>
                          <p className="text-slate-700 dark:text-slate-200 line-clamp-2 leading-relaxed">
                            {log.messageSent}
                          </p>
                          {log.audioUrl && (
                            <div className="mt-1.5 flex items-center space-x-2">
                              <audio id={`audio-${log.id}`} src={log.audioUrl} preload="none" />
                              <button
                                type="button"
                                onClick={() => {
                                  const el = document.getElementById(`audio-${log.id}`) as HTMLAudioElement;
                                  if (el) {
                                    if (el.paused) el.play();
                                    else el.pause();
                                  }
                                }}
                                className="inline-flex items-center space-x-1.5 bg-purple-50 dark:bg-purple-950/50 hover:bg-purple-100 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60 px-2 py-0.5 rounded-full text-[10px] font-semibold transition cursor-pointer"
                                title="Listen to dispatched voice note"
                              >
                                <Volume2 className="w-3 h-3 text-purple-500" />
                                <span>Voice Note Sent 🎙️</span>
                              </button>
                            </div>
                          )}
                          {log.errorMessage && (
                            <p className="text-[10px] text-red-600 dark:text-red-400 mt-1 font-mono">
                              Error: {log.errorMessage}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Timestamp */}
                    <td className="py-3.5 px-3 text-slate-500 dark:text-slate-400 whitespace-nowrap text-[11px]">
                      {new Date(log.sentAt).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
