"use client";

import React, { useState } from "react";
import {
  FileText,
  Plus,
  Sparkles,
  Trash2,
  Copy,
  ExternalLink,
  Send,
  X,
  Tag,
} from "lucide-react";
import { DeleteConfirmModal } from "@/components/common/DeleteConfirmModal";

interface TemplatesTabProps {
  templates: any[];
  onUseTemplate: (template: any) => void;
  onCreateTemplate: (templateData: any) => Promise<void>;
  onDeleteTemplate: (id: string) => Promise<void>;
}

export function TemplatesTab({
  templates,
  onUseTemplate,
  onCreateTemplate,
  onDeleteTemplate,
}: TemplatesTabProps) {
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<any | null>(null);
  const [isDeletingTemplate, setIsDeletingTemplate] = useState(false);

  const handleConfirmDelete = async () => {
    if (!templateToDelete) return;
    setIsDeletingTemplate(true);
    try {
      await onDeleteTemplate(templateToDelete.id);
      setTemplateToDelete(null);
    } finally {
      setIsDeletingTemplate(false);
    }
  };

  // New Template form state
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Promotional");
  const [content, setContent] = useState("");
  const [tags, setTags] = useState("");
  const [mediaType, setMediaType] = useState("none");
  const [mediaUrl, setMediaUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const categories = [
    "ALL",
    "Promotional",
    "Announcement",
    "Daily Engagement",
    "Events",
    "System Alert",
  ];

  const filteredTemplates = templates.filter((t) => {
    if (selectedCategory === "ALL") return true;
    return t.category === selectedCategory;
  });

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      alert("Title and content are required.");
      return;
    }

    setIsSubmitting(true);
    try {
      await onCreateTemplate({
        title: title.trim(),
        category,
        content,
        tags: tags.trim() || null,
        mediaType,
        mediaUrl: mediaType !== "none" ? mediaUrl : null,
      });
      setShowCreateModal(false);
      setTitle("");
      setContent("");
      setTags("");
      setMediaType("none");
      setMediaUrl("");
    } catch (err: any) {
      alert(err.message || "Failed to create template.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-500 dark:text-blue-400" />
            <span>Post Template & Snippet Library</span>
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            Stop copy-pasting promotional messages. Load pre-formatted campaigns in 1 click.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md shadow-blue-600/20 transition-all active:scale-[0.98]"
        >
          <Plus className="w-4 h-4" />
          <span>New Template</span>
        </button>
      </div>

      {/* Category Filter Pills */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-none">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all whitespace-nowrap ${
              selectedCategory === cat
                ? "bg-blue-600 text-white shadow-sm shadow-blue-600/30"
                : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:border-slate-300 dark:hover:border-slate-700 shadow-sm"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredTemplates.map((tmpl) => (
          <div
            key={tmpl.id}
            className="group rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 p-5 hover:border-slate-300 dark:hover:border-slate-700 shadow-sm transition-all flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-2">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20">
                  {tmpl.category}
                </span>

                <button
                  onClick={() => setTemplateToDelete(tmpl)}
                  className="p-1 rounded text-slate-400 hover:text-rose-600 dark:text-slate-500 dark:hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Delete template"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              <h4 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                {tmpl.title}
              </h4>

              {/* Formatted Preview */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-300 font-mono line-clamp-4 leading-relaxed whitespace-pre-wrap">
                {tmpl.content}
              </div>

              {/* Tags */}
              {tmpl.tags && (
                <div className="flex flex-wrap gap-1">
                  {tmpl.tags.split(",").map((tag: string, i: number) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 rounded text-[10px] bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400"
                    >
                      #{tag.trim()}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Use Template Action */}
            <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800/80 flex items-center justify-between">
              <span className="text-[11px] text-slate-500 capitalize">
                {tmpl.mediaType !== "none" ? `📷 ${tmpl.mediaType}` : "Text only"}
              </span>

              <button
                onClick={() => onUseTemplate(tmpl)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-600 border border-blue-200 hover:border-blue-600 text-blue-700 hover:text-white dark:bg-blue-600/20 dark:hover:bg-blue-600 dark:border-blue-500/30 dark:text-blue-300 dark:hover:text-white text-xs font-semibold transition-all"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Use in Composer</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Create Template Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <span>Create Reusable Template</span>
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Template Title *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Weekly VIP Recap / Flash Deal 50%"
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-xs"
                >
                  <option value="Promotional">Promotional</option>
                  <option value="Announcement">Announcement</option>
                  <option value="Daily Engagement">Daily Engagement</option>
                  <option value="Events">Events</option>
                  <option value="System Alert">System Alert</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Message Content (HTML & Spintax supported) *
                </label>
                <textarea
                  rows={6}
                  required
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Write your template message... Use <b>bold</b>, <i>italic</i>, and {Option 1|Option 2}."
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-mono text-xs focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Tags (Comma separated)
                </label>
                <input
                  type="text"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="deal, promo, discount"
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md shadow-blue-600/20 disabled:opacity-50"
                >
                  {isSubmitting ? "Saving..." : "Save Template"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Global Delete Confirmation Popup Card */}
      <DeleteConfirmModal
        isOpen={Boolean(templateToDelete)}
        onClose={() => setTemplateToDelete(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Post Template?"
        itemName={templateToDelete?.title || "Untitled Template"}
        itemType="Template"
        isDeleting={isDeletingTemplate}
        details={[
          { label: "Category", value: templateToDelete?.category || "General" },
          { label: "Parse Mode", value: templateToDelete?.parseMode || "HTML" },
          { label: "Media Attachment", value: templateToDelete?.mediaType || "none" },
        ]}
        warningText="Deleting this template will permanently remove it from your template library. Any posts already created from this template will not be affected."
      />
    </div>
  );
}
