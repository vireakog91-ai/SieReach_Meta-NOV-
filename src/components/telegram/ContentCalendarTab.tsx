"use client";

import React, { useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  CheckCircle2,
  AlertCircle,
  Repeat,
  Tv,
} from "lucide-react";

interface ContentCalendarTabProps {
  posts: any[];
  onOpenNewPostWithDate?: (date: Date) => void;
  onSelectPost: (post: any) => void;
}

export function ContentCalendarTab({
  posts,
  onOpenNewPostWithDate,
  onSelectPost,
}: ContentCalendarTabProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Navigation handlers
  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Calendar calculations
  const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 is Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  // Map posts by date string "YYYY-MM-DD"
  const postsByDate: Record<string, any[]> = {};
  posts.forEach((p) => {
    if (!p.scheduledAt) return;
    const d = new Date(p.scheduledAt);
    const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    if (!postsByDate[dateKey]) {
      postsByDate[dateKey] = [];
    }
    postsByDate[dateKey].push(p);
  });

  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  // Build 42-day calendar grid (6 weeks)
  const calendarCells = [];

  // Previous month trailing days
  for (let i = firstDayOfMonth - 1; i >= 0; i--) {
    const day = daysInPrevMonth - i;
    calendarCells.push({
      day,
      isCurrentMonth: false,
      date: new Date(year, month - 1, day),
    });
  }

  // Current month days
  for (let i = 1; i <= daysInMonth; i++) {
    calendarCells.push({
      day: i,
      isCurrentMonth: true,
      date: new Date(year, month, i),
    });
  }

  // Next month leading days
  const remainingCells = 42 - calendarCells.length;
  for (let i = 1; i <= remainingCells; i++) {
    calendarCells.push({
      day: i,
      isCurrentMonth: false,
      date: new Date(year, month + 1, i),
    });
  }

  return (
    <div className="space-y-4">
      {/* Calendar Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            {monthNames[month]} {year}
          </h2>
          <button
            onClick={handleToday}
            className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 transition-colors"
          >
            Today
          </button>
        </div>

        {/* Legend & Navigation */}
        <div className="flex items-center gap-4">
          <div className="hidden lg:flex items-center gap-3 text-xs text-slate-600 dark:text-slate-400">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
              <span>Scheduled</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
              <span>Recurring</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span>Delivered</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
              <span>Failed</span>
            </div>
          </div>

          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
            <button
              onClick={handlePrevMonth}
              className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-600 hover:text-slate-900 dark:hover:bg-slate-800 dark:text-slate-400 dark:hover:text-white transition-colors"
              title="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleNextMonth}
              className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-600 hover:text-slate-900 dark:hover:bg-slate-800 dark:text-slate-400 dark:hover:text-white transition-colors"
              title="Next Month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        {/* Days of week header */}
        <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 text-center py-2 text-xs font-bold text-slate-600 dark:text-slate-400">
          <div>SUN</div>
          <div>MON</div>
          <div>TUE</div>
          <div>WED</div>
          <div>THU</div>
          <div>FRI</div>
          <div>SAT</div>
        </div>

        {/* 6 Weeks Grid */}
        <div className="grid grid-cols-7 divide-x divide-y divide-slate-200 dark:divide-slate-800/80">
          {calendarCells.map((cell, idx) => {
            const dateStr = `${cell.date.getFullYear()}-${String(cell.date.getMonth() + 1).padStart(2, "0")}-${String(cell.date.getDate()).padStart(2, "0")}`;
            const isToday = dateStr === todayKey;
            const dayPosts = postsByDate[dateStr] || [];

            return (
              <div
                key={idx}
                onClick={() => onOpenNewPostWithDate && onOpenNewPostWithDate(cell.date)}
                className={`min-h-[110px] p-2 flex flex-col group transition-colors cursor-pointer ${
                  cell.isCurrentMonth
                    ? "bg-white hover:bg-slate-50 dark:bg-slate-900/50 dark:hover:bg-slate-800/40"
                    : "bg-slate-50/70 opacity-60 hover:opacity-90 dark:bg-slate-950/40 dark:opacity-40 dark:hover:opacity-75"
                } ${isToday ? "ring-2 ring-blue-500/50 inset-0" : ""}`}
              >
                {/* Date number */}
                <div className="flex items-center justify-between mb-1.5">
                  <span
                    className={`text-xs font-semibold rounded-full w-6 h-6 flex items-center justify-center ${
                      isToday
                        ? "bg-blue-600 text-white font-bold"
                        : cell.isCurrentMonth
                        ? "text-slate-800 dark:text-slate-300"
                        : "text-slate-400 dark:text-slate-500"
                    }`}
                  >
                    {cell.day}
                  </span>

                  {/* Add post shortcut button on hover */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenNewPostWithDate && onOpenNewPostWithDate(cell.date);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-all"
                    title={`Schedule post for ${dateStr}`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Posts on this date */}
                <div className="flex-1 space-y-1 overflow-y-auto max-h-[75px] scrollbar-none">
                  {dayPosts.map((post) => {
                    let badgeBg = "bg-blue-600/20 text-blue-300 border-blue-500/30";
                    if (post.isRecurring) {
                      badgeBg = "bg-purple-600/20 text-purple-300 border-purple-500/30";
                    } else if (post.status === "PUBLISHED") {
                      badgeBg = "bg-emerald-600/20 text-emerald-300 border-emerald-500/30";
                    } else if (post.status === "FAILED") {
                      badgeBg = "bg-rose-600/20 text-rose-300 border-rose-500/30";
                    }

                    const postTime = new Date(post.scheduledAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    });

                    return (
                      <div
                        key={post.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectPost(post);
                        }}
                        className={`px-1.5 py-1 rounded-md text-[10px] font-medium border truncate hover:brightness-125 transition-all flex items-center gap-1 ${badgeBg}`}
                        title={`${post.title} at ${postTime}`}
                      >
                        <span className="font-mono text-[9px] opacity-75">{postTime}</span>
                        <span className="truncate">{post.title}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
