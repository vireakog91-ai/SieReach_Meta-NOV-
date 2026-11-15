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
  Layers,
  Sliders,
  Bot,
  Eye,
  EyeOff,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";
import { PagesManagerTab } from "./PagesManagerTab";

interface PageItem {
  id: string;
  pageId: string;
  name: string;
  category: string;
  businessName?: string;
  avatarUrl?: string | null;
  accessToken: string;
  isActive: boolean;
  awaitingCount?: number;
  followedUpCount?: number;
  _count?: {
    leads: number;
    campaigns: number;
    logs: number;
  };
}

interface SettingsTabProps {
  isMockMode: boolean;
  onToggleMockMode: () => void;
  // Facebook Pages & Portfolios Integration
  pages?: PageItem[];
  campaigns?: Array<{
    id: string;
    name: string;
    businessName?: string;
    pageId?: string | null;
    isActive: boolean;
    autoBlast: boolean;
    inactiveHoursThreshold: number;
  }>;
  portfolios?: Array<{ id: string; name: string; icon?: string; industry?: string; description?: string }>;
  activeBusiness?: string;
  onSelectBusiness?: (businessName: string) => void;
  onOpenCreatePortfolio?: () => void;
  onAddPage?: (page: {
    pageId: string;
    name: string;
    category: string;
    businessName?: string;
    accessToken: string;
    avatarUrl?: string;
  }) => Promise<void>;
  onTogglePageActive?: (pageId: string, isActive: boolean) => Promise<void>;
  onDeletePage?: (pageId: string) => Promise<void>;
  onSyncProfile?: (pageId: string) => Promise<void>;
  onTriggerBlastForPage?: (pageId: string) => Promise<void>;
  activeSubTab?: "pages" | "api" | "preferences";
  onSubTabChange?: (subTab: "pages" | "api" | "preferences") => void;
}

