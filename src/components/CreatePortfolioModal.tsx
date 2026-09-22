"use client";

import React, { useState } from "react";
import { Briefcase, X, Sparkles, Check } from "lucide-react";

interface CreatePortfolioModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (newPortfolio: any) => void;
}

const PRESET_ICONS = ["🏢", "☕", "🛍️", "💻", "🏨", "🚚", "✨", "🍕", "👗", "🌿", "🍔", "📱"];
const PRESET_INDUSTRIES = [
  "Retail & E-commerce",
  "Artisan F&B & Hospitality",
  "Consumer Electronics & Tech",
  "Health & Organic Cosmetics",
  "Home & Interior Design",
  "Hotels & Luxury Resorts",
  "Logistics & Express Delivery",
  "Fashion & Apparel Brand",
  "Automotive & Motors",
  "General Business",
];

export function CreatePortfolioModal({
  isOpen,
  onClose,
  onCreated,
}: CreatePortfolioModalProps) {
  const [name, setName] = useState("");
  const [industry, setIndustry] = useState("Retail & E-commerce");
  const [icon, setIcon] = useState("🏢");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Please enter a business portfolio name.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/portfolios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          industry: industry.trim(),
          icon: icon.trim(),
          description: description.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to create business portfolio.");
      }

      // Reset form
      setName("");
      setDescription("");
      onCreated(data.portfolio);
      onClose();
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95">
        {/* Modal Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800/60">
              <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Create Business Portfolio
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Establish an isolated workspace for a new brand or enterprise entity.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-500/30 rounded-xl text-xs text-red-600 dark:text-red-400 font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Portfolio Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Portfolio / Brand Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Phnom Penh Logistics, Angkor Boutique Resorts"
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-blue-500 font-medium"
            />
          </div>

          {/* Industry Category */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Industry Category
            </label>
            <select
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-200 focus:outline-none focus:border-blue-500 font-medium cursor-pointer"
            >
              {PRESET_INDUSTRIES.map((ind) => (
                <option key={ind} value={ind}>
                  {ind}
                </option>
              ))}
            </select>
          </div>

          {/* Icon Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Brand Emoji Icon
            </label>
            <div className="flex flex-wrap items-center gap-1.5 bg-slate-50 dark:bg-slate-950 p-2 rounded-xl border border-slate-200 dark:border-slate-800">
              {PRESET_ICONS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setIcon(emoji)}
                  className={`w-8 h-8 rounded-lg text-sm flex items-center justify-center transition cursor-pointer ${
                    icon === emoji
                      ? "bg-blue-600 text-white shadow-sm ring-2 ring-blue-500/40"
                      : "hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Description / Notes (Optional)
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief summary of what this business entity oversees..."
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-blue-500 font-medium resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-xl transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !name.trim()}
              className="flex items-center space-x-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs px-4 py-2 rounded-xl transition shadow-sm shadow-blue-600/30 disabled:opacity-50 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isSubmitting ? "Creating..." : "Create Portfolio"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
