"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Send,
  Sparkles,
  Bot,
  Radio,
  Plus,
  Moon,
  Sun,
  Layers,
  Calendar as CalendarIcon,
  ListOrdered,
  FileText,
  History,
  Settings as SettingsIcon,
  Tv,
  LogOut,
  User as UserIcon,
  Shield,
  ChevronDown,
} from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: any) => void;
  onOpenNewPost: () => void;
  isSandbox: boolean;
  onToggleSandbox: () => void;
  scheduledCount: number;
  failedCount: number;
  user?: {
    id: string;
    email: string;
    name: string;
    role: "ADMIN" | "CLIENT";
    avatarUrl?: string | null;
  } | null;
  onLogout?: () => void;
}

export function Navbar({
  activeTab,
  setActiveTab,
  onOpenNewPost,
  isSandbox,
  onToggleSandbox,
  scheduledCount,
  failedCount,
  user,
  onLogout,
}: NavbarProps) {
  const { theme, toggleTheme } = useTheme();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close user dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: Sparkles },
    {
      id: "queue",
      label: "Posts & Queue",
      icon: ListOrdered,
      badge: scheduledCount > 0 ? scheduledCount : undefined,
      badgeColor: "bg-blue-500/20 text-blue-400 border border-blue-500/30",
    },
    { id: "calendar", label: "Content Calendar", icon: CalendarIcon },
    { id: "channels", label: "Channels & Groups", icon: Tv },
    { id: "templates", label: "Templates", icon: FileText },
    {
      id: "logs",
      label: "Delivery Logs",
      icon: History,
      badge: failedCount > 0 ? failedCount : undefined,
      badgeColor: "bg-rose-500/20 text-rose-400 border border-rose-500/30",
    },
    // Restrict settings tab to ADMIN users
    ...(user?.role === "CLIENT"
      ? []
      : [{ id: "settings", label: "Settings", icon: SettingsIcon }]),
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 dark:border-slate-800/80 bg-white/90 dark:bg-slate-950/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Name */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-sky-400 flex items-center justify-center shadow-lg shadow-blue-500/20 ring-1 ring-white/20">
              <Send className="w-5 h-5 text-white -rotate-12 translate-x-[-1px] translate-y-[1px]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 dark:from-white dark:via-slate-200 dark:to-slate-400 bg-clip-text text-transparent">
                  SieReach
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 font-medium">
                  Telegram Scheduler
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-none mt-0.5 hidden sm:block">
                Centralized Telegram Content & Broadcast Automation
              </p>
            </div>
          </div>

          {/* Right Header Actions */}
          <div className="flex items-center gap-3">
            {/* Live Worker Status */}
            <div className="hidden md:flex items-center gap-2 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="font-mono text-[11px] font-semibold">Worker Active</span>
            </div>

            {/* Sandbox / Live Mode Toggle */}
            <button
              onClick={onToggleSandbox}
              title={
                isSandbox
                  ? "Click to switch to Live Telegram API Mode"
                  : "Click to switch to Sandbox Simulated Mode"
              }
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                isSandbox
                  ? "bg-amber-500/10 text-amber-500 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/20"
                  : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20"
              }`}
            >
              <Radio className="w-3.5 h-3.5" />
              <span>{isSandbox ? "Sandbox (Demo)" : "Live API"}</span>
            </button>

            {/* Dark / Light Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 hover:text-slate-900 dark:bg-slate-900 dark:hover:bg-slate-800 dark:border-slate-800 dark:text-slate-300 dark:hover:text-white transition-colors"
              title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
              aria-label="Toggle theme"
            >
              {theme === "dark" ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-blue-600" />
              )}
            </button>

            {/* Create Post Button */}
            <button
              onClick={onOpenNewPost}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-500 hover:to-sky-400 text-white font-medium text-sm shadow-lg shadow-blue-600/25 transition-all active:scale-[0.98]"
            >
              <Plus className="w-4 h-4" />
              <span>New Post</span>
            </button>

            {/* User Session Profile & Dropdown */}
            {user && (
              <div className="relative" ref={userMenuRef}>
                <button
                  type="button"
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 transition-colors"
                  title="User Account"
                >
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-500 text-white font-bold text-xs flex items-center justify-center shadow-sm">
                    {user.name ? user.name.slice(0, 2).toUpperCase() : "US"}
                  </div>
                  <div className="hidden sm:block text-left">
                    <div className="text-xs font-bold text-slate-900 dark:text-white leading-tight truncate max-w-[100px]">
                      {user.name}
                    </div>
                    <div className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 leading-none mt-0.5">
                      {user.role}
                    </div>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 hidden sm:block" />
                </button>

                {/* Dropdown Menu */}
                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-2 z-50 animate-in fade-in duration-150">
                    <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800/80 mb-1">
                      <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {user.name}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                        {user.email}
                      </p>
                      <div className="mt-1.5">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            user.role === "ADMIN"
                              ? "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300 border border-blue-200 dark:border-blue-500/20"
                              : "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300 border border-amber-200 dark:border-amber-500/20"
                          }`}
                        >
                          {user.role === "ADMIN" ? "Administrator" : "Client Operator"}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setShowUserMenu(false);
                        if (onLogout) onLogout();
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Navigation Tabs Bar */}
        <div className="flex items-center space-x-1 overflow-x-auto py-2 scrollbar-none border-t border-slate-200 dark:border-slate-800/80">
          {navItems.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  isActive
                    ? "bg-blue-600 text-white shadow-sm shadow-blue-600/30"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800/60"
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? "text-white" : "text-slate-500 dark:text-slate-400"}`} />
                <span>{tab.label}</span>
                {tab.badge !== undefined && (
                  <span
                    className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                      isActive ? "bg-white/20 text-white" : tab.badgeColor
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
}
