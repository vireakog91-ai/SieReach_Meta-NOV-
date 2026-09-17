"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  X,
  Send,
  Calendar,
  Clock,
  Repeat,
  Image as ImageIcon,
  Link as LinkIcon,
  Bold,
  Italic,
  Code,
  EyeOff,
  Underline,
  Strikethrough,
  Pin,
  BellOff,
  Sparkles,
  Plus,
  Trash2,
  Tv,
  Check,
  Smartphone,
  ExternalLink,
  ChevronDown,
  UploadCloud,
  FileText,
  Film,
  Loader2,
  AlertCircle,
  RefreshCw,
  Download,
  CheckCircle2,
  HardDrive,
  Globe,
  Info,
} from "lucide-react";
import { parseSpintax } from "@/lib/spintax";
import {
  decodeGoogleDriveUrl,
  formatFileSize,
  DecodedMediaResult,
} from "@/lib/mediaUtils";

export interface ChannelItem {
  id: string;
  title: string;
  username?: string | null;
  chatId: string;
  type: string;
  memberCount: number;
  avatarUrl?: string | null;
}

export interface TemplateItem {
  id: string;
  title: string;
  category: string;
  content: string;
  parseMode: string;
  mediaType: string;
  mediaUrl?: string | null;
  inlineButtons?: string | null;
}

interface PostComposerModalProps {
  isOpen: boolean;
  onClose: () => void;
  channels: ChannelItem[];
  templates: TemplateItem[];
  initialPost?: any;
  onSave: (postData: any) => Promise<void>;
  isSubmitting: boolean;
}

