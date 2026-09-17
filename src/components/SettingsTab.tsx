"use client";

import React, { useState, useEffect } from "react";
import {
  Settings,
  Shield,
  Key,
  Webhook,
  Copy,
  CheckCircle2,
  Save,
  Sparkles,
  ExternalLink,
  Sun,
  Moon,
} from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";

interface SettingsTabProps {
  isMockMode: boolean;
  onToggleMockMode: () => void;
}

export function SettingsTab({ isMockMode, onToggleMockMode }: SettingsTabProps) {
  const { theme, setTheme } = useTheme();
  const [appId, setAppId] = useState("");
  const [appSecret, setAppSecret] = useState("");
  const [verifyToken, setVerifyToken] = useState("sielab_reach_verify_token_2026");
  const [copied, setCopied] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => {
        if (data.settings) {
          setAppId(data.settings.META_APP_ID || "");
          setAppSecret(data.settings.META_APP_SECRET || "");
          setVerifyToken(data.settings.WEBHOOK_VERIFY_TOKEN || "sielab_reach_verify_token_2026");
        }
      })
      .catch((err) => console.error(err));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          META_APP_ID: appId,
          META_APP_SECRET: appSecret,
          WEBHOOK_VERIFY_TOKEN: verifyToken,
        }),
      });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const webhookCallbackUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/api/webhooks/facebook`
      : "https://your-domain.com/api/webhooks/facebook";

  const handleCopyWebhook = () => {
    navigator.clipboard.writeText(webhookCallbackUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-white flex items-center space-x-2">
          <Settings className="w-5 h-5 text-blue-400" />
          <span>Meta Graph API & Platform Configuration</span>
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Configure connection settings, Facebook Developer App credentials, and webhook endpoints for SieReach.
        </p>
      </div>

      {/* Appearance & Theme Preference */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              {theme === "dark" ? <Moon className="w-5 h-5 text-indigo-400" /> : <Sun className="w-5 h-5 text-amber-400" />}
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Interface Theme</h3>
              <p className="text-xs text-slate-400">
                Choose between high-contrast dark mode and clean daylight light theme.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setTheme("dark")}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                theme === "dark"
                  ? "bg-slate-800 text-white shadow-sm border border-slate-700"
                  : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
              }`}
            >
              <Moon className="w-3.5 h-3.5 text-indigo-400" />
              <span>Dark Theme</span>
            </button>
            <button
              type="button"
              onClick={() => setTheme("light")}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                theme === "light"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
              }`}
            >
              <Sun className="w-3.5 h-3.5 text-amber-400" />
              <span>Light Theme</span>
            </button>
          </div>
        </div>
      </div>

      {/* Mode Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Execution Mode</h3>
              <p className="text-xs text-slate-400">
                Switch between offline Sandbox simulation and Live Facebook Graph API.
              </p>
            </div>
          </div>

          <button
            onClick={onToggleMockMode}
            className={`px-4 py-2 rounded-xl text-xs font-bold border transition ${
              isMockMode
                ? "bg-emerald-950/60 border-emerald-500/40 text-emerald-400 hover:bg-emerald-900/60"
                : "bg-amber-950/60 border-amber-500/40 text-amber-400 hover:bg-amber-900/60"
            }`}
          >
            {isMockMode ? "Active: Sandbox Simulator" : "Active: Live Meta Graph API"}
          </button>
        </div>

        <p className="text-xs text-slate-400 bg-slate-950/50 p-3 rounded-xl border border-slate-800/80 leading-relaxed">
          <strong>Sandbox Mode:</strong> Enables safe simulation of Messenger messages, scans, and blasts without needing approved Facebook App permissions or live tokens. Perfect for demos, onboarding, and testing templates.
        </p>
      </div>

      {/* Meta Webhooks Helper */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex items-center space-x-2 text-sm font-semibold text-white">
          <Webhook className="w-4 h-4 text-purple-400" />
          <span>Facebook Messenger Webhook Details</span>
        </div>

        <p className="text-xs text-slate-400">
          In your Meta Developer App (Messenger &gt; Webhooks), configure this Callback URL and Verify Token to receive real-time inbound messages.
        </p>

        <div className="space-y-3 text-xs">
          <div>
            <label className="block text-slate-400 font-semibold mb-1">Callback URL</label>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                readOnly
                value={webhookCallbackUrl}
                className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-800 dark:text-slate-300 font-mono text-xs select-all"
              />
              <button
                onClick={handleCopyWebhook}
                className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 transition flex items-center space-x-1"
              >
                {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-500 dark:text-emerald-400" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? "Copied" : "Copy"}</span>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">Verify Token</label>
            <input
              type="text"
              value={verifyToken}
              onChange={(e) => setVerifyToken(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-900 dark:text-white font-mono text-xs focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Live App Credentials */}
      <form onSubmit={handleSave} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4 text-xs">
        <div className="flex items-center space-x-2 text-sm font-semibold text-white">
          <Key className="w-4 h-4 text-amber-500 dark:text-amber-400" />
          <span>Meta Developer App Credentials</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">App ID</label>
            <input
              type="text"
              placeholder="e.g. 1092837465019"
              value={appId}
              onChange={(e) => setAppId(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-900 dark:text-white font-mono text-xs focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">App Secret</label>
            <input
              type="password"
              placeholder="••••••••••••••••"
              value={appSecret}
              onChange={(e) => setAppSecret(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-900 dark:text-white font-mono text-xs focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-slate-800">
          {savedSuccess ? (
            <span className="text-emerald-400 text-xs flex items-center space-x-1">
              <CheckCircle2 className="w-4 h-4" />
              <span>Settings saved successfully!</span>
            </span>
          ) : (
            <span className="text-slate-500 text-xs">Credentials are stored locally in SQLite</span>
          )}

          <button
            type="submit"
            disabled={isSaving}
            className="bg-blue-600 hover:bg-blue-500 text-white font-semibold px-4 py-2 rounded-xl transition shadow-md shadow-blue-600/30 flex items-center space-x-1.5"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSaving ? "Saving..." : "Save Settings"}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
