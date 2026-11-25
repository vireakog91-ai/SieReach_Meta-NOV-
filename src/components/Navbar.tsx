"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  MessageSquareShare,
  RefreshCw,
  Sparkles,
  ShieldAlert,
  ChevronDown,
  Check,
  Plus,
  LogOut,
  Layers,
  Radar,
  Radio,
  Send,
  Zap,
  Target,
} from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";
import { ThemeLayoutSwitcher } from "@/components/ThemeLayoutSwitcher";

interface NavbarProps {
  isMockMode: boolean;
  onToggleMockMode: () => void;
  onResetDemoData: () => void;
  isRefreshing: boolean;
  selectedPageId?: string;
  onSelectPageId?: (id: string) => void;
  pages?: Array<{ pageId: string; name: string; businessName?: string; pictureUrl?: string }>;
  portfolios?: Array<{ id: string; name: string; icon?: string; industry?: string }>;
  selectedBusiness?: string;
  onSelectBusiness?: (businessName: string) => void;
  onOpenCreatePortfolio?: () => void;
  onNavigateToPages?: () => void;
  onLockWorkspace?: () => void;
  toolCategory?: string;
  onSelectToolCategory?: (cat: string) => void;
}

export function Navbar({
  isMockMode,
  onToggleMockMode,
  onResetDemoData,
  isRefreshing,
  selectedPageId = "ALL",
  onSelectPageId = () => {},
  pages = [],
  portfolios = [],
  selectedBusiness = "ALL",
  onSelectBusiness = () => {},
  onOpenCreatePortfolio = () => {},
  onLockWorkspace,
  toolCategory = "hub",
  onSelectToolCategory = () => {},
}: NavbarProps) {
  const { theme, navLayout } = useTheme();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isPageDropdownOpen, setIsPageDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const pageDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
      if (pageDropdownRef.current && !pageDropdownRef.current.contains(event.target as Node)) {
        setIsPageDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const currentPortfolio = portfolios.find((p) => p.name === selectedBusiness);
  const scopedPages = selectedBusiness === "ALL"
    ? pages
    : pages.filter((p) => (p.businessName || "SieLab Retail Group") === selectedBusiness);
  const activePagesCount = scopedPages.length;
  const activePageObj = scopedPages.find((p) => p.pageId === selectedPageId);

  return (
    <header className="border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md sticky top-0 z-30 transition-colors">
      <div className={`${navLayout === "ultra-compact" ? "max-w-[1720px]" : "max-w-7xl"} mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3`}>
        {/* Left: Brand + Quick Page Filter (when 2-Row or Ultra-Compact) */}
        <div className="flex items-center space-x-3 shrink-0">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-sky-500 flex items-center justify-center shadow-lg shadow-blue-500/25 text-white font-bold shrink-0">
            <MessageSquareShare className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <div className="flex items-baseline space-x-1.5 shrink-0">
                <span className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">SieReach</span>
                <span className="text-lg font-bold bg-gradient-to-r from-blue-600 via-sky-500 to-indigo-600 dark:from-blue-400 dark:via-sky-300 dark:to-indigo-400 bg-clip-text text-transparent">
                  Meta
                </span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/30 font-bold tracking-wide uppercase whitespace-nowrap shrink-0">
                Command Center
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 hidden xl:block">
              Multi-Business Meta Lead Recovery & Blast Automation
            </p>
          </div>
        </div>

        {/* Center: When Ultra-Compact Mode is active, show the navigation tabs in Header */}
        {navLayout === "ultra-compact" && (
          <div className="hidden lg:flex items-center p-1 bg-slate-100 dark:bg-slate-800/90 rounded-xl border border-slate-200 dark:border-slate-700/80 gap-1 shrink-0">
            <button
              type="button"
              onClick={() => onSelectToolCategory("hub")}
              className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                toolCategory === "hub" ? "bg-emerald-600 text-white shadow-xs" : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-300" />
              <span>Hub</span>
            </button>
            <button
              type="button"
              onClick={() => onSelectToolCategory("advance-scan")}
              className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                toolCategory === "advance-scan" ? "bg-teal-600 text-white shadow-xs" : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              <Radar className="w-3.5 h-3.5" />
              <span>Advance Scan</span>
            </button>
            <button
              type="button"
              onClick={() => onSelectToolCategory("comcent")}
              className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                toolCategory === "comcent" ? "bg-indigo-600 text-white shadow-xs" : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              <Radio className="w-3.5 h-3.5" />
              <span>COMCENT</span>
            </button>
            <button
              type="button"
              onClick={() => onSelectToolCategory("blaster")}
              className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                toolCategory === "blaster" ? "bg-blue-600 text-white shadow-xs" : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              <Send className="w-3.5 h-3.5" />
              <span>Blaster</span>
            </button>
            <button
              type="button"
              onClick={() => onSelectToolCategory("response")}
              className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                toolCategory === "response" ? "bg-amber-600 text-white shadow-xs" : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              <Zap className="w-3.5 h-3.5 fill-current" />
              <span>Response</span>
            </button>
            <button
              type="button"
              onClick={() => onSelectToolCategory("ads")}
              className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                toolCategory === "ads" ? "bg-purple-600 text-white shadow-xs" : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              <Target className="w-3.5 h-3.5" />
              <span>Ads</span>
            </button>
            <button
              type="button"
              onClick={() => onSelectToolCategory("cdc")}
              className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                toolCategory === "cdc" ? "bg-sky-600 text-white shadow-xs" : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>CDC</span>
            </button>
          </div>
        )}

        {/* Right: Actions, Layout & Theme Switcher, Compact Page Dropdown, Business Portfolio */}
        <div className="flex items-center space-x-2 shrink-0">
          {/* Reset Demo Data Button */}
          <button
            onClick={onResetDemoData}
            disabled={isRefreshing}
            title="Reset demo data with fresh timestamps"
            className="hidden sm:flex items-center space-x-1.5 text-xs bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 px-2.5 py-1.5 rounded-lg transition disabled:opacity-50 font-medium shrink-0 whitespace-nowrap cursor-pointer shadow-2xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 shrink-0 ${isRefreshing ? "animate-spin text-blue-500" : "text-slate-500 dark:text-slate-400"}`} />
            <span className="whitespace-nowrap">Reset Demo</span>
          </button>

          {/* Mode Switcher */}
          <button
            onClick={onToggleMockMode}
            className={`hidden sm:flex items-center space-x-1.5 text-xs font-semibold px-2 py-1.5 rounded-lg border transition shrink-0 whitespace-nowrap cursor-pointer ${
              isMockMode
                ? "bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:border-emerald-500/40 dark:text-emerald-400 dark:hover:bg-emerald-900/60"
                : "bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100 dark:bg-amber-950/60 dark:border-amber-500/40 dark:text-amber-400 dark:hover:bg-amber-900/60"
            }`}
            title="Toggle between Sandbox Simulator and Live Meta Graph API"
          >
            {isMockMode ? (
              <>
                <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span className="whitespace-nowrap">Sandbox</span>
              </>
            ) : (
              <>
                <ShieldAlert className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                <span className="whitespace-nowrap">Live Meta</span>
              </>
            )}
          </button>

          {/* Theme & Navigation Layout Switcher Control */}
          <ThemeLayoutSwitcher variant="navbar" />

          {/* Subtle Divider */}
          <div className="h-6 w-px bg-slate-200 dark:bg-slate-800 shrink-0 mx-0.5" />

          {/* Compact Page Filter Dropdown (Active when 2-Row or Ultra-Compact layout is selected) */}
          {navLayout !== "classic-3row" && (
            <div className="relative" ref={pageDropdownRef}>
              <button
                type="button"
                onClick={() => setIsPageDropdownOpen(!isPageDropdownOpen)}
                className="flex items-center space-x-1.5 py-1.5 px-2.5 rounded-xl bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-750 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 transition cursor-pointer shadow-2xs text-xs font-semibold shrink-0"
                title="Filter by Facebook Page"
              >
                {activePageObj?.pictureUrl ? (
                  <img
                    src={activePageObj.pictureUrl}
                    alt={activePageObj.name}
                    className="w-3.5 h-3.5 rounded-full object-cover shrink-0"
                  />
                ) : (
                  <Layers className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                )}
                <span className="max-w-[110px] md:max-w-[150px] truncate block">
                  {selectedPageId === "ALL" ? `All Pages (${scopedPages.length})` : activePageObj?.name || "Page"}
                </span>
                <ChevronDown className="w-3 h-3 opacity-60 ml-0.5" />
              </button>

              {isPageDropdownOpen && (
                <div className="absolute right-0 top-full mt-1.5 w-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-50 p-2 space-y-1 animate-in fade-in zoom-in-95">
                  <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Filter Facebook Page
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onSelectPageId("ALL");
                      setIsPageDropdownOpen(false);
                    }}
                    className={`w-full text-left px-2.5 py-1.5 rounded-xl text-xs flex items-center justify-between cursor-pointer ${
                      selectedPageId === "ALL"
                        ? "bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-bold"
                        : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200"
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-blue-500" />
                      <span>All Pages ({scopedPages.length})</span>
                    </span>
                    {selectedPageId === "ALL" && <Check className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />}
                  </button>
                  <div className="h-px bg-slate-100 dark:border-slate-800 my-1" />
                  {scopedPages.map((pg) => {
                    const isSel = selectedPageId === pg.pageId;
                    return (
                      <button
                        key={pg.pageId}
                        type="button"
                        onClick={() => {
                          onSelectPageId(pg.pageId);
                          setIsPageDropdownOpen(false);
                        }}
                        className={`w-full text-left px-2.5 py-1.5 rounded-xl text-xs flex items-center justify-between cursor-pointer ${
                          isSel
                            ? "bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-bold"
                            : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200"
                        }`}
                      >
                        <span className="flex items-center gap-1.5 truncate pr-2">
                          {pg.pictureUrl ? (
                            <img src={pg.pictureUrl} alt={pg.name} className="w-3.5 h-3.5 rounded-full object-cover shrink-0" />
                          ) : (
                            <span>📄</span>
                          )}
                          <span className="truncate">{pg.name}</span>
                        </span>
                        {isSel && <Check className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Admin Profile Badge & Business Portfolio Switcher Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="flex items-center space-x-2 py-1 pl-1.5 pr-2.5 rounded-xl bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-750 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 transition cursor-pointer shadow-2xs group shrink-0"
              title="Admin Profile & Business Switcher"
            >
              <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shadow-xs shrink-0">
                {currentPortfolio?.icon || "🏢"}
              </div>
              <div className="text-left hidden sm:block">
                <div className="flex items-center space-x-1.5">
                  <span className="text-xs font-bold text-slate-900 dark:text-white max-w-[120px] md:max-w-[160px] truncate block leading-tight">
                    {selectedBusiness === "ALL" ? "All Portfolios" : selectedBusiness}
                  </span>
                  <span className="text-[9px] px-1 py-0.2 rounded bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 font-bold uppercase">
                    Admin
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 -mt-0.5 leading-tight">
                  {selectedBusiness === "ALL"
                    ? `${portfolios.length} Portfolios`
                    : `${activePagesCount} ${activePagesCount === 1 ? "Page" : "Pages"}`}
                </p>
              </div>
              <ChevronDown
                className={`w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200 transition-transform duration-200 shrink-0 ${
                  isProfileOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {/* Dropdown Menu */}
            {isProfileOpen && (
              <div className="absolute right-0 mt-2 w-72 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl dark:shadow-2xl z-50 py-2 animate-in fade-in-0 zoom-in-95 duration-150">
                {/* Admin Header */}
                <div className="px-3.5 py-2.5 border-b border-slate-100 dark:border-slate-800/80">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-500/20 border border-blue-200 dark:border-blue-500/30 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-sm shrink-0">
                      👑
                    </div>
                    <div className="truncate">
                      <div className="flex items-center space-x-1.5">
                        <span className="text-xs font-bold text-slate-900 dark:text-white truncate">Workspace Admin</span>
                        <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 font-bold shrink-0">
                          Active
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        sielab2026 (Full Access)
                      </p>
                    </div>
                  </div>
                </div>

                {/* Switch Portfolio Section */}
                <div className="px-3.5 py-2">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400">
                      Select Business Portfolio
                    </span>
                    <button
                      onClick={() => {
                        setIsProfileOpen(false);
                        onOpenCreatePortfolio();
                      }}
                      className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer font-medium"
                    >
                      <Plus className="w-3 h-3" />
                      <span>New</span>
                    </button>
                  </div>

                  <div className="space-y-1">
                    <button
                      onClick={() => {
                        onSelectBusiness("ALL");
                        setIsProfileOpen(false);
                      }}
                      className={`w-full text-left px-2.5 py-1.5 rounded-xl text-xs flex items-center justify-between transition cursor-pointer ${
                        selectedBusiness === "ALL"
                          ? "bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-bold"
                          : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                      }`}
                    >
                      <span className="flex items-center space-x-2">
                        <span>🌐</span>
                        <span>All Portfolios ({portfolios.length})</span>
                      </span>
                      {selectedBusiness === "ALL" && (
                        <Check className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                      )}
                    </button>

                    {portfolios.map((p) => {
                      const isSelected = selectedBusiness === p.name;
                      const count = pages.filter((pg) => (pg.businessName || "SieLab Retail Group") === p.name).length;
                      return (
                        <button
                          key={p.id}
                          onClick={() => {
                            onSelectBusiness(p.name);
                            setIsProfileOpen(false);
                          }}
                          className={`w-full text-left px-2.5 py-1.5 rounded-xl text-xs flex items-center justify-between transition cursor-pointer ${
                            isSelected
                              ? "bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-bold"
                              : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                          }`}
                        >
                          <span className="flex items-center space-x-2 truncate pr-2">
                            <span>{p.icon || "🏢"}</span>
                            <span className="truncate">{p.name}</span>
                          </span>
                          <div className="flex items-center space-x-1 shrink-0">
                            <span className="text-[10px] text-slate-400 font-mono">
                              {count}p
                            </span>
                            {isSelected && (
                              <Check className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 ml-1" />
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Footer Controls: Lock Workspace */}
                {onLockWorkspace && (
                  <div className="px-3 py-2 border-t border-slate-100 dark:border-slate-800/80 mt-1">
                    <button
                      onClick={() => {
                        setIsProfileOpen(false);
                        onLockWorkspace();
                      }}
                      className="w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-xl text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer font-medium"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Lock Workspace (Log Out)</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
