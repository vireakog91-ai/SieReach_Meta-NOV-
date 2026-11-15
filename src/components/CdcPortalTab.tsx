"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Send,
  Calendar,
  Clock,
  Sparkles,
  Layers,
  Plus,
  Trash2,
  Edit3,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Image as ImageIcon,
  Video,
  Copy,
  FileText,
  Check,
  RefreshCw,
  Eye,
  Share2,
  ThumbsUp,
  MessageCircle,
  BookmarkCheck,
  Upload,
  X,
  ChevronLeft,
  ChevronRight,
  Filter,
  Search,
  CalendarDays,
  GripVertical,
  ListFilter,
  Move,
} from "lucide-react";

interface FacebookPageItem {
  id: string;
  pageId: string;
  name: string;
  avatarUrl?: string | null;
  category?: string;
  businessName?: string;
}

interface CdcPostTemplate {
  id: string;
  businessName: string;
  title: string;
  category: string;
  content: string;
  mediaType: string;
  mediaUrls: string | null;
  tags: string | null;
  isPinned: boolean;
  enableFirstComment?: boolean;
  firstComment?: string | null;
  callToActionType?: string | null;
  callToActionTitle?: string | null;
  callToActionUrl?: string | null;
  enableCommentToDm?: boolean;
  commentToDmKeyword?: string | null;
  commentToDmReply?: string | null;
  commentToDmMiniBlast?: string | null;
  createdAt: string;
}

interface CdcPostTarget {
  id: string;
  postId: string;
  pageId: string;
  page: FacebookPageItem;
  status: "PENDING" | "PUBLISHED" | "FAILED";
  metaPostId?: string | null;
  firstCommentId?: string | null;
  errorMessage?: string | null;
  publishedAt?: string | null;
  customText?: string | null;
  scheduledAt?: string | null;
}

interface CdcPost {
  id: string;
  businessName: string;
  title?: string | null;
  content: string;
  mediaType: string;
  mediaUrls?: string | null;
  status: "DRAFT" | "SCHEDULED" | "PUBLISHING" | "PUBLISHED" | "PARTIALLY_PUBLISHED" | "PARTIALLY_FAILED" | "FAILED";
  scheduledAt?: string | null;
  publishedAt?: string | null;
  enableFirstComment?: boolean;
  firstComment?: string | null;
  callToActionType?: string | null;
  callToActionTitle?: string | null;
  callToActionUrl?: string | null;
  enableCommentToDm?: boolean;
  commentToDmKeyword?: string | null;
  commentToDmReply?: string | null;
  commentToDmMiniBlast?: string | null;
  createdAt: string;
  targets: CdcPostTarget[];
}

interface CdcPortalTabProps {
  pages: FacebookPageItem[];
  activeBusiness: string;
  isMockMode: boolean;
}

