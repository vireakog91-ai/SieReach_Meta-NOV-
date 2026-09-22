"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  MessageSquareShare,
  RefreshCw,
  Sparkles,
  ShieldAlert,
  Sun,
  Moon,
  ChevronDown,
  Check,
  Plus,
  LogOut,
} from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";

interface NavbarProps {
  isMockMode: boolean;
  onToggleMockMode: () => void;
  onResetDemoData: () => void;
  isRefreshing: boolean;
  selectedPageId?: string;
  onSelectPageId?: (id: string) => void;
  pages?: Array<{ pageId: string; name: string; businessName?: string }>;
  portfolios?: Array<{ id: string; name: string; icon?: string; industry?: string }>;
  selectedBusiness?: string;
  onSelectBusiness?: (businessName: string) => void;
  onOpenCreatePortfolio?: () => void;
  onNavigateToPages?: () => void;
  onLockWorkspace?: () => void;
}

export function Navbar({
  isMockMode,
  onToggleMockMode,
  onResetDemoData,
  isRefreshing,
  pages = [],
  portfolios = [],
  selectedBusiness = "ALL",
  onSelectBusiness = () => {},
  onOpenCreatePortfolio = () => {},
  onLockWorkspace,
}: NavbarProps) {
  const { theme, toggleTheme } = useTheme();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const currentPortfolio = portfolios.find((p) => p.name === selectedBusiness);
  const activePagesCount = selectedBusiness === "ALL"
    ? pages.length
    : pages.filter((p) => (p.businessName || "SieLab Retail Group") === selectedBusiness).length;

  return (
    <header className="border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md sticky top-0 z-30 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
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
            <p className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block">
              Multi-Business Meta Lead Recovery & Blast Automation
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-2.5 shrink-0">
          {/* Reset Demo Data Button */}
          <button
            onClick={onResetDemoData}
            disabled={isRefreshing}
            title="Reset demo data with fresh timestamps"
            className="flex items-center space-x-1.5 text-xs bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 px-3 py-1.5 rounded-lg transition disabled:opacity-50 font-medium shrink-0 whitespace-nowrap cursor-pointer shadow-2xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 shrink-0 ${isRefreshing ? "animate-spin text-blue-500" : "text-slate-500 dark:text-slate-400"}`} />
            <span className="hidden sm:inline whitespace-nowrap">Reset Demo</span>
          </button>

          {/* Mode Switcher */}
          <button
            onClick={onToggleMockMode}
            className={`flex items-center space-x-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg border transition shrink-0 whitespace-nowrap cursor-pointer ${
              isMockMode
                ? "bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:border-emerald-500/40 dark:text-emerald-400 dark:hover:bg-emerald-900/60"
                : "bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100 dark:bg-amber-950/60 dark:border-amber-500/40 dark:text-amber-400 dark:hover:bg-amber-900/60"
            }`}
            title="Toggle between Sandbox Simulator and Live Meta Graph API"
          >
            {isMockMode ? (
              <>
                <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span className="whitespace-nowrap">Sandbox Mode</span>
              </>
            ) : (
              <>
                <ShieldAlert className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                <span className="whitespace-nowrap">Live Meta API</span>
              </>
            )}
          </button>

          {/* Theme Switcher Button */}
          <button
            onClick={toggleTheme}
            className="flex items-center space-x-1.5 text-xs bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100 px-2.5 py-1.5 rounded-lg transition shrink-0 whitespace-nowrap cursor-pointer"
            title={theme === "dark" ? "Switch to Light Theme" : "Switch to Dark Theme"}
          >
            {theme === "dark" ? (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="hidden sm:inline font-medium">Light</span>
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                <span className="hidden sm:inline font-medium text-slate-800">Dark</span>
              </>
            )}
          </button>

          {/* Subtle Divider */}
          <div className="h-6 w-px bg-slate-200 dark:bg-slate-800 shrink-0 mx-0.5" />

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
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">admin@sielab.meta</p>
                    </div>
                  </div>
                </div>

                {/* Switch Portfolio Section */}
                <div className="px-3.5 pt-2.5 pb-1">
                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                    Switch Business Portfolio
                  </span>
                </div>

                <div className="px-1.5 py-1 space-y-0.5">
                  {portfolios.map((p) => {
                    const isCurrent = selectedBusiness === p.name;
                    const pCount = pages.filter(
                      (pg) => (pg.businessName || "SieLab Retail Group") === p.name
                    ).length;
                    return (
                      <button
                        key={p.id}
                        onClick={() => {
                          onSelectBusiness(p.name);
                          setIsProfileOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition cursor-pointer ${
                          isCurrent
                            ? "bg-blue-50 dark:bg-blue-500/15 text-blue-700 dark:text-blue-300 font-bold"
                            : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium"
                        }`}
                      >
                        <div className="flex items-center space-x-2.5 truncate">
                          <span className="text-base shrink-0">{p.icon || "🏢"}</span>
                          <div className="text-left truncate">
                            <span className="block truncate">{p.name}</span>
                            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-normal">
                              {p.industry || "Business Portfolio"}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-1.5 shrink-0 ml-2">
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold ${
                              isCurrent
                                ? "bg-blue-200 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200"
                                : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
                            }`}
                          >
                            {pCount}p
                          </span>
                          {isCurrent && <Check className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />}
                        </div>
                      </button>
                    );
                  })}

                  {/* All Portfolios Option */}
                  <button
                    onClick={() => {
                      onSelectBusiness("ALL");
                      setIsProfileOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition cursor-pointer ${
                      selectedBusiness === "ALL"
                        ? "bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 font-bold"
                        : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium"
                    }`}
                  >
                    <div className="flex items-center space-x-2.5">
                      <span className="text-base shrink-0">🌐</span>
                      <div className="text-left">
                        <span>All Portfolios (Overview)</span>
                        <span className="block text-[10px] text-slate-500 dark:text-slate-400 font-normal">
                          Consolidated view across all businesses
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1.5 shrink-0 ml-2">
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold ${
                          selectedBusiness === "ALL"
                            ? "bg-indigo-200 text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-200"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
                        }`}
                      >
                        {pages.length}p
                      </span>
                      {selectedBusiness === "ALL" && <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />}
                    </div>
                  </button>
                </div>

                {/* Footer: Create Portfolio & Lock Workspace */}
                <div className="px-2 pt-1 border-t border-slate-100 dark:border-slate-800/80 mt-1 space-y-0.5">
                  <button
                    onClick={() => {
                      onOpenCreatePortfolio();
                      setIsProfileOpen(false);
                    }}
                    className="w-full flex items-center space-x-2 px-3 py-2 rounded-xl text-xs text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 font-semibold transition cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Create Business Portfolio...</span>
                  </button>

                  {onLockWorkspace && (
                    <button
                      onClick={() => {
                        setIsProfileOpen(false);
                        onLockWorkspace();
                      }}
                      className="w-full flex items-center space-x-2 px-3 py-2 rounded-xl text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 font-semibold transition cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Lock Workspace / Sign Out</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
