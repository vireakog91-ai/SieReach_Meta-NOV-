"use client";

import React, { useState } from "react";
import {
  Settings as SettingsIcon,
  Bot,
  Plus,
  ShieldCheck,
  Globe,
  Database,
  CheckCircle2,
  Trash2,
  RefreshCw,
  Sparkles,
  Radio,
  ExternalLink,
  AlertOctagon,
} from "lucide-react";
import { DeleteConfirmModal } from "@/components/common/DeleteConfirmModal";

interface SettingsTabProps {
  bots: any[];
  settings: Record<string, string>;
  onAddBot: (token: string, name?: string) => Promise<void>;
  onDeleteBot: (id: string) => Promise<void>;
  onUpdateSetting: (key: string, value: string) => Promise<void>;
  onSeedData: () => Promise<void>;
  isSeeding: boolean;
}

export function SettingsTab({
  bots,
  settings,
  onAddBot,
  onDeleteBot,
  onUpdateSetting,
  onSeedData,
  isSeeding,
}: SettingsTabProps) {
  const [newBotToken, setNewBotToken] = useState("");
  const [newBotName, setNewBotName] = useState("");
  const [isAddingBot, setIsAddingBot] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [botError, setBotError] = useState<string | null>(null);
  const [botToDelete, setBotToDelete] = useState<any | null>(null);
  const [isDeletingBot, setIsDeletingBot] = useState(false);

  const handleConfirmDeleteBot = async () => {
    if (!botToDelete) return;
    setIsDeletingBot(true);
    try {
      await onDeleteBot(botToDelete.id);
      setBotToDelete(null);
    } finally {
      setIsDeletingBot(false);
    }
  };

  const isSandbox = settings["sandbox_mode"] === "true";
  const timezone = settings["timezone"] || "Asia/Phnom_Penh";

  const handleAddBot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBotToken.trim()) return;

    setIsAddingBot(true);
    setBotError(null);
    try {
      await onAddBot(newBotToken.trim(), newBotName.trim() || undefined);
      setNewBotToken("");
      setNewBotName("");
      setBotError(null);
      setSaveStatus("Bot connected and verified successfully!");
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (err: any) {
      setBotError(err.message || "Failed to add bot. Please check your token from @BotFather.");
    } finally {
      setIsAddingBot(false);
    }
  };

  const handleToggleSandbox = async () => {
    const nextVal = isSandbox ? "false" : "true";
    await onUpdateSetting("sandbox_mode", nextVal);
  };

  const handleTimezoneChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    await onUpdateSetting("timezone", e.target.value);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Settings Header */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <SettingsIcon className="w-5 h-5 text-blue-500 dark:text-blue-400" />
            <span>Platform Settings & Bot Credentials</span>
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            Configure Telegram Bot API tokens, delivery modes, and scheduler preferences.
          </p>
        </div>

        {saveStatus && (
          <span className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold flex items-center gap-1 bg-emerald-50 dark:bg-emerald-500/10 px-3 py-1 rounded-xl border border-emerald-200 dark:border-emerald-500/20">
            <CheckCircle2 className="w-4 h-4" />
            <span>{saveStatus}</span>
          </span>
        )}
      </div>

      {/* 1. Bot Credentials Section */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Bot className="w-4 h-4 text-blue-500 dark:text-blue-400" />
              <span>Connected Telegram Bots ({bots.length})</span>
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
              Obtain your Bot Token from Telegram&apos;s official{" "}
              <a
                href="https://t.me/BotFather"
                target="_blank"
                rel="noreferrer"
                className="text-sky-600 dark:text-sky-400 hover:underline inline-flex items-center gap-0.5"
              >
                @BotFather
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
              .
            </p>
          </div>
        </div>

        {/* Existing Bots List */}
        <div className="space-y-3">
          {bots.map((bot) => (
            <div
              key={bot.id}
              className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/80"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-sm">
                  🤖
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <span>{bot.name}</span>
                    {bot.username && (
                      <span className="text-slate-500 dark:text-slate-400 font-normal">(@{bot.username})</span>
                    )}
                    <span className="px-2 py-0.2 rounded-full text-[10px] bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
                      Active
                    </span>
                  </div>
                  <div className="text-[11px] font-mono text-slate-500 mt-0.5">
                    Token: {bot.botToken.substring(0, 14)}••••••••••••••••••••••••
                  </div>
                </div>
              </div>

              <button
                onClick={() => setBotToDelete(bot)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title="Remove bot"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        {/* Add Bot Form */}
        <form onSubmit={handleAddBot} className="pt-4 border-t border-slate-200 dark:border-slate-800/80 space-y-3">
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
            Add New Telegram Bot
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              type="text"
              value={newBotName}
              onChange={(e) => setNewBotName(e.target.value)}
              placeholder="Friendly Bot Label (e.g. Sales Dispatcher)"
              className="px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-xs placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
            <input
              type="password"
              required
              value={newBotToken}
              onChange={(e) => setNewBotToken(e.target.value)}
              placeholder="Enter Bot Token (123456789:ABCdef...)"
              className="px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-xs placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono"
            />
          </div>

          {botError && (
            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 flex items-start gap-2.5 text-xs text-rose-800 dark:text-rose-200 shadow-sm animate-in fade-in duration-200">
              <AlertOctagon className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
              <div className="flex-1 leading-relaxed">
                <span className="font-bold block text-rose-900 dark:text-rose-100 mb-0.5">Verification Failed</span>
                {botError}
              </div>
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isAddingBot}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md shadow-blue-600/20 disabled:opacity-50"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isAddingBot ? "Verifying..." : "Verify & Connect Bot"}</span>
            </button>
          </div>
        </form>
      </div>

      {/* 2. Sandbox / Live Mode Switch */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-amber-500 dark:text-amber-400" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Sandbox Simulated Mode
            </h3>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                isSandbox
                  ? "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700"
              }`}
            >
              {isSandbox ? "ENABLED" : "DISABLED"}
            </span>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400 max-w-xl">
            When enabled, all scheduling and broadcasts run through an internal simulator. You can test complete workflows without sending live messages to real Telegram subscribers.
          </p>
        </div>

        <button
          type="button"
          onClick={handleToggleSandbox}
          className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-all ${
            isSandbox
              ? "bg-amber-50 dark:bg-amber-500/10 border-amber-300 dark:border-amber-500/40 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-500/20"
              : "bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 dark:hover:bg-slate-700"
          }`}
        >
          {isSandbox ? "Switch to Live API" : "Enable Sandbox"}
        </button>
      </div>

      {/* 3. Timezone Setting */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-sky-500 dark:text-sky-400" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Default Timezone</h3>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Posts are published according to this timezone.
          </p>
        </div>

        <select
          value={timezone}
          onChange={handleTimezoneChange}
          className="px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 shadow-sm"
        >
          <option value="Asia/Phnom_Penh">Asia/Phnom_Penh (GMT+7)</option>
          <option value="Asia/Bangkok">Asia/Bangkok (GMT+7)</option>
          <option value="Asia/Singapore">Asia/Singapore (GMT+8)</option>
          <option value="UTC">UTC (GMT+0)</option>
          <option value="America/New_York">America/New_York (EST)</option>
          <option value="Europe/London">Europe/London (GMT+1)</option>
        </select>
      </div>

      {/* 4. Showcase Demo Seeder */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-purple-500 dark:text-purple-400" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Showcase Demo Data</h3>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400 max-w-xl">
            Populate sample Telegram channels, scheduled posts, recurring campaigns, templates, and delivery logs to demo the full platform capabilities.
          </p>
        </div>

        <button
          onClick={onSeedData}
          disabled={isSeeding}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-md shadow-purple-600/20 disabled:opacity-50"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>{isSeeding ? "Seeding..." : "Load Demo Data"}</span>
        </button>
      </div>

      {/* Global Delete Confirmation Popup Card */}
      <DeleteConfirmModal
        isOpen={Boolean(botToDelete)}
        onClose={() => setBotToDelete(null)}
        onConfirm={handleConfirmDeleteBot}
        title="Remove Telegram Bot?"
        itemName={botToDelete?.name || "Telegram Bot"}
        itemType="Bot"
        isDeleting={isDeletingBot}
        details={[
          { label: "Bot Username", value: botToDelete?.username ? `@${botToDelete.username}` : "N/A" },
          {
            label: "Token Prefix",
            value: botToDelete?.botToken
              ? `${botToDelete.botToken.substring(0, 14)}••••••••`
              : "N/A",
          },
          {
            label: "Linked Channels",
            value: `${botToDelete?.channels?.length || 0} destinations`,
          },
        ]}
        warningText="Disconnecting this bot will prevent scheduled posts and broadcasts from delivering to all channels associated with it."
      />
    </div>
  );
}
