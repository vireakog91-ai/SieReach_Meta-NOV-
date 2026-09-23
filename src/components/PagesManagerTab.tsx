"use client";

import React, { useState, useEffect } from "react";
import {
  Layers,
  CheckCircle2,
  Plus,
  Trash2,
  Key,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  Clock,
  Users,
  Sparkles,
  Check,
  AlertCircle,
  Zap,
} from "lucide-react";
import { DeleteConfirmModal } from "./common/DeleteConfirmModal";

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

interface PagesManagerTabProps {
  pages: PageItem[];
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
  onAddPage: (page: {
    pageId: string;
    name: string;
    category: string;
    businessName?: string;
    accessToken: string;
    avatarUrl?: string;
  }) => Promise<void>;
  onTogglePageActive: (pageId: string, isActive: boolean) => Promise<void>;
  onDeletePage: (pageId: string) => Promise<void>;
  onSyncProfile?: (pageId: string) => Promise<void>;
  onTriggerBlastForPage?: (pageId: string) => Promise<void>;
  isMockMode: boolean;
}

export function PagesManagerTab({
  pages,
  campaigns = [],
  portfolios = [],
  activeBusiness = "ALL",
  onSelectBusiness,
  onOpenCreatePortfolio,
  onAddPage,
  onTogglePageActive,
  onDeletePage,
  onSyncProfile,
  onTriggerBlastForPage,
  isMockMode,
}: PagesManagerTabProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [newPageId, setNewPageId] = useState("");
  const [newName, setNewName] = useState("");
  const [newCategory, setNewCategory] = useState("Business Page");
  const [newBusinessName, setNewBusinessName] = useState<string>(
    activeBusiness !== "ALL" ? activeBusiness : portfolios[0]?.name || "SieLab Retail Group"
  );
  const [newToken, setNewToken] = useState("");
  const [newAvatar, setNewAvatar] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFetchingProfile, setIsFetchingProfile] = useState(false);
  const [fetchedProfile, setFetchedProfile] = useState<{
    id: string;
    name: string;
    category?: string;
    avatarUrl?: string;
  } | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [syncingPageId, setSyncingPageId] = useState<string | null>(null);
  const [triggeringPageId, setTriggeringPageId] = useState<string | null>(null);
  const [pageToDelete, setPageToDelete] = useState<PageItem | null>(null);
  const [isDeletingPage, setIsDeletingPage] = useState(false);

  const handleTriggerPageBlast = async (pageId: string) => {
    if (!onTriggerBlastForPage) return;
    setTriggeringPageId(pageId);
    try {
      await onTriggerBlastForPage(pageId);
    } finally {
      setTriggeringPageId(null);
    }
  };

  // Synchronize newBusinessName whenever portfolios load or modal opens
  useEffect(() => {
    if (portfolios && portfolios.length > 0) {
      if (activeBusiness && activeBusiness !== "ALL" && portfolios.some((p) => p.name === activeBusiness)) {
        setNewBusinessName(activeBusiness);
      } else if (!portfolios.some((p) => p.name === newBusinessName)) {
        setNewBusinessName(portfolios[0].name);
      }
    }
  }, [portfolios, activeBusiness, showAddModal]);

  const handleConfirmDeletePage = async () => {
    if (!pageToDelete) return;
    setIsDeletingPage(true);
    try {
      await onDeletePage(pageToDelete.pageId);
      setPageToDelete(null);
    } finally {
      setIsDeletingPage(false);
    }
  };

  const handleFetchProfile = async () => {
    if (!newPageId.trim() || !newToken.trim()) {
      setFetchError("Please enter both Page ID and Page Access Token first.");
      return;
    }
    setIsFetchingProfile(true);
    setFetchError(null);
    try {
      const res = await fetch("/api/pages/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageId: newPageId.trim(), accessToken: newToken.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data.success || !data.profile) {
        throw new Error(data.error || "Could not fetch profile from Meta Graph API.");
      }
      setFetchedProfile(data.profile);
      if (data.profile.name) setNewName(data.profile.name);
      if (data.profile.category) setNewCategory(data.profile.category);
      if (data.profile.avatarUrl) setNewAvatar(data.profile.avatarUrl);
    } catch (err: any) {
      console.error("Fetch profile error:", err);
      setFetchError(err.message || "Failed to fetch profile from Meta.");
    } finally {
      setIsFetchingProfile(false);
    }
  };

  const handleCardSyncProfile = async (pageId: string) => {
    if (!onSyncProfile) return;
    setSyncingPageId(pageId);
    try {
      await onSyncProfile(pageId);
    } finally {
      setSyncingPageId(null);
    }
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPageId || (!newName && !fetchedProfile?.name)) return;
    setIsSubmitting(true);
    try {
      await onAddPage({
        pageId: newPageId.trim(),
        name: newName || fetchedProfile?.name || `Facebook Page (${newPageId.slice(-4)})`,
        category: newCategory || fetchedProfile?.category || "Business Page",
        businessName: newBusinessName || (activeBusiness !== "ALL" ? activeBusiness : "SieLab Retail Group"),
        accessToken: newToken || (isMockMode ? `EAAB_mock_${newPageId}` : ""),
        avatarUrl:
          newAvatar ||
          fetchedProfile?.avatarUrl ||
          "https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=150&auto=format&fit=crop&q=80",
      });
      setShowAddModal(false);
      setNewPageId("");
      setNewName("");
      setNewCategory("Business Page");
      setNewToken("");
      setNewAvatar("");
      setFetchedProfile(null);
      setFetchError(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Add Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center space-x-2">
              <Layers className="w-5 h-5 text-blue-500 dark:text-blue-400" />
              <span>Connected Facebook Business Pages ({pages.length})</span>
            </h2>
            {activeBusiness && activeBusiness !== "ALL" && (
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-500/30">
                {activeBusiness}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {activeBusiness && activeBusiness !== "ALL"
              ? `Connected Facebook storefronts managed under ${activeBusiness}.`
              : "Monitor and automate sales follow-up across all of your connected business storefronts."}
          </p>
        </div>

        <button
          onClick={() => {
            if (activeBusiness && activeBusiness !== "ALL") {
              setNewBusinessName(activeBusiness);
            }
            setShowAddModal(true);
          }}
          className="inline-flex items-center space-x-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-4 py-2 rounded-xl transition shadow-md shadow-blue-600/30 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Connect New Page</span>
        </button>
      </div>

      {/* Pages Grid */}
      {pages.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center shadow-xs">
          <Layers className="w-10 h-10 text-slate-400 dark:text-slate-600 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            No Pages Connected to {activeBusiness !== "ALL" ? activeBusiness : "this Portfolio"}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
            Connect a Facebook Page to start monitoring incoming leads and automated follow-ups.
          </p>
          <button
            type="button"
            onClick={() => {
              if (activeBusiness && activeBusiness !== "ALL") {
                setNewBusinessName(activeBusiness);
              }
              setShowAddModal(true);
            }}
            className="mt-4 inline-flex items-center space-x-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-4 py-2 rounded-xl transition shadow-md shadow-blue-600/30 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Connect Page</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {pages.map((page) => {
            const matchedPortfolio = portfolios.find((p) => p.name === page.businessName);
          const businessLabel = page.businessName || "SieLab Retail Group";
          const businessIcon = matchedPortfolio?.icon || (businessLabel.includes("Moew") ? "☕" : "🏢");
          const isMoew = businessLabel.includes("Moew") || page.pageId === "fb_page_05";

          // Detect active auto-blast campaign governing this page
          const activeBotCampaign = campaigns.find(
            (c) =>
              c.isActive &&
              c.autoBlast &&
              (!c.pageId || c.pageId === page.pageId) &&
              (!c.businessName || c.businessName === businessLabel)
          );

          return (
            <div
              key={page.pageId}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 flex flex-col justify-between hover:border-blue-400 dark:hover:border-slate-700 transition relative overflow-hidden shadow-xs dark:shadow-sm"
            >
              <div>
                {/* Header: Avatar, Name & Status */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <img
                      src={
                        page.avatarUrl ||
                        "https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=150&auto=format&fit=crop&q=80"
                      }
                      alt={page.name}
                      className="w-12 h-12 rounded-xl object-cover ring-1 ring-slate-200 dark:ring-slate-700 shadow-sm"
                    />
                    <div>
                      <div className="flex items-center space-x-1.5 mb-1">
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded font-semibold border ${
                            isMoew
                              ? "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800/60"
                              : "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800/60"
                          }`}
                        >
                          {businessIcon} {businessLabel}
                        </span>
                      </div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">{page.name}</h3>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400">{page.category}</span>
                    </div>
                  </div>

                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    page.isActive
                      ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30"
                      : "bg-slate-100 text-slate-500 border-slate-300 dark:bg-slate-800 dark:text-slate-500 dark:border-slate-700"
                  }`}
                >
                  {page.isActive ? "Active" : "Paused"}
                </span>
              </div>

              {/* Meta Page ID & Token status */}
              <div className="space-y-1.5 bg-slate-50 dark:bg-slate-950/60 rounded-xl p-3 border border-slate-200 dark:border-slate-800/80 text-xs">
                <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                  <span className="text-[11px]">Page ID:</span>
                  <span className="font-mono text-[11px] text-slate-700 dark:text-slate-300">{page.pageId}</span>
                </div>
                <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                  <span className="text-[11px]">Token Health:</span>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center space-x-1">
                    <ShieldCheck className="w-3 h-3" />
                    <span>{isMockMode ? "Sandbox Verified" : "Live Connected"}</span>
                  </span>
                </div>
              </div>

              {/* Lead statistics */}
              <div className="grid grid-cols-2 gap-2 mt-3 text-center">
                <div className="bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/60 rounded-xl p-2">
                  <div className="text-base font-bold text-slate-900 dark:text-white">
                    {page._count?.leads ?? 0}
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">Total Leads</div>
                </div>

                <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-500/20 rounded-xl p-2">
                  <div className="text-base font-bold text-amber-600 dark:text-amber-300">
                    {page.awaitingCount ?? 0}
                  </div>
                  <div className="text-[10px] text-amber-700 dark:text-amber-400/90 font-medium">Awaiting Reply</div>
                </div>
              </div>

              {/* Active Bot Status & Trigger Action */}
              <div className="mt-3 p-2.5 rounded-xl border bg-slate-50/80 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800/90 flex items-center justify-between text-xs">
                <div className="flex items-center space-x-2 min-w-0 pr-2">
                  {activeBotCampaign ? (
                    <>
                      <span className="relative flex h-2 w-2 shrink-0">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                      </span>
                      <div className="min-w-0">
                        <span className="text-[9px] uppercase tracking-wider text-emerald-600 dark:text-emerald-400 font-bold block leading-none mb-0.5">
                          Active Bot Campaign
                        </span>
                        <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate block">
                          {activeBotCampaign.name}
                        </span>
                      </div>
                    </>
                  ) : (
                    <>
                      <span className="inline-flex rounded-full h-2 w-2 bg-slate-400 dark:bg-slate-600 shrink-0"></span>
                      <div className="min-w-0">
                        <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold block leading-none mb-0.5">
                          Bot Status
                        </span>
                        <span className="text-xs text-slate-500 dark:text-slate-400 block truncate">
                          No Active Bot
                        </span>
                      </div>
                    </>
                  )}
                </div>

                {onTriggerBlastForPage && activeBotCampaign && (
                  <button
                    onClick={() => handleTriggerPageBlast(page.pageId)}
                    disabled={triggeringPageId === page.pageId}
                    className="shrink-0 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold transition flex items-center space-x-1 shadow-xs cursor-pointer disabled:opacity-50"
                    title={`Immediately execute ${activeBotCampaign.name} blast check for this page`}
                  >
                    <Zap className={`w-3 h-3 ${triggeringPageId === page.pageId ? "animate-spin" : ""}`} />
                    <span>{triggeringPageId === page.pageId ? "Triggering..." : "Trigger Blast"}</span>
                  </button>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="pt-4 mt-4 border-t border-slate-200 dark:border-slate-800/80 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => onTogglePageActive(page.pageId, !page.isActive)}
                  className="text-xs text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white transition font-medium"
                >
                  {page.isActive ? "Pause Monitoring" : "Resume Monitoring"}
                </button>

                {onSyncProfile && (
                  <button
                    onClick={() => handleCardSyncProfile(page.pageId)}
                    disabled={syncingPageId === page.pageId}
                    className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition font-medium flex items-center space-x-1 disabled:opacity-50"
                    title="Sync latest profile & picture from Meta"
                  >
                    <RefreshCw className={`w-3 h-3 ${syncingPageId === page.pageId ? "animate-spin" : ""}`} />
                    <span>{syncingPageId === page.pageId ? "Syncing..." : "Sync Profile"}</span>
                  </button>
                )}
              </div>

              <button
                onClick={() => setPageToDelete(page)}
                className="text-slate-400 hover:text-red-500 dark:text-slate-500 dark:hover:text-red-400 p-1 rounded transition"
                title="Disconnect Page"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        );
      })}
      </div>
      )}

      {/* Add Page Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                  <span>Connect Facebook Page</span>
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Enter your Page ID and Token to automatically fetch your page profile.
                </p>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white text-xs"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Facebook Page ID</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 1264018876795756"
                  value={newPageId}
                  onChange={(e) => {
                    setNewPageId(e.target.value);
                    setFetchedProfile(null);
                    setFetchError(null);
                  }}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 font-mono text-xs transition"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Page Access Token</label>
                <input
                  type="password"
                  placeholder={isMockMode ? "Leave blank for auto sandbox token" : "EAAB..."}
                  value={newToken}
                  onChange={(e) => {
                    setNewToken(e.target.value);
                    setFetchedProfile(null);
                    setFetchError(null);
                  }}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 font-mono text-xs transition"
                />
              </div>

              {/* Fetch Profile Button */}
              {newPageId && (newToken || isMockMode) && (
                <div>
                  <button
                    type="button"
                    onClick={handleFetchProfile}
                    disabled={isFetchingProfile}
                    className="w-full py-2 px-3 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 dark:bg-blue-600/15 dark:hover:bg-blue-600/25 dark:text-blue-400 dark:border-blue-500/30 flex items-center justify-center space-x-2 font-semibold transition text-xs disabled:opacity-50"
                  >
                    {isFetchingProfile ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Connecting & Fetching Meta Profile...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Fetch & Verify Page Profile from Meta</span>
                      </>
                    )}
                  </button>
                  {fetchError && (
                    <div className="mt-1.5 text-[11px] text-red-600 dark:text-red-400 flex items-center space-x-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{fetchError}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Profile Preview Card when Fetched */}
              {fetchedProfile && (
                <div className="bg-emerald-50/70 dark:bg-slate-950 border border-emerald-300 dark:border-emerald-500/40 rounded-xl p-3 flex items-center space-x-3 shadow-xs">
                  {fetchedProfile.avatarUrl ? (
                    <img
                      src={fetchedProfile.avatarUrl}
                      alt={fetchedProfile.name}
                      className="w-12 h-12 rounded-xl object-cover ring-2 ring-emerald-500/50 shadow-sm shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center font-bold text-white text-lg shrink-0">
                      {fetchedProfile.name ? fetchedProfile.name[0] : "P"}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-1.5">
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">{fetchedProfile.name}</h4>
                      <span className="text-[10px] bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 font-bold px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-500/30 shrink-0">
                        Meta Verified ✓
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 truncate">{fetchedProfile.category || "Business Page"}</p>
                    <p className="text-[10px] text-slate-500 font-mono mt-0.5">ID: {fetchedProfile.id}</p>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                  Page Name {fetchedProfile && <span className="text-emerald-600 dark:text-emerald-400 font-normal">(Auto-fetched)</span>}
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. SieLab Outdoor & Camping"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 text-xs transition"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                  Category {fetchedProfile && <span className="text-emerald-600 dark:text-emerald-400 font-normal">(Auto-fetched)</span>}
                </label>
                <input
                  type="text"
                  placeholder="e.g. Sporting Goods / Retail"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 text-xs transition"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                  Assign to Business Portfolio
                </label>
                <select
                  value={newBusinessName}
                  onChange={(e) => setNewBusinessName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 text-xs transition"
                >
                  {portfolios && portfolios.length > 0 ? (
                    portfolios.map((p) => (
                      <option key={p.id} value={p.name} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                        {p.icon || "🏢"} {p.name}
                      </option>
                    ))
                  ) : (
                    <>
                      <option value="SieLab Retail Group" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">🏢 SieLab Retail Group</option>
                      <option value="Moew Hospitality" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">☕ Moew Hospitality</option>
                    </>
                  )}
                </select>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                  Ensures all leads, campaigns, and metrics for this page are isolated to this business portfolio.
                </p>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-blue-600 hover:bg-blue-500 text-white font-semibold px-4 py-1.5 rounded-xl transition shadow-md shadow-blue-600/30"
                >
                  {isSubmitting ? "Connecting..." : "Connect Page"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Global Delete Confirmation Popup Card */}
      <DeleteConfirmModal
        isOpen={Boolean(pageToDelete)}
        onClose={() => setPageToDelete(null)}
        onConfirm={handleConfirmDeletePage}
        title="Disconnect Facebook Page?"
        itemName={pageToDelete?.name || "Facebook Page"}
        itemType="Facebook Page"
        isDeleting={isDeletingPage}
        details={[
          { label: "Page ID", value: pageToDelete?.pageId || "N/A" },
          { label: "Category", value: pageToDelete?.category || "Business Page" },
          { label: "Status", value: pageToDelete?.isActive ? "Active" : "Inactive" },
        ]}
        warningText="Disconnecting this Facebook Page will stop automated messenger blasts and comment tracking associated with it."
      />
    </div>
  );
}
