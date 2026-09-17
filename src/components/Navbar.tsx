"use client";

import React from "react";
import { MessageSquareShare, RefreshCw, Sparkles, ShieldAlert, CheckCircle2, Sun, Moon } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";

interface NavbarProps {
  isMockMode: boolean;
  onToggleMockMode: () => void;
  onResetDemoData: () => void;
  selectedPageId: string;
  onSelectPageId: (id: string) => void;
  pages: Array<{ pageId: string; name: string }>;
  isRefreshing: boolean;
  onNavigateToPages?: () => void;
}

export function Navbar({
  isMockMode,
  onToggleMockMode,
  onResetDemoData,
  selectedPageId,
  onSelectPageId,
  pages,
  isRefreshing,
  onNavigateToPages,
}: NavbarProps) {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/20 text-white font-bold">
            <MessageSquareShare className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xl font-bold tracking-tight text-white">SieReach</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/30 font-semibold">
                v1.0
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              Facebook Multi-Page Inactive Lead Recovery & Blast Tool
            </p>
          </div>
        </div>

        {/* Filters & Actions */}
        <div className="flex items-center space-x-3">
          {/* Page Filter */}
          <div className="hidden md:flex items-center space-x-2">
            <label htmlFor="page-filter" className="text-xs text-slate-400 font-medium">
              Filter Page:
            </label>
            <select
              id="page-filter"
              value={selectedPageId}
              onChange={(e) => onSelectPageId(e.target.value)}
              className="bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="ALL">All Connected Pages ({pages.length})</option>
              {pages.map((p) => (
                <option key={p.pageId} value={p.pageId}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Reset Demo Data Button */}
          <button
            onClick={onResetDemoData}
            disabled={isRefreshing}
            title="Reset demo data with fresh timestamps"
            className="flex items-center space-x-1.5 text-xs bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 px-3 py-1.5 rounded-lg transition disabled:opacity-50 font-medium"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-blue-500" : "text-slate-500 dark:text-slate-400"}`} />
            <span className="hidden sm:inline">Reset Demo Leads</span>
          </button>

          {/* Mode Switcher */}
          <button
            onClick={onToggleMockMode}
            className={`flex items-center space-x-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition ${
              isMockMode
                ? "bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:border-emerald-500/40 dark:text-emerald-400 dark:hover:bg-emerald-900/60"
                : "bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100 dark:bg-amber-950/60 dark:border-amber-500/40 dark:text-amber-400 dark:hover:bg-amber-900/60"
            }`}
            title="Toggle between Sandbox Simulator and Live Meta Graph API"
          >
            {isMockMode ? (
              <>
                <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Sandbox Mode (Active)</span>
              </>
            ) : (
              <>
                <ShieldAlert className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                <span>Live Meta API</span>
              </>
            )}
          </button>

          {/* Theme Switcher Button */}
          <button
            onClick={toggleTheme}
            className="flex items-center space-x-1.5 text-xs bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100 px-2.5 py-1.5 rounded-lg transition"
            title={theme === "dark" ? "Switch to Light Theme" : "Switch to Dark Theme"}
          >
            {theme === "dark" ? (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline font-medium">Light</span>
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5 text-indigo-600" />
                <span className="hidden sm:inline font-medium text-slate-800">Dark</span>
              </>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
