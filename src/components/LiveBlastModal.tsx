"use client";

import React from "react";
import { Send, CheckCircle2, Clock, Timer, X, AlertCircle, Sparkles, RefreshCw } from "lucide-react";

export interface LiveBlastStep {
  customerName: string;
  pageName: string;
  status: "PENDING" | "SENDING" | "DELIVERED" | "FAILED";
  delaySeconds?: number;
  time?: string;
}

interface LiveBlastModalProps {
  isOpen: boolean;
  onClose: () => void;
  total: number;
  current: number;
  currentStepStatus: string;
  countdown: number;
  steps: LiveBlastStep[];
  isFinished: boolean;
  onStop: () => void;
}

export function LiveBlastModal({
  isOpen,
  onClose,
  total,
  current,
  currentStepStatus,
  countdown,
  steps,
  isFinished,
  onStop,
}: LiveBlastModalProps) {
  if (!isOpen) return null;

  const progressPercent = total > 0 ? Math.round((current / total) * 100) : 0;

  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in zoom-in-95">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div
              className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
                isFinished
                  ? "bg-emerald-500/20 text-emerald-400"
                  : "bg-blue-500/20 text-blue-400"
              }`}
            >
              {isFinished ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 animate-in zoom-in" />
              ) : (
                <RefreshCw className="w-5 h-5 text-blue-400 animate-spin" />
              )}
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                {isFinished ? "Follow-Up Blast Completed!" : "Live Follow-Up Blast in Progress"}
              </h3>
              <p className="text-xs text-slate-400">
                {isFinished
                  ? `Delivered messages to ${current} customer(s)`
                  : `Drip Rate Engine active: human-like pacing per message`}
              </p>
            </div>
          </div>

          {isFinished && (
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Progress Bar & Counter */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-300 font-semibold">
              {isFinished ? "All Leads Processed" : currentStepStatus}
            </span>
            <span className="font-mono text-blue-400 font-bold">
              {current} of {total} ({progressPercent}%)
            </span>
          </div>

          <div className="w-full bg-slate-950 rounded-full h-3 p-0.5 border border-slate-800 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-600 via-indigo-500 to-emerald-500 rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Drip Countdown Indicator */}
        {!isFinished && countdown > 0 && (
          <div className="bg-blue-950/40 border border-blue-500/30 rounded-2xl p-3.5 flex items-center justify-between animate-in fade-in">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center animate-spin">
                <Timer className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-white">
                  Drip Pacing: Next message in {countdown.toFixed(1)}s
                </div>
                <div className="text-[10px] text-blue-300/80">
                  Simulating natural typing speed to prevent Meta rate limit blocks
                </div>
              </div>
            </div>

            <span className="text-sm font-mono font-bold text-blue-400 bg-blue-500/10 px-2.5 py-1 rounded-xl border border-blue-500/20">
              {countdown.toFixed(1)}s
            </span>
          </div>
        )}

        {/* Live Step-by-Step Delivery Log */}
        <div className="bg-slate-950 rounded-2xl p-3 border border-slate-800/80 max-h-52 overflow-y-auto space-y-2">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 pb-1 border-b border-slate-900">
            Real-Time Delivery Timeline
          </div>

          {steps.length === 0 ? (
            <div className="text-center py-6 text-slate-500 text-xs">
              Initializing blast queue...
            </div>
          ) : (
            steps.map((step, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between text-xs py-1 px-1.5 rounded-lg hover:bg-slate-900/50 transition"
              >
                <div className="flex items-center space-x-2 truncate">
                  {step.status === "DELIVERED" ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  ) : step.status === "SENDING" ? (
                    <RefreshCw className="w-3.5 h-3.5 text-blue-400 animate-spin shrink-0" />
                  ) : step.status === "FAILED" ? (
                    <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                  ) : (
                    <Clock className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                  )}
                  <span className="text-white font-medium truncate">
                    {step.customerName}
                  </span>
                  <span className="text-[10px] text-slate-500 truncate">
                    ({step.pageName})
                  </span>
                </div>

                <div className="flex items-center space-x-2 shrink-0">
                  {step.delaySeconds !== undefined && step.delaySeconds > 0 && (
                    <span className="text-[10px] text-blue-400 bg-blue-500/10 px-1.5 py-0.2 rounded border border-blue-500/20 font-mono">
                      +{step.delaySeconds}s delay
                    </span>
                  )}
                  <span className="text-[10px] text-slate-400 font-mono">
                    {step.time || ""}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Actions */}
        <div className="pt-2 flex items-center justify-between">
          {!isFinished ? (
            <button
              type="button"
              onClick={onStop}
              className="text-xs text-red-400 hover:text-red-300 font-medium px-3 py-1.5 rounded-xl border border-red-500/20 hover:bg-red-500/10 transition"
            >
              Stop Blast
            </button>
          ) : (
            <span className="text-xs text-emerald-400 font-semibold flex items-center space-x-1">
              <Sparkles className="w-3.5 h-3.5" />
              <span>All messages dispatched successfully</span>
            </span>
          )}

          {isFinished && (
            <button
              type="button"
              onClick={onClose}
              className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-5 py-2 rounded-xl transition shadow-md shadow-blue-600/30"
            >
              Close & View Updated Logs
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
