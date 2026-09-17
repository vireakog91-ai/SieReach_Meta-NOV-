"use client";

import React, { useState } from "react";
import {
  Tv,
  Plus,
  Users,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Trash2,
  Bot,
  ExternalLink,
  ShieldCheck,
  HelpCircle,
  X,
  Send,
  FileEdit,
  AlertOctagon,
} from "lucide-react";
import { DeleteConfirmModal } from "@/components/common/DeleteConfirmModal";

interface ChannelsManagerTabProps {
  channels: any[];
  bots: any[];
  onAddChannel: (data: { chatId: string; title?: string; botId?: string }) => Promise<void>;
  onUpdateChannel: (data: { id: string; title?: string; chatId?: string; type?: string; botId?: string }) => Promise<void>;
  onRefreshChannel: (id: string) => Promise<void>;
  onDeleteChannel: (id: string) => Promise<void>;
  isLoading: boolean;
}

export function ChannelsManagerTab({
  channels,
  bots,
  onAddChannel,
  onUpdateChannel,
  onRefreshChannel,
  onDeleteChannel,
  isLoading,
}: ChannelsManagerTabProps) {
  // Add channel state
  const [showAddModal, setShowAddModal] = useState(false);
  const [chatId, setChatId] = useState("");
  const [title, setTitle] = useState("");
  const [selectedBotId, setSelectedBotId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  // Edit channel state
  const [editingChannel, setEditingChannel] = useState<any | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editChatId, setEditChatId] = useState("");
  const [editType, setEditType] = useState("channel");
  const [editBotId, setEditBotId] = useState("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Delete confirmation popup state
  const [deletingChannel, setDeletingChannel] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Action loaders
  const [refreshingId, setRefreshingId] = useState<string | null>(null);

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatId.trim()) {
      setAddError("Please enter a Channel @username or Chat ID.");
      return;
    }

    setIsSubmitting(true);
    setAddError(null);
    try {
      await onAddChannel({
        chatId: chatId.trim(),
        title: title.trim() || undefined,
        botId: selectedBotId || undefined,
      });
      setShowAddModal(false);
      setChatId("");
      setTitle("");
      setAddError(null);
    } catch (err: any) {
      setAddError(err.message || "Failed to connect channel.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartEdit = (chan: any) => {
    setEditingChannel(chan);
    setEditTitle(chan.title || "");
    setEditChatId(chan.chatId || "");
    setEditType(chan.type || "channel");
    setEditBotId(chan.botId || chan.bot?.id || "");
    setEditError(null);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingChannel) return;
    if (!editTitle.trim() || !editChatId.trim()) {
      setEditError("Channel title and Chat ID cannot be empty.");
      return;
    }

    setIsSavingEdit(true);
    setEditError(null);
    try {
      await onUpdateChannel({
        id: editingChannel.id,
        title: editTitle.trim(),
        chatId: editChatId.trim(),
        type: editType,
        botId: editBotId || undefined,
      });
      setEditingChannel(null);
      setEditError(null);
    } catch (err: any) {
      setEditError(err.message || "Failed to update channel.");
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingChannel) return;

    setIsDeleting(true);
    try {
      await onDeleteChannel(deletingChannel.id);
      setDeletingChannel(null);
    } catch (err: any) {
      alert(err.message || "Failed to disconnect channel.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleRefresh = async (id: string) => {
    setRefreshingId(id);
    try {
      await onRefreshChannel(id);
    } finally {
      setRefreshingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with CTA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Tv className="w-5 h-5 text-blue-500 dark:text-blue-400" />
            <span>Telegram Channels & Groups</span>
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            Connect and manage all your broadcast destinations from one workspace.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md shadow-blue-600/20 transition-all active:scale-[0.98]"
        >
          <Plus className="w-4 h-4" />
          <span>Connect Channel / Group</span>
        </button>
      </div>

      {/* Channel Cards Grid */}
      {channels.length === 0 ? (
        <div className="rounded-2xl bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 p-12 text-center shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800/80 text-slate-500 flex items-center justify-center mx-auto mb-3">
            <Tv className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-1">
            No channels connected yet
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-4">
            Connect your first Telegram channel or group to start scheduling automated broadcasts.
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold"
          >
            Connect Channel
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {channels.map((chan) => {
            const isRefreshing = refreshingId === chan.id;
            return (
              <div
                key={chan.id}
                className="group rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 p-5 hover:border-slate-300 dark:hover:border-slate-700 shadow-sm transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Channel Top row */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-blue-600 to-sky-400 flex items-center justify-center text-white font-bold text-base overflow-hidden shadow-inner ring-1 ring-white/10 shrink-0">
                        {chan.avatarUrl ? (
                          <img
                            src={chan.avatarUrl}
                            alt="avatar"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          chan.title.charAt(0).toUpperCase()
                        )}
                      </div>
                      <div className="truncate">
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">
                          {chan.title}
                        </h4>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 truncate">
                            {chan.chatId}
                          </span>
                          {chan.username && (
                            <a
                              href={`https://t.me/${chan.username}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-slate-400 hover:text-sky-500 dark:text-slate-500 dark:hover:text-sky-400"
                              title="Open in Telegram"
                            >
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Action buttons: Edit, Refresh & Delete */}
                    <div className="flex items-center gap-1 shrink-0">
                      {/* Edit Button */}
                      <button
                        onClick={() => handleStartEdit(chan)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-blue-400 dark:hover:bg-slate-800 transition-colors"
                        title="Edit channel details"
                      >
                        <FileEdit className="w-3.5 h-3.5" />
                      </button>

                      {/* Refresh Button */}
                      <button
                        onClick={() => handleRefresh(chan.id)}
                        disabled={isRefreshing}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800 transition-colors"
                        title="Re-sync status from Telegram"
                      >
                        <RefreshCw
                          className={`w-3.5 h-3.5 ${
                            isRefreshing ? "animate-spin" : ""
                          }`}
                        />
                      </button>

                      {/* Delete Button (Triggers Popup Modal) */}
                      <button
                        onClick={() => setDeletingChannel(chan)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:text-slate-400 dark:hover:text-rose-400 dark:hover:bg-slate-800 transition-colors"
                        title="Disconnect channel"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Channel Metrics */}
                  <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-slate-200 dark:border-slate-800/80">
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/60">
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold block">
                        Subscribers
                      </span>
                      <span className="text-sm font-bold text-slate-900 dark:text-white font-mono mt-0.5 block">
                        {chan.memberCount.toLocaleString()}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/60">
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold block">
                        Channel Type
                      </span>
                      <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 capitalize mt-0.5 block">
                        {chan.type}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Status Footer */}
                <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800/80 flex items-center justify-between text-xs">
                  {chan.isBotAdmin ? (
                    <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span className="text-[11px] font-medium">Bot Admin Active</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span className="text-[11px] font-medium">Admin Rights Needed</span>
                    </div>
                  )}

                  <span className="text-[11px] text-slate-500">
                    {chan._count?.deliveryLogs || 0} posts sent
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. EDIT CHANNEL MODAL POPUP                                              */}
      {/* ========================================================================= */}
      {editingChannel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  <FileEdit className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Edit Channel / Group
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Update channel display name, chat identifier, or assigned bot
                  </p>
                </div>
              </div>

              <button
                onClick={() => setEditingChannel(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {editError && (
              <div className="mt-4 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 flex items-start gap-2.5 text-xs text-rose-800 dark:text-rose-200 shadow-sm animate-in fade-in duration-200">
                <AlertOctagon className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
                <div className="flex-1 leading-relaxed">
                  <span className="font-bold block text-rose-900 dark:text-rose-100 mb-0.5">Update Failed</span>
                  {editError}
                </div>
              </div>
            )}

            <form onSubmit={handleEditSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Channel Display Title *
                </label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="e.g. Official Announcements"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-xs placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Chat ID or @Username *
                </label>
                <input
                  type="text"
                  required
                  value={editChatId}
                  onChange={(e) => setEditChatId(e.target.value)}
                  placeholder="@your_channel or -100123456789"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-xs placeholder-slate-400 dark:placeholder-slate-500 font-mono focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Destination Type
                  </label>
                  <select
                    value={editType}
                    onChange={(e) => setEditType(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-blue-500"
                  >
                    <option value="channel">Channel</option>
                    <option value="supergroup">Supergroup</option>
                    <option value="group">Group</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Assigned Bot
                  </label>
                  <select
                    value={editBotId}
                    onChange={(e) => setEditBotId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-blue-500"
                  >
                    <option value="">Default Active Bot</option>
                    {bots.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} (@{b.username || "bot"})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingChannel(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md shadow-blue-600/20 disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSavingEdit ? "Saving Changes..." : "Save Changes"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. DELETION CONFIRMATION POPUP MODAL                                     */}
      {/* ========================================================================= */}
      <DeleteConfirmModal
        isOpen={Boolean(deletingChannel)}
        onClose={() => setDeletingChannel(null)}
        onConfirm={handleConfirmDelete}
        title="Disconnect Channel or Group?"
        itemName={deletingChannel?.title}
        itemType="Channel"
        confirmText="Disconnect Channel"
        isDeleting={isDeleting}
        details={[
          { label: "Destination", value: deletingChannel?.chatId },
          {
            label: "Type",
            value: deletingChannel?.type
              ? deletingChannel.type.charAt(0).toUpperCase() +
                deletingChannel.type.slice(1)
              : "Channel",
          },
          {
            label: "Subscribers",
            value: deletingChannel?.memberCount?.toLocaleString() || 0,
          },
        ]}
        warningText="Any upcoming scheduled posts currently assigned to this channel will no longer be broadcast to it."
      />

      {/* ========================================================================= */}
      {/* 3. CONNECT CHANNEL MODAL POPUP                                           */}
      {/* ========================================================================= */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  <Tv className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Connect Telegram Channel or Group
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Add bot as administrator to broadcast content
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowAddModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Step-by-step Setup Guide */}
            <div className="mt-4 p-4 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 text-xs text-blue-900 dark:text-slate-300 space-y-1.5">
              <span className="font-bold text-blue-700 dark:text-blue-300 flex items-center gap-1">
                <ShieldCheck className="w-4 h-4" />
                <span>Quick 3-Step Telegram Guide:</span>
              </span>
              <p>1. Open your Telegram Channel or Supergroup settings.</p>
              <p>2. Tap <b>Administrators</b> &rarr; <b>Add Admin</b>, search for your Bot.</p>
              <p>3. Grant <b>Post Messages</b> (or Manage Messages) permission.</p>
            </div>

            {addError && (
              <div className="mt-4 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 flex items-start gap-2.5 text-xs text-rose-800 dark:text-rose-200 shadow-sm animate-in fade-in duration-200">
                <AlertOctagon className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
                <div className="flex-1 leading-relaxed">
                  <span className="font-bold block text-rose-900 dark:text-rose-100 mb-0.5">Connection Failed</span>
                  {addError}
                </div>
              </div>
            )}

            <form onSubmit={handleAddSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Channel @Username or Chat ID *
                </label>
                <input
                  type="text"
                  required
                  value={chatId}
                  onChange={(e) => setChatId(e.target.value)}
                  placeholder="@your_channel_name or -100123456789"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-xs placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  For public channels, enter `@channelname`. For private channels/groups, enter the numeric Chat ID starting with `-100`.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Custom Display Name (Optional)
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Official Announcements"
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-xs placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              {bots.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Assign Bot
                  </label>
                  <select
                    value={selectedBotId}
                    onChange={(e) => setSelectedBotId(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-xs"
                  >
                    <option value="">Default Active Bot</option>
                    {bots.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} (@{b.username || "bot"})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md shadow-blue-600/20 disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSubmitting ? "Verifying..." : "Verify & Connect"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
