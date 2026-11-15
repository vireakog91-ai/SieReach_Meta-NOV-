"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Radio,
  Send,
  Mic,
  Square,
  Play,
  Pause,
  Image as ImageIcon,
  Paperclip,
  CheckCircle2,
  AlertCircle,
  Clock,
  Search,
  Filter,
  Plus,
  Trash2,
  ChevronDown,
  Sparkles,
  Building2,
  Layers,
  MessageSquare,
  Zap,
  ExternalLink,
  X,
  RotateCcw,
  Volume2,
  Bot,
  User,
  Check,
  RefreshCw,
  Sliders,
  ShieldAlert,
  ArrowRight,
  FileText,
  Smile,
  PanelRightClose,
  PanelRightOpen,
  ChevronRight,
  UserCheck,
} from "lucide-react";
import { HouseItem, DEFAULT_HOUSES } from "@/app/api/houses/route";
import { ComcentConversationItem, ComcentMessageItem, isConversationTakenOver } from "@/app/api/comcent/conversations/route";
import { ResponseTemplateItem, DEFAULT_TEMPLATES } from "@/app/api/response-templates/route";

interface ComcentDashboardTabProps {
  pages: Array<{
    pageId: string;
    name: string;
    category: string;
    businessName?: string;
    avatarUrl?: string | null;
  }>;
  activeBusiness?: string;
  onNavigateToResponseTemplates?: () => void;
}