export function PostComposerModal({
  isOpen,
  onClose,
  channels,
  templates,
  initialPost,
  onSave,
  isSubmitting,
}: PostComposerModalProps) {
  // Form state
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [parseMode, setParseMode] = useState("HTML");
  const [selectedChannelIds, setSelectedChannelIds] = useState<string[]>([]);
  const [mediaType, setMediaType] = useState<"none" | "photo" | "video" | "document">("none");
  const [mediaUrl, setMediaUrl] = useState("");
  const [inlineButtons, setInlineButtons] = useState<
    Array<{ text: string; url: string; row?: number }>
  >([]);

  // Media upload & Google Drive decoder state
  const [mediaSource, setMediaSource] = useState<"url" | "upload">("url");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadedFileMeta, setUploadedFileMeta] = useState<{
    name: string;
    size: number;
    mimeType?: string;
  } | null>(null);
  const [googleDriveMeta, setGoogleDriveMeta] = useState<DecodedMediaResult | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Delivery settings
  const [deliveryMode, setDeliveryMode] = useState<"now" | "schedule" | "recurring">("schedule");
  const [scheduledDateTime, setScheduledDateTime] = useState("");
  const [recurrenceRule, setRecurrenceRule] = useState<"daily" | "weekly" | "interval_hours">("daily");
  const [recurrenceDays, setRecurrenceDays] = useState<string[]>(["MON", "WED", "FRI"]);
  const [recurrenceTime, setRecurrenceTime] = useState("09:00");
  const [recurrenceIntervalHours, setRecurrenceIntervalHours] = useState(6);
  const [recurrenceEndDate, setRecurrenceEndDate] = useState("");

  // Flags
  const [isPinned, setIsPinned] = useState(false);
  const [isSilent, setIsSilent] = useState(false);
  const [disablePreview, setDisablePreview] = useState(false);

  // Template picker state
  const [showTemplateMenu, setShowTemplateMenu] = useState(false);

  // Spintax test preview state
  const [spintaxSeed, setSpintaxSeed] = useState(0);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Group buttons by row for live preview (hook declared at top level)
  const buttonRows = useMemo(() => {
    const rowMap = new Map<number, Array<{ text: string; url: string; row?: number }>>();
    inlineButtons.forEach((btn) => {
      const r = btn.row || 1;
      if (!rowMap.has(r)) rowMap.set(r, []);
      rowMap.get(r)!.push(btn);
    });
    const sortedRowKeys = Array.from(rowMap.keys()).sort((a, b) => a - b);
    return sortedRowKeys.map((k) => rowMap.get(k)!);
  }, [inlineButtons]);

  // Initialize form when opened or editing
  useEffect(() => {
    if (!isOpen) return;

    if (initialPost) {
      setTitle(initialPost.title || "");
      setContent(initialPost.content || "");
      setParseMode(initialPost.parseMode || "HTML");
      setMediaType(initialPost.mediaType || "none");
      setMediaUrl(initialPost.mediaUrl || "");
      setIsPinned(Boolean(initialPost.isPinned));
      setIsSilent(Boolean(initialPost.isSilent));
      setDisablePreview(Boolean(initialPost.disablePreview));

      // Media initialization
      if (initialPost.mediaUrl) {
        if (initialPost.mediaUrl.startsWith("/uploads/")) {
          setMediaSource("upload");
          setUploadedFileMeta({
            name: initialPost.mediaUrl.split("/").pop() || "Uploaded media",
            size: 0,
          });
          setGoogleDriveMeta(null);
        } else {
          setMediaSource("url");
          const decoded = decodeGoogleDriveUrl(initialPost.mediaUrl, initialPost.mediaType);
          if (decoded.isGoogleDrive) {
            setGoogleDriveMeta(decoded);
          } else {
            setGoogleDriveMeta(null);
          }
        }
      } else {
        setMediaSource("url");
        setUploadedFileMeta(null);
        setGoogleDriveMeta(null);
      }

      // Channels
      if (initialPost.targets) {
        setSelectedChannelIds(initialPost.targets.map((t: any) => t.channelId || t.channel?.id));
      }

      // Buttons with row preservation
      if (initialPost.inlineButtons) {
        try {
          const parsed = JSON.parse(initialPost.inlineButtons);
          if (Array.isArray(parsed)) {
            if (Array.isArray(parsed[0])) {
              const flatWithRows: Array<{ text: string; url: string; row: number }> = [];
              parsed.forEach((rowArray: any[], rowIdx: number) => {
                if (Array.isArray(rowArray)) {
                  rowArray.forEach((btn: any) => {
                    if (btn && typeof btn === "object") {
                      flatWithRows.push({
                        text: btn.text || "",
                        url: btn.url || "",
                        row: rowIdx + 1,
                      });
                    }
                  });
                }
              });
              setInlineButtons(flatWithRows);
            } else {
              setInlineButtons(
                parsed.map((b: any, i: number) => ({
                  text: b.text || "",
                  url: b.url || "",
                  row: Math.floor(i / 2) + 1,
                }))
              );
            }
          }
        } catch {
          setInlineButtons([]);
        }
      }

      // Delivery mode
      if (initialPost.isRecurring) {
        setDeliveryMode("recurring");
        setRecurrenceRule(initialPost.recurrenceRule || "daily");
        if (initialPost.recurrenceDays) {
          try {
            setRecurrenceDays(JSON.parse(initialPost.recurrenceDays));
          } catch {}
        }
        if (initialPost.recurrenceTime) setRecurrenceTime(initialPost.recurrenceTime);
        if (initialPost.recurrenceIntervalHours)
          setRecurrenceIntervalHours(initialPost.recurrenceIntervalHours);
      } else {
        setDeliveryMode("schedule");
        if (initialPost.scheduledAt) {
          const d = new Date(initialPost.scheduledAt);
          // format YYYY-MM-DDTHH:mm
          const localIso = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
            .toISOString()
            .slice(0, 16);
          setScheduledDateTime(localIso);
        }
      }
    } else {
      // Default new post: scheduled 1 hour in the future
      setTitle("");
      setContent("");
      setParseMode("HTML");
      setMediaType("none");
      setMediaUrl("");
      setMediaSource("url");
      setUploadedFileMeta(null);
      setGoogleDriveMeta(null);
      setUploadError(null);
      setInlineButtons([]);
      setIsPinned(false);
      setIsSilent(false);
      setDisablePreview(false);
      setDeliveryMode("schedule");

      // Default to all channels
      setSelectedChannelIds(channels.map((c) => c.id));

      const future = new Date(Date.now() + 60 * 60 * 1000);
      const localIso = new Date(future.getTime() - future.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16);
      setScheduledDateTime(localIso);
    }
  }, [isOpen, initialPost, channels]);

  // Handle media URL change with auto Google Drive link decoder
  const handleMediaUrlChange = (val: string) => {
    const trimmed = val.trim();
    setMediaUrl(val);

    if (!trimmed) {
      setGoogleDriveMeta(null);
      return;
    }

    const decoded = decodeGoogleDriveUrl(trimmed, mediaType);
    if (decoded.isGoogleDrive) {
      setGoogleDriveMeta(decoded);
      // Auto-update to direct stream URL if user pasted raw sharing link
      if (decoded.directUrl && decoded.directUrl !== trimmed) {
        setMediaUrl(decoded.directUrl);
      }
    } else {
      setGoogleDriveMeta(null);
    }
  };

  // Explicit Google Drive decoding trigger
  const triggerDecodeDrive = () => {
    if (!mediaUrl.trim()) return;
    const decoded = decodeGoogleDriveUrl(mediaUrl.trim(), mediaType);
    if (decoded.isGoogleDrive) {
      setGoogleDriveMeta(decoded);
      setMediaUrl(decoded.directUrl);
    } else {
      alert("No Google Drive sharing link detected. Ensure the URL is a valid Google Drive file link.");
    }
  };

  // Upload local media file handler
  const uploadFile = async (file: File) => {
    setUploadError(null);
    setIsUploading(true);

    try {
      if (file.size > 50 * 1024 * 1024) {
        throw new Error("File size exceeds 50MB limit allowed by Telegram Bot API.");
      }

      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || "Failed to upload media file.");
      }

      setMediaUrl(data.url);
      setUploadedFileMeta({
        name: data.fileName,
        size: data.size,
        mimeType: data.mimeType,
      });

      // Automatically adjust mediaType if currently "none"
      if (mediaType === "none" || (data.detectedType && mediaType !== data.detectedType)) {
        setMediaType(data.detectedType);
      }
    } catch (err: any) {
      setUploadError(err.message || "Failed to upload file.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      uploadFile(file);
    }
  };

  const removeMediaAttachment = () => {
    setMediaUrl("");
    setUploadedFileMeta(null);
    setGoogleDriveMeta(null);
    setUploadError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Insert tag helper
  const insertTag = (openTag: string, closeTag: string) => {
    if (!textareaRef.current) return;
    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;
    const selected = content.substring(start, end);
    const replacement = `${openTag}${selected || "text"}${closeTag}`;
    const newContent =
      content.substring(0, start) + replacement + content.substring(end);
    setContent(newContent);
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(
          start + openTag.length,
          start + openTag.length + (selected.length || 4)
        );
      }
    }, 50);
  };

  const insertSpintax = () => {
    if (!textareaRef.current) return;
    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;
    const selected = content.substring(start, end);
    const replacement = selected
      ? `{${selected}|Alternative Option}`
      : `{🔥 Hot Deal|⚡ Exclusive Promo|🎉 Special Offer}`;
    const newContent =
      content.substring(0, start) + replacement + content.substring(end);
    setContent(newContent);
  };

  const loadTemplate = (tmpl: TemplateItem) => {
    setTitle(tmpl.title);
    setContent(tmpl.content);
    setParseMode(tmpl.parseMode || "HTML");
    setMediaType((tmpl.mediaType as any) || "none");
    setMediaUrl(tmpl.mediaUrl || "");

    if (tmpl.mediaUrl) {
      if (tmpl.mediaUrl.startsWith("/uploads/")) {
        setMediaSource("upload");
        setUploadedFileMeta({
          name: tmpl.mediaUrl.split("/").pop() || "Attached File",
          size: 0,
        });
        setGoogleDriveMeta(null);
      } else {
        setMediaSource("url");
        const decoded = decodeGoogleDriveUrl(tmpl.mediaUrl, tmpl.mediaType);
        if (decoded.isGoogleDrive) {
          setGoogleDriveMeta(decoded);
        } else {
          setGoogleDriveMeta(null);
        }
      }
    } else {
      setMediaSource("url");
      setUploadedFileMeta(null);
      setGoogleDriveMeta(null);
    }

    if (tmpl.inlineButtons) {
      try {
        const parsed = JSON.parse(tmpl.inlineButtons);
        if (Array.isArray(parsed)) {
          if (Array.isArray(parsed[0])) {
            const flatWithRows: Array<{ text: string; url: string; row: number }> = [];
            parsed.forEach((rowArray: any[], rowIdx: number) => {
              if (Array.isArray(rowArray)) {
                rowArray.forEach((btn: any) => {
                  if (btn && typeof btn === "object") {
                    flatWithRows.push({
                      text: btn.text || "",
                      url: btn.url || "",
                      row: rowIdx + 1,
                    });
                  }
                });
              }
            });
            setInlineButtons(flatWithRows);
          } else {
            setInlineButtons(
              parsed.map((b: any, i: number) => ({
                text: b.text || "",
                url: b.url || "",
                row: Math.floor(i / 2) + 1,
              }))
            );
          }
        }
      } catch {
        setInlineButtons([]);
      }
    }
    setShowTemplateMenu(false);
  };

  const toggleChannel = (id: string) => {
    setSelectedChannelIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const selectAllChannels = () => {
    setSelectedChannelIds(channels.map((c) => c.id));
  };

  const deselectAllChannels = () => {
    setSelectedChannelIds([]);
  };

  const addButton = () => {
    setInlineButtons((prev) => {
      const lastBtn = prev[prev.length - 1];
      let nextRow = 1;
      if (lastBtn) {
        const currentRow = lastBtn.row || 1;
        const countInCurrentRow = prev.filter((b) => (b.row || 1) === currentRow).length;
        if (countInCurrentRow >= 2) {
          nextRow = currentRow + 1;
        } else {
          nextRow = currentRow;
        }
      }
      return [...prev, { text: "Learn More", url: "https://", row: nextRow }];
    });
  };

  const updateButton = (
    index: number,
    field: "text" | "url" | "row",
    value: string | number
  ) => {
    setInlineButtons((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const removeButton = (index: number) => {
    setInlineButtons((prev) => prev.filter((_, i) => i !== index));
  };

  const toggleDay = (day: string) => {
    setRecurrenceDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const handleSubmit = async (isDraft = false) => {
    if (!content.trim()) {
      alert("Please enter message content.");
      return;
    }
    if (!isDraft && selectedChannelIds.length === 0) {
      alert("Please select at least one channel or group.");
      return;
    }

    // Group buttons into 2D row array for Telegram Bot API
    const rowMap = new Map<number, Array<{ text: string; url: string }>>();
    inlineButtons.forEach((btn) => {
      if (btn.text.trim() && btn.url.trim()) {
        const r = btn.row || 1;
        if (!rowMap.has(r)) rowMap.set(r, []);
        rowMap.get(r)!.push({ text: btn.text.trim(), url: btn.url.trim() });
      }
    });
    const sortedRowKeys = Array.from(rowMap.keys()).sort((a, b) => a - b);
    const formattedKeyboard = sortedRowKeys.map((k) => rowMap.get(k)!);

    const payload = {
      id: initialPost?.id,
      title: title || undefined,
      content,
      parseMode,
      mediaType,
      mediaUrl: mediaType !== "none" ? mediaUrl : null,
      inlineButtons: formattedKeyboard.length > 0 ? formattedKeyboard : null,
      channelIds: selectedChannelIds,
      isPinned,
      isSilent,
      disablePreview,
      sendNow: deliveryMode === "now" && !isDraft,
      isDraft,
      scheduledAt:
        deliveryMode === "schedule" && scheduledDateTime
          ? new Date(scheduledDateTime).toISOString()
          : undefined,
      isRecurring: deliveryMode === "recurring",
      recurrenceRule: deliveryMode === "recurring" ? recurrenceRule : undefined,
      recurrenceDays:
        deliveryMode === "recurring" &&
        (recurrenceRule === "weekly" || (recurrenceRule as string) === "custom_days")
          ? recurrenceDays
          : undefined,
      recurrenceTime: deliveryMode === "recurring" ? recurrenceTime : undefined,
      recurrenceIntervalHours:
        deliveryMode === "recurring" && recurrenceRule === "interval_hours"
          ? recurrenceIntervalHours
          : undefined,
      recurrenceEndDate:
        deliveryMode === "recurring" && recurrenceEndDate
          ? new Date(recurrenceEndDate).toISOString()
          : undefined,
    };

    await onSave(payload);
  };

  if (!isOpen) return null;

  // Preview computed text with spintax evaluated
  const previewContent = parseSpintax(content);
  const selectedChannelsInfo = channels.filter((c) =>
    selectedChannelIds.includes(c.id)
  );
  const firstChannel = selectedChannelsInfo[0] || channels[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-5xl rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-8 flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Send className="w-5 h-5 -rotate-12" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {initialPost ? "Edit Scheduled Post" : "Create Telegram Broadcast"}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Compose once, schedule precisely, broadcast across channels
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Template loader */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowTemplateMenu(!showTemplateMenu)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 text-xs font-semibold transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
                <span>Load Template</span>
                <ChevronDown className="w-3 h-3" />
              </button>

              {showTemplateMenu && (
                <div className="absolute right-0 mt-2 w-64 rounded-xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700 shadow-xl py-2 z-50">
                  <div className="px-3 py-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Choose Template
                  </div>
                  {templates.map((tmpl) => (
                    <button
                      key={tmpl.id}
                      onClick={() => loadTemplate(tmpl)}
                      className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:text-blue-600 hover:bg-blue-50 dark:text-slate-200 dark:hover:bg-blue-600/20 dark:hover:text-blue-300 flex items-center justify-between transition-colors"
                    >
                      <span className="truncate">{tmpl.title}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                        {tmpl.category}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:text-white dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body: Two Column (Editor on Left, Live Mockup on Right) */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 p-6 overflow-y-auto">
          {/* Left Column: Form & Settings (7 cols) */}
          <div className="lg:col-span-7 space-y-5">
            {/* Target Channels Selector */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Tv className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  Target Channels & Groups ({selectedChannelIds.length}/{channels.length})
                </label>
                <div className="space-x-2 text-[11px]">
                  <button
                    type="button"
                    onClick={selectAllChannels}
                    className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
                  >
                    Select All
                  </button>
                  <span className="text-slate-400 dark:text-slate-600">•</span>
                  <button
                    type="button"
                    onClick={deselectAllChannels}
                    className="text-slate-500 dark:text-slate-400 hover:underline font-medium"
                  >
                    Clear
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-36 overflow-y-auto p-2 rounded-xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 scrollbar-thin">
                {channels.map((chan) => {
                  const isSelected = selectedChannelIds.includes(chan.id);
                  return (
                    <div
                      key={chan.id}
                      onClick={() => toggleChannel(chan.id)}
                      className={`flex items-center gap-2.5 p-2 rounded-lg cursor-pointer border text-xs transition-all ${
                        isSelected
                          ? "bg-blue-50 dark:bg-blue-600/15 border-blue-500/50 text-slate-900 dark:text-white"
                          : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800/80 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700"
                      }`}
                    >
                      <div
                        className={`w-4 h-4 rounded flex items-center justify-center border transition-colors ${
                          isSelected
                            ? "bg-blue-600 border-blue-600 text-white"
                            : "border-slate-300 bg-slate-100 dark:border-slate-700 dark:bg-slate-800"
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                      <div className="truncate flex-1">
                        <div className="font-medium truncate text-slate-900 dark:text-white">
                          {chan.title}
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                          {chan.type} • {chan.memberCount.toLocaleString()} members
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Post Title / Label */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Internal Post Title / Campaign Tag
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Flash Sale 48H Promo / Daily Morning Quote"
                className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white text-xs placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            {/* Content & Formatting Toolbar */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Message Content (HTML & Spintax supported)
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    {content.length} / {mediaType !== "none" ? "1024" : "4096"}
                  </span>
                </div>
              </div>

              {/* Formatting Toolbar */}
              <div className="flex flex-wrap items-center gap-1 p-1.5 bg-slate-50 dark:bg-slate-950 border-t border-x border-slate-300 dark:border-slate-800 rounded-t-xl text-slate-600 dark:text-slate-400 text-xs">
                <button
                  type="button"
                  onClick={() => insertTag("<b>", "</b>")}
                  title="Bold"
                  className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
                >
                  <Bold className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => insertTag("<i>", "</i>")}
                  title="Italic"
                  className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
                >
                  <Italic className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => insertTag("<code>", "</code>")}
                  title="Monospace"
                  className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
                >
                  <Code className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => insertTag("<tg-spoiler>", "</tg-spoiler>")}
                  title="Spoiler"
                  className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
                >
                  <EyeOff className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => insertTag("<u>", "</u>")}
                  title="Underline"
                  className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
                >
                  <Underline className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => insertTag("<s>", "</s>")}
                  title="Strikethrough"
                  className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
                >
                  <Strikethrough className="w-3.5 h-3.5" />
                </button>
                <div className="w-[1px] h-4 bg-slate-300 dark:bg-slate-800 mx-1" />
                <button
                  type="button"
                  onClick={() => {
                    const url = prompt("Enter Link URL:", "https://");
                    if (url) insertTag(`<a href="${url}">`, "</a>");
                  }}
                  title="Hyperlink"
                  className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white flex items-center gap-1"
                >
                  <LinkIcon className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={insertSpintax}
                  title="Insert Spintax Variation"
                  className="p-1.5 px-2 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 font-mono text-[11px] font-semibold flex items-center gap-1"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>{`{Spintax}`}</span>
                </button>
              </div>

              {/* Textarea */}
              <textarea
                ref={textareaRef}
                rows={5}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Write your Telegram message here... Use <b>bold</b>, <i>italic</i>, or {Hello|Hi|Greetings} for dynamic variations."
                className="w-full px-3.5 py-3 rounded-b-xl bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white font-mono text-xs placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            {/* Media Attachment Selector */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-sky-500 dark:text-sky-400" />
                  Media Attachment
                </label>
                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900 p-0.5 rounded-lg border border-slate-200 dark:border-slate-800 text-xs">
                  {(["none", "photo", "video", "document"] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setMediaType(t)}
                      className={`px-2 py-1 rounded-md capitalize text-[11px] font-medium transition-colors ${
                        mediaType === t
                          ? "bg-blue-600 text-white"
                          : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {mediaType !== "none" && (
                <div className="space-y-3 pt-1">
                  {/* Source Toggle: URL vs Upload */}
                  <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
                    <button
                      type="button"
                      onClick={() => setMediaSource("url")}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg font-medium text-xs transition-all ${
                        mediaSource === "url"
                          ? "bg-blue-600 text-white shadow-sm"
                          : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                      }`}
                    >
                      <Globe className="w-3.5 h-3.5" />
                      <span>URL / Cloud Link</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setMediaSource("upload")}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg font-medium text-xs transition-all ${
                        mediaSource === "upload"
                          ? "bg-blue-600 text-white shadow-sm"
                          : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                      }`}
                    >
                      <UploadCloud className="w-3.5 h-3.5" />
                      <span>Upload Local File</span>
                    </button>
                  </div>

                  {/* Mode 1: URL / Cloud Link */}
                  {mediaSource === "url" && (
                    <div className="space-y-2">
                      <div className="relative flex items-center">
                        <input
                          type="url"
                          value={mediaUrl}
                          onChange={(e) => handleMediaUrlChange(e.target.value)}
                          placeholder={
                            mediaType === "photo"
                              ? "Paste image URL or Google Drive share link (e.g. drive.google.com/file/d/...)"
                              : mediaType === "video"
                              ? "Paste video URL or Google Drive link (.mp4, .mov, etc.)"
                              : "Paste document URL or Google Drive link (.pdf, .zip, etc.)"
                          }
                          className="w-full pl-3 pr-28 py-2 rounded-lg bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white text-xs placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                        />
                        {mediaUrl.trim() && (
                          <div className="absolute right-1.5 flex items-center gap-1">
                            <button
                              type="button"
                              onClick={triggerDecodeDrive}
                              title="Decode Google Drive link"
                              className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-sky-600 border border-slate-200 dark:bg-slate-850 dark:hover:bg-slate-800 dark:text-sky-400 dark:border-slate-700 text-[10px] font-medium flex items-center gap-1 transition-colors"
                            >
                              <HardDrive className="w-3 h-3" />
                              <span>Decode</span>
                            </button>
                            <button
                              type="button"
                              onClick={removeMediaAttachment}
                              className="p-1 rounded text-slate-400 hover:text-rose-500"
                              title="Clear URL"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Google Drive Decoder Badge & Controls */}
                      {googleDriveMeta?.isGoogleDrive && (
                        <div className="rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/50 p-3 space-y-2 text-xs">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300 font-semibold">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                              <span>Google Drive Link Decoded!</span>
                            </div>
                            <span className="text-[10px] px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 font-mono border border-blue-300 dark:border-blue-700/50">
                              ID: {googleDriveMeta.fileId?.slice(0, 10)}...
                            </span>
                          </div>

                          <p className="text-[11px] text-slate-600 dark:text-slate-300">
                            Converted Google Drive sharing link into a direct stream URL for instant preview and Telegram Bot delivery.
                          </p>

                          <div className="flex flex-wrap items-center gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => {
                                if (googleDriveMeta.thumbnailUrl) {
                                  setMediaUrl(googleDriveMeta.thumbnailUrl);
                                }
                              }}
                              className={`px-2.5 py-1 rounded-md text-[11px] font-medium border transition-colors ${
                                mediaUrl.includes("thumbnail")
                                  ? "bg-blue-600 border-blue-500 text-white"
                                  : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                              }`}
                            >
                              Direct Image Stream (Web/HD)
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (googleDriveMeta.downloadUrl) {
                                  setMediaUrl(googleDriveMeta.downloadUrl);
                                }
                              }}
                              className={`px-2.5 py-1 rounded-md text-[11px] font-medium border transition-colors ${
                                mediaUrl.includes("uc?export=download")
                                  ? "bg-blue-600 border-blue-500 text-white"
                                  : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                              }`}
                            >
                              Direct Binary Stream (UC Download)
                            </button>
                          </div>

                          <div className="flex items-start gap-1.5 pt-1 text-[10px] text-amber-800 dark:text-amber-300/90 bg-amber-50 dark:bg-amber-500/10 p-2 rounded-lg border border-amber-200 dark:border-amber-500/20">
                            <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                            <span>
                              Make sure this file in Google Drive has General Access set to <strong>&ldquo;Anyone with the link can view&rdquo;</strong> so Telegram&apos;s servers can access it.
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Mode 2: Upload Local File */}
                  {mediaSource === "upload" && (
                    <div className="space-y-2">
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileInputChange}
                        accept={
                          mediaType === "photo"
                            ? "image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
                            : mediaType === "video"
                            ? "video/mp4,video/quicktime,video/webm,video/x-matroska"
                            : "application/pdf,.doc,.docx,.xls,.xlsx,.zip,.txt,application/zip"
                        }
                        className="hidden"
                      />

                      {/* Loading State */}
                      {isUploading && (
                        <div className="p-6 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center gap-2">
                          <Loader2 className="w-6 h-6 text-blue-600 dark:text-blue-400 animate-spin" />
                          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                            Uploading media file to server...
                          </span>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400">
                            Saving to local storage for direct Telegram delivery
                          </span>
                        </div>
                      )}

                      {/* Uploaded File Card */}
                      {!isUploading && mediaUrl && (uploadedFileMeta || mediaUrl.startsWith("/uploads/")) && (
                        <div className="p-3 rounded-xl bg-emerald-50/60 dark:bg-slate-950 border border-emerald-500/30 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                              {mediaType === "photo" ? (
                                <ImageIcon className="w-5 h-5" />
                              ) : mediaType === "video" ? (
                                <Film className="w-5 h-5" />
                              ) : (
                                <FileText className="w-5 h-5" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs font-semibold text-slate-900 dark:text-white truncate flex items-center gap-1.5">
                                <span>
                                  {uploadedFileMeta?.name ||
                                    mediaUrl.split("/").pop() ||
                                    "Uploaded File"}
                                </span>
                                <span className="px-1.5 py-0.2 rounded text-[10px] bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-medium">
                                  Uploaded
                                </span>
                              </div>
                              <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-2">
                                <span>
                                  {uploadedFileMeta?.size
                                    ? formatFileSize(uploadedFileMeta.size)
                                    : "Saved on Server"}
                                </span>
                                <span>•</span>
                                <span className="text-sky-600 dark:text-sky-400 truncate">{mediaUrl}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => fileInputRef.current?.click()}
                              className="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-850 dark:hover:bg-slate-800 dark:text-slate-200 dark:border-slate-700 text-xs font-medium transition-colors"
                            >
                              Replace
                            </button>
                            <button
                              type="button"
                              onClick={removeMediaAttachment}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-850 transition-colors"
                              title="Remove file"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Dropzone (When nothing is uploaded yet or replacing) */}
                      {!isUploading && (!mediaUrl || (!uploadedFileMeta && !mediaUrl.startsWith("/uploads/"))) && (
                        <div
                          onClick={() => fileInputRef.current?.click()}
                          onDragOver={handleDragOver}
                          onDragLeave={handleDragLeave}
                          onDrop={handleDrop}
                          className={`p-6 rounded-xl border-2 border-dashed cursor-pointer transition-all flex flex-col items-center justify-center text-center gap-2 ${
                            isDragging
                              ? "bg-blue-50 dark:bg-blue-600/10 border-blue-500 text-blue-600 dark:text-blue-300"
                              : "bg-slate-50 dark:bg-slate-950/60 border-slate-300 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-700 text-slate-500 dark:text-slate-400"
                          }`}
                        >
                          <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                            <UploadCloud className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                              Click to browse or drag &amp; drop file here
                            </p>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                              {mediaType === "photo" && "Supports JPG, PNG, WebP, GIF (up to 50MB)"}
                              {mediaType === "video" && "Supports MP4, MOV, WebM, MKV (up to 50MB)"}
                              {mediaType === "document" && "Supports PDF, DOC, DOCX, ZIP, TXT (up to 50MB)"}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Upload Error Banner */}
                      {uploadError && (
                        <div className="flex items-center gap-2 p-2.5 rounded-lg bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-700 dark:text-rose-300 text-xs">
                          <AlertCircle className="w-4 h-4 shrink-0" />
                          <span>{uploadError}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Interactive Inline Buttons Builder */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <LinkIcon className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  Inline Action Buttons ({inlineButtons.length})
                </label>
                <button
                  type="button"
                  onClick={addButton}
                  className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Button</span>
                </button>
              </div>

              {inlineButtons.length === 0 ? (
                <p className="text-[11px] text-slate-500 dark:text-slate-400 italic">
                  No interactive buttons added. Click &quot;Add Button&quot; to include clickable links under your post.
                </p>
              ) : (
                <div className="space-y-2">
                  {inlineButtons.map((btn, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <select
                        value={btn.row || 1}
                        onChange={(e) => updateButton(idx, "row", Number(e.target.value))}
                        title="Button Row"
                        className="px-2 py-1.5 rounded-lg bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white text-xs font-semibold focus:outline-none focus:border-blue-500 shrink-0"
                      >
                        <option value={1}>Row 1</option>
                        <option value={2}>Row 2</option>
                        <option value={3}>Row 3</option>
                        <option value={4}>Row 4</option>
                      </select>
                      <input
                        type="text"
                        value={btn.text}
                        onChange={(e) => updateButton(idx, "text", e.target.value)}
                        placeholder="Button Title (e.g. Claim Offer)"
                        className="flex-1 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white text-xs placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-blue-500"
                      />
                      <input
                        type="url"
                        value={btn.url}
                        onChange={(e) => updateButton(idx, "url", e.target.value)}
                        placeholder="https://yourwebsite.com"
                        className="flex-1 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white text-xs placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-blue-500"
                      />
                      <button
                        type="button"
                        onClick={() => removeButton(idx)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Delivery Timing & Scheduling */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 space-y-3">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                Delivery Schedule
              </label>

              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "now", label: "Send Now", icon: Send },
                  { id: "schedule", label: "Schedule Date", icon: Calendar },
                  { id: "recurring", label: "Recurring", icon: Repeat },
                ].map((mode) => {
                  const Icon = mode.icon;
                  return (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => setDeliveryMode(mode.id as any)}
                      className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg border text-xs font-semibold transition-all ${
                        deliveryMode === mode.id
                          ? "bg-blue-600/20 border-blue-500 text-blue-600 dark:text-blue-400"
                          : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{mode.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Schedule For Later controls */}
              {deliveryMode === "schedule" && (
                <div className="pt-2">
                  <label className="block text-[11px] text-slate-600 dark:text-slate-400 mb-1">
                    Publish Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    value={scheduledDateTime}
                    onChange={(e) => setScheduledDateTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>
              )}

              {/* Recurring schedule controls */}
              {deliveryMode === "recurring" && (
                <div className="pt-2 space-y-3">
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: "daily", label: "Every Day" },
                      { id: "weekly", label: "Specific Days" },
                      { id: "interval_hours", label: "Hourly Interval" },
                    ].map((r) => (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => setRecurrenceRule(r.id as any)}
                        className={`py-1.5 rounded-lg text-[11px] font-semibold border ${
                          recurrenceRule === r.id
                            ? "bg-purple-50 dark:bg-purple-600/20 border-purple-500 text-purple-700 dark:text-purple-300"
                            : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400"
                        }`}
                      >
                        {r.label}
                      </button>
                    ))}
                  </div>

                  {recurrenceRule === "daily" && (
                    <div>
                      <label className="block text-[11px] text-slate-600 dark:text-slate-400 mb-1">
                        Post Time (Every Day)
                      </label>
                      <input
                        type="time"
                        value={recurrenceTime}
                        onChange={(e) => setRecurrenceTime(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white text-xs"
                      />
                    </div>
                  )}

                  {recurrenceRule === "weekly" && (
                    <div>
                      <label className="block text-[11px] text-slate-600 dark:text-slate-400 mb-1.5">
                        Select Days of the Week
                      </label>
                      <div className="flex items-center gap-1.5">
                        {["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"].map((d) => {
                          const isDaySelected = recurrenceDays.includes(d);
                          return (
                            <button
                              key={d}
                              type="button"
                              onClick={() => toggleDay(d)}
                              className={`flex-1 py-1 rounded text-[10px] font-bold border transition-colors ${
                                isDaySelected
                                  ? "bg-purple-600 border-purple-500 text-white"
                                  : "bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400"
                              }`}
                            >
                              {d}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {recurrenceRule === "interval_hours" && (
                    <div>
                      <label className="block text-[11px] text-slate-600 dark:text-slate-400 mb-1">
                        Repeat Every X Hours
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={168}
                        value={recurrenceIntervalHours}
                        onChange={(e) =>
                          setRecurrenceIntervalHours(Number(e.target.value))
                        }
                        className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white text-xs"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Telegram Specific Flags */}
            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 dark:text-slate-400 pt-1">
              <label className="flex items-center gap-2 cursor-pointer hover:text-slate-900 dark:hover:text-slate-200">
                <input
                  type="checkbox"
                  checked={isPinned}
                  onChange={(e) => setIsPinned(e.target.checked)}
                  className="rounded border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-blue-600 focus:ring-0"
                />
                <Pin className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span>Pin in Channel</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer hover:text-slate-900 dark:hover:text-slate-200">
                <input
                  type="checkbox"
                  checked={isSilent}
                  onChange={(e) => setIsSilent(e.target.checked)}
                  className="rounded border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-blue-600 focus:ring-0"
                />
                <BellOff className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
                <span>Silent Notification</span>
              </label>
            </div>
          </div>

          {/* Right Column: Live Telegram Mockup Preview (5 cols) */}
          <div className="lg:col-span-5 flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Smartphone className="w-3.5 h-3.5 text-sky-400" />
                Live Telegram Mockup Preview
              </span>
              {content.includes("{") && (
                <button
                  type="button"
                  onClick={() => setSpintaxSeed((s) => s + 1)}
                  className="flex items-center gap-1 text-[11px] text-amber-400 hover:underline"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>Re-roll Spintax</span>
                </button>
              )}
            </div>

            {/* Telegram Phone Simulator Frame */}
            <div className="telegram-mockup-screen flex-1 rounded-2xl bg-[#0e1621] border border-slate-800 p-4 flex flex-col shadow-inner min-h-[380px]">
              {/* Telegram Channel Header */}
              <div className="flex items-center gap-3 pb-3 border-b border-slate-800/80 mb-4">
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-sky-400 flex items-center justify-center font-bold text-white text-xs overflow-hidden">
                  {firstChannel?.avatarUrl ? (
                    <img
                      src={firstChannel.avatarUrl}
                      alt="avatar"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    firstChannel?.title?.charAt(0) || "T"
                  )}
                </div>
                <div className="truncate flex-1">
                  <div className="text-xs font-semibold text-white truncate flex items-center gap-1">
                    <span>{firstChannel?.title || "Telegram Channel"}</span>
                    <span className="text-sky-400 text-[10px]">✓</span>
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {firstChannel?.memberCount
                      ? `${firstChannel.memberCount.toLocaleString()} subscribers`
                      : "Channel preview"}
                  </div>
                </div>
              </div>

              {/* Message Bubble Container */}
              <div className="flex-1 flex flex-col justify-end space-y-2">
                <div className="max-w-[95%] rounded-2xl rounded-bl-sm bg-[#182533] border border-[#232e3c] text-white overflow-hidden shadow-md">
                  {/* Photo attachment preview */}
                  {mediaType === "photo" && mediaUrl && (
                    <div className="w-full max-h-56 bg-slate-900 overflow-hidden relative">
                      <img
                        src={mediaUrl}
                        alt="attachment"
                        className="w-full h-full max-h-56 object-cover"
                        onError={(e) => {
                          (e.target as any).src =
                            "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800";
                        }}
                      />
                    </div>
                  )}

                  {/* Video attachment preview */}
                  {mediaType === "video" && mediaUrl && (
                    <div className="w-full max-h-56 bg-black overflow-hidden flex items-center justify-center relative">
                      <video
                        src={mediaUrl}
                        controls
                        className="w-full max-h-56 object-contain"
                      />
                    </div>
                  )}

                  {/* Document attachment preview */}
                  {mediaType === "document" && mediaUrl && (
                    <div className="p-3 bg-[#1e2c3a] border-b border-[#2b3a4a] flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#5288c1] flex items-center justify-center text-white shrink-0 shadow">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold text-white truncate">
                          {uploadedFileMeta?.name ||
                            mediaUrl.split("/").pop() ||
                            "Attached Document"}
                        </div>
                        <div className="text-[10px] text-slate-400 flex items-center gap-1.5">
                          <span>
                            {uploadedFileMeta?.size
                              ? formatFileSize(uploadedFileMeta.size)
                              : "Document"}
                          </span>
                          <span>•</span>
                          <span className="text-sky-400">Telegram File</span>
                        </div>
                      </div>
                      <a
                        href={mediaUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1.5 rounded-lg bg-[#2b3a4a] hover:bg-[#354659] text-sky-300 transition-colors"
                        title="Download/view document"
                      >
                        <Download className="w-4 h-4" />
                      </a>
                    </div>
                  )}

                  {/* Bubble Content Body */}
                  <div className="p-3.5 space-y-2">
                    {previewContent ? (
                      <div
                        className="text-xs leading-relaxed text-slate-100 whitespace-pre-wrap break-words font-sans [&>b]:font-bold [&>i]:italic [&>code]:bg-[#0e1621] [&>code]:px-1 [&>code]:py-0.5 [&>code]:rounded [&>code]:font-mono [&>a]:text-[#6ab2f2] [&>a]:underline"
                        dangerouslySetInnerHTML={{
                          __html: previewContent,
                        }}
                      />
                    ) : (
                      <span className="text-xs text-slate-500 italic">
                        Type your message to see the real-time Telegram preview here...
                      </span>
                    )}

                    {/* Timestamp & double check */}
                    <div className="flex items-center justify-end gap-1 pt-1 text-[10px] text-slate-400">
                      <span>{new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                      <span className="text-sky-400 font-mono">✓✓</span>
                    </div>
                  </div>
                </div>

                {/* Inline URL Buttons (multi-column rows like native Telegram) */}
                {buttonRows.length > 0 && (
                  <div className="space-y-1.5 max-w-[95%]">
                    {buttonRows.map((row, rowIdx) => (
                      <div key={rowIdx} className="flex items-center gap-1.5 w-full">
                        {row.map((btn, btnIdx) => (
                          <a
                            key={btnIdx}
                            href={btn.url || "#"}
                            target="_blank"
                            rel="noreferrer"
                            className="flex-1 min-w-0 flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl bg-[#2b3a4a] hover:bg-[#344659] text-sky-300 text-xs font-medium border border-[#3e4f62] transition-colors"
                          >
                            <span className="truncate">{btn.text || "Click Here"}</span>
                            <ExternalLink className="w-3 h-3 text-sky-400 opacity-70 shrink-0" />
                          </a>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60">
          <button
            type="button"
            onClick={() => handleSubmit(true)}
            disabled={isSubmitting}
            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 text-xs font-semibold transition-colors"
          >
            Save as Draft
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-100 border border-slate-200 hover:bg-slate-200 text-slate-700 dark:bg-slate-900 dark:border-slate-800 dark:hover:bg-slate-800 dark:text-slate-400 text-xs font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => handleSubmit(false)}
              disabled={isSubmitting}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-500 hover:to-sky-400 text-white text-xs font-semibold shadow-lg shadow-blue-600/30 transition-all active:scale-[0.98] disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              <span>
                {deliveryMode === "now"
                  ? isSubmitting
                    ? "Broadcasting..."
                    : "Broadcast Now"
                  : isSubmitting
                  ? "Scheduling..."
                  : "Schedule Broadcast"}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
