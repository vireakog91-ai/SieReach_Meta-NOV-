"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Palette,
  Check,
  ChevronDown,
  Sparkles,
  Rows3,
  Layers,
  Maximize2,
  Sun,
  Moon,
  Sparkle,
  TreePine,
  X,
  RotateCcw,
} from "lucide-react";
import { useTheme, Theme, NavLayout } from "@/components/ThemeProvider";

interface ThemeLayoutSwitcherProps {
  className?: string;
  variant?: "navbar" | "floating";
}

export function ThemeLayoutSwitcher({ className = "", variant = "navbar" }: ThemeLayoutSwitcherProps) {
  const { theme, navLayout, setTheme, setNavLayout } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const navLayoutOptions: Array<{
    id: NavLayout;
    title: string;
    badge: string;
    badgeColor: "emerald" | "slate" | "indigo";
    icon: React.ElementType;
    description: string;
    heightBenefit: string;
  }> = [
    {
      id: "executive-2row",
      title: "Executive 2-Row",
      badge: "Recommended",
      badgeColor: "emerald",
      icon: Layers,
      description: "Combines Page Selector into top bar. Eliminates Row 2 clutter & right-side tab cut-offs.",
      heightBenefit: "+90px Workspace Height",
    },
    {
      id: "classic-3row",
      title: "Classic 3-Row",
      badge: "Original",
      badgeColor: "slate",
      icon: Rows3,
      description: "The original 3-tier layout: Top Navbar, Wide Page Chips Bar, and Split Dock.",
      heightBenefit: "Original Staged View",
    },
    {
      id: "ultra-compact",
      title: "Ultra-Compact 1-Row",
      badge: "Max Space",
      badgeColor: "indigo",
      icon: Maximize2,
      description: "Modern SaaS single-bar (Linear/Vercel style). Nav tools embedded directly in the top header.",
      heightBenefit: "100% Maximized Workspace",
    },
  ];

  const themeOptions: Array<{
    id: Theme;
    name: string;
    icon: React.ElementType;
    colorSwatch: string;
    borderSwatch: string;
    description: string;
  }> = [
    {
      id: "dark",
      name: "Dark Studio",
      icon: Moon,
      colorSwatch: "bg-slate-900 text-indigo-400",
      borderSwatch: "border-slate-700",
      description: "Default high-contrast executive dark",
    },
    {
      id: "light",
      name: "Executive Light",
      icon: Sun,
      colorSwatch: "bg-white text-amber-500",
      borderSwatch: "border-slate-300",
      description: "Crisp modern daytime SaaS",
    },
    {
      id: "midnight",
      name: "Midnight OLED",
      icon: Sparkle,
      colorSwatch: "bg-[#02040a] text-sky-400",
      borderSwatch: "border-blue-900/60",
      description: "Deep space black & glowing indigo",
    },
    {
      id: "emerald",
      name: "Emerald Forest",
      icon: TreePine,
      colorSwatch: "bg-[#02140f] text-emerald-400",
      borderSwatch: "border-emerald-800/60",
      description: "Rich commerce forest & mint accents",
    },
  ];

  const currentLayoutLabel =
    navLayout === "executive-2row"
      ? "2-Row"
      : navLayout === "classic-3row"
      ? "3-Row"
      : "1-Row";

  const currentThemeLabel =
    theme === "dark"
      ? "Dark"
      : theme === "light"
      ? "Light"
      : theme === "midnight"
      ? "Midnight"
      : "Emerald";

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Trigger Button */}
      {variant === "navbar" ? (
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center space-x-1.5 text-xs bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100 px-2.5 py-1.5 rounded-lg transition shrink-0 whitespace-nowrap cursor-pointer shadow-2xs group"
          title="Customize Navigation Layout & Visual Theme"
        >
          <Palette className="w-3.5 h-3.5 text-indigo-500 group-hover:rotate-12 transition-transform duration-200" />
          <span className="font-semibold hidden md:inline">Layout & Theme</span>
          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
            {currentLayoutLabel} • {currentThemeLabel}
          </span>
          <ChevronDown className="w-3 h-3 opacity-60 ml-0.5" />
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center space-x-2 px-3.5 py-2 rounded-full bg-slate-900/90 dark:bg-slate-800/90 text-white border border-slate-700/80 shadow-2xl backdrop-blur-md hover:scale-105 transition active:scale-95 cursor-pointer"
          title="Interactive Theme & Navigation Switcher"
        >
          <Palette className="w-4 h-4 text-amber-400 animate-pulse" />
          <span className="text-xs font-bold">Theme & Layout</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-600 font-mono">
            {currentLayoutLabel}
          </span>
        </button>
      )}

      {/* Popover Customizer Menu */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-[340px] sm:w-[420px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-50 p-4 space-y-4 animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                <Palette className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                  <span>Navigation & Theme Switcher</span>
                  <Sparkles className="w-3 h-3 text-amber-500" />
                </h4>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                  Test and compare UX layout styles & color schemes
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Section 1: Navigation UX Layout Styles */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400">
                1. Navigation Layout Architecture
              </span>
              <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium">
                Switch instantly
              </span>
            </div>

            <div className="space-y-1.5">
              {navLayoutOptions.map((opt) => {
                const isSelected = navLayout === opt.id;
                const Icon = opt.icon;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setNavLayout(opt.id)}
                    className={`w-full text-left p-2.5 rounded-xl border transition cursor-pointer flex items-start gap-2.5 group ${
                      isSelected
                        ? "bg-indigo-50/70 dark:bg-indigo-950/40 border-indigo-500 text-indigo-900 dark:text-indigo-200 shadow-2xs ring-1 ring-indigo-500/30"
                        : "bg-slate-50/50 hover:bg-slate-100 dark:bg-slate-950/40 dark:hover:bg-slate-800/60 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                        isSelected
                          ? "bg-indigo-600 text-white"
                          : "bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white"
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                          <span>{opt.title}</span>
                          <span
                            className={`text-[9px] px-1.5 py-0.2 rounded font-mono font-bold ${
                              opt.badgeColor === "emerald"
                                ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300/50"
                                : opt.badgeColor === "indigo"
                                ? "bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-300/50"
                                : "bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                            }`}
                          >
                            {opt.badge}
                          </span>
                        </span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />}
                      </div>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                        {opt.description}
                      </p>
                      <span className="inline-block mt-1 text-[9px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                        ✓ {opt.heightBenefit}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 2: Visual Color Themes */}
          <div className="space-y-2 pt-1 border-t border-slate-100 dark:border-slate-800">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400 block">
              2. Visual Color Palette
            </span>

            <div className="grid grid-cols-2 gap-2">
              {themeOptions.map((opt) => {
                const isSelected = theme === opt.id;
                const Icon = opt.icon;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setTheme(opt.id)}
                    className={`p-2.5 rounded-xl border text-left transition cursor-pointer flex items-center gap-2 ${
                      isSelected
                        ? "bg-indigo-50/70 dark:bg-indigo-950/40 border-indigo-500 shadow-2xs ring-1 ring-indigo-500/30"
                        : "bg-slate-50/50 hover:bg-slate-100 dark:bg-slate-950/40 dark:hover:bg-slate-800/60 border-slate-200 dark:border-slate-800"
                    }`}
                  >
                    <div
                      className={`w-6 h-6 rounded-lg border ${opt.borderSwatch} ${opt.colorSwatch} flex items-center justify-center shrink-0 shadow-2xs`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="font-bold text-xs text-slate-900 dark:text-white block truncate">
                        {opt.name}
                      </span>
                      <span className="text-[9px] text-slate-400 block truncate">
                        {opt.id}
                      </span>
                    </div>
                    {isSelected && <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Footer Reset & Helper */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-400">
            <span>Settings saved automatically</span>
            <button
              type="button"
              onClick={() => {
                setNavLayout("executive-2row");
                setTheme("dark");
              }}
              className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer font-medium"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset Recommended</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