export function ComcentDashboardTab({
  pages,
  activeBusiness = "ALL",
  onNavigateToResponseTemplates,
}: ComcentDashboardTabProps) {
  // Houses State
  const [houses, setHouses] = useState<HouseItem[]>(DEFAULT_HOUSES);
  const [selectedHouseId, setSelectedHouseId] = useState<string>(DEFAULT_HOUSES[0].id);
  const [isHouseModalOpen, setIsHouseModalOpen] = useState(false);
  const [newHouseName, setNewHouseName] = useState("");
  const [newHouseDesc, setNewHouseDesc] = useState("");
  const [newHouseIcon, setNewHouseIcon] = useState("🏠");
  const [newHousePageIds, setNewHousePageIds] = useState<string[]>([]);
  const [isSavingHouse, setIsSavingHouse] = useState(false);

  // Conversations State
  const [conversations, setConversations] = useState<ComcentConversationItem[]>([]);
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const selectedConvIdRef = useRef<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "attention" | "qualified" | "unread">("all");
  const [showSimulateMenu, setShowSimulateMenu] = useState(false);

  // Templates from Response State (for 1-click Pre-setup dispatch & 3rd Column Library)
  const [templates, setTemplates] = useState<ResponseTemplateItem[]>(DEFAULT_TEMPLATES);
  const [isTemplatePanelOpen, setIsTemplatePanelOpen] = useState(true);
  const [templateSearchQuery, setTemplateSearchQuery] = useState("");
  const [templateFormatFilter, setTemplateFormatFilter] = useState<
    "all" | "generic_card" | "button" | "voice_note" | "quick_replies"
  >("all");

  // Commander Message Input State
  const [manualText, setManualText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [selectedFileUrl, setSelectedFileUrl] = useState<string | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);

  // Manual Voice Recording State for Commander
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [recordedVoiceUrl, setRecordedVoiceUrl] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Playing Audio State
  const [playingAudioUrl, setPlayingAudioUrl] = useState<string | null>(null);
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);

  // Passive Live View Auto-Update State
  const [isLiveActive, setIsLiveActive] = useState(true);
  const [lastLivePing, setLastLivePing] = useState<string>("Just now");
  const [liveToast, setLiveToast] = useState<{ title: string; subtitle: string } | null>(null);
  // Human Takeover State (Pause all Bot Rules for specific customer)
  const [isTakeoverMenuOpen, setIsTakeoverMenuOpen] = useState(false);
  const takeoverMenuRef = useRef<HTMLDivElement>(null);
  const [isUpdatingTakeover, setIsUpdatingTakeover] = useState(false);

  // Close Takeover Menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (takeoverMenuRef.current && !takeoverMenuRef.current.contains(event.target as Node)) {
        setIsTakeoverMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const [isScrolledUp, setIsScrolledUp] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = (smooth = false) => {
    if (!chatContainerRef.current) return;
    if (smooth) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: "smooth",
      });
    } else {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
    setIsScrolledUp(false);
  };

  const handleChatScroll = () => {
    if (!chatContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
    const isUp = scrollHeight - (scrollTop + clientHeight) > 150;
    setIsScrolledUp(isUp);
  };

  // 1. Initial Data Fetch
  const fetchHouses = async () => {
    try {
      const res = await fetch("/api/houses");
      const data = await res.json();
      if (data.success && Array.isArray(data.houses)) {
        setHouses(data.houses);
        if (!selectedHouseId && data.houses[0]) {
          setSelectedHouseId(data.houses[0].id);
        }
      }
    } catch (err) {
      console.warn("Using default houses:", err);
    }
  };

  const fetchTemplates = async () => {
    try {
      const res = await fetch("/api/response-templates");
      const data = await res.json();
      if (data.success && Array.isArray(data.templates) && data.templates.length > 0) {
        setTemplates(data.templates);
      }
    } catch (err) {
      console.warn("Using default response templates:", err);
    }
  };

  const fetchConversations = async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const activeHouse = houses.find((h) => h.id === selectedHouseId) || houses[0];
      const pageIdsParam = activeHouse?.pageIds?.includes("ALL") ? "ALL" : activeHouse?.pageIds?.join(",") || "ALL";

      const res = await fetch(`/api/comcent/conversations?pageIds=${encodeURIComponent(pageIdsParam)}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.conversations)) {
        setConversations(data.conversations);
        setSelectedConvId((currentSelected) => {
          // If user already selected a conversation and it exists in data, ALWAYS KEEP IT!
          if (currentSelected && data.conversations.some((c: ComcentConversationItem) => c.id === currentSelected)) {
            return currentSelected;
          }
          if (selectedConvIdRef.current && data.conversations.some((c: ComcentConversationItem) => c.id === selectedConvIdRef.current)) {
            return selectedConvIdRef.current;
          }
          // Only if no conversation has ever been selected, default to first
          return data.conversations[0]?.id || null;
        });
      }
    } catch (err) {
      console.error("Failed to fetch conversations:", err);
    } finally {
      if (!silent) setIsLoading(false);
      setLastLivePing("Active (Live)");
    }
  };

  useEffect(() => {
    fetchHouses();
    fetchTemplates();
  }, []);

  useEffect(() => {
    fetchConversations();
  }, [selectedHouseId]);

  // Keep selectedConvIdRef in sync with state
  useEffect(() => {
    selectedConvIdRef.current = selectedConvId;
  }, [selectedConvId]);

  // 2. Passive Live View Interval (Auto-update every 5 seconds - NEVER forces auto-scroll or selection reset)
  useEffect(() => {
    if (!isLiveActive) return;
    const interval = setInterval(() => {
      fetchConversations(true);
    }, 5000);
    return () => clearInterval(interval);
  }, [isLiveActive, selectedHouseId]);

  // Position inner chat container to bottom cleanly ONLY when switching conversations (no window scroll)
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
    setIsScrolledUp(false);
  }, [selectedConvId]);

  // Cleanup audio on component unmount
  useEffect(() => {
    return () => {
      if (activeAudioRef.current) {
        activeAudioRef.current.pause();
        activeAudioRef.current = null;
      }
    };
  }, []);

  // Active House Object
  const currentHouse = useMemo(() => {
    return houses.find((h) => h.id === selectedHouseId) || houses[0] || DEFAULT_HOUSES[0];
  }, [houses, selectedHouseId]);

  // Filtered Conversations
  const filteredConversations = useMemo(() => {
    let list = [...conversations];

    // Status / Qualification Tab filter
    if (statusFilter === "attention") {
      list = list.filter((c) => c.qualification.needsCommander && c.status !== "REPLIED");
    } else if (statusFilter === "qualified") {
      list = list.filter((c) => c.qualification.isQualified);
    } else if (statusFilter === "unread") {
      list = list.filter((c) => c.unreadCount > 0);
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (c) =>
          c.customerName.toLowerCase().includes(q) ||
          c.lastMessage.toLowerCase().includes(q) ||
          c.pageName.toLowerCase().includes(q) ||
          c.qualification.badgeText.toLowerCase().includes(q)
      );
    }

    return list;
  }, [conversations, statusFilter, searchQuery]);

  // Active Selected Conversation
  const activeConversation = useMemo(() => {
    return conversations.find((c) => c.id === selectedConvId) || filteredConversations[0] || null;
  }, [conversations, selectedConvId, filteredConversations]);

  // Is active conversation currently under Human Takeover (bot paused)
  const isCurrentConvTakenOver = useMemo(() => {
    return isConversationTakenOver(activeConversation);
  }, [activeConversation]);

  // Formatted remaining pause duration
  const getTakeoverRemainingText = (conv?: ComcentConversationItem | null) => {
    if (!conv?.takeover?.isTakenOver) return "";
    if (conv.takeover.mode === "forever" || !conv.takeover.expiresAt) return "Forever";
    const diffMs = new Date(conv.takeover.expiresAt).getTime() - Date.now();
    if (diffMs <= 0) return "Expired";
    const hours = Math.floor(diffMs / (3600 * 1000));
    const mins = Math.floor((diffMs % (3600 * 1000)) / (60 * 1000));
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days}d left`;
    }
    if (hours > 0) return `${hours}h ${mins}m left`;
    return `${mins}m left`;
  };

  // Filtered Templates for Column 3
  const filteredTemplates = useMemo(() => {
    let list = [...templates];
    if (templateFormatFilter !== "all") {
      list = list.filter((t) => t.format === templateFormatFilter);
    }
    if (templateSearchQuery.trim()) {
      const q = templateSearchQuery.toLowerCase().trim();
      list = list.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q) ||
          t.format.toLowerCase().includes(q)
      );
    }
    return list;
  }, [templates, templateFormatFilter, templateSearchQuery]);

  // Helper to extract preview info from template JSON payload for Column 3
  const getTemplatePreview = (tmpl: ResponseTemplateItem) => {
    try {
      const payload = JSON.parse(tmpl.jsonPayload);
      const msg = payload.message || payload;
      const attach = msg.attachment;

      if (attach?.type === "audio") {
        return {
          type: "audio" as const,
          url: attach.payload?.url || "https://actions.google.com/sounds/v1/ambiences/coffee_shop.ogg",
          duration: "0:15s",
        };
      }

      if (attach?.payload?.template_type === "generic") {
        const el = attach.payload.elements?.[0];
        return {
          type: "generic" as const,
          imageUrl: el?.image_url,
          title: el?.title,
          buttons: Array.isArray(el?.buttons) ? el.buttons.map((b: any) => b.title) : [],
        };
      }

      if (attach?.payload?.template_type === "button") {
        return {
          type: "button" as const,
          text: attach.payload.text,
          buttons: Array.isArray(attach.payload.buttons) ? attach.payload.buttons.map((b: any) => b.title) : [],
        };
      }

      const qrList = msg.quick_replies || payload.quick_replies;
      if (qrList && Array.isArray(qrList)) {
        return {
          type: "quick_replies" as const,
          text: msg.text || payload.text || "",
          replies: qrList.map((q: any) => q.title || q.payload || "Option"),
        };
      }
    } catch {
      return null;
    }
    return null;
  };

  // 3. Actions: 1-Click Pre-setup JSON Template Dispatch
  const handleDispatchTemplate = async (tmpl: ResponseTemplateItem) => {
    if (!activeConversation) return;

    let parsedPayload: any = null;
    try {
      parsedPayload = JSON.parse(tmpl.jsonPayload);
    } catch {
      parsedPayload = { text: tmpl.description };
    }

    setIsSending(true);
    try {
      const res = await fetch("/api/comcent/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: activeConversation.id,
          action: "send_template",
          templateId: tmpl.id,
          templateName: tmpl.name,
          templatePayload: parsedPayload,
        }),
      });

      const data = await res.json();
      if (data.success && Array.isArray(data.conversations)) {
        setConversations(data.conversations);
        setTimeout(() => scrollToBottom(true), 50);
      }

      setLiveToast({
        title: "⚡ Pre-setup Template Dispatched",
        subtitle: `Sent "${tmpl.name}" to ${activeConversation.customerName}`,
      });
      setTimeout(() => setLiveToast(null), 3000);
    } catch (err) {
      console.error("Failed to dispatch template:", err);
    } finally {
      setIsSending(false);
    }
  };

  // 4. Action: Manual Text, File, or Voice Message Dispatch
  const handleSendManualMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!activeConversation) return;
    if (!manualText.trim() && !selectedFileUrl && !recordedVoiceUrl) return;

    setIsSending(true);
    try {
      let attachType: "none" | "image" | "audio" | "file" = "none";
      let attachUrl: string | undefined = undefined;
      let attachName: string | undefined = undefined;

      if (recordedVoiceUrl) {
        attachType = "audio";
        attachUrl = recordedVoiceUrl;
        attachName = "Commander Voice Note.webm";
      } else if (selectedFileUrl) {
        attachType = "image";
        attachUrl = selectedFileUrl;
        attachName = selectedFileName || "Attachment.jpg";
      }

      const res = await fetch("/api/comcent/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: activeConversation.id,
          action: "send_commander_message",
          text: manualText.trim(),
          attachmentType: attachType,
          attachmentUrl: attachUrl,
          attachmentName: attachName,
        }),
      });

      const data = await res.json();
      if (data.success && Array.isArray(data.conversations)) {
        setConversations(data.conversations);
        setTimeout(() => scrollToBottom(true), 50);
      }

      // Reset Inputs
      setManualText("");
      setSelectedFileUrl(null);
      setSelectedFileName(null);
      setRecordedVoiceUrl(null);
    } catch (err) {
      console.error("Failed to send manual message:", err);
    } finally {
      setIsSending(false);
    }
  };

  // 5. Action: Human Takeover Toggle & Duration Selector (Pause all Bot Rules)
  const handleSetTakeover = async (isTakenOver: boolean, mode: "2h" | "7d" | "forever" = "2h") => {
    if (!activeConversation) return;

    setIsUpdatingTakeover(true);
    setIsTakeoverMenuOpen(false);

    try {
      const res = await fetch("/api/comcent/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: activeConversation.id,
          action: "set_takeover",
          isTakenOver,
          mode,
        }),
      });

      const data = await res.json();
      if (data.success && Array.isArray(data.conversations)) {
        setConversations(data.conversations);
        setTimeout(() => scrollToBottom(true), 50);
      }

      setLiveToast({
        title: isTakenOver ? "👤 Human Takeover Activated" : "🤖 Bot Automation Resumed",
        subtitle: isTakenOver
          ? `All Bot Rules paused for ${activeConversation.customerName} (${mode === "2h" ? "2 Hours" : mode === "7d" ? "7 Days" : "Forever"})`
          : `Bot rules & automated flows reactivated for ${activeConversation.customerName}`,
      });
      setTimeout(() => setLiveToast(null), 3500);
    } catch (err) {
      console.error("Failed to update takeover status:", err);
    } finally {
      setIsUpdatingTakeover(false);
    }
  };

  // 6. Action: Simulate Live Inbound Customer Text (To demonstrate Live View & Inbound Rules Qualification)
  const handleSimulateInbound = async (sampleText?: string) => {
    const textToSimulate =
      sampleText ||
      (Math.random() > 0.5
        ? "តម្លៃប៉ុន្មានបង? មាន size L អត់? (Price Inquiry in Khmer)"
        : "Hi, do you offer free delivery to Siem Reap / Phnom Penh?");

    try {
      const targetPageId = activeConversation?.pageId || pages[0]?.pageId || "fb_page_01";
      const res = await fetch("/api/comcent/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "simulate_inbound",
          pageId: targetPageId,
          text: textToSimulate,
          customerName: "Kosal Rathana (Live Inbound)",
        }),
      });

      const data = await res.json();
      if (data.success && Array.isArray(data.conversations)) {
        setConversations(data.conversations);
      }

      setLiveToast({
        title: "● Live Message Received",
        subtitle: `"${textToSimulate}" on ${currentHouse.name}`,
      });
      setTimeout(() => setLiveToast(null), 3500);
    } catch (err) {
      console.error("Simulation failed:", err);
    }
  };

  // 6. Voice Recording Handlers
  const startVoiceRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const audioUrl = URL.createObjectURL(audioBlob);
        setRecordedVoiceUrl(audioUrl);
        setIsRecordingVoice(false);
      };

      mediaRecorder.start();
      setIsRecordingVoice(true);
      setRecordingSeconds(0);

      timerIntervalRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.warn("Microphone access unavailable, providing demo voice memo for dispatch:", err);
      // Seamless demo fallback so Commander can test voice dispatch even without hardware microphone
      setRecordedVoiceUrl("https://actions.google.com/sounds/v1/ambiences/coffee_shop.ogg");
      setIsRecordingVoice(false);
      setRecordingSeconds(15);
    }
  };

  const stopVoiceRecording = () => {
    if (mediaRecorderRef.current && isRecordingVoice) {
      mediaRecorderRef.current.stop();
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }
  };

  const cancelVoiceRecording = () => {
    if (mediaRecorderRef.current && isRecordingVoice) {
      mediaRecorderRef.current.stop();
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }
    setRecordedVoiceUrl(null);
    setIsRecordingVoice(false);
    setRecordingSeconds(0);
  };

  // Audio Playback Handler
  const togglePlayAudio = (url: string) => {
    if (playingAudioUrl === url) {
      if (activeAudioRef.current) {
        activeAudioRef.current.pause();
      }
      setPlayingAudioUrl(null);
    } else {
      if (activeAudioRef.current) {
        activeAudioRef.current.pause();
        activeAudioRef.current = null;
      }
      try {
        const audio = new Audio(url);
        activeAudioRef.current = audio;
        setPlayingAudioUrl(url);
        audio.play().catch((err) => {
          console.warn("Audio playback error:", err);
          setPlayingAudioUrl(null);
        });
        audio.onended = () => setPlayingAudioUrl(null);
        audio.onerror = () => {
          console.warn("Audio file could not be played:", url);
          setPlayingAudioUrl(null);
        };
      } catch (err) {
        console.error("Audio initialization error:", err);
        setPlayingAudioUrl(null);
      }
    }
  };

  // 7. House Creation Handler
  const handleCreateHouse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHouseName.trim()) return;

    setIsSavingHouse(true);
    try {
      const res = await fetch("/api/houses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newHouseName.trim(),
          description: newHouseDesc.trim() || "Centralized storefront communication group",
          icon: newHouseIcon,
          pageIds: newHousePageIds.length > 0 ? newHousePageIds : ["ALL"],
        }),
      });

      const data = await res.json();
      if (data.success && Array.isArray(data.houses)) {
        setHouses(data.houses);
        if (data.house?.id) {
          setSelectedHouseId(data.house.id);
        }
      }

      setIsHouseModalOpen(false);
      setNewHouseName("");
      setNewHouseDesc("");
      setNewHousePageIds([]);
    } catch (err) {
      console.error("Failed to create house:", err);
    } finally {
      setIsSavingHouse(false);
    }
  };

  const handleDeleteHouse = async (houseId: string) => {
    if (houses.length <= 1) {
      alert("At least one House must remain active.");
      return;
    }
    if (!confirm("Are you sure you want to delete this House?")) return;

    try {
      const res = await fetch(`/api/houses?id=${houseId}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success && Array.isArray(data.houses)) {
        setHouses(data.houses);
        if (selectedHouseId === houseId) {
          setSelectedHouseId(data.houses[0]?.id || DEFAULT_HOUSES[0].id);
        }
      }
    } catch (err) {
      console.error("Failed to delete house:", err);
    }
  };

  // Reusable Interactive Native Voice Player (dispatched templates & manual voice notes)
  const renderVoicePlayer = (
    audioUrl: string,
    title?: string,
    subtitle?: string,
    isCommander?: boolean
  ) => {
    const isPlaying = playingAudioUrl === audioUrl;
    return (
      <div className="flex items-center space-x-3 p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 text-xs w-full max-w-sm shadow-xs transition hover:shadow-md">
        <button
          type="button"
          onClick={() => togglePlayAudio(audioUrl)}
          className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 cursor-pointer shadow-md transition-all active:scale-95 ${
            isPlaying
              ? "bg-rose-500 hover:bg-rose-600 text-white ring-4 ring-rose-500/20"
              : isCommander
              ? "bg-indigo-600 hover:bg-indigo-500 text-white ring-2 ring-indigo-500/20"
              : "bg-blue-600 hover:bg-blue-500 text-white ring-2 ring-blue-500/20"
          }`}
          title={isPlaying ? "Pause Voice Note" : "Play Voice Note"}
        >
          {isPlaying ? (
            <Pause className="w-4 h-4 fill-current" />
          ) : (
            <Play className="w-4 h-4 ml-0.5 fill-current" />
          )}
        </button>

        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-center justify-between text-[11px] gap-2">
            <span className="font-bold text-slate-900 dark:text-slate-100 truncate flex items-center gap-1.5">
              <Volume2
                className={`w-3.5 h-3.5 shrink-0 ${
                  isPlaying ? "text-rose-500 animate-pulse" : "text-indigo-500"
                }`}
              />
              <span className="truncate">{title || "Voice Note"}</span>
            </span>
            <span
              className={`text-[10px] font-mono px-1.5 py-0.5 rounded shrink-0 font-medium ${
                isPlaying
                  ? "bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-300 font-semibold"
                  : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
              }`}
            >
              {isPlaying ? "Playing..." : subtitle || "Voice Memo"}
            </span>
          </div>

          {/* Dynamic Animated Waveform Graphic (Clickable to Play/Pause) */}
          <div
            onClick={() => togglePlayAudio(audioUrl)}
            className="flex items-center gap-0.5 h-5 px-1.5 py-0.5 bg-slate-50 dark:bg-slate-950/50 rounded-lg border border-slate-100 dark:border-slate-800/80 cursor-pointer group"
            title="Click to play / pause audio"
          >
            {[35, 65, 95, 45, 80, 100, 50, 75, 40, 90, 60, 85, 30, 95, 70, 50, 85, 65, 40, 90].map(
              (h, i) => (
                <div
                  key={i}
                  className={`flex-1 rounded-full transition-all duration-200 ${
                    isPlaying
                      ? "bg-gradient-to-t from-indigo-500 to-rose-500 group-hover:brightness-110"
                      : "bg-slate-300 dark:bg-slate-600 group-hover:bg-indigo-400"
                  }`}
                  style={{
                    height: isPlaying ? `${Math.max(25, (h + i * 13) % 100)}%` : `${h}%`,
                  }}
                />
              )
            )}
          </div>
        </div>
      </div>
    );
  };

  // Render Standalone Native Messenger Template Card (Generic Cards, Button Templates, Quick Replies, Voice Notes)
  const renderTemplateCard = (msg: ComcentMessageItem) => {
    // 1. Resolve payload & format (with fallback to templates library by templateId)
    let payload = msg.templatePayload;
    let format = msg.templateFormat;

    if ((!payload || (!payload.message && !payload.quick_replies)) && msg.templateId) {
      const matchedTmpl = templates.find((t) => t.id === msg.templateId);
      if (matchedTmpl) {
        try {
          payload = JSON.parse(matchedTmpl.jsonPayload);
          if (!format) format = matchedTmpl.format;
        } catch {}
      }
    }

    const payloadMsg = payload?.message || payload;
    const attachType = payloadMsg?.attachment?.type;
    const p = payloadMsg?.attachment?.payload;

    // Audio / Voice Note Template Check
    const isAudio =
      attachType === "audio" ||
      msg.attachmentType === "audio" ||
      format === "voice_note" ||
      msg.templateFormat === "voice_note" ||
      (typeof p?.url === "string" &&
        (p.url.includes("sounds") ||
          p.url.includes("audio") ||
          p.url.endsWith(".ogg") ||
          p.url.endsWith(".mp3") ||
          p.url.endsWith(".wav")));

    if (isAudio) {
      const audioUrl =
        p?.url ||
        msg.attachmentUrl ||
        "https://actions.google.com/sounds/v1/ambiences/coffee_shop.ogg";
      return renderVoicePlayer(
        audioUrl,
        msg.templateName || "Founder Welcome Voice Note",
        "Pre-setup Voice Template",
        true
      );
    }

    // Quick Replies Template Check (Message prompt text + interactive quick reply chips)
    const quickReplies =
      payloadMsg?.quick_replies ||
      (Array.isArray(payload?.quick_replies) ? payload.quick_replies : null);

    if (quickReplies && Array.isArray(quickReplies) && quickReplies.length > 0) {
      const promptText = payloadMsg?.text || msg.text || "";
      return (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm max-w-sm w-full space-y-2.5 p-3.5 transition hover:shadow-md">
          {promptText && (
            <p className="text-xs text-slate-800 dark:text-slate-100 leading-relaxed font-medium whitespace-pre-wrap">
              {promptText}
            </p>
          )}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5 flex items-center gap-1">
              <span>⚡</span>
              <span>Quick Reply Options</span>
            </span>
            <div className="flex flex-wrap gap-1.5">
              {quickReplies.map((qr: any, qIdx: number) => {
                const title = qr.title || qr.payload || "Option";
                return (
                  <button
                    key={qIdx}
                    type="button"
                    onClick={() => {
                      setManualText(title);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-50 hover:bg-indigo-50 dark:bg-slate-800/90 dark:hover:bg-indigo-950/60 border border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-700 text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-300 text-xs font-semibold shadow-2xs transition cursor-pointer group active:scale-95"
                    title="Click to copy into reply box"
                  >
                    {qr.image_url && (
                      <img
                        src={qr.image_url}
                        alt=""
                        className="w-3.5 h-3.5 rounded-full object-cover shrink-0"
                      />
                    )}
                    <span>{title}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      );
    }

    if (!p) {
      if (payloadMsg?.text) {
        return (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 text-xs text-slate-800 dark:text-slate-100 max-w-sm shadow-sm">
            <p className="whitespace-pre-wrap leading-relaxed font-medium">{payloadMsg.text}</p>
          </div>
        );
      }
      return null;
    }

    // Generic Card Template (Full-bleed Image, Title, Subtitle, Direct Action Buttons)
    if (p.template_type === "generic" && Array.isArray(p.elements) && p.elements[0]) {
      const el = p.elements[0];
      return (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm max-w-sm w-full transition hover:shadow-md">
          {el.image_url && (
            <div className="relative w-full h-40 bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <img
                src={el.image_url}
                alt={el.title}
                className="w-full h-full object-cover transition duration-300 hover:scale-105"
              />
              <span className="absolute top-2 right-2 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-xs text-[10px] text-white font-medium">
                Messenger Card
              </span>
            </div>
          )}
          <div className="p-3.5 space-y-1">
            <h5 className="font-bold text-xs text-slate-950 dark:text-white leading-snug">
              {el.title}
            </h5>
            {el.subtitle && (
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed whitespace-pre-wrap">
                {el.subtitle}
              </p>
            )}
          </div>
          {Array.isArray(el.buttons) && el.buttons.length > 0 && (
            <div className="border-t border-slate-100 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800 bg-slate-50/60 dark:bg-slate-950/40">
              {el.buttons.map((btn: any, bIdx: number) => (
                <div
                  key={bIdx}
                  className="py-2.5 px-3 text-center text-xs font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span>{btn.title}</span>
                  <ExternalLink className="w-3 h-3 opacity-60" />
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }

    // Button Template
    if (p.template_type === "button") {
      return (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm max-w-sm w-full">
          <p className="p-3.5 text-xs text-slate-800 dark:text-slate-100 leading-relaxed font-medium">
            {p.text}
          </p>
          {Array.isArray(p.buttons) && (
            <div className="border-t border-slate-100 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800 bg-slate-50/60 dark:bg-slate-950/40">
              {p.buttons.map((btn: any, bIdx: number) => (
                <div
                  key={bIdx}
                  className="py-2.5 px-3 text-center text-xs font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition cursor-pointer"
                >
                  {btn.title}
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }

    return null;
  };

  // Render Attached Media (Voice Notes with waveform, Image Attachments)
  const renderMediaPayload = (msg: ComcentMessageItem) => {
    // Voice Note Player
    if (msg.attachmentType === "audio" && msg.attachmentUrl) {
      return renderVoicePlayer(
        msg.attachmentUrl,
        msg.attachmentName || "Voice Note",
        "Voice Memo",
        msg.sender === "commander"
      );
    }

    // Image / Attachment
    if (msg.attachmentType === "image" && msg.attachmentUrl) {
      return (
        <div className="mt-2 rounded-xl overflow-hidden border border-slate-200/80 dark:border-slate-700/80 max-w-xs shadow-xs">
          <img
            src={msg.attachmentUrl}
            alt="Attachment"
            className="w-full h-auto object-cover max-h-56 hover:opacity-95 transition"
          />
        </div>
      );
    }

    return null;
  };

  return (
    <div className="space-y-4">
      {/* Live Toast Notification Banner */}
      {liveToast && (
        <div className="fixed top-5 right-5 z-50 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-xl border border-indigo-500/40 flex items-center space-x-3 animate-in slide-in-from-top-3 duration-300">
          <div className="w-7 h-7 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold shrink-0">
            <Radio className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <span className="text-xs font-bold block">{liveToast.title}</span>
            <span className="text-[11px] text-slate-300 block">{liveToast.subtitle}</span>
          </div>
        </div>
      )}

      {/* Unified Hero Banner */}
      <div className="tool-hero-banner comcent-hero-banner bg-gradient-to-r from-indigo-50 via-purple-50/50 to-white dark:from-indigo-950 dark:via-purple-950 dark:to-slate-900 border border-indigo-200/80 dark:border-indigo-800/40 rounded-3xl p-6 sm:p-7 text-slate-900 dark:text-white shadow-sm dark:shadow-xl relative overflow-hidden transition-all mb-4">
        <div className="absolute -right-16 -top-16 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-40 -bottom-10 w-48 h-48 bg-purple-500/15 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div>
            <div className="flex items-center space-x-2.5 flex-wrap gap-y-1">
              <span className="comcent-badge-pill px-2.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-500/20 text-indigo-800 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-400/30 text-[11px] font-bold uppercase tracking-wider">
                Communication Center
              </span>
              <span className="text-xs text-slate-600 dark:text-indigo-200/70 font-medium">
                House: <strong className="text-slate-900 dark:text-white font-bold">{currentHouse.name}</strong>
              </span>
              <span className="text-xs text-slate-600 dark:text-indigo-200/70 font-medium">
                Active Chats: <strong className="text-slate-900 dark:text-white font-bold">{conversations.length}</strong>
              </span>
              <span className="px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-400/30 text-[10px] font-semibold flex items-center gap-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span>Live Stream {lastLivePing}</span>
              </span>
            </div>

            <h1 className="tool-heading text-2xl sm:text-3xl font-extrabold tracking-tight mt-2 text-slate-900 dark:text-white flex items-center gap-2">
              <Radio className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
              COMCENT · Customer Communication Center
            </h1>
            <p className="tool-desc text-sm text-slate-600 dark:text-indigo-100/80 mt-1 max-w-2xl leading-relaxed">
              Live multi-page customer response hub with Brand House dispatch, human commander takeover, and instant audio/template messaging.
            </p>
          </div>

          {/* SubTab / House Switcher Controls */}
          <div className="tool-subtab-container flex flex-wrap items-center p-1.5 bg-white/90 dark:bg-black/40 backdrop-blur-md rounded-2xl border border-slate-200 dark:border-white/10 shrink-0 self-start md:self-auto shadow-xs gap-1.5">
            {/* House Dropdown */}
            <div className="flex items-center space-x-1.5 px-2.5 py-1 text-xs text-slate-700 dark:text-slate-300 font-bold border-r border-slate-200 dark:border-slate-800 pr-2">
              <Building2 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <select
                value={selectedHouseId}
                onChange={(e) => setSelectedHouseId(e.target.value)}
                className="bg-transparent text-slate-800 dark:text-slate-200 font-bold focus:outline-none cursor-pointer max-w-[150px] truncate"
              >
                {houses.map((h) => (
                  <option key={h.id} value={h.id} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                    {h.icon} {h.name} ({h.pageIds.includes("ALL") ? "All Pages" : `${h.pageIds.length} Pgs`})
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={() => setIsHouseModalOpen(true)}
              className="flex items-center space-x-1 px-2.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-sm cursor-pointer"
              title="Create new communication House"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New House</span>
            </button>

            {currentHouse.id !== "house_all_command" && (
              <button
                type="button"
                onClick={() => handleDeleteHouse(currentHouse.id)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-slate-200 dark:border-slate-800 transition cursor-pointer"
                title={`Delete ${currentHouse.name}`}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Test Inbound Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowSimulateMenu(!showSimulateMenu)}
                className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl tool-subtab-btn-inactive text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 text-xs font-semibold transition cursor-pointer"
                title="Simulate inbound message to test Inbound Rules qualification"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Test Inbound</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              {showSimulateMenu && (
                <div className="absolute right-0 top-full mt-1.5 w-72 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl z-50 p-2 space-y-1 animate-in fade-in-50 zoom-in-95">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1 block">
                    Simulate Inbound Rules Trigger
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      handleSimulateInbound("តម្លៃប៉ុន្មានបង? មាន size L អត់?");
                      setShowSimulateMenu(false);
                    }}
                    className="w-full text-left px-2.5 py-1.5 rounded-xl text-xs hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 cursor-pointer flex flex-col"
                  >
                    <span className="font-bold flex items-center gap-1.5">
                      <span>🏷️</span>
                      <span>Khmer Price Inquiry</span>
                    </span>
                    <span className="text-[10px] text-slate-400 truncate">"តម្លៃប៉ុន្មានបង? មាន size L អត់?"</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      handleSimulateInbound("Can I pay via ABA / Bakong KHQR transfer?");
                      setShowSimulateMenu(false);
                    }}
                    className="w-full text-left px-2.5 py-1.5 rounded-xl text-xs hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 cursor-pointer flex flex-col"
                  >
                    <span className="font-bold flex items-center gap-1.5">
                      <span>💳</span>
                      <span>Payment / ABA Transfer</span>
                    </span>
                    <span className="text-[10px] text-slate-400 truncate">"Can I pay via ABA / Bakong KHQR?"</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      handleSimulateInbound("I want to speak directly with the human commander please.");
                      setShowSimulateMenu(false);
                    }}
                    className="w-full text-left px-2.5 py-1.5 rounded-xl text-xs hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 cursor-pointer flex flex-col"
                  >
                    <span className="font-bold flex items-center gap-1.5">
                      <span>👤</span>
                      <span>Human Commander Request</span>
                    </span>
                    <span className="text-[10px] text-slate-400 truncate">"I want to speak with real human commander"</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      handleSimulateInbound("Do you provide free delivery to Siem Reap or provinces?");
                      setShowSimulateMenu(false);
                    }}
                    className="w-full text-left px-2.5 py-1.5 rounded-xl text-xs hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 cursor-pointer flex flex-col"
                  >
                    <span className="font-bold flex items-center gap-1.5">
                      <span>📦</span>
                      <span>Delivery Question</span>
                    </span>
                    <span className="text-[10px] text-slate-400 truncate">"Do you provide free delivery...?"</span>
                  </button>
                </div>
              )}
            </div>

            {/* Refresh */}
            <button
              type="button"
              onClick={() => fetchConversations()}
              className="p-1.5 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition cursor-pointer"
              title="Manual refresh"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Main 3-Column Desk: Col 1 Inbound Feed, Col 2 Message Review & Active Chat, Col 3 1-Click Response Templates */}
      <div className="flex flex-col lg:flex-row gap-3.5 h-[calc(100vh-210px)] min-h-[600px] max-h-[820px] overflow-hidden">
        {/* Col 1: Live Inbound Queue & Qualification Filter (Streamlined & Compact) */}
        <div className="w-full lg:w-72 xl:w-80 shrink-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 shadow-2xs flex flex-col h-full max-h-full min-h-0 overflow-hidden">
          {/* Search Bar */}
          <div className="relative shrink-0 mb-2">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Filter customer, keyword, or page..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-8.5 pr-8 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs"
              >
                ✕
              </button>
            )}
          </div>

          {/* Qualification Filter Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto [scrollbar-width:none] shrink-0 pb-1.5">
            {[
              { id: "all", label: "All Inbound", count: conversations.length },
              {
                id: "attention",
                label: "Needs Reply",
                count: conversations.filter((c) => c.qualification.needsCommander && c.status !== "REPLIED").length,
              },
              {
                id: "qualified",
                label: "Qualified",
                count: conversations.filter((c) => c.qualification.isQualified).length,
              },
              {
                id: "unread",
                label: "Unread",
                count: conversations.filter((c) => c.unreadCount > 0).length,
              },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id as any)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition shrink-0 cursor-pointer flex items-center space-x-1.5 ${
                  statusFilter === tab.id
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`text-[9px] px-1.5 py-0.2 rounded-full ${
                    statusFilter === tab.id ? "bg-white/20 text-white" : "bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Inbound Conversations List */}
          <div className="flex-1 min-h-0 overflow-y-auto space-y-1.5 pr-1">
            {filteredConversations.length === 0 ? (
              <div className="text-center py-12 px-4 text-slate-400 text-xs">
                <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30 text-indigo-400" />
                <p className="font-semibold text-slate-600 dark:text-slate-300">No active conversations found</p>
                <p className="text-[11px] mt-1 text-slate-500">
                  Switch Houses or click "Test Inbound" above to simulate incoming customer messages.
                </p>
              </div>
            ) : (
              filteredConversations.map((conv) => {
                const isSelected = activeConversation?.id === conv.id;
                const isReplied = conv.status === "REPLIED";

                return (
                  <button
                    key={conv.id}
                    type="button"
                    onClick={() => {
                      setSelectedConvId(conv.id);
                      selectedConvIdRef.current = conv.id;
                      conv.unreadCount = 0;
                    }}
                    className={`w-full text-left p-3 rounded-xl transition cursor-pointer border flex flex-col gap-1.5 ${
                      isSelected
                        ? "bg-indigo-50/70 dark:bg-indigo-950/40 border-indigo-500/80 shadow-xs ring-1 ring-indigo-500/30"
                        : "bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center space-x-2.5 min-w-0">
                        {conv.customerAvatar ? (
                          <img
                            src={conv.customerAvatar}
                            alt={conv.customerName}
                            className="w-8 h-8 rounded-full object-cover shrink-0 ring-1 ring-slate-200"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs shrink-0">
                            {conv.customerName[0]}
                          </div>
                        )}
                        <div className="min-w-0">
                          <span className="font-bold text-xs text-slate-900 dark:text-white truncate block">
                            {conv.customerName}
                          </span>
                          <span className="text-[10px] text-slate-400 truncate block">
                            via {conv.pageName}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-col items-end shrink-0 space-y-1">
                        <span className="text-[10px] text-slate-400 font-mono">
                          {new Date(conv.lastMessageAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                        {conv.unreadCount > 0 && (
                          <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                        )}
                      </div>
                    </div>

                    {/* Last Inbound Message Snippet */}
                    <p className={`text-xs line-clamp-1 ${conv.unreadCount > 0 ? "font-bold text-slate-900 dark:text-white" : "font-medium text-slate-600 dark:text-slate-300"}`}>
                      {conv.lastMessage}
                    </p>

                    {/* Inbound Rules Qualification Badge */}
                    <div className="flex items-center space-x-1.5 pt-0.5">
                      {isConversationTakenOver(conv) ? (
                        <span className="text-[9px] px-2 py-0.5 rounded-md font-bold border truncate bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700 flex items-center gap-1 shadow-2xs">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                          <span>👤 Human Mode ({conv.takeover?.mode === "forever" ? "Forever" : conv.takeover?.mode?.toUpperCase()})</span>
                        </span>
                      ) : isReplied ? (
                        <span className="text-[9px] px-2 py-0.5 rounded-md font-bold border truncate bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                          <Check className="w-2.5 h-2.5" />
                          <span>✓ Responded (Commander)</span>
                        </span>
                      ) : (
                        <span
                          className={`text-[9px] px-2 py-0.5 rounded-md font-bold border truncate ${
                            conv.qualification.badgeColor === "emerald"
                              ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                              : conv.qualification.badgeColor === "purple"
                              ? "bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800"
                              : conv.qualification.badgeColor === "blue"
                              ? "bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800"
                              : "bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800"
                          }`}
                        >
                          {conv.qualification.badgeText}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Col 2: Message Review & Active Command Chat (Spacious & Clean View) */}
        <div className="flex-1 min-w-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xs flex flex-col h-full max-h-full min-h-0 overflow-hidden">
          {activeConversation ? (
            <>
              {/* Header Bar for Active Conversation */}
              <div className="p-3 sm:p-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-950/30 rounded-t-2xl shrink-0">
                <div className="flex items-center space-x-3 min-w-0">
                  {activeConversation.customerAvatar ? (
                    <img
                      src={activeConversation.customerAvatar}
                      alt={activeConversation.customerName}
                      className="w-9 h-9 rounded-full object-cover shrink-0 ring-1 ring-slate-200"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-sm shrink-0">
                      {activeConversation.customerName[0]}
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="flex items-center space-x-2">
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white truncate">
                        {activeConversation.customerName}
                      </h4>
                      <span className="text-[10px] px-2 py-0.2 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono">
                        {activeConversation.pageName}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2 text-[11px] text-slate-500 mt-0.5">
                      <span>PSID: {activeConversation.psid}</span>
                      {activeConversation.adSource && (
                        <>
                          <span>•</span>
                          <span className="truncate text-indigo-600 dark:text-indigo-400 font-medium">
                            {activeConversation.adSource}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Header Actions: Qualification Badge (if non-replied & not taken over), Human Takeover Button, Templates Column Toggle */}
                <div className="flex items-center space-x-2 shrink-0">
                  {/* Qualification Badge (shown when not taken over and not replied) */}
                  {!isCurrentConvTakenOver && activeConversation.status !== "REPLIED" && activeConversation.qualification?.badgeText && (
                    <div
                      className={`hidden sm:flex px-2.5 py-1 rounded-xl text-xs font-bold border items-center space-x-1.5 ${
                        activeConversation.qualification.badgeColor === "emerald"
                          ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                          : activeConversation.qualification.badgeColor === "purple"
                          ? "bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800"
                          : activeConversation.qualification.badgeColor === "blue"
                          ? "bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800"
                          : "bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800"
                      }`}
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span className="truncate max-w-[140px]">{activeConversation.qualification.badgeText}</span>
                    </div>
                  )}

                  {/* HUMAN TAKEOVER BUTTON & DURATION DROPDOWN (Replaces ✓ Responded (Commander)) */}
                  <div className="relative" ref={takeoverMenuRef}>
                    <button
                      type="button"
                      onClick={() => setIsTakeoverMenuOpen(!isTakeoverMenuOpen)}
                      disabled={isUpdatingTakeover}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition flex items-center space-x-1.5 cursor-pointer active:scale-95 shadow-2xs ${
                        isCurrentConvTakenOver
                          ? "bg-amber-50 dark:bg-amber-950/70 border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-300 ring-1 ring-amber-400/40"
                          : "bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700"
                      }`}
                      title={
                        isCurrentConvTakenOver
                          ? "Human takeover active (Bot rules paused). Click to modify or resume bot."
                          : "Take over conversation (Pause all bot rules for this user)"
                      }
                    >
                      {isCurrentConvTakenOver ? (
                        <>
                          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                          <User className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                          <span>
                            Taken Over ({activeConversation.takeover?.mode === "forever" ? "Forever" : activeConversation.takeover?.mode?.toUpperCase()})
                          </span>
                        </>
                      ) : (
                        <>
                          <UserCheck className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                          <span>Take Over</span>
                        </>
                      )}
                      <ChevronDown className="w-3 h-3 opacity-60 ml-0.5" />
                    </button>

                    {/* Takeover Dropdown Menu */}
                    {isTakeoverMenuOpen && (
                      <div className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-50 p-3.5 space-y-3 animate-in fade-in zoom-in-95 duration-150">
                        <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
                          <div>
                            <h5 className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                              <User className="w-3.5 h-3.5 text-amber-500" />
                              <span>Human Takeover Control</span>
                            </h5>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                              Pause all Bot Rules & auto-replies for {activeConversation.customerName}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setIsTakeoverMenuOpen(false)}
                            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {isCurrentConvTakenOver ? (
                          <div className="space-y-2.5">
                            <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 flex items-center justify-between text-xs">
                              <div className="flex items-center space-x-2">
                                <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                                <span className="font-bold text-amber-900 dark:text-amber-200">
                                  Bot Rules Paused
                                </span>
                              </div>
                              <span className="text-[10px] font-mono font-bold text-amber-700 dark:text-amber-300">
                                {getTakeoverRemainingText(activeConversation)}
                              </span>
                            </div>

                            {/* Resume Bot Button */}
                            <button
                              type="button"
                              onClick={() => handleSetTakeover(false)}
                              disabled={isUpdatingTakeover}
                              className="w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition flex items-center justify-center space-x-1.5 cursor-pointer shadow-xs active:scale-95"
                            >
                              <Bot className="w-4 h-4" />
                              <span>▶️ Resume Bot Automation</span>
                            </button>

                            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                              <span className="text-[10px] font-bold text-slate-400 block mb-1.5">
                                Switch Pause Duration:
                              </span>
                              <div className="grid grid-cols-3 gap-1.5">
                                {(["2h", "7d", "forever"] as const).map((m) => (
                                  <button
                                    key={m}
                                    type="button"
                                    onClick={() => handleSetTakeover(true, m)}
                                    disabled={isUpdatingTakeover}
                                    className={`py-1.5 px-2 rounded-xl text-xs font-bold transition cursor-pointer border ${
                                      activeConversation.takeover?.mode === m
                                        ? "bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-200 border-amber-400 font-black shadow-xs"
                                        : "bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                                    }`}
                                  >
                                    {m === "2h" ? "2 Hours" : m === "7d" ? "7 Days" : "Forever"}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-1.5">
                            <span className="text-[10px] font-bold text-slate-400 block mb-1">
                              Select Pause Duration:
                            </span>

                            {/* 2 Hours Option */}
                            <button
                              type="button"
                              onClick={() => handleSetTakeover(true, "2h")}
                              disabled={isUpdatingTakeover}
                              className="w-full text-left p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-amber-400 dark:hover:border-amber-600 hover:bg-amber-50/50 dark:hover:bg-amber-950/30 transition cursor-pointer group"
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-xs text-slate-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 flex items-center gap-1.5">
                                  <span>⏱️</span>
                                  <span>Pause for 2 Hours (2H)</span>
                                </span>
                                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                  Quick Chat
                                </span>
                              </div>
                              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                                Ideal for active negotiations. Automatically resumes bot after 2 hours.
                              </p>
                            </button>

                            {/* 7 Days Option */}
                            <button
                              type="button"
                              onClick={() => handleSetTakeover(true, "7d")}
                              disabled={isUpdatingTakeover}
                              className="w-full text-left p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-amber-400 dark:hover:border-amber-600 hover:bg-amber-50/50 dark:hover:bg-amber-950/30 transition cursor-pointer group"
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-xs text-slate-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 flex items-center gap-1.5">
                                  <span>📅</span>
                                  <span>Pause for 7 Days (7D)</span>
                                </span>
                                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                  Weekly Care
                                </span>
                              </div>
                              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                                Best for custom multi-day order fulfillment and VIP customer care.
                              </p>
                            </button>

                            {/* Forever Option */}
                            <button
                              type="button"
                              onClick={() => handleSetTakeover(true, "forever")}
                              disabled={isUpdatingTakeover}
                              className="w-full text-left p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-amber-400 dark:hover:border-amber-600 hover:bg-amber-50/50 dark:hover:bg-amber-950/30 transition cursor-pointer group"
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-xs text-slate-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 flex items-center gap-1.5">
                                  <span>♾️</span>
                                  <span>Pause Forever</span>
                                </span>
                                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 font-bold">
                                  Permanent
                                </span>
                              </div>
                              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                                Permanent human-only mode. Bot will never auto-reply until manually released.
                              </p>
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Toggle 3rd Column (1-Click Templates) */}
                  <button
                    type="button"
                    onClick={() => setIsTemplatePanelOpen(!isTemplatePanelOpen)}
                    className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border transition flex items-center space-x-1.5 cursor-pointer shrink-0 ${
                      isTemplatePanelOpen
                        ? "bg-indigo-50 dark:bg-indigo-950/70 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 shadow-2xs"
                        : "bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                    }`}
                    title={isTemplatePanelOpen ? "Hide 1-Click Templates Column" : "Show 1-Click Templates Column"}
                  >
                    <Zap className="w-3.5 h-3.5 text-amber-500 fill-current" />
                    <span className="hidden sm:inline">Templates</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-indigo-600 text-white font-bold">
                      {templates.length}
                    </span>
                    {isTemplatePanelOpen ? (
                      <PanelRightClose className="w-3.5 h-3.5 opacity-60 ml-0.5" />
                    ) : (
                      <PanelRightOpen className="w-3.5 h-3.5 opacity-60 ml-0.5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Chat Messages Stream Wrapper */}
              <div className="relative flex-1 min-h-0 flex flex-col">
                <div
                  ref={chatContainerRef}
                  onScroll={handleChatScroll}
                  className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3 bg-slate-50/20 dark:bg-slate-950/10"
                >
                  {activeConversation.messages.map((msg) => {
                    const isCustomer = msg.sender === "customer";
                    const isBot = msg.sender === "bot";
                    const isCommander = msg.sender === "commander";
                    const hasTemplate = Boolean(
                      msg.templatePayload?.message?.attachment?.payload ||
                      msg.templatePayload?.message?.quick_replies ||
                      msg.templatePayload?.quick_replies ||
                      msg.templateId ||
                      msg.templateFormat === "voice_note" ||
                      msg.templateFormat === "quick_replies"
                    );
                    const isVoiceMemoOnly = msg.attachmentType === "audio" && !msg.text && !hasTemplate;

                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isCustomer ? "items-start" : "items-end"} max-w-full`}
                      >
                        {/* Sender Tag & Timestamp */}
                        <div className="flex items-center space-x-1.5 mb-1 text-[10px] text-slate-400">
                          {isCustomer && (
                            <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                              <span>{activeConversation.customerName}</span>
                            </span>
                          )}
                          {isBot && (
                            <span className="font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                              <Bot className="w-3 h-3" />
                              <span>Auto-Bot Response</span>
                            </span>
                          )}
                          {isCommander && (
                            <span className="font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                              <User className="w-3 h-3" />
                              <span>Commander Dispatch</span>
                            </span>
                          )}
                          <span>•</span>
                          <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                          {msg.ruleBadge && (
                            <span className="px-1.5 py-0.2 rounded bg-slate-200/80 dark:bg-slate-800 text-[9px] font-mono text-slate-600 dark:text-slate-300">
                              {msg.ruleBadge}
                            </span>
                          )}
                        </div>

                        {/* Content: If Template, Render Direct Native Messenger Card / Voice Player. Else Standard Bubble */}
                        {hasTemplate ? (
                          <div className={`flex flex-col ${isCustomer ? "items-start" : "items-end"} space-y-1 max-w-sm`}>
                            <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-200/80 dark:border-indigo-800/80 text-[10px] text-indigo-700 dark:text-indigo-300 font-bold shadow-2xs">
                              <Zap className="w-3 h-3 text-amber-500 fill-current" />
                              <span>Template: {msg.templateName || "Rich JSON Card"}</span>
                            </div>
                            {renderTemplateCard(msg)}
                          </div>
                        ) : isVoiceMemoOnly ? (
                          <div className={`flex flex-col ${isCustomer ? "items-start" : "items-end"} max-w-sm`}>
                            {renderMediaPayload(msg)}
                          </div>
                        ) : (
                          <div
                            className={`rounded-2xl p-3.5 text-xs max-w-md ${
                              isCustomer
                                ? "bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200/80 dark:border-slate-700/80 shadow-2xs rounded-tl-xs"
                                : isCommander
                                ? "bg-indigo-600 text-white shadow-xs rounded-tr-xs"
                                : "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-xs rounded-tr-xs"
                            }`}
                          >
                            {msg.text && <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>}
                            {renderMediaPayload(msg)}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>

                {/* Floating Jump to Latest Button (only when scrolled up) */}
                {isScrolledUp && (
                  <button
                    type="button"
                    onClick={() => scrollToBottom(true)}
                    className="absolute bottom-3 right-4 z-20 px-3 py-1.5 rounded-full bg-slate-900/90 hover:bg-slate-800 text-white text-[11px] font-bold shadow-lg flex items-center space-x-1.5 cursor-pointer backdrop-blur-xs border border-slate-700 animate-in fade-in-50 transition"
                  >
                    <span>↓ Jump to Latest</span>
                  </button>
                )}
              </div>

              {/* COMMANDER TOOLBAR & QUICK DISPATCH ACTIONS */}
              <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 rounded-b-2xl space-y-2.5 shrink-0">
                {/* Staged File / Voice Note Preview Attachment */}
                {(selectedFileUrl || recordedVoiceUrl) && (
                  <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-2 truncate">
                      {selectedFileUrl ? <ImageIcon className="w-4 h-4 text-blue-500 shrink-0" /> : <Volume2 className="w-4 h-4 text-purple-500 shrink-0" />}
                      <span className="truncate font-semibold text-slate-700 dark:text-slate-200">
                        Ready to send: {selectedFileName || "Recorded Voice Note.webm"}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedFileUrl(null);
                        setSelectedFileName(null);
                        setRecordedVoiceUrl(null);
                      }}
                      className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer p-1"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* Live Voice Recorder Floating Active Bar */}
                {isRecordingVoice && (
                  <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 flex items-center justify-between text-xs animate-pulse">
                    <div className="flex items-center space-x-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-ping" />
                      <span className="font-bold text-rose-700 dark:text-rose-300">
                        Recording Commander Voice Note... ({recordingSeconds}s)
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={stopVoiceRecording}
                        className="px-2.5 py-1 rounded-lg bg-rose-600 text-white font-bold text-xs flex items-center space-x-1 cursor-pointer"
                      >
                        <Square className="w-3 h-3" />
                        <span>Finish</span>
                      </button>
                      <button
                        type="button"
                        onClick={cancelVoiceRecording}
                        className="text-slate-500 hover:text-slate-700 dark:text-slate-400 text-xs cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* Manual Text & File / Voice Interaction Form */}
                <form onSubmit={handleSendManualMessage} className="flex items-center space-x-2">
                  {/* File Upload Button */}
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*,application/pdf"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const url = URL.createObjectURL(file);
                        setSelectedFileUrl(url);
                        setSelectedFileName(file.name);
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition cursor-pointer shrink-0"
                    title="Attach image or file"
                  >
                    <Paperclip className="w-4 h-4" />
                  </button>

                  {/* Voice Note Button */}
                  <button
                    type="button"
                    onClick={isRecordingVoice ? stopVoiceRecording : startVoiceRecording}
                    className={`p-2.5 rounded-xl transition cursor-pointer shrink-0 ${
                      isRecordingVoice
                        ? "bg-rose-600 text-white animate-bounce"
                        : "bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
                    }`}
                    title="Record voice note"
                  >
                    <Mic className="w-4 h-4" />
                  </button>

                  {/* Text Input with Enter-to-Send */}
                  <input
                    type="text"
                    value={manualText}
                    onChange={(e) => setManualText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSendManualMessage();
                      }
                    }}
                    placeholder="Type manual reply (or select 1-click template on the right)..."
                    className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                  />

                  {/* Send Button */}
                  <button
                    type="submit"
                    disabled={isSending || (!manualText.trim() && !selectedFileUrl && !recordedVoiceUrl)}
                    className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer shadow-sm shadow-indigo-600/30"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Send</span>
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400">
              <MessageSquare className="w-12 h-12 mb-3 opacity-30 text-indigo-400" />
              <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200">No Conversation Selected</h4>
              <p className="text-xs text-slate-500 max-w-sm mt-1">
                Select a customer conversation from the queue on the left to inspect Inbound Rules qualification or dispatch 1-click templates.
              </p>
            </div>
          )}
        </div>

        {/* Col 3: 1-Click Response Templates Library (Dedicated Vertical Dispatch Panel) */}
        {isTemplatePanelOpen ? (
          <div className="w-full lg:w-80 xl:w-92 shrink-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xs flex flex-col h-full max-h-full min-h-0 overflow-hidden animate-in slide-in-from-right-3 duration-200">
            {/* Header */}
            <div className="p-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/60 dark:bg-slate-950/40 shrink-0">
              <div className="flex items-center space-x-2 min-w-0">
                <div className="w-7 h-7 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                  <Zap className="w-4 h-4 fill-current" />
                </div>
                <div className="min-w-0">
                  <h4 className="font-bold text-xs text-slate-900 dark:text-white truncate flex items-center gap-1.5">
                    <span>1-Click Templates</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      {filteredTemplates.length}
                    </span>
                  </h4>
                  <p className="text-[10px] text-slate-400 truncate">
                    Direct JSON Messenger Dispatch
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsTemplatePanelOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                title="Collapse template panel"
              >
                <PanelRightClose className="w-4 h-4" />
              </button>
            </div>

            {/* Target Customer Callout Strip */}
            <div className="px-3 py-1.5 bg-indigo-50/50 dark:bg-indigo-950/30 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] shrink-0">
              <span className="text-slate-600 dark:text-slate-400 truncate">
                Target: <strong className="text-indigo-600 dark:text-indigo-300 font-bold">{activeConversation?.customerName || "No selection"}</strong>
              </span>
              <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold shrink-0">
                ● Live Ready
              </span>
            </div>

            {/* Search within Templates & Format Filters */}
            <div className="p-2.5 pb-1.5 border-b border-slate-100 dark:border-slate-800/80 space-y-2 shrink-0">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search templates (price, qr, voice)..."
                  value={templateSearchQuery}
                  onChange={(e) => setTemplateSearchQuery(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-8 pr-7 py-1 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                />
                {templateSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setTemplateSearchQuery("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Format Filter Pills */}
              <div className="flex items-center gap-1 overflow-x-auto [scrollbar-width:none] pb-1">
                {[
                  { id: "all", label: "All" },
                  { id: "generic_card", label: "Cards" },
                  { id: "button", label: "Buttons" },
                  { id: "voice_note", label: "Voice" },
                  { id: "quick_replies", label: "Quick" },
                ].map((fmt) => (
                  <button
                    key={fmt.id}
                    type="button"
                    onClick={() => setTemplateFormatFilter(fmt.id as any)}
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition shrink-0 cursor-pointer ${
                      templateFormatFilter === fmt.id
                        ? "bg-amber-500 text-white shadow-2xs"
                        : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white bg-slate-100 dark:bg-slate-800"
                    }`}
                  >
                    {fmt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Scrollable Templates Stream */}
            <div className="flex-1 min-h-0 overflow-y-auto p-2.5 space-y-2.5">
              {filteredTemplates.length === 0 ? (
                <div className="text-center py-10 px-3 text-slate-400 text-xs">
                  <Zap className="w-8 h-8 mx-auto mb-2 opacity-30 text-amber-500" />
                  <p className="font-semibold text-slate-600 dark:text-slate-300">No templates found</p>
                  <p className="text-[11px] mt-1 text-slate-500">
                    Try another keyword or reset filter.
                  </p>
                </div>
              ) : (
                filteredTemplates.map((tmpl) => {
                  const preview = getTemplatePreview(tmpl);
                  const isAudioTmpl = tmpl.format === "voice_note" || preview?.type === "audio";

                  return (
                    <div
                      key={tmpl.id}
                      className="bg-slate-50/70 dark:bg-slate-950/40 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-3 shadow-2xs hover:border-indigo-400 dark:hover:border-indigo-600 transition flex flex-col justify-between space-y-2 group"
                    >
                      <div>
                        {/* Format Badge & Action Type */}
                        <div className="flex items-center justify-between text-[10px] mb-1.5">
                          <span
                            className={`px-2 py-0.5 rounded-full font-bold flex items-center gap-1 ${
                              tmpl.format === "generic_card"
                                ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300"
                                : tmpl.format === "voice_note"
                                ? "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300"
                                : tmpl.format === "button"
                                ? "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                                : "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                            }`}
                          >
                            <span>
                              {tmpl.format === "generic_card"
                                ? "🏷️ Generic Card"
                                : tmpl.format === "voice_note"
                                ? "🎙️ Voice Note"
                                : tmpl.format === "button"
                                ? "💳 Button Card"
                                : "⚡ Quick Reply"}
                            </span>
                          </span>
                          <span className="text-slate-400 text-[9px] font-mono">
                            JSON Flow
                          </span>
                        </div>

                        {/* Title & Description */}
                        <h5 className="font-bold text-xs text-slate-900 dark:text-white leading-snug group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition">
                          {tmpl.name}
                        </h5>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed mt-0.5 line-clamp-2">
                          {tmpl.description}
                        </p>

                        {/* Visual Mini Preview Snippet */}
                        {preview && (
                          <div className="mt-2 pt-2 border-t border-slate-200/60 dark:border-slate-800/60">
                            {preview.type === "generic" && (
                              <div className="space-y-1.5">
                                {preview.imageUrl && (
                                  <div className="relative w-full h-20 rounded-lg overflow-hidden bg-slate-200 dark:bg-slate-800">
                                    <img
                                      src={preview.imageUrl}
                                      alt="Preview"
                                      className="w-full h-full object-cover"
                                    />
                                    <span className="absolute bottom-1 right-1 px-1.5 py-0.2 rounded bg-black/60 text-[9px] text-white">
                                      Card Image
                                    </span>
                                  </div>
                                )}
                                {preview.buttons.length > 0 && (
                                  <div className="flex flex-wrap gap-1">
                                    {preview.buttons.map((b: string, i: number) => (
                                      <span
                                        key={i}
                                        className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[10px] text-blue-600 dark:text-blue-400 font-semibold"
                                      >
                                        • {b}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}

                            {preview.type === "audio" && (
                              <div className="flex items-center justify-between p-2 rounded-xl bg-purple-50/80 dark:bg-purple-950/40 border border-purple-200/60 dark:border-purple-800/60">
                                <div className="flex items-center space-x-2">
                                  <button
                                    type="button"
                                    onClick={() => preview.url && togglePlayAudio(preview.url)}
                                    className="w-6 h-6 rounded-full bg-purple-600 text-white flex items-center justify-center cursor-pointer shadow-xs hover:bg-purple-500 transition"
                                    title="Preview Voice Audio"
                                  >
                                    {playingAudioUrl === preview.url ? (
                                      <Pause className="w-3 h-3 fill-current" />
                                    ) : (
                                      <Play className="w-3 h-3 ml-0.5 fill-current" />
                                    )}
                                  </button>
                                  <span className="text-[11px] font-semibold text-purple-900 dark:text-purple-200">
                                    {playingAudioUrl === preview.url ? "Playing 0:15s..." : "Voice Memo (0:15s)"}
                                  </span>
                                </div>
                                <Volume2 className={`w-3.5 h-3.5 ${playingAudioUrl === preview.url ? "text-purple-600 animate-pulse" : "text-purple-400"}`} />
                              </div>
                            )}

                            {preview.type === "button" && (
                              <div className="space-y-1.5">
                                {preview.text && (
                                  <p className="text-[10px] text-slate-600 dark:text-slate-300 italic line-clamp-2 bg-white dark:bg-slate-900/80 p-1.5 rounded-lg border border-slate-200/60 dark:border-slate-800/60 leading-relaxed font-medium">
                                    &ldquo;{preview.text}&rdquo;
                                  </p>
                                )}
                                {preview.buttons.length > 0 && (
                                  <div className="flex flex-wrap gap-1">
                                    {preview.buttons.map((b: string, i: number) => (
                                      <span
                                        key={i}
                                        className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[10px] text-blue-600 dark:text-blue-400 font-semibold"
                                      >
                                        🔘 {b}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}

                            {preview.type === "quick_replies" && (
                              <div className="space-y-1.5">
                                {preview.text && (
                                  <p className="text-[10px] text-slate-600 dark:text-slate-300 italic line-clamp-2 bg-white dark:bg-slate-900/80 p-1.5 rounded-lg border border-slate-200/60 dark:border-slate-800/60 leading-relaxed font-medium">
                                    &ldquo;{preview.text}&rdquo;
                                  </p>
                                )}
                                {preview.replies.length > 0 && (
                                  <div className="flex flex-wrap gap-1">
                                    {preview.replies.map((r: string, i: number) => (
                                      <span
                                        key={i}
                                        className="px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/80 text-[10px] text-amber-700 dark:text-amber-300 font-semibold flex items-center gap-1 shadow-2xs"
                                      >
                                        <span>⚡</span>
                                        <span>{r}</span>
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* 1-Click Dispatch Button */}
                      <button
                        type="button"
                        disabled={isSending || !activeConversation}
                        onClick={() => handleDispatchTemplate(tmpl)}
                        className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white text-xs font-bold transition flex items-center justify-center space-x-1.5 shadow-xs cursor-pointer active:scale-[0.98] disabled:opacity-50"
                        title={`Send ${tmpl.name} to ${activeConversation?.customerName || "customer"}`}
                      >
                        <Zap className="w-3.5 h-3.5 text-amber-300 fill-current" />
                        <span>1-Click Dispatch</span>
                        <ArrowRight className="w-3.5 h-3.5 opacity-70 ml-0.5" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer / Manage in Response */}
            <div className="p-2.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 shrink-0">
              {onNavigateToResponseTemplates ? (
                <button
                  type="button"
                  onClick={onNavigateToResponseTemplates}
                  className="w-full py-1.5 px-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 text-xs font-semibold transition flex items-center justify-center space-x-1.5 cursor-pointer"
                >
                  <Sliders className="w-3.5 h-3.5 text-amber-500" />
                  <span>Configure in Response Engine</span>
                  <ExternalLink className="w-3 h-3 opacity-60" />
                </button>
              ) : (
                <div className="text-[10px] text-slate-400 text-center">
                  💡 Linked to Response JSON Template Library
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Minimized Tab for Column 3 when collapsed */
          <button
            type="button"
            onClick={() => setIsTemplatePanelOpen(true)}
            className="hidden lg:flex flex-col items-center justify-center w-10 shrink-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xs hover:border-indigo-400 dark:hover:border-indigo-600 transition cursor-pointer p-2 space-y-3 group"
            title="Open 1-Click Response Templates Library"
          >
            <Zap className="w-4 h-4 text-amber-500 fill-current group-hover:scale-110 transition" />
            <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 [writing-mode:vertical-lr] rotate-180 uppercase tracking-widest">
              1-Click Templates
            </span>
            <span className="text-[9px] font-mono px-1 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-bold">
              {templates.length}
            </span>
          </button>
        )}
      </div>

      {/* CREATE HOUSE MODAL */}
      {isHouseModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl animate-in zoom-in-95 duration-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">Create Communication House</h3>
                  <p className="text-[11px] text-slate-500">
                    Group pages to centralize customer responses & auto-filter live texts.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsHouseModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateHouse} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  House Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. VIP Fashion & Streetwear Outlets"
                  value={newHouseName}
                  onChange={(e) => setNewHouseName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  House Description
                </label>
                <input
                  type="text"
                  placeholder="e.g. Dedicated response team for apparel inquiries and preorder drops"
                  value={newHouseDesc}
                  onChange={(e) => setNewHouseDesc(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Icon Selector */}
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
                  Select House Emblem / Icon
                </label>
                <div className="flex items-center gap-2">
                  {["🏠", "🏰", "🛍️", "☕", "🏢", "⚡", "💎", "🛵", "🎯"].map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setNewHouseIcon(emoji)}
                      className={`w-9 h-9 rounded-xl border text-base flex items-center justify-center cursor-pointer transition ${
                        newHouseIcon === emoji
                          ? "bg-indigo-50 border-indigo-500 ring-2 ring-indigo-500/30 dark:bg-indigo-950/60"
                          : "bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 hover:border-slate-300"
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              {/* Assign Pages to this House */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Assign Pages to this House ({newHousePageIds.length} Selected)
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      if (newHousePageIds.length === pages.length) {
                        setNewHousePageIds([]);
                      } else {
                        setNewHousePageIds(pages.map((p) => p.pageId));
                      }
                    }}
                    className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline font-medium cursor-pointer"
                  >
                    {newHousePageIds.length === pages.length ? "Deselect All" : "Select All Pages"}
                  </button>
                </div>

                <div className="max-h-40 overflow-y-auto space-y-1.5 p-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                  {pages.map((p) => {
                    const isChecked = newHousePageIds.includes(p.pageId);
                    return (
                      <label
                        key={p.pageId}
                        className="flex items-center space-x-2.5 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-900 cursor-pointer text-xs"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setNewHousePageIds([...newHousePageIds, p.pageId]);
                            } else {
                              setNewHousePageIds(newHousePageIds.filter((id) => id !== p.pageId));
                            }
                          }}
                          className="rounded text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5 cursor-pointer"
                        />
                        <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">{p.name}</span>
                        <span className="text-[10px] text-slate-400 font-mono">({p.category})</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsHouseModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingHouse || !newHouseName.trim()}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white transition shadow-sm cursor-pointer"
                >
                  {isSavingHouse ? "Saving..." : "Create House"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