export function CdcPortalTab({ pages, activeBusiness, isMockMode }: CdcPortalTabProps) {
  // Navigation inside CDC
  const [subTab, setSubTab] = useState<"composer" | "planner" | "templates">("composer");

  // Target Facebook Pages selection
  const [selectedPageIds, setSelectedPageIds] = useState<string[]>([]);

  // Composer Form State
  const [postTitle, setPostTitle] = useState("");
  const [postContent, setPostContent] = useState("");
  const [mediaType, setMediaType] = useState<"none" | "image" | "multi_image" | "video">("image");
  const [mediaUrls, setMediaUrls] = useState<string[]>([
    "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=1200&q=80",
  ]);
  const [newMediaInput, setNewMediaInput] = useState("");
  const [publishAction, setPublishAction] = useState<"PUBLISH_NOW" | "SCHEDULE" | "DRAFT">("PUBLISH_NOW");
  const [scheduledDateTime, setScheduledDateTime] = useState<string>("");
  const [scheduleMode, setScheduleMode] = useState<"uniform" | "individual">("uniform");
  const [pageSchedules, setPageSchedules] = useState<Record<string, string>>({});

  // High-Growth & Lead Conversion States
  const [enableFirstComment, setEnableFirstComment] = useState(false);
  const [firstCommentText, setFirstCommentText] = useState(
    "👉 Check out our latest deals & exclusive member vouchers: https://sielab.shop/flash-deal?page={{page_name}}"
  );
  const [callToActionType, setCallToActionType] = useState<"NONE" | "MESSAGE_PAGE" | "WHATSAPP" | "LEARN_MORE" | "SHOP_NOW">("NONE");
  const [callToActionTitle, setCallToActionTitle] = useState("Direct Messenger Inquiry");
  const [callToActionUrl, setCallToActionUrl] = useState("");
  const [enableCommentToDm, setEnableCommentToDm] = useState(false);
  const [commentToDmKeyword, setCommentToDmKeyword] = useState("PM");
  const [commentToDmReply, setCommentToDmReply] = useState(
    "Hi {{name}}! We just sent you a private message with your discount code 🎁 Check your Messenger inbox!"
  );
  const [commentToDmMiniBlast, setCommentToDmMiniBlast] = useState(
    "Hello {{name}}! Thank you for commenting on {{page_name}}. Here is your exclusive 20% OFF flash voucher: VIP20. Tap here to redeem: https://sielab.shop/deals"
  );

  // Simulation Modal States (Lead Conversion Testing)
  const [isSimModalOpen, setIsSimModalOpen] = useState(false);
  const [simTargetPost, setSimTargetPost] = useState<CdcPost | null>(null);
  const [simPageId, setSimPageId] = useState<string>("");
  const [simCommenterName, setSimCommenterName] = useState("Sarah Jenkins");
  const [simCommentText, setSimCommentText] = useState("PM price and discount code please!");
  const [isSimulating, setIsSimulating] = useState(false);
  const [simResult, setSimResult] = useState<any>(null);

  // Quick stagger helper across selected pages
  const handleApplyStagger = (stepMinutes: number) => {
    let baseDate: Date;
    if (scheduledDateTime) {
      const parsed = new Date(scheduledDateTime);
      baseDate = isNaN(parsed.getTime()) ? new Date(Date.now() + 30 * 60 * 1000) : parsed;
    } else {
      const now = new Date(Date.now() + 30 * 60 * 1000);
      now.setMinutes(Math.ceil(now.getMinutes() / 5) * 5, 0, 0);
      baseDate = now;
    }

    const pad = (n: number) => n.toString().padStart(2, "0");
    const formatLocal = (d: Date) =>
      `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;

    const updated: Record<string, string> = {};
    selectedPageIds.forEach((pid, idx) => {
      const targetTime = new Date(baseDate.getTime() + idx * stepMinutes * 60 * 1000);
      updated[pid] = formatLocal(targetTime);
    });

    setPageSchedules(updated);
    setScheduledDateTime(formatLocal(baseDate));
    setScheduleMode("individual");
  };

  // Live Facebook Mock Preview Page selector
  const [previewPageId, setPreviewPageId] = useState<string>("");

  // Data Lists
  const [templates, setTemplates] = useState<CdcPostTemplate[]>([]);
  const [posts, setPosts] = useState<CdcPost[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishResultModal, setPublishResultModal] = useState<any | null>(null);

  // Filter & Search states
  const [plannerStatusFilter, setPlannerStatusFilter] = useState<string>("ALL");
  const [plannerViewMode, setPlannerViewMode] = useState<"calendar" | "list">("calendar");
  const [calendarDate, setCalendarDate] = useState<Date>(new Date());
  const [calendarPageFilter, setCalendarPageFilter] = useState<string>("ALL");
  const [draggedPostId, setDraggedPostId] = useState<string | null>(null);
  const [dragOverDateStr, setDragOverDateStr] = useState<string | null>(null);
  const [selectedCalendarPost, setSelectedCalendarPost] = useState<CdcPost | null>(null);
  const [calendarRescheduleTime, setCalendarRescheduleTime] = useState<string>("");
  const [isSavingReschedule, setIsSavingReschedule] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [templateCategoryFilter, setTemplateCategoryFilter] = useState<string>("ALL");
  const [templateSearchQuery, setTemplateSearchQuery] = useState("");

  // Template Modal
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<CdcPostTemplate | null>(null);
  const [templateForm, setTemplateForm] = useState({
    title: "",
    category: "Promotion",
    content: "",
    mediaType: "image",
    mediaUrl: "",
    tags: "",
    isPinned: false,
    enableFirstComment: false,
    firstComment: "",
    callToActionType: "NONE",
    callToActionTitle: "Direct Messenger Inquiry",
    callToActionUrl: "",
    enableCommentToDm: false,
    commentToDmKeyword: "ALL",
    commentToDmReply: "",
    commentToDmMiniBlast: "",
  });

  // Filter pages for current business portfolio
  const filteredPages = useMemo(() => {
    if (!pages || pages.length === 0) return [];
    if (activeBusiness === "ALL") return pages;
    return pages.filter((p) => (p.businessName || "SieLab Retail Group") === activeBusiness);
  }, [pages, activeBusiness]);

  // Initial selection: select all filtered pages by default
  useEffect(() => {
    if (filteredPages.length > 0) {
      setSelectedPageIds(filteredPages.map((p) => p.pageId));
      if (!previewPageId || !filteredPages.some((p) => p.pageId === previewPageId)) {
        setPreviewPageId(filteredPages[0].pageId);
      }
    }
  }, [filteredPages]);

  // Load Templates and Posts
  const fetchTemplates = async () => {
    try {
      const res = await fetch(`/api/cdc/templates?businessName=${encodeURIComponent(activeBusiness)}`);
      const data = await res.json();
      if (data.success) {
        setTemplates(data.templates);
      }
    } catch (err) {
      console.error("Failed to load CDC templates:", err);
    }
  };

  const fetchPosts = async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/cdc/posts?businessName=${encodeURIComponent(activeBusiness)}`);
      const data = await res.json();
      if (data.success) {
        setPosts(data.posts);
      }
    } catch (err) {
      console.error("Failed to load CDC posts:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
    fetchPosts();
  }, [activeBusiness]);

  // Toggle page selection
  const togglePageSelection = (pageId: string) => {
    setSelectedPageIds((prev) =>
      prev.includes(pageId) ? prev.filter((id) => id !== pageId) : [...prev, pageId]
    );
  };

  const selectAllPages = () => {
    setSelectedPageIds(filteredPages.map((p) => p.pageId));
  };

  const deselectAllPages = () => {
    setSelectedPageIds([]);
  };

  // Add media URL
  const handleAddMedia = () => {
    if (!newMediaInput.trim()) return;
    setMediaUrls((prev) => [...prev, newMediaInput.trim()]);
    setNewMediaInput("");
  };

  const handleRemoveMedia = (index: number) => {
    setMediaUrls((prev) => prev.filter((_, i) => i !== index));
  };

  // Apply template to composer
  const handleApplyTemplate = (tpl: CdcPostTemplate) => {
    setPostTitle(tpl.title);
    setPostContent(tpl.content);
    setMediaType(tpl.mediaType as any);
    try {
      const urls = tpl.mediaUrls ? JSON.parse(tpl.mediaUrls) : [];
      setMediaUrls(Array.isArray(urls) ? urls : []);
    } catch {
      setMediaUrls([]);
    }
    // High-Growth & Lead Conversion Fields
    setEnableFirstComment(Boolean(tpl.enableFirstComment));
    setFirstCommentText(tpl.firstComment || "");
    setCallToActionType((tpl.callToActionType as any) || "NONE");
    setCallToActionTitle(tpl.callToActionTitle || "Direct Messenger Inquiry");
    setCallToActionUrl(tpl.callToActionUrl || "");
    setEnableCommentToDm(Boolean(tpl.enableCommentToDm));
    setCommentToDmKeyword(tpl.commentToDmKeyword || "PM");
    setCommentToDmReply(tpl.commentToDmReply || "");
    setCommentToDmMiniBlast(tpl.commentToDmMiniBlast || "");

    setSubTab("composer");
  };

  // Save current composer as template
  const handleSaveAsTemplateFromComposer = () => {
    setEditingTemplate(null);
    setTemplateForm({
      title: postTitle || "New Custom Template",
      category: "Promotion",
      content: postContent,
      mediaType: mediaType,
      mediaUrl: mediaUrls[0] || "",
      tags: "Custom, Distribution",
      isPinned: false,
      enableFirstComment,
      firstComment: firstCommentText,
      callToActionType,
      callToActionTitle,
      callToActionUrl,
      enableCommentToDm,
      commentToDmKeyword,
      commentToDmReply,
      commentToDmMiniBlast,
    });
    setIsTemplateModalOpen(true);
  };

  // Handle template submit
  const handleSaveTemplateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!templateForm.title || !templateForm.content) return;

    try {
      const mediaUrlsArray = templateForm.mediaUrl.trim() ? [templateForm.mediaUrl.trim()] : [];
      const tagsArray = templateForm.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      const templatePayload = {
        title: templateForm.title,
        category: templateForm.category,
        content: templateForm.content,
        mediaType: templateForm.mediaType,
        mediaUrls: mediaUrlsArray,
        tags: tagsArray,
        isPinned: templateForm.isPinned,
        businessName: activeBusiness === "ALL" ? "SieLab Retail Group" : activeBusiness,
        enableFirstComment: templateForm.enableFirstComment,
        firstComment: templateForm.firstComment || null,
        callToActionType: templateForm.callToActionType || "NONE",
        callToActionTitle: templateForm.callToActionTitle || "Direct Messenger Inquiry",
        callToActionUrl: templateForm.callToActionUrl || null,
        enableCommentToDm: templateForm.enableCommentToDm,
        commentToDmKeyword: templateForm.commentToDmKeyword || "ALL",
        commentToDmReply: templateForm.commentToDmReply || null,
        commentToDmMiniBlast: templateForm.commentToDmMiniBlast || null,
      };

      if (editingTemplate) {
        // Update
        const res = await fetch(`/api/cdc/templates/${editingTemplate.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(templatePayload),
        });
        if (res.ok) {
          setIsTemplateModalOpen(false);
          fetchTemplates();
        }
      } else {
        // Create
        const res = await fetch("/api/cdc/templates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(templatePayload),
        });
        if (res.ok) {
          setIsTemplateModalOpen(false);
          fetchTemplates();
        }
      }
    } catch (err) {
      console.error("Error saving template:", err);
    }
  };

  // Handle Delete Template
  const handleDeleteTemplate = async (id: string) => {
    if (!confirm("Are you sure you want to delete this template?")) return;
    try {
      const res = await fetch(`/api/cdc/templates/${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchTemplates();
      }
    } catch (err) {
      console.error("Error deleting template:", err);
    }
  };

  // Dispatch post (Immediate publish, schedule, or draft)
  const handleDispatchPost = async () => {
    if (!postContent.trim()) {
      alert("Please write some content before publishing.");
      return;
    }
    if (publishAction !== "DRAFT" && selectedPageIds.length === 0) {
      alert("Please select at least one Facebook page.");
      return;
    }
    if (publishAction === "SCHEDULE") {
      if (scheduleMode === "uniform" && !scheduledDateTime) {
        alert("Please specify a scheduled date and time.");
        return;
      }
      if (scheduleMode === "individual") {
        const missingPageId = selectedPageIds.find((pid) => !pageSchedules[pid] && !scheduledDateTime);
        if (missingPageId) {
          const pageObj = filteredPages.find((p) => p.pageId === missingPageId);
          alert(`Please set a scheduled date and time for "${pageObj?.name || missingPageId}".`);
          return;
        }
      }
    }

    try {
      setIsPublishing(true);
      const res = await fetch("/api/cdc/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessName: activeBusiness === "ALL" ? "SieLab Retail Group" : activeBusiness,
          title: postTitle || undefined,
          content: postContent,
          mediaType,
          mediaUrls,
          targetPageIds: selectedPageIds,
          action: publishAction,
          scheduledAt: publishAction === "SCHEDULE" ? (scheduledDateTime || Object.values(pageSchedules)[0]) : undefined,
          targetSchedules: publishAction === "SCHEDULE" ? pageSchedules : undefined,
          enableFirstComment,
          firstComment: enableFirstComment ? firstCommentText : null,
          callToActionType,
          callToActionTitle: callToActionType !== "NONE" ? callToActionTitle : null,
          callToActionUrl: callToActionType !== "NONE" ? callToActionUrl : null,
          enableCommentToDm,
          commentToDmKeyword: enableCommentToDm ? commentToDmKeyword : null,
          commentToDmReply: enableCommentToDm ? commentToDmReply : null,
          commentToDmMiniBlast: enableCommentToDm ? commentToDmMiniBlast : null,
          isMockMode,
        }),
      });

      const data = await res.json();
      if (data.success) {
        fetchPosts();
        if (publishAction === "PUBLISH_NOW") {
          setPublishResultModal(data.report);
        } else if (publishAction === "SCHEDULE") {
          alert("Post successfully scheduled! You can manage it in the Content Planner & Queue tab.");
          setSubTab("planner");
        } else {
          alert("Post saved as Draft!");
          setSubTab("planner");
        }
      } else {
        alert("Error: " + (data.error || "Failed to process post"));
      }
    } catch (err: any) {
      alert("Failed to submit post: " + err.message);
    } finally {
      setIsPublishing(false);
    }
  };

  // Retry or publish now for an existing post
  const handleRetryPost = async (postId: string) => {
    try {
      const res = await fetch(`/api/cdc/posts/${postId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isMockMode }),
      });
      const data = await res.json();
      if (data.success) {
        fetchPosts();
        alert(`Distribution execution complete! Successful: ${data.report.successCount}, Failed: ${data.report.failureCount}`);
      } else {
        alert("Failed to retry: " + data.error);
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  // Delete post
  const handleDeletePost = async (postId: string) => {
    if (!confirm("Are you sure you want to delete this post from the queue/history?")) return;
    try {
      const res = await fetch(`/api/cdc/posts/${postId}`, { method: "DELETE" });
      if (res.ok) {
        fetchPosts();
      }
    } catch (err) {
      console.error("Error deleting post:", err);
    }
  };

  // Compute live rendered preview text for the selected preview page
  const currentPreviewPage = filteredPages.find((p) => p.pageId === previewPageId) || filteredPages[0];
  const renderedPreviewText = useMemo(() => {
    if (!postContent) return "";
    let txt = postContent;
    const pageName = currentPreviewPage?.name || "Your Facebook Page";
    const bizName = currentPreviewPage?.businessName || activeBusiness || "SieLab Retail Group";

    txt = txt.replace(/\{\{\s*page_name\s*\}\}/gi, pageName);
    txt = txt.replace(/\{\{\s*business_name\s*\}\}/gi, bizName);
    txt = txt.replace(/\{\{\s*day\s*\}\}/gi, new Date().toLocaleDateString("en-US", { weekday: "short" }).toUpperCase());

    // Basic spintax preview (pick first option)
    txt = txt.replace(/\{([^{}]+)\}/g, (_, match) => {
      const parts = match.split("|");
      return parts[0] || "";
    });

    return txt;
  }, [postContent, currentPreviewPage, activeBusiness]);

  // Live rendered preview for Auto First-Comment
  const renderedPreviewFirstComment = useMemo(() => {
    if (!firstCommentText) return "";
    let txt = firstCommentText;
    const pageName = currentPreviewPage?.name || "Your Facebook Page";
    const bizName = currentPreviewPage?.businessName || activeBusiness || "SieLab Retail Group";
    txt = txt.replace(/\{\{\s*page_name\s*\}\}/gi, pageName);
    txt = txt.replace(/\{\{\s*business_name\s*\}\}/gi, bizName);
    txt = txt.replace(/\{([^{}]+)\}/g, (_, match) => {
      const parts = match.split("|");
      return parts[0] || "";
    });
    return txt;
  }, [firstCommentText, currentPreviewPage, activeBusiness]);

  // Open Lead Simulation modal for a specific post
  const handleOpenSimulationModal = (post: CdcPost) => {
    setSimTargetPost(post);
    setSimPageId(post.targets[0]?.pageId || "");
    setSimCommenterName("Sarah Jenkins");
    setSimCommentText(
      post.commentToDmKeyword && post.commentToDmKeyword !== "ALL"
        ? `${post.commentToDmKeyword} please!`
        : "PM price & details!"
    );
    setSimResult(null);
    setIsSimModalOpen(true);
  };

  // Run Comment-to-DM simulation
  const handleRunSimulation = async () => {
    if (!simTargetPost) return;
    try {
      setIsSimulating(true);
      setSimResult(null);
      const res = await fetch("/api/cdc/simulate-comment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postId: simTargetPost.id,
          targetPageId: simPageId,
          commenterName: simCommenterName,
          commentText: simCommentText,
        }),
      });
      const data = await res.json();
      setSimResult(data);
    } catch (err: any) {
      setSimResult({ success: false, error: err.message });
    } finally {
      setIsSimulating(false);
    }
  };

  // -------------------------------------------------------------------------
  // Visual Content Calendar Handlers & Helpers
  // -------------------------------------------------------------------------
  const handlePrevMonth = () => {
    setCalendarDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCalendarDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const handleToday = () => {
    setCalendarDate(new Date());
  };

  const formatLocalDateStr = (d: Date) => {
    const pad = (n: number) => n.toString().padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  };

  const getPostPrimaryDate = (post: CdcPost): Date | null => {
    const dStr = post.scheduledAt || post.publishedAt || post.createdAt;
    if (!dStr) return null;
    const d = new Date(dStr);
    return isNaN(d.getTime()) ? null : d;
  };

  // 42-cell calendar grid for active month
  const calendarGrid = useMemo(() => {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();

    const firstDayOfMonth = new Date(year, month, 1);
    const startDayOfWeek = firstDayOfMonth.getDay(); // 0 is Sunday
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const days: {
      date: Date;
      dateStr: string;
      dayNum: number;
      isCurrentMonth: boolean;
      isToday: boolean;
    }[] = [];

    const todayStr = formatLocalDateStr(new Date());

    // Leading days from previous month
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const dayNum = daysInPrevMonth - i;
      const d = new Date(year, month - 1, dayNum);
      const dateStr = formatLocalDateStr(d);
      days.push({
        date: d,
        dateStr,
        dayNum,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
      });
    }

    // Days in current month
    for (let d = 1; d <= daysInMonth; d++) {
      const dateObj = new Date(year, month, d);
      const dateStr = formatLocalDateStr(dateObj);
      days.push({
        date: dateObj,
        dateStr,
        dayNum: d,
        isCurrentMonth: true,
        isToday: dateStr === todayStr,
      });
    }

    // Trailing days from next month up to 42 cells
    let nextMonthDay = 1;
    while (days.length < 42) {
      const dateObj = new Date(year, month + 1, nextMonthDay);
      const dateStr = formatLocalDateStr(dateObj);
      days.push({
        date: dateObj,
        dateStr,
        dayNum: nextMonthDay,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
      });
      nextMonthDay++;
    }

    return days;
  }, [calendarDate]);

  // Group posts by local date string
  const postsByDate = useMemo(() => {
    const map: Record<string, CdcPost[]> = {};

    posts.forEach((post) => {
      // Filter by page
      if (calendarPageFilter !== "ALL") {
        const hasTarget = post.targets.some((t) => t.pageId === calendarPageFilter);
        if (!hasTarget) return;
      }

      // Filter by status
      if (plannerStatusFilter !== "ALL" && post.status !== plannerStatusFilter) {
        return;
      }

      const pDate = getPostPrimaryDate(post);
      if (!pDate) return;
      const key = formatLocalDateStr(pDate);
      if (!map[key]) map[key] = [];
      map[key].push(post);
    });

    // Sort by time within each day
    Object.keys(map).forEach((k) => {
      map[k].sort((a, b) => {
        const timeA = (getPostPrimaryDate(a) || new Date(0)).getTime();
        const timeB = (getPostPrimaryDate(b) || new Date(0)).getTime();
        return timeA - timeB;
      });
    });

    return map;
  }, [posts, calendarPageFilter, plannerStatusFilter]);

  // HTML5 Drag-and-Drop Handlers
  const handleDragStart = (e: React.DragEvent, post: CdcPost) => {
    setDraggedPostId(post.id);
    e.dataTransfer.setData("text/plain", post.id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, dateStr: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverDateStr !== dateStr) {
      setDragOverDateStr(dateStr);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    const relatedTarget = e.relatedTarget as HTMLElement;
    if (!relatedTarget || !e.currentTarget.contains(relatedTarget)) {
      setDragOverDateStr(null);
    }
  };

  const handleDragEnd = () => {
    setDraggedPostId(null);
    setDragOverDateStr(null);
  };

  const handleDropOnDate = async (targetDateStr: string) => {
    setDragOverDateStr(null);
    const postId = draggedPostId;
    if (!postId) return;

    const post = posts.find((p) => p.id === postId);
    if (!post) {
      setDraggedPostId(null);
      return;
    }

    if (post.status === "PUBLISHED") {
      alert("Published posts cannot be rescheduled.");
      setDraggedPostId(null);
      return;
    }

    // Calculate new date, preserving existing hours/minutes or defaulting to 10:00 AM
    const [y, m, d] = targetDateStr.split("-").map(Number);
    let hours = 10;
    let minutes = 0;
    if (post.scheduledAt) {
      const existingDate = new Date(post.scheduledAt);
      if (!isNaN(existingDate.getTime())) {
        hours = existingDate.getHours();
        minutes = existingDate.getMinutes();
      }
    }

    const newDate = new Date(y, m - 1, d, hours, minutes, 0);
    const newIsoStr = newDate.toISOString();

    // Optimistically update post in state
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id !== postId) return p;
        return {
          ...p,
          scheduledAt: newIsoStr,
          status: p.status === "DRAFT" || p.status === "FAILED" ? "SCHEDULED" : p.status,
          targets: p.targets.map((t) =>
            t.status === "PENDING" ? { ...t, scheduledAt: newIsoStr } : t
          ),
        };
      })
    );

    setDraggedPostId(null);

    const formattedDay = newDate.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    const formattedTime = newDate.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
    setToastMessage(`Post rescheduled to ${formattedDay} at ${formattedTime}!`);
    setTimeout(() => setToastMessage(null), 3500);

    try {
      const res = await fetch(`/api/cdc/posts/${postId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scheduledAt: newIsoStr }),
      });
      const result = await res.json();
      if (!result.success) {
        console.error("Reschedule failed:", result.error);
        fetchPosts();
      } else {
        fetchPosts();
      }
    } catch (err) {
      console.error("Error updating scheduled date:", err);
      fetchPosts();
    }
  };

  const handleOpenCalendarPost = (post: CdcPost) => {
    setSelectedCalendarPost(post);
    const d = post.scheduledAt ? new Date(post.scheduledAt) : (post.publishedAt ? new Date(post.publishedAt) : new Date());
    const pad = (n: number) => n.toString().padStart(2, "0");
    const localIso = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    setCalendarRescheduleTime(localIso);
  };

  const handleSaveModalReschedule = async () => {
    if (!selectedCalendarPost || !calendarRescheduleTime) return;
    setIsSavingReschedule(true);
    try {
      const newDate = new Date(calendarRescheduleTime);
      if (isNaN(newDate.getTime())) {
        alert("Invalid date and time selected.");
        return;
      }
      const newIsoStr = newDate.toISOString();
      const res = await fetch(`/api/cdc/posts/${selectedCalendarPost.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scheduledAt: newIsoStr }),
      });
      const data = await res.json();
      if (data.success) {
        fetchPosts();
        setSelectedCalendarPost(null);
        setToastMessage(`Rescheduled to ${newDate.toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}!`);
        setTimeout(() => setToastMessage(null), 3500);
      } else {
        alert("Failed to reschedule: " + data.error);
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setIsSavingReschedule(false);
    }
  };

  const handleScheduleForDate = (dateStr: string) => {
    const [y, m, d] = dateStr.split("-").map(Number);
    const pad = (n: number) => n.toString().padStart(2, "0");
    setScheduledDateTime(`${y}-${pad(m)}-${pad(d)}T10:00`);
    setPublishAction("SCHEDULE");
    setSubTab("composer");
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Mode Controls */}
      <div className="cdc-hero-banner bg-gradient-to-r from-sky-50 via-indigo-50/50 to-white dark:from-sky-950 dark:via-indigo-950 dark:to-slate-900 border border-sky-200/80 dark:border-sky-800/40 rounded-3xl p-6 sm:p-7 text-slate-900 dark:text-white shadow-sm dark:shadow-xl relative overflow-hidden transition-all">
        <div className="absolute -right-16 -top-16 w-64 h-64 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-40 -bottom-10 w-48 h-48 bg-indigo-500/15 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div>
            <div className="flex items-center space-x-2.5">
              <span className="cdc-badge-hub px-2.5 py-0.5 rounded-full bg-sky-100 dark:bg-sky-500/20 text-sky-800 dark:text-sky-300 border border-sky-300 dark:border-sky-400/30 text-[11px] font-bold uppercase tracking-wider">
                Distribution Hub
              </span>
              <span className="text-xs text-slate-600 dark:text-sky-200/70 font-medium">
                Connected Pages: <strong className="text-slate-900 dark:text-white font-bold">{filteredPages.length}</strong>
              </span>
              {isMockMode && (
                <span className="px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-400/30 text-[10px] font-semibold">
                  Sandbox Active
                </span>
              )}
            </div>
            <h1 className="cdc-heading text-2xl sm:text-3xl font-extrabold tracking-tight mt-2 text-slate-900 dark:text-white flex items-center gap-2">
              <Layers className="w-7 h-7 text-sky-600 dark:text-sky-400" />
              CDC · Channel Distribution Center
            </h1>
            <p className="cdc-desc text-sm text-slate-600 dark:text-sky-100/80 mt-1 max-w-2xl leading-relaxed">
              Upload, schedule, and distribute content across multiple Facebook pages simultaneously without Meta Business Suite lag.
            </p>
          </div>

          {/* SubTab Switcher */}
          <div className="cdc-subtab-container flex items-center p-1.5 bg-white/90 dark:bg-black/40 backdrop-blur-md rounded-2xl border border-slate-200 dark:border-white/10 shrink-0 self-start md:self-auto shadow-xs">
            <button
              onClick={() => setSubTab("composer")}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                subTab === "composer"
                  ? "bg-sky-600 text-white shadow-md shadow-sky-600/25"
                  : "cdc-subtab-btn-inactive text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5"
              }`}
            >
              <Send className="w-3.5 h-3.5" />
              <span>Composer & Dispatch</span>
            </button>
            <button
              onClick={() => setSubTab("planner")}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                subTab === "planner"
                  ? "bg-sky-600 text-white shadow-md shadow-sky-600/25"
                  : "cdc-subtab-btn-inactive text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5"
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Content Planner ({posts.length})</span>
            </button>
            <button
              onClick={() => setSubTab("templates")}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                subTab === "templates"
                  ? "bg-sky-600 text-white shadow-md shadow-sky-600/25"
                  : "cdc-subtab-btn-inactive text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5"
              }`}
            >
              <BookmarkCheck className="w-3.5 h-3.5" />
              <span>Templates ({templates.length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SUBTAB 1: COMPOSER & DISPATCH                                             */}
      {/* ========================================================================= */}
      {subTab === "composer" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT COLUMN: Page Selection & Content Composer (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            {/* Target Page Selector Card */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Target Facebook Pages ({selectedPageIds.length}/{filteredPages.length})
                  </h3>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    Content will post to all checked pages
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={selectAllPages}
                    className="text-xs text-sky-600 dark:text-sky-400 hover:underline font-semibold cursor-pointer"
                  >
                    Select All
                  </button>
                  <span className="text-slate-300 dark:text-slate-700">|</span>
                  <button
                    type="button"
                    onClick={deselectAllPages}
                    className="text-xs text-slate-500 hover:underline cursor-pointer"
                  >
                    Deselect
                  </button>
                </div>
              </div>

              {/* Pages Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-48 overflow-y-auto pr-1">
                {filteredPages.map((page) => {
                  const isChecked = selectedPageIds.includes(page.pageId);
                  return (
                    <div
                      key={page.id}
                      onClick={() => togglePageSelection(page.pageId)}
                      className={`flex items-center justify-between p-2.5 rounded-xl border transition cursor-pointer select-none ${
                        isChecked
                          ? "bg-sky-50 dark:bg-sky-950/40 border-sky-300 dark:border-sky-500/40 shadow-xs"
                          : "bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 opacity-70 hover:opacity-100"
                      }`}
                    >
                      <div className="flex items-center space-x-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-sky-600 text-white font-bold text-xs flex items-center justify-center shrink-0 overflow-hidden shadow-xs">
                          {page.avatarUrl ? (
                            <img src={page.avatarUrl} alt={page.name} className="w-full h-full object-cover" />
                          ) : (
                            page.name.charAt(0)
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                            {page.name}
                          </p>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                            {page.category || "Business"}
                          </p>
                        </div>
                      </div>
                      <div
                        className={`w-5 h-5 rounded-md flex items-center justify-center border transition shrink-0 ${
                          isChecked
                            ? "bg-sky-600 border-sky-600 text-white"
                            : "border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900"
                        }`}
                      >
                        {isChecked && <Check className="w-3.5 h-3.5" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Content Composer Box */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
              {/* Header with Quick Template Loader */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Edit3 className="w-4 h-4 text-sky-500" />
                    Unified Content Composer
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Write master caption with formatting, dynamic tags, or spintax.
                  </p>
                </div>

                {/* Quick Templates Selector */}
                <div className="flex items-center space-x-2">
                  <select
                    onChange={(e) => {
                      const tpl = templates.find((t) => t.id === e.target.value);
                      if (tpl) handleApplyTemplate(tpl);
                    }}
                    value=""
                    className="text-xs bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg px-2.5 py-1.5 font-medium cursor-pointer"
                  >
                    <option value="" disabled>
                      ⚡ Quick Load Saved Template...
                    </option>
                    {templates.map((tpl) => (
                      <option key={tpl.id} value={tpl.id}>
                        {tpl.title} ({tpl.category})
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={handleSaveAsTemplateFromComposer}
                    title="Save current text as reusable template"
                    className="text-xs text-sky-600 dark:text-sky-400 hover:text-sky-700 bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800 px-2.5 py-1.5 rounded-lg font-semibold flex items-center space-x-1 cursor-pointer"
                  >
                    <BookmarkCheck className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Save as Template</span>
                  </button>
                </div>
              </div>

              {/* Internal Title (Optional) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Internal Title / Campaign Tag <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={postTitle}
                  onChange={(e) => setPostTitle(e.target.value)}
                  placeholder="e.g. Weekend Flash Sale Promo - All Outlets"
                  className="w-full text-xs px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              {/* Master Textarea with Formatting Helper Pills */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Post Caption & Formatting
                  </label>
                  <span className="text-[11px] text-slate-400">{postContent.length} characters</span>
                </div>

                {/* Variable & Helper Insertion Pills */}
                <div className="flex flex-wrap items-center gap-1.5 mb-2">
                  <span className="text-[10px] uppercase font-bold text-slate-400 mr-1">Insert Tags:</span>
                  <button
                    type="button"
                    onClick={() => setPostContent((prev) => prev + " {{page_name}}")}
                    className="px-2 py-0.5 rounded-md bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300 text-[11px] font-semibold border border-sky-200 dark:border-sky-800 hover:bg-sky-200 cursor-pointer"
                  >
                    + Page Name
                  </button>
                  <button
                    type="button"
                    onClick={() => setPostContent((prev) => prev + " {{business_name}}")}
                    className="px-2 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 text-[11px] font-semibold border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-200 cursor-pointer"
                  >
                    + Business Portfolio
                  </button>
                  <button
                    type="button"
                    onClick={() => setPostContent((prev) => prev + " {Exclusive|Special|Limited time}")}
                    className="px-2 py-0.5 rounded-md bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 text-[11px] font-semibold border border-purple-200 dark:border-purple-800 hover:bg-purple-200 cursor-pointer"
                  >
                    + Spintax Variation
                  </button>
                  <button
                    type="button"
                    onClick={() => setPostContent((prev) => prev + " 🔥 ✨ 🎁 💬")}
                    className="px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 text-[11px] font-semibold border border-amber-200 dark:border-amber-800 hover:bg-amber-200 cursor-pointer"
                  >
                    + Emojis
                  </button>
                </div>

                <textarea
                  value={postContent}
                  onChange={(e) => setPostContent(e.target.value)}
                  rows={8}
                  placeholder={`Write your post copy here...\n\nUse emojis, bullet points, and hashtags.\nExample:\n🔥 BIG NEWS from {{page_name}}!\n{Don't miss our weekend special|Check out our brand new arrival} now!\n\n👉 Send us a message to order.\n#Trending #Promo #{{page_name}}`}
                  className="w-full text-xs font-mono sm:font-sans p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 leading-relaxed"
                />
              </div>

              {/* Media Attachments Section */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <ImageIcon className="w-4 h-4 text-sky-500" />
                    Media Attachment
                  </label>
                  {/* Media Type Switcher */}
                  <div className="flex items-center p-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                    <button
                      type="button"
                      onClick={() => setMediaType("none")}
                      className={`text-[11px] px-2.5 py-1 rounded-md font-semibold cursor-pointer ${
                        mediaType === "none"
                          ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs"
                          : "text-slate-500"
                      }`}
                    >
                      Text Only
                    </button>
                    <button
                      type="button"
                      onClick={() => setMediaType("image")}
                      className={`text-[11px] px-2.5 py-1 rounded-md font-semibold cursor-pointer ${
                        mediaType === "image"
                          ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs"
                          : "text-slate-500"
                      }`}
                    >
                      Single Image
                    </button>
                    <button
                      type="button"
                      onClick={() => setMediaType("multi_image")}
                      className={`text-[11px] px-2.5 py-1 rounded-md font-semibold cursor-pointer ${
                        mediaType === "multi_image"
                          ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs"
                          : "text-slate-500"
                      }`}
                    >
                      Multi-Photo
                    </button>
                    <button
                      type="button"
                      onClick={() => setMediaType("video")}
                      className={`text-[11px] px-2.5 py-1 rounded-md font-semibold cursor-pointer ${
                        mediaType === "video"
                          ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs"
                          : "text-slate-500"
                      }`}
                    >
                      Video
                    </button>
                  </div>
                </div>

                {mediaType !== "none" && (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <input
                        type="url"
                        value={newMediaInput}
                        onChange={(e) => setNewMediaInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddMedia();
                          }
                        }}
                        placeholder="Paste image/media public URL (e.g. Unsplash, CDN, or Drive link)..."
                        className="flex-1 text-xs px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500"
                      />
                      <button
                        type="button"
                        onClick={handleAddMedia}
                        className="px-3 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-semibold cursor-pointer"
                      >
                        Add URL
                      </button>
                    </div>

                    {/* Previews */}
                    {mediaUrls.length > 0 && (
                      <div className="flex flex-wrap gap-2.5 pt-1">
                        {mediaUrls.map((url, idx) => (
                          <div
                            key={idx}
                            className="relative group w-20 h-20 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800"
                          >
                            <img src={url} alt={`Media ${idx + 1}`} className="w-full h-full object-cover" />
                            <button
                              type="button"
                              onClick={() => handleRemoveMedia(idx)}
                              className="absolute top-1 right-1 p-1 rounded-full bg-red-600 text-white opacity-0 group-hover:opacity-100 transition shadow-xs cursor-pointer"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* High-Growth & Lead Conversion Hooks */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="p-1 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                      <Sparkles className="w-4 h-4" />
                    </span>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                        High-Growth & Lead Conversion Hooks
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                          Algorithmic Reach & Sales Funnel
                        </span>
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        First-comment link placement, Meta feed CTA buttons, and automated Comment-to-DM lead capture.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Sub-Card 1: Auto First-Comment Dispatch */}
                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700/80 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="enableFirstCommentCheck"
                        checked={enableFirstComment}
                        onChange={(e) => setEnableFirstComment(e.target.checked)}
                        className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 dark:border-slate-600 cursor-pointer"
                      />
                      <label htmlFor="enableFirstCommentCheck" className="text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer flex items-center gap-1.5">
                        💬 Auto First-Comment Dispatch
                        <span className="text-[10px] font-normal text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                          Bypass Reach Penalty
                        </span>
                      </label>
                    </div>
                    <span className="text-[10px] text-slate-400">
                      Dispatched simultaneously upon posting
                    </span>
                  </div>

                  {enableFirstComment && (
                    <div className="space-y-2 pl-6 pt-1">
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal">
                        💡 Putting external links or store URLs in the primary caption triggers Meta&apos;s outbound link reach suppression. Moving links into the first comment secures maximum feed impressions.
                      </p>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[10px] uppercase font-bold text-slate-400">Quick Insert:</span>
                        <button
                          type="button"
                          onClick={() => setFirstCommentText((prev) => prev + " {{page_name}}")}
                          className="px-2 py-0.5 rounded bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-[10px] text-slate-700 dark:text-slate-300 hover:bg-slate-100 cursor-pointer"
                        >
                          + &#123;&#123;page_name&#123;&#123;
                        </button>
                        <button
                          type="button"
                          onClick={() => setFirstCommentText((prev) => prev + " 👉 Claim offer: https://sielab.shop/deal")}
                          className="px-2 py-0.5 rounded bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-[10px] text-slate-700 dark:text-slate-300 hover:bg-slate-100 cursor-pointer"
                        >
                          + Voucher Link
                        </button>
                        <button
                          type="button"
                          onClick={() => setFirstCommentText((prev) => prev + " (Drop 'PM' below to claim your discount via Messenger!)")}
                          className="px-2 py-0.5 rounded bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-[10px] text-slate-700 dark:text-slate-300 hover:bg-slate-100 cursor-pointer"
                        >
                          + Comment Prompt
                        </button>
                      </div>
                      <textarea
                        value={firstCommentText}
                        onChange={(e) => setFirstCommentText(e.target.value)}
                        rows={2}
                        placeholder="Write pinned first-comment text with link or promo code..."
                        className="w-full text-xs p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 leading-relaxed font-sans"
                      />
                    </div>
                  )}
                </div>

                {/* Sub-Card 2: Native Call-to-Action (CTA) Button */}
                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700/80 space-y-2.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                        🔘 Native Call-to-Action (CTA) Button
                        <span className="text-[10px] font-normal text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/40 px-1.5 py-0.5 rounded border border-sky-200 dark:border-sky-800">
                          Interactive Feed Card
                        </span>
                      </label>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Renders an interactive action button natively directly at the bottom of the feed card.
                      </p>
                    </div>

                    <select
                      value={callToActionType}
                      onChange={(e) => setCallToActionType(e.target.value as any)}
                      className="text-xs px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg font-semibold text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
                    >
                      <option value="NONE">No Button (Standard Post)</option>
                      <option value="MESSAGE_PAGE">💬 Send Message (Direct Messenger)</option>
                      <option value="WHATSAPP">📱 Send WhatsApp Message</option>
                      <option value="SHOP_NOW">🛍️ Shop Now (Direct Store Link)</option>
                      <option value="LEARN_MORE">🔗 Learn More (Landing Page)</option>
                    </select>
                  </div>

                  {(callToActionType === "SHOP_NOW" || callToActionType === "LEARN_MORE") && (
                    <div className="pt-1">
                      <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Destination Target URL:
                      </label>
                      <input
                        type="url"
                        value={callToActionUrl}
                        onChange={(e) => setCallToActionUrl(e.target.value)}
                        placeholder="https://sielab.shop/collections/exclusive"
                        className="w-full text-xs px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
                      />
                    </div>
                  )}

                  {callToActionType !== "NONE" && (
                    <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 space-y-2">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                            Card Headline / Sub-Title:
                          </label>
                          <span className="text-[10px] text-sky-600 dark:text-sky-400 font-medium">
                            Live on Feed Card
                          </span>
                        </div>
                        <input
                          type="text"
                          value={callToActionTitle}
                          onChange={(e) => setCallToActionTitle(e.target.value)}
                          placeholder="e.g. Direct Messenger Inquiry, Chat with our stylists, Claim your coupon..."
                          className="w-full text-xs px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 font-semibold"
                        />
                      </div>

                      {/* Quick Headline Presets */}
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[10px] uppercase font-bold text-slate-400">Presets:</span>
                        {[
                          "Direct Messenger Inquiry",
                          "Chat with our team now",
                          "Claim your 20% discount coupon",
                          "Inquire about prices & sizes",
                          "Instant 1-on-1 assistance",
                        ].map((preset) => (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => setCallToActionTitle(preset)}
                            className="text-[10px] px-2 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-sky-400 hover:text-sky-600 cursor-pointer transition"
                          >
                            + {preset}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Sub-Card 3: Comment-to-DM Lead Funnel */}
                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700/80 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="enableCommentToDmCheck"
                        checked={enableCommentToDm}
                        onChange={(e) => setEnableCommentToDm(e.target.checked)}
                        className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 dark:border-slate-600 cursor-pointer"
                      />
                      <label htmlFor="enableCommentToDmCheck" className="text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer flex items-center gap-1.5">
                        ⚡ Comment-to-DM Lead Funnel
                        <span className="text-[10px] font-normal text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-1.5 py-0.5 rounded border border-indigo-200 dark:border-indigo-800">
                          Zero-Click Messenger Capture
                        </span>
                      </label>
                    </div>
                    <span className="text-[10px] text-slate-400">
                      Syncs directly into SieReach CRM
                    </span>
                  </div>

                  {enableCommentToDm && (
                    <div className="space-y-3 pl-6 pt-1">
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal">
                        🔥 When users comment on any published post across your pages, SieReach automatically replies publicly AND dispatches a private Messenger DM with your voucher/link, qualifying them into your active sales CRM.
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="sm:col-span-1">
                          <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            Trigger Keyword:
                          </label>
                          <input
                            type="text"
                            value={commentToDmKeyword}
                            onChange={(e) => setCommentToDmKeyword(e.target.value)}
                            placeholder="e.g. PM or ALL"
                            className="w-full text-xs px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none"
                          />
                          <span className="text-[9px] text-slate-400">Set to &apos;ALL&apos; to trigger on any comment.</span>
                        </div>

                        <div className="sm:col-span-2">
                          <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            Public Reply Under Comment:
                          </label>
                          <input
                            type="text"
                            value={commentToDmReply}
                            onChange={(e) => setCommentToDmReply(e.target.value)}
                            placeholder="Hi {{name}}! We just sent you a private message with your discount code 🎁"
                            className="w-full text-xs px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none"
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                            Private Messenger DM Message (Mini-Blast):
                          </label>
                          <span className="text-[10px] text-indigo-500">Supports &#123;&#123;name&#125;&#125;, &#123;&#123;page_name&#125;&#125;</span>
                        </div>
                        <textarea
                          value={commentToDmMiniBlast}
                          onChange={(e) => setCommentToDmMiniBlast(e.target.value)}
                          rows={2}
                          placeholder="Hello {{name}}! Thank you for commenting on {{page_name}}. Here is your exclusive voucher code..."
                          className="w-full text-xs p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 leading-relaxed font-sans"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Bar (Publish Now vs Schedule vs Draft) */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => setPublishAction("PUBLISH_NOW")}
                      className={`text-xs px-3 py-2 rounded-xl font-bold transition flex items-center space-x-1.5 cursor-pointer ${
                        publishAction === "PUBLISH_NOW"
                          ? "bg-sky-600 text-white shadow-sm"
                          : "bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                      }`}
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Publish Now</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPublishAction("SCHEDULE")}
                      className={`text-xs px-3 py-2 rounded-xl font-bold transition flex items-center space-x-1.5 cursor-pointer ${
                        publishAction === "SCHEDULE"
                          ? "bg-purple-600 text-white shadow-sm"
                          : "bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                      }`}
                    >
                      <Calendar className="w-3.5 h-3.5" />
                      <span>Schedule Post</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPublishAction("DRAFT")}
                      className={`text-xs px-3 py-2 rounded-xl font-bold transition flex items-center space-x-1.5 cursor-pointer ${
                        publishAction === "DRAFT"
                          ? "bg-slate-700 text-white shadow-sm"
                          : "bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                      }`}
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Save Draft</span>
                    </button>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="button"
                    disabled={isPublishing || selectedPageIds.length === 0}
                    onClick={handleDispatchPost}
                    className="flex items-center justify-center space-x-2 px-5 py-2.5 rounded-xl font-bold text-xs bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white shadow-md shadow-sky-500/25 transition disabled:opacity-50 cursor-pointer"
                  >
                    {isPublishing ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Distributing ({selectedPageIds.length} Pages)...</span>
                      </>
                    ) : publishAction === "PUBLISH_NOW" ? (
                      <>
                        <Send className="w-4 h-4" />
                        <span>Blast to {selectedPageIds.length} Pages Now</span>
                      </>
                    ) : publishAction === "SCHEDULE" ? (
                      <>
                        <Clock className="w-4 h-4" />
                        <span>Set Schedule for {selectedPageIds.length} Pages</span>
                      </>
                    ) : (
                      <>
                        <FileText className="w-4 h-4" />
                        <span>Save Post as Draft</span>
                      </>
                    )}
                  </button>
                </div>

                {/* If Schedule Action selected, show Multi-Page Schedule Configuration Box */}
                {publishAction === "SCHEDULE" && (
                  <div className="p-4 bg-purple-50/90 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 rounded-2xl space-y-3.5">
                    {/* Header & Mode Switcher */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-purple-200/60 dark:border-purple-800/60">
                      <div className="flex items-center space-x-2 text-xs font-bold text-purple-900 dark:text-purple-300">
                        <Clock className="w-4 h-4 text-purple-600" />
                        <span>Multi-Page Schedule Configuration</span>
                      </div>

                      {/* Mode Toggle */}
                      <div className="flex items-center p-0.5 bg-white dark:bg-slate-900 rounded-lg border border-purple-200 dark:border-purple-800">
                        <button
                          type="button"
                          onClick={() => setScheduleMode("uniform")}
                          className={`text-[11px] px-2.5 py-1 rounded-md font-semibold cursor-pointer transition ${
                            scheduleMode === "uniform"
                              ? "bg-purple-600 text-white shadow-2xs"
                              : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                          }`}
                        >
                          Same Time (Uniform)
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setScheduleMode("individual");
                            if (Object.keys(pageSchedules).length === 0 && scheduledDateTime) {
                              const init: Record<string, string> = {};
                              selectedPageIds.forEach((pid) => (init[pid] = scheduledDateTime));
                              setPageSchedules(init);
                            }
                          }}
                          className={`text-[11px] px-2.5 py-1 rounded-md font-semibold cursor-pointer transition flex items-center space-x-1 ${
                            scheduleMode === "individual"
                              ? "bg-purple-600 text-white shadow-2xs"
                              : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                          }`}
                        >
                          <span>Different Time per Page</span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300 font-bold">
                            {selectedPageIds.length}
                          </span>
                        </button>
                      </div>
                    </div>

                    {/* Mode 1: Uniform Schedule */}
                    {scheduleMode === "uniform" ? (
                      <div className="flex flex-col sm:flex-row items-center gap-3">
                        <div className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                          Dispatch date & time for all {selectedPageIds.length} pages:
                        </div>
                        <input
                          type="datetime-local"
                          value={scheduledDateTime}
                          onChange={(e) => {
                            const val = e.target.value;
                            setScheduledDateTime(val);
                            const updated: Record<string, string> = {};
                            selectedPageIds.forEach((pid) => (updated[pid] = val));
                            setPageSchedules(updated);
                          }}
                          className="text-xs px-3 py-1.5 bg-white dark:bg-slate-900 border border-purple-300 dark:border-purple-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none"
                        />
                        <span className="text-[11px] text-purple-700 dark:text-purple-400">
                          All selected pages will trigger concurrently.
                        </span>
                      </div>
                    ) : (
                      /* Mode 2: Individual Schedule Per Page */
                      <div className="space-y-3">
                        {/* Quick Stagger Toolbar */}
                        <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-purple-100/60 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800/60">
                          <div className="text-xs font-semibold text-purple-950 dark:text-purple-200 flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                            <span>Quick Stagger Presets:</span>
                          </div>

                          <div className="flex flex-wrap items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleApplyStagger(15)}
                              className="text-[11px] px-2.5 py-1 bg-white dark:bg-slate-800 border border-purple-300 dark:border-purple-700 text-purple-800 dark:text-purple-300 rounded-lg font-semibold hover:bg-purple-50 dark:hover:bg-slate-700 transition cursor-pointer"
                            >
                              +15m apart
                            </button>
                            <button
                              type="button"
                              onClick={() => handleApplyStagger(30)}
                              className="text-[11px] px-2.5 py-1 bg-white dark:bg-slate-800 border border-purple-300 dark:border-purple-700 text-purple-800 dark:text-purple-300 rounded-lg font-semibold hover:bg-purple-50 dark:hover:bg-slate-700 transition cursor-pointer"
                            >
                              +30m apart
                            </button>
                            <button
                              type="button"
                              onClick={() => handleApplyStagger(60)}
                              className="text-[11px] px-2.5 py-1 bg-white dark:bg-slate-800 border border-purple-300 dark:border-purple-700 text-purple-800 dark:text-purple-300 rounded-lg font-semibold hover:bg-purple-50 dark:hover:bg-slate-700 transition cursor-pointer"
                            >
                              +1h apart
                            </button>
                            <button
                              type="button"
                              onClick={() => handleApplyStagger(120)}
                              className="text-[11px] px-2.5 py-1 bg-white dark:bg-slate-800 border border-purple-300 dark:border-purple-700 text-purple-800 dark:text-purple-300 rounded-lg font-semibold hover:bg-purple-50 dark:hover:bg-slate-700 transition cursor-pointer"
                            >
                              +2h apart
                            </button>
                          </div>
                        </div>

                        {/* Per-Page Schedule Rows */}
                        <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                          {selectedPageIds.map((pageId, idx) => {
                            const pageObj = filteredPages.find((p) => p.pageId === pageId);
                            const currentSched = pageSchedules[pageId] || scheduledDateTime || "";
                            return (
                              <div
                                key={pageId}
                                className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-purple-200 dark:border-purple-800/80 shadow-2xs"
                              >
                                {/* Page Info */}
                                <div className="flex items-center space-x-2.5 min-w-0">
                                  <span className="w-5 h-5 rounded-full bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300 text-[10px] font-bold flex items-center justify-center shrink-0">
                                    {idx + 1}
                                  </span>
                                  <div className="w-7 h-7 rounded-lg bg-sky-600 text-white font-bold text-xs flex items-center justify-center shrink-0 overflow-hidden shadow-xs">
                                    {pageObj?.avatarUrl ? (
                                      <img src={pageObj.avatarUrl} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                      pageObj?.name.charAt(0) || "P"
                                    )}
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                                      {pageObj?.name || pageId}
                                    </p>
                                    <p className="text-[10px] text-slate-400 truncate">
                                      {pageObj?.category || "Facebook Page"}
                                    </p>
                                  </div>
                                </div>

                                {/* Date-time picker for this specific page */}
                                <div className="flex items-center space-x-2 shrink-0">
                                  <input
                                    type="datetime-local"
                                    value={currentSched}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setPageSchedules((prev) => ({
                                        ...prev,
                                        [pageId]: val,
                                      }));
                                      if (idx === 0 && !scheduledDateTime) {
                                        setScheduledDateTime(val);
                                      }
                                    }}
                                    className="text-xs px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-purple-300 dark:border-purple-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none"
                                  />
                                  {scheduledDateTime && currentSched !== scheduledDateTime && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setPageSchedules((prev) => ({
                                          ...prev,
                                          [pageId]: scheduledDateTime,
                                        }))
                                      }
                                      title="Sync to base time"
                                      className="text-[10px] text-purple-600 hover:text-purple-800 underline cursor-pointer"
                                    >
                                      Reset
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Real-Time Facebook Post Live Preview Mockup (5 cols) */}
          <div className="lg:col-span-5 space-y-4 sticky top-20">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-sky-500" />
                Live Meta Feed Preview
              </h3>

              {/* Page Switcher for Preview */}
              <div className="flex items-center space-x-1.5">
                <span className="text-[11px] text-slate-400">Preview as:</span>
                <select
                  value={previewPageId}
                  onChange={(e) => setPreviewPageId(e.target.value)}
                  className="text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-1 text-slate-800 dark:text-slate-200 font-semibold cursor-pointer max-w-[160px] truncate"
                >
                  {filteredPages.map((p) => (
                    <option key={p.pageId} value={p.pageId}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Realistic Facebook Post Card Replica */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-md">
              {/* FB Post Header */}
              <div className="p-3.5 flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <div className="w-10 h-10 rounded-full bg-blue-600 text-white font-bold text-sm flex items-center justify-center shrink-0 overflow-hidden shadow-xs ring-1 ring-slate-200 dark:ring-slate-700">
                    {currentPreviewPage?.avatarUrl ? (
                      <img
                        src={currentPreviewPage.avatarUrl}
                        alt={currentPreviewPage.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      currentPreviewPage?.name.charAt(0) || "P"
                    )}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                      {currentPreviewPage?.name || "Your Facebook Page"}
                    </h4>
                    <div className="flex items-center space-x-1.5 text-[10px] text-slate-500 dark:text-slate-400">
                      <span>Just now</span>
                      <span>·</span>
                      <span title="Public post">🌐</span>
                    </div>
                  </div>
                </div>

                <div className="text-slate-400 text-sm font-bold">···</div>
              </div>

              {/* FB Post Body Content */}
              <div className="px-3.5 pb-3">
                {renderedPreviewText ? (
                  <p className="text-xs text-slate-800 dark:text-slate-100 whitespace-pre-wrap leading-relaxed">
                    {renderedPreviewText}
                  </p>
                ) : (
                  <p className="text-xs text-slate-400 italic">
                    Type your caption in the composer to preview realistic Facebook feed rendering...
                  </p>
                )}
              </div>

              {/* FB Post Media */}
              {mediaType !== "none" && mediaUrls.length > 0 && (
                <div className="border-t border-b border-slate-100 dark:border-slate-800 bg-black/5 dark:bg-black/30">
                  {mediaType === "image" || mediaUrls.length === 1 ? (
                    <img
                      src={mediaUrls[0]}
                      alt="Post visual"
                      className="w-full max-h-80 object-cover"
                    />
                  ) : (
                    <div className="grid grid-cols-2 gap-0.5">
                      {mediaUrls.slice(0, 4).map((url, i) => (
                        <div key={i} className="relative aspect-square overflow-hidden bg-slate-900">
                          <img src={url} alt={`Media ${i}`} className="w-full h-full object-cover" />
                          {i === 3 && mediaUrls.length > 4 && (
                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white font-bold text-base">
                              +{mediaUrls.length - 4}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Native Meta Call-to-Action Bar */}
              {callToActionType !== "NONE" && (
                <div className="mx-3.5 my-2.5 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex items-center justify-between shadow-2xs">
                  <div className="min-w-0 pr-2">
                    <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">
                      {currentPreviewPage?.name || "Facebook Page"}
                    </span>
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                      {callToActionTitle ||
                        (callToActionType === "MESSAGE_PAGE" && "Direct Messenger Inquiry") ||
                        (callToActionType === "WHATSAPP" && "WhatsApp Business Chat") ||
                        (callToActionType === "SHOP_NOW" && (callToActionUrl || "Explore Store Catalog")) ||
                        (callToActionType === "LEARN_MORE" && (callToActionUrl || "Official Information Link"))}
                    </p>
                  </div>
                  <div className="shrink-0 px-3 py-1.5 rounded-lg bg-sky-600 text-white font-bold text-xs flex items-center space-x-1 shadow-xs">
                    <span>
                      {callToActionType === "MESSAGE_PAGE" && "💬 Send Message"}
                      {callToActionType === "WHATSAPP" && "📱 WhatsApp"}
                      {callToActionType === "SHOP_NOW" && "🛍️ Shop Now"}
                      {callToActionType === "LEARN_MORE" && "Learn More"}
                    </span>
                  </div>
                </div>
              )}

              {/* FB Post Engagement Counters */}
              <div className="px-3.5 py-2 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center space-x-1">
                  <span className="w-4 h-4 rounded-full bg-blue-500 text-white flex items-center justify-center text-[9px]">
                    👍
                  </span>
                  <span>14</span>
                </div>
                <div>3 comments · 2 shares</div>
              </div>

              {/* FB Post Action Buttons */}
              <div className="grid grid-cols-3 p-1 text-slate-600 dark:text-slate-300 text-xs font-semibold text-center">
                <button type="button" className="flex items-center justify-center space-x-1.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition">
                  <ThumbsUp className="w-3.5 h-3.5" />
                  <span>Like</span>
                </button>
                <button type="button" className="flex items-center justify-center space-x-1.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition">
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>Comment</span>
                </button>
                <button type="button" className="flex items-center justify-center space-x-1.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition">
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Share</span>
                </button>
              </div>

              {/* Pinned First-Comment Mockup */}
              {enableFirstComment && renderedPreviewFirstComment.trim() && (
                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                    <span className="flex items-center gap-1">
                      <Sparkles className="w-3 h-3" /> Auto Pinned First-Comment
                    </span>
                    <span className="text-[10px] text-slate-400 font-normal">Algorithmic Reach Safe</span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <div className="w-6 h-6 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                      {currentPreviewPage?.name.charAt(0) || "P"}
                    </div>
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200 shadow-2xs max-w-[85%]">
                      <div className="flex items-center space-x-1.5 mb-0.5">
                        <span className="font-bold text-[11px] text-slate-900 dark:text-white">
                          {currentPreviewPage?.name || "Your Page"}
                        </span>
                        <span className="text-[9px] bg-slate-100 dark:bg-slate-800 text-slate-500 px-1 rounded font-semibold">
                          Author
                        </span>
                      </div>
                      <p className="whitespace-pre-wrap leading-relaxed text-[11px]">
                        {renderedPreviewFirstComment}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Comment-to-DM Funnel Status Mockup */}
              {enableCommentToDm && (
                <div className="p-3 bg-indigo-50 dark:bg-indigo-950/20 border-t border-indigo-100 dark:border-indigo-900/40 text-[11px] text-indigo-900 dark:text-indigo-300">
                  <div className="font-bold flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                    Comment-to-DM Funnel Active
                  </div>
                  <p className="mt-0.5 text-[10px] text-indigo-700 dark:text-indigo-400 leading-normal">
                    Keyword: <strong>&quot;{commentToDmKeyword || "ALL"}&quot;</strong> &rarr; Instant public reply + private Messenger DM + qualified into CRM.
                  </p>
                </div>
              )}
            </div>

            {/* CDC Feature Hint */}
            <div className="p-3.5 rounded-xl bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800 text-xs text-sky-800 dark:text-sky-300">
              <div className="font-bold flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-sky-500" />
                Zero-Lag Syndication
              </div>
              <p className="mt-1 text-[11px] leading-relaxed text-sky-700 dark:text-sky-400">
                When you click blast, our server publishes directly to each page's Graph API feed concurrently. No page switching, no Meta UI freezes.
              </p>
            </div>
          </div>
        </div>
      )}



      {/* ========================================================================= */}
      {/* SUBTAB 2: CONTENT PLANNER & VISUAL CALENDAR                               */}
      {/* ========================================================================= */}
      {subTab === "planner" && (
        <div className="space-y-4">
          {/* Master Controls Bar */}
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3.5 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
            {/* Left: View Mode Switcher (Visual Calendar vs Queue List) */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800/90 rounded-xl border border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setPlannerViewMode("calendar")}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    plannerViewMode === "calendar"
                      ? "bg-sky-600 text-white shadow-xs"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  <CalendarDays className="w-3.5 h-3.5" />
                  <span>Visual Calendar</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPlannerViewMode("list")}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    plannerViewMode === "list"
                      ? "bg-sky-600 text-white shadow-xs"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  <ListFilter className="w-3.5 h-3.5" />
                  <span>Queue List ({posts.length})</span>
                </button>
              </div>

              {/* Status Filter Badges */}
              <div className="hidden sm:flex items-center space-x-1 pl-2 border-l border-slate-200 dark:border-slate-800">
                {["ALL", "SCHEDULED", "PUBLISHED", "DRAFT", "FAILED"].map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setPlannerStatusFilter(status)}
                    className={`text-[11px] px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                      plannerStatusFilter === status
                        ? "bg-sky-600 text-white"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>

            {/* Right: Page Filter Dropdown & Action Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Target Page Filter */}
              <div className="flex items-center space-x-1.5 bg-slate-50 dark:bg-slate-800/80 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-[11px] font-bold text-slate-500">Page:</span>
                <select
                  value={calendarPageFilter}
                  onChange={(e) => setCalendarPageFilter(e.target.value)}
                  className="text-xs bg-transparent border-none text-slate-800 dark:text-slate-200 font-semibold focus:outline-none cursor-pointer max-w-[150px] truncate"
                >
                  <option value="ALL">All Pages ({filteredPages.length})</option>
                  {filteredPages.map((page) => (
                    <option key={page.pageId} value={page.pageId}>
                      {page.name}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={fetchPosts}
                disabled={isLoading}
                className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 font-semibold flex items-center space-x-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
                <span>Refresh</span>
              </button>

              <button
                type="button"
                onClick={() => setSubTab("composer")}
                className="text-xs bg-sky-600 hover:bg-sky-500 text-white px-3 py-1.5 rounded-xl font-bold flex items-center space-x-1.5 transition cursor-pointer shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Compose Post</span>
              </button>
            </div>
          </div>

          {/* VIEW MODE 1: VISUAL DRAG-AND-DROP CALENDAR */}
          {plannerViewMode === "calendar" && (
            <div className="space-y-3">
              {/* Calendar Month Navigation Sub-Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 px-5 py-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
                {/* Month Title & Prev/Today/Next Controls */}
                <div className="flex items-center space-x-3">
                  <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-sky-600 dark:text-sky-400" />
                    <span>
                      {calendarDate.toLocaleString("default", { month: "long" })} {calendarDate.getFullYear()}
                    </span>
                  </h2>
                  <div className="flex items-center space-x-1 bg-slate-100 dark:bg-slate-800 rounded-xl p-1 border border-slate-200 dark:border-slate-700">
                    <button
                      type="button"
                      onClick={handlePrevMonth}
                      className="p-1 rounded-lg hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition cursor-pointer"
                      title="Previous Month"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={handleToday}
                      className="px-2.5 py-0.5 text-xs font-bold rounded-lg hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition cursor-pointer"
                      title="Jump to Today"
                    >
                      Today
                    </button>
                    <button
                      type="button"
                      onClick={handleNextMonth}
                      className="p-1 rounded-lg hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition cursor-pointer"
                      title="Next Month"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Drag Hint & Status Legend */}
                <div className="flex flex-wrap items-center gap-3.5">
                  <div className="hidden lg:flex items-center space-x-1.5 text-slate-500 text-xs font-medium">
                    <Move className="w-3.5 h-3.5 text-sky-500" />
                    <span>Drag cards between days to reschedule dispatch date</span>
                  </div>

                  <div className="flex items-center space-x-2.5 text-[11px] font-bold">
                    <span className="flex items-center gap-1 text-purple-700 dark:text-purple-400">
                      <span className="w-2 h-2 rounded-full bg-purple-500"></span> Scheduled
                    </span>
                    <span className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400">
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Published
                    </span>
                    <span className="flex items-center gap-1 text-slate-600 dark:text-slate-400">
                      <span className="w-2 h-2 rounded-full bg-slate-400"></span> Draft
                    </span>
                    <span className="flex items-center gap-1 text-red-600 dark:text-red-400">
                      <span className="w-2 h-2 rounded-full bg-red-500"></span> Failed
                    </span>
                  </div>
                </div>
              </div>

              {/* Day Headers (Sun -> Sat) */}
              <div className="grid grid-cols-7 gap-px bg-slate-200 dark:bg-slate-800 rounded-t-2xl overflow-hidden border-t border-x border-slate-200 dark:border-slate-800 text-center">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((dayName) => (
                  <div
                    key={dayName}
                    className="bg-slate-100 dark:bg-slate-900/90 py-2.5 text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider"
                  >
                    {dayName}
                  </div>
                ))}
              </div>

              {/* 42-Day Month Grid */}
              <div className="grid grid-cols-7 gap-px bg-slate-200 dark:bg-slate-800 border-b border-x border-slate-200 dark:border-slate-800 rounded-b-2xl overflow-hidden shadow-xs">
                {calendarGrid.map((day) => {
                  const dayPosts = postsByDate[day.dateStr] || [];
                  const isDragOver = dragOverDateStr === day.dateStr;

                  return (
                    <div
                      key={day.dateStr}
                      onDragOver={(e) => handleDragOver(e, day.dateStr)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => {
                        e.preventDefault();
                        handleDropOnDate(day.dateStr);
                      }}
                      className={`min-h-[125px] sm:min-h-[145px] p-2 flex flex-col justify-between transition relative group select-none ${
                        isDragOver
                          ? "bg-sky-100/90 dark:bg-sky-950/70 ring-2 ring-sky-500 z-10 scale-[1.01]"
                          : day.isCurrentMonth
                          ? "bg-white dark:bg-slate-900 hover:bg-slate-50/80 dark:hover:bg-slate-850/60"
                          : "bg-slate-50/70 dark:bg-slate-950/40 opacity-70"
                      }`}
                    >
                      {/* Cell Top: Date number + Compose Shortcut */}
                      <div className="flex items-center justify-between mb-1.5">
                        <span
                          className={`text-xs font-black transition ${
                            day.isToday
                              ? "w-6 h-6 rounded-full bg-sky-600 text-white flex items-center justify-center shadow-xs"
                              : day.isCurrentMonth
                              ? "text-slate-800 dark:text-slate-200"
                              : "text-slate-400 dark:text-slate-600"
                          }`}
                        >
                          {day.dayNum}
                        </span>

                        <button
                          type="button"
                          onClick={() => handleScheduleForDate(day.dateStr)}
                          className="opacity-0 group-hover:opacity-100 transition p-1 hover:bg-sky-50 dark:hover:bg-sky-950/60 text-sky-600 dark:text-sky-400 rounded-md cursor-pointer"
                          title={`Compose and schedule post for ${day.dateStr}`}
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Drop Target Visual Banner */}
                      {isDragOver ? (
                        <div className="my-auto py-3 px-1 border-2 border-dashed border-sky-400 dark:border-sky-500 rounded-xl bg-sky-50/90 dark:bg-sky-900/30 text-center animate-pulse">
                          <span className="text-[11px] font-black text-sky-700 dark:text-sky-300">
                            Drop here to reschedule
                          </span>
                        </div>
                      ) : (
                        /* Post Cards inside this Day */
                        <div className="space-y-1.5 flex-1 overflow-y-auto max-h-[125px] pr-0.5">
                          {dayPosts.map((post) => {
                            const isPostPublished = post.status === "PUBLISHED";
                            const postDate = getPostPrimaryDate(post);
                            const timeStr = postDate
                              ? postDate.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
                              : "";

                            // Left border and background accent based on status
                            const statusBorder =
                              post.status === "PUBLISHED"
                                ? "border-l-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/20 hover:border-emerald-600"
                                : post.status === "SCHEDULED" || post.status === "PARTIALLY_PUBLISHED"
                                ? "border-l-purple-500 bg-purple-50/40 dark:bg-purple-950/20 hover:border-purple-600"
                                : post.status === "DRAFT"
                                ? "border-l-slate-400 bg-slate-50 dark:bg-slate-800/50 hover:border-slate-500"
                                : "border-l-red-500 bg-red-50/40 dark:bg-red-950/20 hover:border-red-600";

                            return (
                              <div
                                key={post.id}
                                draggable={!isPostPublished}
                                onDragStart={(e) => handleDragStart(e, post)}
                                onDragEnd={handleDragEnd}
                                onClick={() => handleOpenCalendarPost(post)}
                                className={`border-l-[3.5px] ${statusBorder} border-t border-r border-b border-slate-200/80 dark:border-slate-800/80 p-1.5 rounded-lg shadow-2xs hover:shadow-md transition text-left ${
                                  draggedPostId === post.id ? "opacity-30 scale-95" : ""
                                } ${
                                  !isPostPublished ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"
                                }`}
                                title={
                                  isPostPublished
                                    ? "Published post (Click to view details)"
                                    : "Drag to another day to reschedule, or click to inspect/modify"
                                }
                              >
                                {/* Time & Drag handle */}
                                <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-0.5">
                                  <span className="flex items-center gap-1 font-mono text-[9px] text-slate-700 dark:text-slate-300">
                                    <Clock className="w-2.5 h-2.5 text-slate-400" />
                                    {timeStr || "Anytime"}
                                  </span>
                                  {!isPostPublished && (
                                    <GripVertical className="w-3 h-3 text-slate-400 hover:text-slate-600" />
                                  )}
                                </div>

                                {/* Title / Excerpt */}
                                <p className="text-[11px] font-bold text-slate-800 dark:text-slate-100 line-clamp-1 leading-tight mb-1">
                                  {post.title || post.content}
                                </p>

                                {/* Target Pages count & Feature Badges */}
                                <div className="flex items-center justify-between text-[9px] text-slate-500">
                                  <span className="font-semibold text-slate-600 dark:text-slate-300 truncate max-w-[80px]">
                                    {post.targets.length} {post.targets.length === 1 ? "page" : "pages"}
                                  </span>

                                  <div className="flex items-center space-x-1 shrink-0">
                                    {post.enableFirstComment && <span title="Auto First-Comment">💬</span>}
                                    {post.callToActionType && post.callToActionType !== "NONE" && (
                                      <span title={`CTA: ${post.callToActionType}`}>🔘</span>
                                    )}
                                    {post.enableCommentToDm && <span title="Comment-to-DM Funnel">⚡</span>}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* VIEW MODE 2: QUEUE LIST VIEW */}
          {plannerViewMode === "list" && (
            <div>
              {posts.length === 0 ? (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center">
                  <Calendar className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                  <h3 className="text-base font-bold text-slate-800 dark:text-white">No Posts in Queue</h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                    You haven't scheduled or published any posts through CDC yet. Switch to Composer to create your first multi-page blast!
                  </p>
                  <button
                    type="button"
                    onClick={() => setSubTab("composer")}
                    className="mt-4 inline-flex items-center space-x-2 px-4 py-2 bg-sky-600 text-white rounded-xl text-xs font-bold shadow-md hover:bg-sky-500 transition cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Create New Post</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {posts
                    .filter((p) => {
                      if (plannerStatusFilter !== "ALL" && p.status !== plannerStatusFilter) return false;
                      if (calendarPageFilter !== "ALL" && !p.targets.some((t) => t.pageId === calendarPageFilter)) return false;
                      return true;
                    })
                    .map((post) => {
                      let parsedMedia: string[] = [];
                      try {
                        parsedMedia = post.mediaUrls ? JSON.parse(post.mediaUrls) : [];
                      } catch {
                        parsedMedia = [];
                      }

                      const publishedCount = post.targets.filter((t) => t.status === "PUBLISHED").length;
                      const failedCount = post.targets.filter((t) => t.status === "FAILED").length;
                      const totalCount = post.targets.length;

                      return (
                        <div
                          key={post.id}
                          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs transition hover:border-slate-300 dark:hover:border-slate-700"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                            {/* Left: Thumbnail & Details */}
                            <div className="flex items-start space-x-3.5 min-w-0">
                              {parsedMedia[0] ? (
                                <img
                                  src={parsedMedia[0]}
                                  alt="Media"
                                  className="w-16 h-16 rounded-xl object-cover shrink-0 border border-slate-200 dark:border-slate-700"
                                />
                              ) : (
                                <div className="w-16 h-16 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-400 shrink-0">
                                  <FileText className="w-6 h-6" />
                                </div>
                              )}

                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2 mb-1">
                                  {post.title && (
                                    <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                      {post.title}
                                    </span>
                                  )}
                                  {/* Status Badge */}
                                  <span
                                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                                      post.status === "PUBLISHED"
                                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-300"
                                        : post.status === "SCHEDULED" || post.status === "PARTIALLY_PUBLISHED"
                                        ? "bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-400 border border-purple-300"
                                        : post.status === "DRAFT"
                                        ? "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-300"
                                        : "bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-400 border border-red-300"
                                    }`}
                                  >
                                    {post.status.replace("_", " ")}
                                  </span>

                                  {/* Timing Info */}
                                  {post.scheduledAt && (post.status === "SCHEDULED" || post.status === "PARTIALLY_PUBLISHED") && (
                                    <span className="text-[11px] text-purple-600 dark:text-purple-400 font-semibold flex items-center gap-1">
                                      <Clock className="w-3 h-3" />
                                      Next Dispatch: {new Date(post.scheduledAt).toLocaleString()}
                                    </span>
                                  )}
                                  {post.publishedAt && (
                                    <span className="text-[11px] text-slate-400">
                                      Published: {new Date(post.publishedAt).toLocaleString()}
                                    </span>
                                  )}
                                </div>

                                <p className="text-xs text-slate-700 dark:text-slate-300 line-clamp-2 leading-relaxed">
                                  {post.content}
                                </p>

                                {/* Target Pages Badges */}
                                <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
                                  <span className="text-[10px] font-bold text-slate-400 uppercase">Pages ({publishedCount}/{totalCount}):</span>
                                  {post.targets.map((tgt) => (
                                    <span
                                      key={tgt.id}
                                      className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-[10px] font-semibold border ${
                                        tgt.status === "PUBLISHED"
                                          ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800"
                                          : tgt.status === "FAILED"
                                          ? "bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800"
                                          : "bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800"
                                      }`}
                                      title={tgt.errorMessage || (tgt.metaPostId ? `Meta Post ID: ${tgt.metaPostId}` : undefined)}
                                    >
                                      <span>{tgt.page?.name || tgt.pageId}</span>
                                      {tgt.scheduledAt && tgt.status === "PENDING" && (
                                        <span className="text-[9px] font-mono text-purple-600 dark:text-purple-400">
                                          ({new Date(tgt.scheduledAt).toLocaleDateString([], { month: "numeric", day: "numeric" })}{" "}
                                          {new Date(tgt.scheduledAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })})
                                        </span>
                                      )}
                                      {tgt.status === "PUBLISHED" && <Check className="w-2.5 h-2.5" />}
                                      {tgt.status === "FAILED" && <AlertCircle className="w-2.5 h-2.5" />}
                                    </span>
                                  ))}
                                </div>

                                {/* High-Growth Indicators */}
                                {(post.enableFirstComment || (post.callToActionType && post.callToActionType !== "NONE") || post.enableCommentToDm) && (
                                  <div className="flex flex-wrap items-center gap-1.5 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                                    {post.enableFirstComment && (
                                      <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                                        <span>💬 First-Comment Active</span>
                                      </span>
                                    )}
                                    {post.callToActionType && post.callToActionType !== "NONE" && (
                                      <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-400 border border-sky-200 dark:border-sky-800">
                                        <span>🔘 CTA: {post.callToActionType}</span>
                                      </span>
                                    )}
                                    {post.enableCommentToDm && (
                                      <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                                        <span>⚡ Comment-to-DM ({post.commentToDmKeyword || "ALL"})</span>
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Right: Actions */}
                            <div className="flex items-center space-x-2 shrink-0 self-end sm:self-center">
                              {post.enableCommentToDm && (
                                <button
                                  type="button"
                                  onClick={() => handleOpenSimulationModal(post)}
                                  className="text-xs px-2.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-800 font-bold flex items-center space-x-1 cursor-pointer transition shadow-2xs"
                                  title="Simulate user comment and test automated Comment-to-DM reply & CRM capture"
                                >
                                  <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                                  <span>Test Lead Funnel</span>
                                </button>
                              )}
                              {(post.status === "SCHEDULED" || post.status === "DRAFT" || post.status === "PARTIALLY_FAILED" || post.status === "FAILED") && (
                                <button
                                  type="button"
                                  onClick={() => handleRetryPost(post.id)}
                                  className="text-xs px-3 py-1.5 rounded-lg bg-sky-50 hover:bg-sky-100 dark:bg-sky-950/60 dark:hover:bg-sky-900/60 text-sky-700 dark:text-sky-300 border border-sky-300 dark:border-sky-800 font-bold flex items-center space-x-1 cursor-pointer"
                                  title="Publish or retry dispatch immediately"
                                >
                                  <Send className="w-3 h-3" />
                                  <span>{post.status === "SCHEDULED" ? "Publish Now" : "Retry"}</span>
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => {
                                  setPostTitle(post.title || "");
                                  setPostContent(post.content);
                                  setMediaType(post.mediaType as any);
                                  setMediaUrls(parsedMedia);
                                  setSelectedPageIds(post.targets.map((t) => t.pageId));
                                  setSubTab("composer");
                                }}
                                className="p-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                                title="Duplicate into Composer"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDeletePost(post.id)}
                                className="p-1.5 text-red-500 hover:text-red-700 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 cursor-pointer"
                                title="Delete post"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          )}
        </div>
      )}



      {/* ========================================================================= */}
      {/* SUBTAB 3: FORMATTED CONTENT TEMPLATES LIBRARY                             */}
      {/* ========================================================================= */}
      {subTab === "templates" && (
        <div className="space-y-4">
          {/* Header & Filter Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Category:</span>
              {["ALL", "Promotion", "Product", "Announcement", "Tips", "Engagement"].map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setTemplateCategoryFilter(cat)}
                  className={`text-xs px-2.5 py-1 rounded-lg font-semibold transition cursor-pointer ${
                    templateCategoryFilter === cat
                      ? "bg-sky-600 text-white"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="flex items-center space-x-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={templateSearchQuery}
                  onChange={(e) => setTemplateSearchQuery(e.target.value)}
                  placeholder="Search templates..."
                  className="text-xs pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none"
                />
              </div>

              <button
                type="button"
                onClick={() => {
                  setEditingTemplate(null);
                  setTemplateForm({
                    title: "",
                    category: "Promotion",
                    content: "",
                    mediaType: "image",
                    mediaUrl: "",
                    tags: "",
                    isPinned: false,
                    enableFirstComment: false,
                    firstComment: "",
                    callToActionType: "NONE",
                    callToActionTitle: "Direct Messenger Inquiry",
                    callToActionUrl: "",
                    enableCommentToDm: false,
                    commentToDmKeyword: "ALL",
                    commentToDmReply: "",
                    commentToDmMiniBlast: "",
                  });
                  setIsTemplateModalOpen(true);
                }}
                className="text-xs bg-sky-600 hover:bg-sky-500 text-white px-3.5 py-1.5 rounded-lg font-bold flex items-center space-x-1.5 transition cursor-pointer shadow-xs shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create Template</span>
              </button>
            </div>
          </div>

          {/* Templates Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates
              .filter((tpl) => {
                const matchCategory = templateCategoryFilter === "ALL" || tpl.category === templateCategoryFilter;
                const matchSearch =
                  !templateSearchQuery ||
                  tpl.title.toLowerCase().includes(templateSearchQuery.toLowerCase()) ||
                  tpl.content.toLowerCase().includes(templateSearchQuery.toLowerCase());
                return matchCategory && matchSearch;
              })
              .map((tpl) => {
                let parsedMedia: string[] = [];
                try {
                  parsedMedia = tpl.mediaUrls ? JSON.parse(tpl.mediaUrls) : [];
                } catch {
                  parsedMedia = [];
                }

                return (
                  <div
                    key={tpl.id}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col justify-between hover:border-sky-300 dark:hover:border-sky-600 transition group"
                  >
                    <div>
                      {/* Top Meta */}
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                          {tpl.category}
                        </span>
                        {tpl.isPinned && (
                          <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                            ⭐ Pinned
                          </span>
                        )}
                      </div>

                      <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-2 leading-snug">
                        {tpl.title}
                      </h4>

                      {/* High-Growth Indicators on Template */}
                      {(tpl.enableFirstComment || (tpl.callToActionType && tpl.callToActionType !== "NONE") || tpl.enableCommentToDm) && (
                        <div className="flex flex-wrap items-center gap-1 mb-2">
                          {tpl.enableFirstComment && (
                            <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                              💬 First Comment
                            </span>
                          )}
                          {tpl.callToActionType && tpl.callToActionType !== "NONE" && (
                            <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-400 border border-sky-200 dark:border-sky-800">
                              🔘 CTA: {tpl.callToActionType}
                            </span>
                          )}
                          {tpl.enableCommentToDm && (
                            <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                              ⚡ Comment-to-DM ({tpl.commentToDmKeyword || "ALL"})
                            </span>
                          )}
                        </div>
                      )}

                      {/* Content Preview */}
                      <div className="bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 font-mono sm:font-sans whitespace-pre-wrap line-clamp-4 leading-relaxed mb-3">
                        {tpl.content}
                      </div>

                      {/* Media Thumb */}
                      {parsedMedia[0] && (
                        <div className="mb-3">
                          <img
                            src={parsedMedia[0]}
                            alt="Template visual"
                            className="w-full h-28 object-cover rounded-xl border border-slate-200 dark:border-slate-700"
                          />
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                      <div className="flex items-center space-x-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingTemplate(tpl);
                            setTemplateForm({
                              title: tpl.title,
                              category: tpl.category,
                              content: tpl.content,
                              mediaType: tpl.mediaType,
                              mediaUrl: parsedMedia[0] || "",
                              tags: tpl.tags ? JSON.parse(tpl.tags).join(", ") : "",
                              isPinned: tpl.isPinned,
                              enableFirstComment: Boolean(tpl.enableFirstComment),
                              firstComment: tpl.firstComment || "",
                              callToActionType: tpl.callToActionType || "NONE",
                              callToActionTitle: tpl.callToActionTitle || "Direct Messenger Inquiry",
                              callToActionUrl: tpl.callToActionUrl || "",
                              enableCommentToDm: Boolean(tpl.enableCommentToDm),
                              commentToDmKeyword: tpl.commentToDmKeyword || "ALL",
                              commentToDmReply: tpl.commentToDmReply || "",
                              commentToDmMiniBlast: tpl.commentToDmMiniBlast || "",
                            });
                            setIsTemplateModalOpen(true);
                          }}
                          className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                          title="Edit Template"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteTemplate(tpl.id)}
                          className="p-1.5 text-red-400 hover:text-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 cursor-pointer"
                          title="Delete Template"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleApplyTemplate(tpl)}
                        className="text-xs bg-sky-600 hover:bg-sky-500 text-white font-bold px-3 py-1.5 rounded-xl shadow-xs transition flex items-center space-x-1 cursor-pointer"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Use in Composer</span>
                      </button>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}



      {/* ========================================================================= */}
      {/* MODAL: CREATE / EDIT TEMPLATE                                             */}
      {/* ========================================================================= */}
      {isTemplateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <BookmarkCheck className="w-5 h-5 text-sky-500" />
                {editingTemplate ? "Edit Content Template" : "Save as Formatted Template"}
              </h3>
              <button
                type="button"
                onClick={() => setIsTemplateModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveTemplateSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Template Name / Title
                </label>
                <input
                  type="text"
                  required
                  value={templateForm.title}
                  onChange={(e) => setTemplateForm({ ...templateForm, title: e.target.value })}
                  placeholder="e.g. Flash 48-Hour Sale Offer"
                  className="w-full text-xs px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Category
                  </label>
                  <select
                    value={templateForm.category}
                    onChange={(e) => setTemplateForm({ ...templateForm, category: e.target.value })}
                    className="w-full text-xs px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none"
                  >
                    <option value="Promotion">Promotion</option>
                    <option value="Product">Product</option>
                    <option value="Announcement">Announcement</option>
                    <option value="Tips">Tips & Advice</option>
                    <option value="Engagement">Engagement & Polls</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Pin to Top?
                  </label>
                  <label className="flex items-center space-x-2 mt-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={templateForm.isPinned}
                      onChange={(e) => setTemplateForm({ ...templateForm, isPinned: e.target.checked })}
                      className="rounded text-sky-600 focus:ring-sky-500 w-4 h-4"
                    />
                    <span className="text-xs text-slate-600 dark:text-slate-400">Pin as recommended</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Formatted Content (Supports emojis, line breaks, {"{{page_name}}"}, {"{{business_name}}"}, Spintax)
                </label>
                <textarea
                  required
                  rows={6}
                  value={templateForm.content}
                  onChange={(e) => setTemplateForm({ ...templateForm, content: e.target.value })}
                  placeholder="Master formatted caption..."
                  className="w-full text-xs p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none leading-relaxed font-sans"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Default Media Image URL <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <input
                  type="url"
                  value={templateForm.mediaUrl}
                  onChange={(e) => setTemplateForm({ ...templateForm, mediaUrl: e.target.value })}
                  placeholder="https://..."
                  className="w-full text-xs px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none"
                />
              </div>

              {/* High-Growth Preset Fields in Template Form */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700/80 space-y-3">
                <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 block">
                  🚀 Preset High-Growth Hooks (Optional)
                </span>

                {/* Auto First Comment */}
                <div className="space-y-1.5">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={templateForm.enableFirstComment}
                      onChange={(e) => setTemplateForm({ ...templateForm, enableFirstComment: e.target.checked })}
                      className="rounded text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5"
                    />
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Enable First-Comment Link Dispatch
                    </span>
                  </label>
                  {templateForm.enableFirstComment && (
                    <input
                      type="text"
                      value={templateForm.firstComment}
                      onChange={(e) => setTemplateForm({ ...templateForm, firstComment: e.target.value })}
                      placeholder="First comment link / voucher text..."
                      className="w-full text-xs px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none"
                    />
                  )}
                </div>

                {/* CTA Button */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-600 dark:text-slate-400 mb-0.5">
                      Call-to-Action Button:
                    </label>
                    <select
                      value={templateForm.callToActionType}
                      onChange={(e) => setTemplateForm({ ...templateForm, callToActionType: e.target.value })}
                      className="w-full text-xs px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none"
                    >
                      <option value="NONE">None</option>
                      <option value="MESSAGE_PAGE">Send Message</option>
                      <option value="WHATSAPP">WhatsApp</option>
                      <option value="SHOP_NOW">Shop Now</option>
                      <option value="LEARN_MORE">Learn More</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-slate-600 dark:text-slate-400 mb-0.5">
                      Target URL (if Shop / Learn):
                    </label>
                    <input
                      type="url"
                      value={templateForm.callToActionUrl}
                      onChange={(e) => setTemplateForm({ ...templateForm, callToActionUrl: e.target.value })}
                      placeholder="https://..."
                      className="w-full text-xs px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none"
                    />
                  </div>
                </div>

                {templateForm.callToActionType !== "NONE" && (
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-600 dark:text-slate-400 mb-0.5">
                      Card Headline / Sub-Title:
                    </label>
                    <input
                      type="text"
                      value={templateForm.callToActionTitle}
                      onChange={(e) => setTemplateForm({ ...templateForm, callToActionTitle: e.target.value })}
                      placeholder="e.g. Direct Messenger Inquiry, Chat with our stylists..."
                      className="w-full text-xs px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none"
                    />
                  </div>
                )}

                {/* Comment-to-DM */}
                <div className="space-y-1.5">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={templateForm.enableCommentToDm}
                      onChange={(e) => setTemplateForm({ ...templateForm, enableCommentToDm: e.target.checked })}
                      className="rounded text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5"
                    />
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Enable Comment-to-DM Lead Funnel
                    </span>
                  </label>
                  {templateForm.enableCommentToDm && (
                    <div className="space-y-2 pt-1">
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={templateForm.commentToDmKeyword}
                          onChange={(e) => setTemplateForm({ ...templateForm, commentToDmKeyword: e.target.value })}
                          placeholder="Keyword (e.g. PM or ALL)"
                          className="w-full text-xs px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none"
                        />
                        <input
                          type="text"
                          value={templateForm.commentToDmReply}
                          onChange={(e) => setTemplateForm({ ...templateForm, commentToDmReply: e.target.value })}
                          placeholder="Public comment reply..."
                          className="w-full text-xs px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none"
                        />
                      </div>
                      <input
                        type="text"
                        value={templateForm.commentToDmMiniBlast}
                        onChange={(e) => setTemplateForm({ ...templateForm, commentToDmMiniBlast: e.target.value })}
                        placeholder="Private Messenger DM voucher..."
                        className="w-full text-xs px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsTemplateModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold bg-sky-600 hover:bg-sky-500 text-white rounded-xl shadow-md cursor-pointer"
                >
                  {editingTemplate ? "Update Template" : "Save Template"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}



      {/* ========================================================================= */}
      {/* MODAL: PUBLISH RESULT REPORT MODAL                                        */}
      {/* ========================================================================= */}
      {publishResultModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Multi-Page Distribution Complete
                </h3>
                <p className="text-xs text-slate-500">
                  Published to {publishResultModal.successCount} of {publishResultModal.total} selected pages.
                </p>
              </div>
            </div>

            {/* Target Breakdown */}
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {publishResultModal.targets?.map((t: any, idx: number) => (
                <div
                  key={idx}
                  className={`p-3 rounded-xl border flex items-center justify-between text-xs ${
                    t.success
                      ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-300"
                      : "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800 text-red-900 dark:text-red-300"
                  }`}
                >
                  <div>
                    <div className="font-bold">{t.pageName}</div>
                    <div className="text-[11px] opacity-80">
                      {t.success ? `Post ID: ${t.metaPostId}` : `Error: ${t.error}`}
                    </div>
                  </div>
                  <div>
                    {t.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-red-600" />
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setPublishResultModal(null)}
                className="px-5 py-2 text-xs font-bold bg-sky-600 hover:bg-sky-500 text-white rounded-xl shadow-xs cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: COMMENT-TO-DM LEAD SIMULATION & TESTING                            */}
      {/* ========================================================================= */}
      {isSimModalOpen && simTargetPost && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center space-x-2">
                <span className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                  <Sparkles className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Comment-to-DM Lead Funnel Simulator
                  </h3>
                  <p className="text-xs text-slate-500">
                    Test automated public reply & private Messenger mini-blast capture.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsSimModalOpen(false);
                  setSimResult(null);
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Post Summary & Trigger Info */}
            <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-700 dark:text-slate-300">
                  Target Post: <span className="font-normal text-slate-900 dark:text-white">{simTargetPost.title || "Social Post"}</span>
                </span>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                  Trigger Keyword: &quot;{simTargetPost.commentToDmKeyword || "ALL"}&quot;
                </span>
              </div>
              <p className="text-slate-500 text-[11px] line-clamp-1 italic">
                &quot;{simTargetPost.content}&quot;
              </p>
            </div>

            {/* Simulation Form */}
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Target Facebook Page:
                </label>
                <select
                  value={simPageId}
                  onChange={(e) => setSimPageId(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none font-semibold text-slate-800 dark:text-slate-200"
                >
                  {simTargetPost.targets.map((tgt) => (
                    <option key={tgt.pageId} value={tgt.pageId}>
                      {tgt.page?.name || tgt.pageId} ({tgt.status})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Simulated User / Customer Name:
                  </label>
                  <input
                    type="text"
                    value={simCommenterName}
                    onChange={(e) => setSimCommenterName(e.target.value)}
                    placeholder="e.g. Sarah Jenkins"
                    className="w-full text-xs px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Customer Comment on Post:
                  </label>
                  <input
                    type="text"
                    value={simCommentText}
                    onChange={(e) => setSimCommentText(e.target.value)}
                    placeholder={`e.g. ${simTargetPost.commentToDmKeyword || "PM"} price please!`}
                    className="w-full text-xs px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="button"
                disabled={isSimulating}
                onClick={handleRunSimulation}
                className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs shadow-md transition flex items-center justify-center space-x-2 cursor-pointer"
              >
                {isSimulating ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Processing Trigger & Dispatching Automations...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Post Comment & Fire Instant Automations</span>
                  </>
                )}
              </button>
            </div>

            {/* Simulation Results Breakdown */}
            {simResult && (
              <div className="p-4 rounded-2xl border space-y-3 bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Execution Report:
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                      simResult.matched
                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300"
                        : "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300"
                    }`}
                  >
                    {simResult.matched ? "✅ Keyword Matched & Triggered" : "⚠️ Keyword Mismatch"}
                  </span>
                </div>

                {simResult.matched ? (
                  <div className="space-y-2 text-xs">
                    {/* Public Reply */}
                    <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                      <span className="text-[10px] uppercase font-bold text-sky-600 dark:text-sky-400 block mb-1">
                        1. Automated Public Reply to Comment
                      </span>
                      <p className="text-slate-700 dark:text-slate-300 font-sans">
                        &quot;{simResult.publicReply || "No public reply template configured"}&quot;
                      </p>
                    </div>

                    {/* Private DM */}
                    <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                      <span className="text-[10px] uppercase font-bold text-indigo-600 dark:text-indigo-400 block mb-1">
                        2. Automated Private Messenger DM
                      </span>
                      <p className="text-slate-700 dark:text-slate-300 font-sans leading-relaxed">
                        &quot;{simResult.privateDm || "No private DM template configured"}&quot;
                      </p>
                    </div>

                    {/* CRM Record */}
                    {simResult.leadCreated && (
                      <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-300">
                        <span className="text-[10px] uppercase font-bold flex items-center gap-1 mb-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> 3. SieReach Lead CRM Updated
                        </span>
                        <p className="text-[11px] leading-tight">
                          Customer <strong>{simResult.leadCreated.customerName}</strong> captured in stage <strong>{simResult.leadCreated.status}</strong> under <strong>{simResult.pageName}</strong>!
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-amber-700 dark:text-amber-400">
                    {simResult.message || simResult.error}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: POST QUICK-VIEW & CALENDAR RESCHEDULE                              */}
      {/* ========================================================================= */}
      {selectedCalendarPost && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-start justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="min-w-0 pr-3">
                <div className="flex items-center space-x-2.5 mb-1">
                  <h3 className="text-base font-black text-slate-900 dark:text-white truncate">
                    {selectedCalendarPost.title || "Post Schedule & Target Details"}
                  </h3>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                      selectedCalendarPost.status === "PUBLISHED"
                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-300"
                        : selectedCalendarPost.status === "SCHEDULED" || selectedCalendarPost.status === "PARTIALLY_PUBLISHED"
                        ? "bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-400 border border-purple-300"
                        : selectedCalendarPost.status === "DRAFT"
                        ? "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-300"
                        : "bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-400 border border-red-300"
                    }`}
                  >
                    {selectedCalendarPost.status.replace("_", " ")}
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  Created {new Date(selectedCalendarPost.createdAt).toLocaleString()} &bull; {selectedCalendarPost.businessName}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCalendarPost(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content Preview & Reschedule Form */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
              {/* Left Column: Post Content & High-Growth Suite (7 cols) */}
              <div className="md:col-span-7 space-y-4">
                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                    Post Copy:
                  </span>
                  <p className="text-xs text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
                    {selectedCalendarPost.content}
                  </p>

                  {/* Attached Media thumbnail if present */}
                  {selectedCalendarPost.mediaUrls && (
                    <div className="mt-3">
                      {(() => {
                        let parsedMedia: string[] = [];
                        try {
                          parsedMedia = JSON.parse(selectedCalendarPost.mediaUrls);
                        } catch {
                          parsedMedia = [];
                        }
                        if (parsedMedia.length === 0) return null;
                        return (
                          <div className="flex gap-2 overflow-x-auto pb-1">
                            {parsedMedia.map((url, i) => (
                              <img
                                key={i}
                                src={url}
                                alt="Post media"
                                className="w-20 h-20 rounded-lg object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                              />
                            ))}
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>

                {/* High Growth Suite Preview */}
                {(selectedCalendarPost.enableFirstComment ||
                  (selectedCalendarPost.callToActionType && selectedCalendarPost.callToActionType !== "NONE") ||
                  selectedCalendarPost.enableCommentToDm) && (
                  <div className="p-3 bg-sky-50/60 dark:bg-sky-950/30 rounded-xl border border-sky-200 dark:border-sky-800/60 space-y-2 text-xs">
                    <span className="text-[10px] font-black uppercase text-sky-700 dark:text-sky-300 block">
                      High-Growth Engine Features
                    </span>

                    {selectedCalendarPost.enableFirstComment && (
                      <div className="text-[11px] text-slate-700 dark:text-slate-300">
                        <strong className="text-emerald-600 dark:text-emerald-400">💬 First-Comment:</strong>{" "}
                        <span className="italic">{selectedCalendarPost.firstComment || "Active"}</span>
                      </div>
                    )}

                    {selectedCalendarPost.callToActionType && selectedCalendarPost.callToActionType !== "NONE" && (
                      <div className="text-[11px] text-slate-700 dark:text-slate-300">
                        <strong className="text-sky-600 dark:text-sky-400">🔘 Call-to-Action:</strong>{" "}
                        <span>{selectedCalendarPost.callToActionType} &bull; &quot;{selectedCalendarPost.callToActionTitle || "Direct Messenger Inquiry"}&quot;</span>
                      </div>
                    )}

                    {selectedCalendarPost.enableCommentToDm && (
                      <div className="text-[11px] text-slate-700 dark:text-slate-300">
                        <strong className="text-indigo-600 dark:text-indigo-400">⚡ Comment-to-DM:</strong>{" "}
                        <span>Trigger: <code>{selectedCalendarPost.commentToDmKeyword || "ALL"}</code></span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Right Column: Reschedule & Target Page Status (5 cols) */}
              <div className="md:col-span-5 space-y-4">
                {/* Reschedule Box */}
                {selectedCalendarPost.status !== "PUBLISHED" && (
                  <div className="p-3.5 bg-purple-50/60 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/60 rounded-xl space-y-2.5">
                    <span className="text-xs font-bold text-purple-900 dark:text-purple-300 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-purple-600" />
                      <span>Reschedule Dispatch</span>
                    </span>
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                        Select Date & Time:
                      </label>
                      <input
                        type="datetime-local"
                        value={calendarRescheduleTime}
                        onChange={(e) => setCalendarRescheduleTime(e.target.value)}
                        className="w-full text-xs px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 font-semibold focus:outline-none focus:ring-1 focus:ring-purple-500"
                      />
                    </div>
                    <button
                      type="button"
                      disabled={isSavingReschedule}
                      onClick={handleSaveModalReschedule}
                      className="w-full py-1.5 px-3 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition cursor-pointer flex items-center justify-center space-x-1.5 shadow-xs"
                    >
                      {isSavingReschedule ? (
                        <>
                          <RefreshCw className="w-3 h-3 animate-spin" />
                          <span>Saving...</span>
                        </>
                      ) : (
                        <span>Save Rescheduled Time</span>
                      )}
                    </button>
                  </div>
                )}

                {/* Target Pages Breakdown */}
                <div className="space-y-2">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                    Target Pages ({selectedCalendarPost.targets.length}):
                  </span>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {selectedCalendarPost.targets.map((tgt) => (
                      <div
                        key={tgt.id}
                        className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs flex items-center justify-between gap-2"
                      >
                        <span className="font-semibold text-slate-700 dark:text-slate-300 truncate max-w-[140px]">
                          {tgt.page?.name || tgt.pageId}
                        </span>
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider shrink-0 ${
                            tgt.status === "PUBLISHED"
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400"
                              : tgt.status === "FAILED"
                              ? "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-400"
                              : "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-400"
                          }`}
                        >
                          {tgt.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Bottom Actions */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
              <div className="flex items-center space-x-2">
                {selectedCalendarPost.enableCommentToDm && (
                  <button
                    type="button"
                    onClick={() => {
                      const p = selectedCalendarPost;
                      setSelectedCalendarPost(null);
                      handleOpenSimulationModal(p);
                    }}
                    className="text-xs px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-800 rounded-xl font-bold flex items-center space-x-1.5 transition cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Test Lead Funnel</span>
                  </button>
                )}

                {(selectedCalendarPost.status === "SCHEDULED" ||
                  selectedCalendarPost.status === "DRAFT" ||
                  selectedCalendarPost.status === "PARTIALLY_FAILED" ||
                  selectedCalendarPost.status === "FAILED") && (
                  <button
                    type="button"
                    onClick={() => {
                      const pid = selectedCalendarPost.id;
                      setSelectedCalendarPost(null);
                      handleRetryPost(pid);
                    }}
                    className="text-xs px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl font-bold flex items-center space-x-1.5 transition cursor-pointer shadow-xs"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Publish Immediately</span>
                  </button>
                )}
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    let parsedMedia: string[] = [];
                    try {
                      parsedMedia = selectedCalendarPost.mediaUrls ? JSON.parse(selectedCalendarPost.mediaUrls) : [];
                    } catch {
                      parsedMedia = [];
                    }
                    setPostTitle(selectedCalendarPost.title || "");
                    setPostContent(selectedCalendarPost.content);
                    setMediaType(selectedCalendarPost.mediaType as any);
                    setMediaUrls(parsedMedia);
                    setSelectedPageIds(selectedCalendarPost.targets.map((t) => t.pageId));
                    setSelectedCalendarPost(null);
                    setSubTab("composer");
                  }}
                  className="text-xs px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-semibold flex items-center space-x-1.5 transition cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Duplicate to Composer</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const pid = selectedCalendarPost.id;
                    setSelectedCalendarPost(null);
                    handleDeletePost(pid);
                  }}
                  className="text-xs px-3 py-1.5 bg-red-50 hover:bg-red-100 dark:bg-red-950/60 dark:hover:bg-red-900/60 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-xl font-semibold flex items-center space-x-1 transition cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedCalendarPost(null)}
                  className="text-xs px-3 py-1.5 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold hover:bg-slate-300 cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating Toast Notification for Drag-and-Drop Feedback */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center space-x-3 bg-slate-900 text-white dark:bg-white dark:text-slate-900 px-4 py-3 rounded-2xl shadow-2xl border border-slate-700 dark:border-slate-200 animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 dark:text-emerald-600 shrink-0" />
          <span className="text-xs font-bold">{toastMessage}</span>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="p-1 hover:opacity-75 cursor-pointer ml-1"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