export function SettingsTab({
  isMockMode,
  onToggleMockMode,
  pages = [],
  campaigns = [],
  portfolios = [],
  activeBusiness = "ALL",
  onSelectBusiness,
  onOpenCreatePortfolio,
  onAddPage = async () => {},
  onTogglePageActive = async () => {},
  onDeletePage = async () => {},
  onSyncProfile,
  onTriggerBlastForPage,
  activeSubTab = "pages",
  onSubTabChange,
}: SettingsTabProps) {
  const { theme, setTheme } = useTheme();
  const [subTab, setSubTab] = useState<"pages" | "api" | "preferences">(activeSubTab);
  const [appId, setAppId] = useState("");
  const [appSecret, setAppSecret] = useState("");
  const [verifyToken, setVerifyToken] = useState("sielab_reach_verify_token_2026");
  const [geminiApiKey, setGeminiApiKey] = useState("");
  const [hasGeminiKey, setHasGeminiKey] = useState(false);
  const [showGeminiKey, setShowGeminiKey] = useState(false);
  const [isTestingGemini, setIsTestingGemini] = useState(false);
  const [geminiTestResult, setGeminiTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const [copied, setCopied] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (activeSubTab) {
      setSubTab(activeSubTab);
    }
  }, [activeSubTab]);

  useEffect(() => {
    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => {
        if (data.settings) {
          setAppId(data.settings.META_APP_ID || "");
          setAppSecret(data.settings.META_APP_SECRET || "");
          setVerifyToken(data.settings.WEBHOOK_VERIFY_TOKEN || "sielab_reach_verify_token_2026");
          if (data.settings.GEMINI_API_KEY) {
            setGeminiApiKey(data.settings.GEMINI_API_KEY);
          }
          if (data.settings.HAS_GEMINI_KEY !== undefined) {
            setHasGeminiKey(Boolean(data.settings.HAS_GEMINI_KEY));
          }
        }
      })
      .catch((err) => console.error(err));
  }, []);

  const handleSubTabChange = (nextSub: "pages" | "api" | "preferences") => {
    setSubTab(nextSub);
    onSubTabChange?.(nextSub);
  };

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
          GEMINI_API_KEY: geminiApiKey,
        }),
      });
      if (geminiApiKey && !geminiApiKey.includes("••")) {
        setHasGeminiKey(true);
      }
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestGemini = async () => {
    setIsTestingGemini(true);
    setGeminiTestResult(null);
    try {
      const res = await fetch("/api/settings/test-gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: geminiApiKey }),
      });
      const data = await res.json();
      if (data.success) {
        setGeminiTestResult({
          success: true,
          message: data.message || "Connected successfully to Gemini Flash!",
        });
        setHasGeminiKey(true);
      } else {
        setGeminiTestResult({
          success: false,
          message: data.error || "Failed to verify Gemini API key.",
        });
      }
    } catch (err: any) {
      setGeminiTestResult({
        success: false,
        message: err.message || "Network error while reaching Gemini API.",
      });
    } finally {
      setIsTestingGemini(false);
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
    <div className="space-y-6">
      {/* Settings Sub-Navigation Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center space-x-2">
            <Settings className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <span>Settings & Platform Administration</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Manage connected Facebook Business Pages, AI Strategic Advisor credentials, and workspace preferences.
          </p>
        </div>

        {/* Sub-Tab Switcher Dock */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-900/90 rounded-2xl border border-slate-200 dark:border-slate-800 shrink-0 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => handleSubTabChange("pages")}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              subTab === "pages"
                ? "bg-blue-600 text-white shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
          >
            <Layers className="w-3.5 h-3.5 shrink-0" />
            <span>Facebook Pages</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ml-0.5 ${
                subTab === "pages"
                  ? "bg-white/20 text-white"
                  : "bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
              }`}
            >
              {pages.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleSubTabChange("api")}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              subTab === "api"
                ? "bg-blue-600 text-white shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
          >
            <Key className="w-3.5 h-3.5 shrink-0" />
            <span>API & Intelligence</span>
          </button>

          <button
            type="button"
            onClick={() => handleSubTabChange("preferences")}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              subTab === "preferences"
                ? "bg-blue-600 text-white shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
          >
            <Sliders className="w-3.5 h-3.5 shrink-0" />
            <span>Environment & Theme</span>
          </button>
        </div>
      </div>

      {/* Sub-Tab 1: Facebook Pages Management */}
      {subTab === "pages" && (
        <PagesManagerTab
          pages={pages}
          campaigns={campaigns}
          portfolios={portfolios}
          activeBusiness={activeBusiness}
          onSelectBusiness={onSelectBusiness}
          onOpenCreatePortfolio={onOpenCreatePortfolio}
          onAddPage={onAddPage}
          onTogglePageActive={onTogglePageActive}
          onDeletePage={onDeletePage}
          onSyncProfile={onSyncProfile}
          onTriggerBlastForPage={onTriggerBlastForPage}
          isMockMode={isMockMode}
        />
      )}

      {/* Sub-Tab 2: Meta API, AI Credentials & Webhooks */}
      {subTab === "api" && (
        <div className="max-w-4xl space-y-6 animate-in fade-in-50 duration-200">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2">
              <Key className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>Meta Graph API & AI Strategic Advisor Configuration</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Configure credentials for Meta Messenger, live webhooks, and the free Google Gemini Flash sales advisor.
            </p>
          </div>

          {/* AI Intelligence & Google Gemini API Card */}
          <div className="bg-gradient-to-br from-emerald-500/5 via-teal-500/5 to-transparent border border-emerald-500/20 dark:border-emerald-500/30 rounded-2xl p-5 shadow-xs dark:shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-sm">
                  <Bot className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                    <span>Google Gemini 2.0 Flash AI Advisor</span>
                    {hasGeminiKey ? (
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-600">
                        Active & Connected
                      </span>
                    ) : (
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                        Optional (Free Tier)
                      </span>
                    )}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Powers the Central Hub's executive strategy recommendations, objection clustering, and custom sales copy.
                  </p>
                </div>
              </div>

              <a
                href="https://aistudio.google.com/"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 transition shrink-0 self-start sm:self-auto"
              >
                <span>Get Free Key (Google AI Studio)</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <div className="space-y-3 pt-2">
              <div>
                <label className="block text-slate-700 dark:text-slate-400 text-xs font-semibold mb-1">
                  Gemini API Key
                </label>
                <div className="flex items-center space-x-2">
                  <div className="relative flex-1">
                    <input
                      type={showGeminiKey ? "text" : "password"}
                      placeholder="AIzaSy..."
                      value={geminiApiKey}
                      onChange={(e) => {
                        setGeminiApiKey(e.target.value);
                        setGeminiTestResult(null);
                      }}
                      className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-900 dark:text-white font-mono text-xs focus:outline-none focus:border-emerald-500 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowGeminiKey(!showGeminiKey)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      {showGeminiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={handleTestGemini}
                    disabled={isTestingGemini || (!geminiApiKey && !hasGeminiKey)}
                    className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold px-3 py-2 rounded-xl transition text-xs flex items-center space-x-1.5 shrink-0 cursor-pointer shadow-sm shadow-emerald-600/20"
                  >
                    {isTestingGemini ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5" />
                    )}
                    <span>{isTestingGemini ? "Testing..." : "Test Key"}</span>
                  </button>
                </div>
              </div>

              {geminiTestResult && (
                <div
                  className={`p-3 rounded-xl text-xs flex items-center space-x-2 border ${
                    geminiTestResult.success
                      ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700"
                      : "bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-700"
                  }`}
                >
                  {geminiTestResult.success ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
                  )}
                  <span>{geminiTestResult.message}</span>
                </div>
              )}
            </div>
          </div>

          {/* Meta Webhooks Helper */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs dark:shadow-sm space-y-4">
            <div className="flex items-center space-x-2 text-sm font-bold text-slate-900 dark:text-white">
              <Webhook className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              <span>Facebook Messenger Webhook Details</span>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              In your Meta Developer App (Messenger &gt; Webhooks), configure this Callback URL and Verify Token to receive real-time inbound customer messages.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 dark:text-slate-400 font-semibold mb-1">Callback URL</label>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    readOnly
                    value={webhookCallbackUrl}
                    className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-800 dark:text-slate-300 font-mono text-xs select-all"
                  />
                  <button
                    onClick={handleCopyWebhook}
                    className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 transition flex items-center space-x-1 cursor-pointer"
                  >
                    {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-500 dark:text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    <span>{copied ? "Copied" : "Copy"}</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-400 font-semibold mb-1">Verify Token</label>
                <input
                  type="text"
                  value={verifyToken}
                  onChange={(e) => setVerifyToken(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-900 dark:text-white font-mono text-xs focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Live App Credentials Form */}
          <form onSubmit={handleSave} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs dark:shadow-sm space-y-4 text-xs">
            <div className="flex items-center space-x-2 text-sm font-bold text-slate-900 dark:text-white">
              <Key className="w-4 h-4 text-amber-500 dark:text-amber-400" />
              <span>Meta Developer App Credentials</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-700 dark:text-slate-400 font-semibold mb-1">App ID</label>
                <input
                  type="text"
                  placeholder="e.g. 1092837465019"
                  value={appId}
                  onChange={(e) => setAppId(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-900 dark:text-white font-mono text-xs focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-400 font-semibold mb-1">App Secret</label>
                <input
                  type="password"
                  placeholder="••••••••••••••••"
                  value={appSecret}
                  onChange={(e) => setAppSecret(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-900 dark:text-white font-mono text-xs focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-800">
              {savedSuccess ? (
                <span className="text-emerald-600 dark:text-emerald-400 text-xs flex items-center space-x-1 font-medium">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Settings saved successfully!</span>
                </span>
              ) : (
                <span className="text-slate-500 text-xs">Credentials are securely stored locally in SQLite</span>
              )}

              <button
                type="submit"
                disabled={isSaving}
                className="bg-blue-600 hover:bg-blue-500 text-white font-semibold px-4 py-2 rounded-xl transition shadow-md shadow-blue-600/30 flex items-center space-x-1.5 cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isSaving ? "Saving..." : "Save All Settings"}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Sub-Tab 3: Environment & Theme */}
      {subTab === "preferences" && (
        <div className="max-w-4xl space-y-6 animate-in fade-in-50 duration-200">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2">
              <Sliders className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>Environment & Platform Preferences</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Customize interface display mode and toggle offline Sandbox testing vs live Graph API execution.
            </p>
          </div>

          {/* Appearance & Theme Preference */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs dark:shadow-sm space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 rounded-xl bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-500/20">
                  {theme === "dark" ? <Moon className="w-5 h-5 text-indigo-400" /> : <Sun className="w-5 h-5 text-amber-500" />}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">Interface Theme</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Choose between clean daylight light theme and high-contrast dark mode.
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2 bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setTheme("dark")}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
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
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
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
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs dark:shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">Execution Mode</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Switch between offline Sandbox simulation and Live Facebook Graph API.
                  </p>
                </div>
              </div>

              <button
                onClick={onToggleMockMode}
                className={`px-4 py-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
                  isMockMode
                    ? "bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:border-emerald-500/40 dark:text-emerald-400 dark:hover:bg-emerald-900/60"
                    : "bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100 dark:bg-amber-950/60 dark:border-amber-500/40 dark:text-amber-400 dark:hover:bg-amber-900/60"
                }`}
              >
                {isMockMode ? "Active: Sandbox Simulator" : "Active: Live Meta Graph API"}
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-950/50 p-3 rounded-xl border border-slate-200 dark:border-slate-800/80 leading-relaxed">
              <strong>Sandbox Mode:</strong> Enables safe simulation of Messenger messages, scans, and blasts without needing approved Facebook App permissions or live tokens. Perfect for demos, onboarding, and testing templates.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
