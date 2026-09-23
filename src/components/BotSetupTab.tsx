"use client";

import React, { useState } from "react";
import {
  Sparkles,
  Image as ImageIcon,
  Clock,
  Layers,
  Save,
  Send,
  HelpCircle,
  Tag,
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
  Smartphone,
  Info,
  Timer,
  AlertTriangle,
  AlertCircle,
  Lock,
  Unlock,
  RefreshCw,
  Zap,
  Upload,
  Trash2,
  Check,
  Shuffle,
  Play,
  Pause,
} from "lucide-react";
import { renderMessageTemplate } from "@/lib/facebook";
import { DeleteConfirmModal } from "./common/DeleteConfirmModal";

interface Campaign {
  id: string;
  name: string;
  businessName?: string;
  pageId?: string | null;
  inactiveHoursThreshold: number;
  messageTemplate: string;
  imageUrl?: string | null;
  imageUrls?: string | null;
  enableImageSpin?: boolean;
  messageTag?: string | null;
  autoBlast: boolean;
  excludePast24h: boolean;
  dripMinSeconds?: number;
  dripMaxSeconds?: number;
  maxFollowUps?: number;
  cooldownHours?: number;
  step2CampaignId?: string | null;
  step2MessageTemplate?: string | null;
  step2ImageUrl?: string | null;
  isActive: boolean;
}

interface BotSetupTabProps {
  campaigns: Campaign[];
  pages: Array<{ pageId: string; name: string }>;
  activeBusiness?: string;
  onSaveCampaign: (campaign: Partial<Campaign>) => Promise<any>;
  onDeleteCampaign?: (campaignId: string) => Promise<any>;
  onExecuteCampaignBlast?: (campaignId: string) => Promise<void>;
  isSaving: boolean;
  isBlasting: boolean;
}

export function BotSetupTab({
  campaigns,
  pages,
  activeBusiness,
  onSaveCampaign,
  onDeleteCampaign,
  onExecuteCampaignBlast,
  isSaving,
  isBlasting,
}: BotSetupTabProps) {
  const activeCampaign = campaigns[0] || {
    name: "24-Hour Inactive Customer Blast Recovery",
    inactiveHoursThreshold: 24.0,
    messageTemplate:
      "Hello {{customer_name}}! 👋 We noticed you checked in with {{page_name}} regarding {{ad_source}}. We wanted to follow up and offer you an exclusive 15% OFF fast-action voucher! Would you like us to assist you with ordering?",
    imageUrl:
      "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=800&auto=format&fit=crop&q=80",
    messageTag: "HUMAN_AGENT",
    autoBlast: false,
    excludePast24h: true,
    dripMinSeconds: 3.0,
    dripMaxSeconds: 5.0,
    maxFollowUps: 1,
    cooldownHours: 3.0,
    step2CampaignId: null,
    step2MessageTemplate: "",
    step2ImageUrl: "",
    isActive: true,
  };

  // Original saved campaign snapshot to detect unsaved changes
  const [savedBaseline, setSavedBaseline] = useState<any>(null);

  // Poster image slots stored temporarily per slot
  const [posterSlots, setPosterSlots] = useState<Record<string, string>>({
    "Poster 1": "",
    "Poster 2": "",
    "Poster 3": "",
  });
  const [selectedPoster, setSelectedPoster] = useState<string>("Poster 1");
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  const [selectedId, setSelectedId] = useState<string>(activeCampaign.id || "new");
  const [name, setName] = useState<string>(activeCampaign.name);
  const [pageId, setPageId] = useState<string>(activeCampaign.pageId || "");
  const [thresholdHours, setThresholdHours] = useState<number>(
    activeCampaign.inactiveHoursThreshold || 24.0
  );
  const [messageTemplate, setMessageTemplate] = useState<string>(
    activeCampaign.messageTemplate
  );
  const [imageUrl, setImageUrl] = useState<string>(activeCampaign.imageUrl || "");
  const [messageTag, setMessageTag] = useState<string>(
    activeCampaign.messageTag || "HUMAN_AGENT"
  );
  const [autoBlast, setAutoBlast] = useState<boolean>(activeCampaign.autoBlast || false);
  const [enableImageSpin, setEnableImageSpin] = useState<boolean>(
    activeCampaign.enableImageSpin ?? false
  );
  const [previewSpinSeed, setPreviewSpinSeed] = useState<number>(0);
  
  // Tag Safety & Drip Rate States
  const [excludePast24h, setExcludePast24h] = useState<boolean>(
    activeCampaign.excludePast24h ?? true
  );
  const [dripMin, setDripMin] = useState<number>(activeCampaign.dripMinSeconds ?? 3.0);
  const [dripMax, setDripMax] = useState<number>(activeCampaign.dripMaxSeconds ?? 5.0);
  const [dripRangeStr, setDripRangeStr] = useState<string>(
    `${activeCampaign.dripMinSeconds ?? 3}-${activeCampaign.dripMaxSeconds ?? 5}`
  );
  const [maxFollowUps, setMaxFollowUps] = useState<number>(activeCampaign.maxFollowUps ?? 1);
  const [cooldownHours, setCooldownHours] = useState<number>(activeCampaign.cooldownHours ?? 3.0);
  const [step2CampaignId, setStep2CampaignId] = useState<string>(activeCampaign.step2CampaignId || "");
  const [step2MessageTemplate, setStep2MessageTemplate] = useState<string>(
    activeCampaign.step2MessageTemplate ||
      "Hi {{first_name}}, this is our final follow-up from {{page_name}} regarding {{ad_source}}! Let us know if you have any questions or would like to claim your offer."
  );
  const [step2ImageUrl, setStep2ImageUrl] = useState<string>(activeCampaign.step2ImageUrl || "");
  const [isActive, setIsActive] = useState<boolean>(activeCampaign.isActive ?? false);
  const [isTogglingActive, setIsTogglingActive] = useState<boolean>(false);

  // Safety Confirmation Modal State
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [confirmInput, setConfirmInput] = useState<string>("");
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Campaign Delete State
  const [campaignToDelete, setCampaignToDelete] = useState<Campaign | null>(null);
  const [isDeletingCampaign, setIsDeletingCampaign] = useState<boolean>(false);

  // Background Auto-Check State
  const [isRunningAutoCheck, setIsRunningAutoCheck] = useState(false);
  const [autoCheckResult, setAutoCheckResult] = useState<string | null>(null);

  const handleTriggerAutoCheck = async () => {
    setIsRunningAutoCheck(true);
    setAutoCheckResult(null);
    try {
      const res = await fetch("/api/cron/auto-blast", { method: "POST" });
      const data = await res.json();
      if (data.success && data.data) {
        setAutoCheckResult(
          `✓ Checked ${data.data.campaignsChecked} campaign(s). Eligible leads: ${data.data.totalEligibleFound}, Delivered: ${data.data.totalDelivered}.`
        );
      } else {
        setAutoCheckResult(`Auto-check completed.`);
      }
    } catch (err: any) {
      setAutoCheckResult("Failed to run auto-check");
    } finally {
      setIsRunningAutoCheck(false);
      setTimeout(() => setAutoCheckResult(null), 7000);
    }
  };

  // Campaign Blast State with loading & success/fail indicators
  const [blastState, setBlastState] = useState<"idle" | "blasting" | "success" | "error">("idle");
  const [blastMessage, setBlastMessage] = useState<string | null>(null);

  const handleToggleActiveCampaign = async (makeActive: boolean) => {
    if (!onSaveCampaign || selectedId === "new") return;
    setIsTogglingActive(true);
    setBlastMessage(null);
    try {
      await onSaveCampaign({
        id: selectedId,
        isActive: makeActive,
      });
      setIsActive(makeActive);
      setBlastState(makeActive ? "success" : "idle");
      setBlastMessage(makeActive ? "Auto-Blast Started! Background engine active." : "Auto-Blast Paused.");
      if (makeActive) {
        handleTriggerAutoCheck();
      }
      setTimeout(() => {
        setBlastState("idle");
        setBlastMessage(null);
      }, 4000);
    } catch (err: any) {
      setBlastState("error");
      setBlastMessage(err?.message || "Failed to update blast state");
      setTimeout(() => {
        setBlastState("idle");
        setBlastMessage(null);
      }, 5000);
    } finally {
      setIsTogglingActive(false);
    }
  };

  const handleBlastClick = async () => {
    if (selectedId === "new") return;
    if (autoBlast) {
      // Toggle between Start Blast and Pause Blast for automated mode
      await handleToggleActiveCampaign(!isActive);
    } else {
      // Manual blast execution
      if (!onExecuteCampaignBlast) return;
      setBlastState("blasting");
      setBlastMessage(null);
      try {
        await onExecuteCampaignBlast(selectedId);
        setBlastState("success");
        setBlastMessage("Delivered ✓");
        setTimeout(() => {
          setBlastState("idle");
          setBlastMessage(null);
        }, 5000);
      } catch (err: any) {
        setBlastState("error");
        setBlastMessage(err?.message || "No eligible leads to blast");
        setTimeout(() => {
          setBlastState("idle");
          setBlastMessage(null);
        }, 6000);
      }
    }
  };

  const isFirstLoadRef = React.useRef(true);

  // Automatically select and populate first campaign when campaigns load or portfolio changes
  React.useEffect(() => {
    if (campaigns.length > 0) {
      if (isFirstLoadRef.current) {
        isFirstLoadRef.current = false;
        handleSelectCampaign(campaigns[0]);
      } else {
        const currentExists = campaigns.some((c) => c.id === selectedId);
        if (!currentExists && selectedId !== "new") {
          handleSelectCampaign(campaigns[0]);
        }
      }
    }
  }, [campaigns, selectedId]);

  // Quick image preset flyers
  const sampleImages = [
    {
      label: "Poster 1",
      url: "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=800&auto=format&fit=crop&q=80",
    },
    {
      label: "Poster 2",
      url: "https://images.unsplash.com/photo-1556742049-0a67c5574f73?w=800&auto=format&fit=crop&q=80",
    },
    {
      label: "Poster 3",
      url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&auto=format&fit=crop&q=80",
    },
  ];

  // Load campaign when switching tabs/selection
  const handleSelectCampaign = (c: Campaign) => {
    setSelectedId(c.id);
    setName(c.name);
    setPageId(c.pageId || "");
    setThresholdHours(c.inactiveHoursThreshold);
    setMessageTemplate(c.messageTemplate);
    setImageUrl(c.imageUrl || "");
    setMessageTag(c.messageTag || "HUMAN_AGENT");
    setAutoBlast(c.autoBlast);
    setExcludePast24h(c.excludePast24h ?? true);
    setDripMin(c.dripMinSeconds ?? 3.0);
    setDripMax(c.dripMaxSeconds ?? 5.0);
    setDripRangeStr(`${c.dripMinSeconds ?? 3}-${c.dripMaxSeconds ?? 5}`);
    setMaxFollowUps(c.maxFollowUps ?? 1);
    setCooldownHours(c.cooldownHours ?? 3.0);
    setStep2CampaignId(c.step2CampaignId || "");
    setStep2MessageTemplate(
      c.step2MessageTemplate ||
        "Hi {{first_name}}, this is our final follow-up from {{page_name}} regarding {{ad_source}}! Let us know if you have any questions or would like to claim your offer."
    );
    setStep2ImageUrl(c.step2ImageUrl || "");
    setIsActive(c.isActive ?? false);
    setSaveError(null);

    setEnableImageSpin(c.enableImageSpin ?? false);

    // Populate poster slots from multi-image array or fallback
    if (c.imageUrls) {
      try {
        const parsed = typeof c.imageUrls === "string" ? JSON.parse(c.imageUrls) : c.imageUrls;
        if (Array.isArray(parsed) && parsed.length > 0) {
          setPosterSlots({
            "Poster 1": parsed[0] || "",
            "Poster 2": parsed[1] || "",
            "Poster 3": parsed[2] || "",
          });
        } else {
          setPosterSlots({
            "Poster 1": c.imageUrl || "",
            "Poster 2": "",
            "Poster 3": "",
          });
        }
      } catch (e) {
        setPosterSlots({
          "Poster 1": c.imageUrl || "",
          "Poster 2": "",
          "Poster 3": "",
        });
      }
    } else {
      setPosterSlots({
        "Poster 1": c.imageUrl || "",
        "Poster 2": "",
        "Poster 3": "",
      });
    }
    setSelectedPoster("Poster 1");

    // Establish saved baseline snapshot to track dirty unsaved edits
    setSavedBaseline({
      name: c.name,
      pageId: c.pageId || "",
      thresholdHours: c.inactiveHoursThreshold,
      messageTemplate: c.messageTemplate,
      imageUrl: c.imageUrl || "",
      enableImageSpin: c.enableImageSpin ?? false,
      messageTag: c.messageTag || "HUMAN_AGENT",
      autoBlast: c.autoBlast,
      excludePast24h: c.excludePast24h ?? true,
      dripMin: c.dripMinSeconds ?? 3.0,
      dripMax: c.dripMaxSeconds ?? 5.0,
      maxFollowUps: c.maxFollowUps ?? 1,
      cooldownHours: c.cooldownHours ?? 3.0,
      step2CampaignId: c.step2CampaignId || "",
      step2MessageTemplate: c.step2MessageTemplate || "",
      step2ImageUrl: c.step2ImageUrl || "",
    });
  };

  const handleNewRule = () => {
    setSelectedId("new");
    setName("New Custom Follow-Up Rule");
    setPageId("");
    setThresholdHours(24.0);
    setMessageTemplate(
      "Hello {{customer_name}}! We noticed you inquired about {{ad_source}}. Would you like assistance placing your order?"
    );
    setImageUrl("");
    setPosterSlots({ "Poster 1": "", "Poster 2": "", "Poster 3": "" });
    setSelectedPoster("Poster 1");
    setMessageTag("HUMAN_AGENT");
    setAutoBlast(false);
    setEnableImageSpin(false);
    setExcludePast24h(true);
    setDripPreset(3, 5);
    setMaxFollowUps(1);
    setCooldownHours(3.0);
    setStep2CampaignId("");
    setStep2MessageTemplate(
      "Hi {{first_name}}, this is our final follow-up from {{page_name}} regarding {{ad_source}}! Let us know if you have any questions or would like to claim your offer."
    );
    setStep2ImageUrl("");
    setIsActive(false);
    setSavedBaseline(null);
    setSaveError(null);
  };

  const handleConfirmDeleteRule = async () => {
    if (!campaignToDelete || !onDeleteCampaign) return;
    setIsDeletingCampaign(true);
    try {
      await onDeleteCampaign(campaignToDelete.id);
      const remaining = campaigns.filter((c) => c.id !== campaignToDelete.id);
      if (selectedId === campaignToDelete.id) {
        if (remaining.length > 0) {
          handleSelectCampaign(remaining[0]);
        } else {
          handleNewRule();
        }
      }
      setCampaignToDelete(null);
    } catch (err: any) {
      alert(err.message || "Failed to delete rule");
    } finally {
      setIsDeletingCampaign(false);
    }
  };


  // Switch poster slot (Poster 1, 2, or 3)
  const handleSelectPosterSlot = (slotLabel: string) => {
    setSelectedPoster(slotLabel);
    setImageUrl(posterSlots[slotLabel] || "");
  };

  // Upload file to /api/upload and assign to current selected poster slot
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to upload image");
      }

      // Update poster slots temporarily
      setPosterSlots((prev) => ({
        ...prev,
        [selectedPoster]: data.url,
      }));
      // Set current active image URL
      setImageUrl(data.url);
    } catch (err: any) {
      alert(err.message || "Failed to upload image");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemovePoster = (slotLabel: string) => {
    setPosterSlots((prev) => ({
      ...prev,
      [slotLabel]: "",
    }));
    if (selectedPoster === slotLabel) {
      setImageUrl("");
    }
  };

  // Compute if there are unsaved changes
  const hasUnsavedChanges = React.useMemo(() => {
    if (selectedId === "new") return true;
    if (!savedBaseline) return false;

    return (
      name !== savedBaseline.name ||
      pageId !== savedBaseline.pageId ||
      thresholdHours !== savedBaseline.thresholdHours ||
      messageTemplate !== savedBaseline.messageTemplate ||
      (imageUrl || "") !== (savedBaseline.imageUrl || "") ||
      messageTag !== savedBaseline.messageTag ||
      autoBlast !== savedBaseline.autoBlast ||
      excludePast24h !== savedBaseline.excludePast24h ||
      dripMin !== savedBaseline.dripMin ||
      dripMax !== savedBaseline.dripMax ||
      maxFollowUps !== savedBaseline.maxFollowUps ||
      cooldownHours !== savedBaseline.cooldownHours ||
      (step2CampaignId || "") !== (savedBaseline.step2CampaignId || "") ||
      (step2MessageTemplate || "") !== (savedBaseline.step2MessageTemplate || "") ||
      (step2ImageUrl || "") !== (savedBaseline.step2ImageUrl || "")
    );
  }, [
    selectedId,
    savedBaseline,
    name,
    pageId,
    thresholdHours,
    messageTemplate,
    imageUrl,
    messageTag,
    autoBlast,
    excludePast24h,
    dripMin,
    dripMax,
    maxFollowUps,
    cooldownHours,
    step2CampaignId,
    step2MessageTemplate,
    step2ImageUrl,
  ]);

  const handleInsertTag = (tag: string) => {
    setMessageTemplate((prev) => prev + ` {{${tag}}}`);
  };

  const handleInsertStep2Tag = (tag: string) => {
    setStep2MessageTemplate((prev) => prev + ` {{${tag}}}`);
  };

  // Handle Drip Range string change (e.g. "3-5", "5-7")
  const handleDripRangeChange = (val: string) => {
    setDripRangeStr(val);
    const parts = val.split("-").map((s) => parseFloat(s.trim()));
    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
      const min = Math.max(3.0, parts[0]);
      const max = Math.max(min, parts[1]);
      setDripMin(min);
      setDripMax(max);
    } else if (parts.length === 1 && !isNaN(parts[0])) {
      const min = Math.max(3.0, parts[0]);
      setDripMin(min);
      setDripMax(min + 2.0);
    }
  };

  const setDripPreset = (min: number, max: number) => {
    setDripMin(min);
    setDripMax(max);
    setDripRangeStr(`${min}-${max}`);
  };

  // Handle Safety Guard Toggle
  const handleToggleSafetyGuard = () => {
    if (excludePast24h) {
      // User is trying to turn it OFF: require CONFIRM_OFF modal!
      setConfirmInput("");
      setShowConfirmModal(true);
    } else {
      // User is turning it back ON: allow immediately
      setExcludePast24h(true);
    }
  };

  const handleConfirmTurnOff = () => {
    if (confirmInput === "CONFIRM_OFF") {
      setExcludePast24h(false);
      setShowConfirmModal(false);
      setConfirmInput("");
    }
  };

  const handleSave = async () => {
    setSaveError(null);
    try {
      const currentCampaign = campaigns.find((c) => c.id === selectedId);
      const targetBusinessName =
        currentCampaign?.businessName ||
        (activeBusiness && activeBusiness !== "ALL" ? activeBusiness : undefined);

      const postUrls = (["Poster 1", "Poster 2", "Poster 3"] as const)
        .map((s) => posterSlots[s])
        .filter((u) => Boolean(u && u.trim()));

      const saved = await onSaveCampaign({
        id: selectedId === "new" ? undefined : selectedId,
        name,
        businessName: targetBusinessName,
        pageId: pageId || null,
        inactiveHoursThreshold: thresholdHours,
        messageTemplate,
        imageUrl: postUrls[0] || imageUrl || null,
        imageUrls: postUrls.length > 0 ? JSON.stringify(postUrls) : null,
        enableImageSpin: Boolean(enableImageSpin && postUrls.length > 1),
        messageTag,
        autoBlast,
        excludePast24h,
        dripMinSeconds: dripMin,
        dripMaxSeconds: dripMax,
        maxFollowUps,
        cooldownHours,
        step2CampaignId: step2CampaignId || null,
        step2MessageTemplate: step2MessageTemplate || null,
        step2ImageUrl: step2ImageUrl || null,
        isActive: false, // Save as Draft - Never auto-executes upon save
      });

      if (saved?.id) {
        setSelectedId(saved.id);
      }
      setIsActive(false);
      // Update baseline to reflect saved state
      setSavedBaseline({
        name,
        pageId: pageId || "",
        thresholdHours,
        messageTemplate,
        imageUrl: postUrls[0] || imageUrl || "",
        enableImageSpin: Boolean(enableImageSpin && postUrls.length > 1),
        messageTag,
        autoBlast,
        excludePast24h,
        dripMin,
        dripMax,
        maxFollowUps,
        cooldownHours,
        step2CampaignId: step2CampaignId || "",
        step2MessageTemplate: step2MessageTemplate || "",
        step2ImageUrl: step2ImageUrl || "",
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      setSaveError(err.message || "Failed to save rule");
      setTimeout(() => setSaveError(null), 6000);
    }
  };

  // Preview rendered message with live Spintax and Multi-Poster resolution
  const previewCustomerName = "Sophea Meng";
  const previewPageName =
    pages.find((p) => p.pageId === pageId)?.name || "SieLab Fashion & Streetwear";
  const previewAdSource = "Oversized Vintage Hoodie (40% OFF)";

  const filledPosters = React.useMemo(() => {
    return (["Poster 1", "Poster 2", "Poster 3"] as const)
      .map((slot) => posterSlots[slot])
      .filter((url) => Boolean(url && url.trim()));
  }, [posterSlots]);

  const activePreviewImage = React.useMemo(() => {
    if (enableImageSpin && filledPosters.length > 1) {
      return filledPosters[previewSpinSeed % filledPosters.length];
    }
    return posterSlots[selectedPoster] || imageUrl || null;
  }, [enableImageSpin, filledPosters, previewSpinSeed, posterSlots, selectedPoster, imageUrl]);

  const previewRenderedText = React.useMemo(() => {
    return renderMessageTemplate(messageTemplate, {
      customerName: previewCustomerName,
      pageName: previewPageName,
      adSource: previewAdSource,
    });
  }, [messageTemplate, previewCustomerName, previewPageName, previewAdSource, previewSpinSeed]);

  return (
    <div className="space-y-6">
      {/* Existing Rules / Quick Selectors */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Follow-up Bot & Blast Rules</h2>
            {activeBusiness && activeBusiness !== "ALL" && (
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-500/30">
                {activeBusiness}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Configure how many hours of customer inactivity triggers the follow-up blast message, image, and safety throttles.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {campaigns.map((c) => (
            <div
              key={c.id}
              className={`group inline-flex items-center rounded-lg text-xs font-semibold transition border pl-3 pr-1.5 py-1 ${
                selectedId === c.id
                  ? "bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-600/30"
                  : "bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 dark:hover:bg-slate-700"
              }`}
            >
              <button
                type="button"
                onClick={() => handleSelectCampaign(c)}
                className="cursor-pointer text-left mr-1.5 focus:outline-none flex items-center space-x-1.5"
              >
                {c.autoBlast && (
                  <span
                    className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                      c.isActive ? "bg-emerald-400 animate-pulse" : "bg-amber-400"
                    }`}
                    title={c.isActive ? "Active (Blasting)" : "Draft (Paused)"}
                  />
                )}
                <span>{c.name} ({c.inactiveHoursThreshold}h)</span>
              </button>
              {onDeleteCampaign && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setCampaignToDelete(c);
                  }}
                  className={`p-1 rounded-md transition cursor-pointer ${
                    selectedId === c.id
                      ? "text-blue-200 hover:text-white hover:bg-blue-700/70"
                      : "text-slate-400 hover:text-rose-600 hover:bg-slate-200 dark:text-slate-500 dark:hover:text-rose-400 dark:hover:bg-slate-700"
                  }`}
                  title={`Delete rule "${c.name}"`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}

          <button
            type="button"
            onClick={handleNewRule}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition border cursor-pointer ${
              selectedId === "new"
                ? "bg-indigo-600 text-white border-indigo-500 shadow-md"
                : "bg-slate-100 text-slate-600 border-dashed border-slate-300 hover:text-slate-900 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700 dark:hover:text-white"
            }`}
          >
            + New Rule
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Form Configuration (Left 7 Cols) */}
        <div className="lg:col-span-7 space-y-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
          {/* Rule Name */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Rule / Campaign Name
              </label>
              {selectedId !== "new" && onDeleteCampaign && (
                <button
                  type="button"
                  onClick={() => {
                    const curr = campaigns.find((c) => c.id === selectedId);
                    if (curr) setCampaignToDelete(curr);
                  }}
                  className="text-xs text-rose-600 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300 flex items-center space-x-1 font-semibold transition cursor-pointer"
                  title="Delete this rule"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete This Rule</span>
                </button>
              )}
            </div>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. 24h Non-Responsive Customer Recovery Blast"
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
            />
          </div>

          {/* Trigger Threshold (Hours) */}
          <div className="bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center space-x-2">
                <Clock className="w-4 h-4 text-amber-500 dark:text-amber-400" />
                <span>Inactivity Trigger Setup (Hours without response)</span>
              </label>
              <span className="text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 px-2 py-0.5 rounded-md">
                {thresholdHours} Hours Inactivity
              </span>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              The bot will detect any customer who hasn&apos;t replied for at least{" "}
              <strong className="text-slate-900 dark:text-white">{thresholdHours} hours</strong> after the sales rep&apos;s initial message.
            </p>

            {/* Hours Slider & Direct Input */}
            <div className="flex items-center space-x-4 pt-1">
              <input
                type="range"
                min="1"
                max="48"
                step="1"
                value={thresholdHours}
                onChange={(e) => setThresholdHours(parseFloat(e.target.value))}
                className="flex-1 accent-blue-500 cursor-pointer"
              />
              <div className="flex items-center space-x-1 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-1">
                <input
                  type="number"
                  min="0.5"
                  max="72"
                  step="0.5"
                  value={thresholdHours}
                  onChange={(e) => setThresholdHours(parseFloat(e.target.value) || 1)}
                  className="w-12 bg-transparent text-xs text-slate-900 dark:text-white text-right outline-none font-bold"
                />
                <span className="text-xs text-slate-500 dark:text-slate-400">h</span>
              </div>
            </div>

            {/* Quick Helper presets */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[11px] text-slate-500">Quick presets:</span>
              {[2, 4, 6, 12, 24, 36].map((hrs) => (
                <button
                  key={hrs}
                  type="button"
                  onClick={() => setThresholdHours(hrs)}
                  className={`text-[11px] px-2 py-0.5 rounded border transition ${
                    thresholdHours === hrs
                      ? "bg-blue-50 text-blue-700 border-blue-300 font-bold dark:bg-blue-600/30 dark:border-blue-500 dark:text-blue-300"
                      : "bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                  }`}
                >
                  {hrs}h {hrs === 24 ? "(Recommended)" : ""}
                </button>
              ))}
            </div>
          </div>

          {/* NEW: TAG SAFETY GUARD (Enabled by default, requires CONFIRM_OFF to disable) */}
          <div
            className={`border rounded-xl p-4 transition ${
              excludePast24h
                ? "bg-emerald-50/80 border-emerald-300 dark:bg-emerald-950/20 dark:border-emerald-500/40"
                : "bg-red-50/80 border-red-300 dark:bg-red-950/20 dark:border-red-500/40"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start space-x-3">
                <div
                  className={`p-2 rounded-lg mt-0.5 ${
                    excludePast24h
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400"
                      : "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400"
                  }`}
                >
                  {excludePast24h ? (
                    <ShieldCheck className="w-5 h-5" />
                  ) : (
                    <ShieldAlert className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      Tag Safety Guard: Exclude Leads Past 24h
                    </span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                        excludePast24h
                          ? "bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/30"
                          : "bg-red-100 text-red-700 border-red-300 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/30"
                      }`}
                    >
                      {excludePast24h ? "ACTIVE (Recommended)" : "UNPROTECTED (High Risk)"}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                    {excludePast24h ? (
                      <>
                        <strong>Protection Active:</strong> Automatically protects your pages by{" "}
                        <strong>excluding all historical leads &gt;24h</strong> (e.g. 500h or 1,000h old messages) that require the Meta <code>HUMAN_AGENT</code> tag.
                      </>
                    ) : (
                      <>
                        <strong>Warning:</strong> The 24-hour safety exclusion is disabled. The bot is allowed to blast leads past 24h using the <code>HUMAN_AGENT</code> tag (capped at Meta&apos;s 7-day maximum).
                      </>
                    )}
                  </p>
                </div>
              </div>

              {/* Toggle Switch */}
              <button
                type="button"
                onClick={handleToggleSafetyGuard}
                className={`w-11 h-6 rounded-full transition-colors relative shrink-0 ${
                  excludePast24h
                    ? "bg-emerald-600"
                    : "bg-slate-300 dark:bg-slate-700 border border-slate-400 dark:border-slate-600"
                }`}
                title={excludePast24h ? "Click to disable (requires CONFIRM_OFF)" : "Click to re-enable safety guard"}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white transition-transform transform ${
                    excludePast24h ? "translate-x-6" : "translate-x-1"
                  } top-1 absolute`}
                />
              </button>
            </div>
          </div>

          {/* NEW: DRIP RATE PACING SETUP */}
          <div className="bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center space-x-2">
                <Timer className="w-4 h-4 text-blue-500 dark:text-blue-400" />
                <span>Drip Rate Throttling (Anti-Velocity Engine)</span>
              </label>
              <span className="text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30 px-2 py-0.5 rounded-md font-mono">
                {dripMin}s – {dripMax}s Random Pacing
              </span>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              To prevent Meta algorithmic spam and velocity alerts (Error #368), the bot introduces randomized delay between each message:
            </p>

            {/* Input and Quick presets */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
              <div className="flex items-center space-x-2">
                <span className="text-xs text-slate-600 dark:text-slate-300 font-medium">Interval Range:</span>
                <div className="flex items-center space-x-1 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1">
                  <input
                    type="text"
                    value={dripRangeStr}
                    onChange={(e) => handleDripRangeChange(e.target.value)}
                    placeholder="3-5"
                    className="w-16 bg-transparent text-xs text-slate-900 dark:text-white text-center outline-none font-bold font-mono"
                  />
                  <span className="text-xs text-slate-500 dark:text-slate-400">sec</span>
                </div>
              </div>

              {/* Helper preset buttons */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] text-slate-500">Presets:</span>
                {[
                  { label: "3-5s (Default)", min: 3, max: 5 },
                  { label: "5-7s (Safer)", min: 5, max: 7 },
                  { label: "8-12s (Stealth)", min: 8, max: 12 },
                ].map((p) => (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => setDripPreset(p.min, p.max)}
                    className={`text-[11px] px-2.5 py-1 rounded-lg border transition ${
                      dripMin === p.min && dripMax === p.max
                        ? "bg-blue-50 text-blue-700 border-blue-300 font-bold dark:bg-blue-600/30 dark:border-blue-500 dark:text-blue-300"
                        : "bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center space-x-2 text-[11px] text-slate-500">
              <Info className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400 shrink-0" />
              <span>Enforces minimum 3-5 seconds to safeguard your Facebook Pages.</span>
            </div>
          </div>

          {/* MULTI-STEP FOLLOW-UP SEQUENCE & COOLDOWN */}
          <div className="bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center space-x-2">
                <RefreshCw className="w-4 h-4 text-purple-500 dark:text-purple-400" />
                <span>Multi-Step Follow-Up Sequence & Anti-Spam Cooldown</span>
              </label>
              <span className="text-xs font-bold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/30 px-2 py-0.5 rounded-md font-mono">
                {maxFollowUps === 1 ? "Single Follow-Up (Default)" : `2-Step Follow-Up • ${cooldownHours}h Cooldown`}
              </span>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Configure whether to send a single follow-up or allow a second follow-up attempt if the customer remains unresponsive after the first message:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              {/* Max Follow-ups Selector */}
              <div className="space-y-1.5">
                <span className="text-xs text-slate-600 dark:text-slate-300 font-medium">Follow-Up Attempts:</span>
                <div className="flex items-center space-x-2">
                  {[
                    { count: 1, label: "1 Follow-Up (Default)" },
                    { count: 2, label: "2 Follow-Ups" },
                  ].map((item) => (
                    <button
                      key={item.count}
                      type="button"
                      onClick={() => setMaxFollowUps(item.count)}
                      className={`text-xs px-3.5 py-1.5 rounded-lg border font-semibold transition ${
                        maxFollowUps === item.count
                          ? "bg-purple-50 text-purple-700 border-purple-300 font-bold dark:bg-purple-600/30 dark:border-purple-500 dark:text-purple-300"
                          : "bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Cooldown Hours (when 2 follow-ups selected) */}
              {maxFollowUps === 2 && (
                <div className="space-y-1.5">
                  <span className="text-xs text-slate-600 dark:text-slate-300 font-medium">Cooldown Before Step 2:</span>
                  <div className="flex items-center space-x-2">
                    {[
                      { label: "3h (Default)", hours: 3.0 },
                      { label: "6h", hours: 6.0 },
                      { label: "12h", hours: 12.0 },
                    ].map((preset) => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => setCooldownHours(preset.hours)}
                        className={`text-xs px-3 py-1.5 rounded-lg border font-semibold transition ${
                          cooldownHours === preset.hours
                            ? "bg-purple-50 text-purple-700 border-purple-300 font-bold dark:bg-purple-600/30 dark:border-purple-500 dark:text-purple-300"
                            : "bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* STEP 2 RULE SELECTION (Only visible when 2 follow-ups selected) */}
            {maxFollowUps === 2 && (
              <div className="pt-2 border-t border-slate-800/80 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-purple-300 flex items-center space-x-1.5">
                    <span>⚡ Step 2: Select a Different Blast Rule</span>
                  </label>
                  <span className="text-[11px] text-slate-500">
                    Dispatched if customer stays silent after Step 1 & ≥ {cooldownHours}h
                  </span>
                </div>

                {/* Rule dropdown selector */}
                <div>
                  <select
                    value={step2CampaignId}
                    onChange={(e) => setStep2CampaignId(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
                  >
                    <option value="">Custom Step 2 Message & Offer (Configured Below)</option>
                    {campaigns
                      .filter((c) => c.id !== selectedId)
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          Use Rule: {c.name} ({c.inactiveHoursThreshold}h threshold)
                        </option>
                      ))}
                  </select>
                </div>

                {/* Custom Step 2 Message Template & Image (if not using another campaign) */}
                {!step2CampaignId && (
                  <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5 space-y-3">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider">
                          Step 2 Message Template
                        </label>
                        <span className="text-[10px] text-slate-400">Click to insert:</span>
                      </div>
                      <div className="flex flex-wrap gap-1 mb-1.5">
                        {[
                          { tag: "customer_name", desc: "Full Name" },
                          { tag: "first_name", desc: "First Name" },
                          { tag: "page_name", desc: "Page Name" },
                          { tag: "ad_source", desc: "Ad Product" },
                        ].map(({ tag }) => (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => handleInsertStep2Tag(tag)}
                            className="bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-purple-400 dark:border-slate-700 text-[10px] px-2 py-0.5 rounded-md font-mono transition"
                          >
                            +{`{{${tag}}}`}
                          </button>
                        ))}
                      </div>
                      <textarea
                        rows={3}
                        value={step2MessageTemplate}
                        onChange={(e) => setStep2MessageTemplate(e.target.value)}
                        placeholder="Enter the distinct message for Follow-Up #2 (e.g. final reminder, last chance voucher)..."
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-xs text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-purple-500 transition"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                        Step 2 Optional Attached Image URL
                      </label>
                      <input
                        type="url"
                        value={step2ImageUrl}
                        onChange={(e) => setStep2ImageUrl(e.target.value)}
                        placeholder="https://images.unsplash.com/... (optional)"
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-purple-500 transition"
                      />
                    </div>
                  </div>
                )}

                {/* STRICT 24H POLICY CALLOUT */}
                <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-xl p-3 text-xs text-amber-800 dark:text-amber-300 space-y-1">
                  <div className="flex items-center space-x-1.5 font-bold text-amber-900 dark:text-amber-200">
                    <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                    <span>Strict Meta 24-Hour Policy Window Enforcement</span>
                  </div>
                  <p className="text-[11px] text-amber-800/90 dark:text-amber-300/90 leading-relaxed">
                    The {cooldownHours}h cooldown does <strong>not bypass nor overtake</strong> Meta&apos;s 24-hour messaging policy window.
                    For example, if a customer receives Follow-Up #1 at <strong>21 hours</strong> and cooldown is <strong>3 hours</strong>, 
                    then <strong>21h + 3h = 24h</strong> (standard window closed). 
                    The system will <strong>safely never send</strong> Follow-Up #2 to this customer.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Target Facebook Page Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Target Facebook Page
            </label>
            <select
              value={pageId}
              onChange={(e) => setPageId(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500 transition"
            >
              <option value="" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-semibold">
                {activeBusiness && activeBusiness !== "ALL"
                  ? `Apply to All Pages in ${activeBusiness} (${pages.length} ${pages.length === 1 ? "Page" : "Pages"})`
                  : `Apply to All Connected Pages across All Portfolios (${pages.length} Pages)`}
              </option>
              {activeBusiness && activeBusiness !== "ALL" ? (
                pages.map((p) => (
                  <option key={p.pageId} value={p.pageId} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                    📄 {p.name}
                  </option>
                ))
              ) : (
                Array.from(
                  new Set(
                    pages.map(
                      (p) =>
                        (p as any).businessName ||
                        (p.pageId === "fb_page_05" ? "Moew Hospitality" : "SieLab Retail Group")
                    )
                  )
                ).map((bName) => {
                  const groupPages = pages.filter(
                    (p) =>
                      ((p as any).businessName ||
                        (p.pageId === "fb_page_05" ? "Moew Hospitality" : "SieLab Retail Group")) === bName
                  );
                  return (
                    <optgroup
                      key={bName}
                      label={`${bName.includes("Moew") ? "☕" : "🏢"} ${bName} (${groupPages.length} ${
                        groupPages.length > 1 ? "Pages" : "Page"
                      })`}
                      className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-semibold"
                    >
                      {groupPages.map((p) => (
                        <option key={p.pageId} value={p.pageId} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-normal">
                          {p.name}
                        </option>
                      ))}
                    </optgroup>
                  );
                })
              )}
            </select>
          </div>

          {/* Message Template */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Follow-Up Message Template
              </label>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">Click to insert variables:</span>
            </div>

            {/* Variable & Spintax Pills */}
            <div className="flex flex-wrap items-center gap-1.5 mb-2">
              <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 mr-1">Variables:</span>
              {[
                { tag: "customer_name", desc: "Full Name" },
                { tag: "first_name", desc: "First Name" },
                { tag: "page_name", desc: "Business Page" },
                { tag: "ad_source", desc: "Ad Product" },
              ].map(({ tag }) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => handleInsertTag(tag)}
                  className="bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-blue-400 dark:border-slate-700 text-[11px] px-2.5 py-1 rounded-lg font-mono transition shadow-2xs cursor-pointer"
                >
                  +{`{{${tag}}}`}
                </button>
              ))}

              <span className="text-[10px] uppercase font-bold text-purple-600 dark:text-purple-400 ml-2 mr-1 flex items-center gap-1">
                <Shuffle className="w-3 h-3" />
                <span>Spintax:</span>
              </span>
              {[
                { label: "{Hi|Hello|Hey}", snippet: "{Hi|Hello|Hey}" },
                { label: "{We noticed|Just checking in}", snippet: "{We noticed you checked in|Just following up}" },
                { label: "{15% OFF|Special offer}", snippet: "{an exclusive 15% OFF voucher|a special fast-action offer}" },
              ].map(({ label, snippet }) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => {
                    setMessageTemplate((prev) => `${prev} ${snippet}`);
                  }}
                  className="bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 dark:bg-purple-950/40 dark:hover:bg-purple-900/60 dark:text-purple-300 dark:border-purple-800/60 text-[11px] px-2.5 py-1 rounded-lg font-mono transition shadow-2xs cursor-pointer"
                  title={`Insert Spintax: ${snippet}`}
                >
                  +{label}
                </button>
              ))}
            </div>

            <textarea
              rows={4}
              value={messageTemplate}
              onChange={(e) => setMessageTemplate(e.target.value)}
              placeholder="Hi {{customer_name}}, we noticed you inquired about {{ad_source}}..."
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-blue-500 resize-none font-sans leading-relaxed transition"
            />

            {/* Spintax guidance bar */}
            <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-1.5 gap-2">
              <span className="flex items-center gap-1">
                <span>💡 <strong>Spintax:</strong> Use <code>&#123;option 1|option 2|option 3&#125;</code> to randomly alternate phrasing per lead.</span>
              </span>
              <button
                type="button"
                onClick={() => setPreviewSpinSeed((s) => s + 1)}
                className="text-purple-600 dark:text-purple-400 hover:underline font-semibold flex items-center gap-1 cursor-pointer shrink-0"
                title="Shuffle Spintax variation & poster in preview"
              >
                <Shuffle className="w-3 h-3" />
                <span>Test Spin Preview</span>
              </button>
            </div>
          </div>

          {/* Image Attachment Setup - Upload Workflow */}
          <div className="space-y-3 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center space-x-1.5">
                <ImageIcon className="w-4 h-4 text-blue-500 dark:text-blue-400" />
                <span>Blast Image Flyer / Poster Attachment</span>
              </label>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                Active Slot: <strong className="text-blue-600 dark:text-blue-400">{selectedPoster}</strong>
              </span>
            </div>

            <p className="text-xs text-slate-400">
              Select a poster slot, then click <strong>Upload Image</strong>. The image is stored temporarily and pushed to your campaign when you click <strong>Save Bot Rule</strong>.
            </p>

            {/* Hidden native file input */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept="image/*"
              className="hidden"
            />

            {/* Poster 1, 2, 3 selection cards */}
            <div className="grid grid-cols-3 gap-3 pt-1">
              {(["Poster 1", "Poster 2", "Poster 3"] as const).map((slot) => {
                const isSelected = selectedPoster === slot;
                const slotUrl = posterSlots[slot];

                return (
                  <div
                    key={slot}
                    onClick={() => handleSelectPosterSlot(slot)}
                    className={`relative cursor-pointer border rounded-xl p-3 transition flex flex-col items-center justify-between min-h-[110px] text-center ${
                      isSelected
                        ? "bg-blue-950/30 border-blue-500 shadow-md shadow-blue-500/10 ring-1 ring-blue-500/50"
                        : "bg-slate-900/80 border-slate-800 hover:border-slate-700"
                    }`}
                  >
                    {/* Badge / Status indicator */}
                    <div className="w-full flex items-center justify-between mb-2">
                      <span
                        className={`text-xs font-bold ${
                          isSelected ? "text-blue-400" : "text-slate-300"
                        }`}
                      >
                        {slot}
                      </span>
                      {slotUrl ? (
                        <span className="w-2 h-2 rounded-full bg-emerald-400 ring-4 ring-emerald-400/20" title="Image uploaded" />
                      ) : (
                        <span className="w-2 h-2 rounded-full bg-slate-600" title="Empty slot" />
                      )}
                    </div>

                    {/* Image Preview thumbnail or empty placeholder */}
                    <div className="w-full h-14 rounded-lg overflow-hidden bg-slate-950/70 border border-slate-800/80 flex items-center justify-center relative group">
                      {slotUrl ? (
                        <img
                          src={slotUrl}
                          alt={slot}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center text-slate-500">
                          <ImageIcon className="w-5 h-5 mb-0.5 opacity-60" />
                          <span className="text-[10px]">No image</span>
                        </div>
                      )}
                    </div>

                    {/* Slot status text */}
                    <div className="mt-2 text-[10px] text-slate-400 truncate max-w-full">
                      {slotUrl ? "Uploaded" : "Empty"}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Action buttons for Selected Poster */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/80">
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="flex items-center space-x-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-3.5 py-1.5 rounded-xl transition shadow-sm disabled:opacity-50"
                >
                  <Upload className={`w-3.5 h-3.5 ${isUploading ? "animate-bounce" : ""}`} />
                  <span>{isUploading ? "Uploading..." : `Upload Image to ${selectedPoster}`}</span>
                </button>

                {posterSlots[selectedPoster] && (
                  <button
                    type="button"
                    onClick={() => handleRemovePoster(selectedPoster)}
                    className="flex items-center space-x-1 text-slate-400 hover:text-red-400 text-xs px-2.5 py-1.5 rounded-lg border border-slate-800 hover:border-red-500/30 transition"
                    title="Remove image from this slot"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Clear</span>
                  </button>
                )}
              </div>

              {/* Status Note */}
              <div className="text-[11px] text-slate-400">
                {filledPosters.length > 0 ? (
                  <span className="text-emerald-500 dark:text-emerald-400 flex items-center space-x-1 font-medium">
                    <Check className="w-3.5 h-3.5" />
                    <span>{filledPosters.length} flyer(s) ready (saves when clicking Save Bot Rule)</span>
                  </span>
                ) : (
                  <span className="text-slate-500">No flyer attached (Text-only message)</span>
                )}
              </div>
            </div>

            {/* Multi-Poster Spin Rotation Toggle (appears when 2+ posters uploaded) */}
            {filledPosters.length > 1 && (
              <div className="p-3.5 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/60 flex items-center justify-between gap-3 shadow-2xs animate-in fade-in">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                    <Shuffle className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <span>Enable Poster Spin (Multi-Image Rotation)</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/80 dark:text-purple-300 font-mono font-bold">
                        {filledPosters.length} Posters Active
                      </span>
                    </div>
                    <p className="text-[11px] text-purple-700 dark:text-purple-300/90 leading-tight mt-0.5">
                      Randomly alternates across your {filledPosters.length} uploaded posters for each recipient to maximize response rates and avoid ad fatigue.
                    </p>
                  </div>
                </div>

                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={enableImageSpin}
                    onChange={(e) => setEnableImageSpin(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-750 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
                </label>
              </div>
            )}
          </div>

          {/* Auto-Blast Background Dispatcher Toggle */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-800">
            <div>
              <div className="text-xs font-semibold text-white flex items-center space-x-2">
                <span>Automated Background Blast</span>
                {autoBlast ? (
                  <span className="bg-emerald-500/10 text-emerald-400 text-[10px] px-2 py-0.5 rounded-full border border-emerald-500/30 flex items-center space-x-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Active</span>
                  </span>
                ) : (
                  <span className="bg-slate-100 text-slate-600 text-[10px] px-2 py-0.5 rounded-full border border-slate-300 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700">
                    Inactive
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Automatically dispatch follow-up blast when customers reach {thresholdHours}h silence with drip pacing.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setAutoBlast(!autoBlast)}
              className={`w-11 h-6 rounded-full transition-colors relative ${
                autoBlast ? "bg-blue-600" : "bg-slate-300 dark:bg-slate-800 border border-slate-400 dark:border-slate-700"
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white transition-transform transform ${
                  autoBlast ? "translate-x-6" : "translate-x-1"
                } top-1 absolute`}
              />
            </button>
          </div>

          {/* Active Auto-Pilot Engine Info & Test Trigger */}
          {autoBlast && (
            <div className={`rounded-2xl p-3.5 space-y-2 animate-in fade-in border ${
              isActive
                ? "bg-emerald-950/30 border-emerald-500/30"
                : "bg-slate-100 border-slate-300 dark:bg-slate-800/60 dark:border-slate-700/80"
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <div className={`w-7 h-7 rounded-xl flex items-center justify-center ${
                    isActive
                      ? "bg-emerald-500/20 text-emerald-400"
                      : "bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300"
                  }`}>
                    {isActive ? <Zap className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center space-x-1.5">
                      <span>{isActive ? "Background Auto-Pilot Running" : "Auto-Pilot Configured (Draft / Paused)"}</span>
                      {isActive ? (
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                      ) : (
                        <span className="text-[10px] text-amber-600 dark:text-amber-400 font-normal">● Click &quot;Start Blast&quot; below to launch</span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      {isActive ? (
                        <>Monitoring leads every 30s. Automatically follows up at <span className="text-emerald-500 dark:text-emerald-300 font-semibold">{thresholdHours}h</span> silence with {dripMin}s-{dripMax}s drip.</>
                      ) : (
                        <>Rule is saved as draft. Background blast is currently dormant. Click &quot;Start Blast&quot; to activate.</>
                      )}
                    </div>
                  </div>
                </div>

                {isActive && (
                  <button
                    type="button"
                    onClick={handleTriggerAutoCheck}
                    disabled={isRunningAutoCheck}
                    className="flex items-center space-x-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 text-xs font-semibold px-3 py-1.5 rounded-xl transition disabled:opacity-50 shrink-0"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isRunningAutoCheck ? "animate-spin" : ""}`} />
                    <span>{isRunningAutoCheck ? "Checking..." : "Run Auto-Check Now"}</span>
                  </button>
                )}
              </div>

              {autoCheckResult && (
                <div className="text-[11px] text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1.5 rounded-lg">
                  {autoCheckResult}
                </div>
              )}
            </div>
          )}

          {/* Save & Action Buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center space-x-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-4 py-2 rounded-xl transition shadow-md shadow-blue-600/30 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{isSaving ? "Saving..." : "Save Bot Rule"}</span>
              </button>

              {saveSuccess && (
                <span className="text-xs text-emerald-500 dark:text-emerald-400 flex items-center space-x-1 animate-in fade-in">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Rule Saved as Draft!</span>
                </span>
              )}

              {saveError && (
                <span className="text-xs text-red-500 dark:text-red-400 flex items-center space-x-1 animate-in fade-in">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>{saveError}</span>
                </span>
              )}
            </div>

            {selectedId !== "new" && (
              <div className="flex items-center space-x-2">
                {hasUnsavedChanges && (
                  <span className="text-[11px] text-amber-500 dark:text-amber-400/90 font-medium flex items-center space-x-1 animate-in fade-in mr-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400 shrink-0" />
                    <span>Save Bot Rule to enable blast</span>
                  </span>
                )}
                <button
                  type="button"
                  onClick={handleBlastClick}
                  disabled={blastState === "blasting" || isBlasting || isTogglingActive || hasUnsavedChanges}
                  title={
                    hasUnsavedChanges
                      ? 'Please click "Save Bot Rule" first to apply your changes before blasting'
                      : autoBlast
                      ? isActive
                        ? "Click to pause automated background follow-up blast"
                        : "Click to start automated background follow-up blast"
                      : "Start manual follow-up blast"
                  }
                  className={`flex items-center space-x-1.5 text-xs font-bold px-4 py-2 rounded-xl transition shadow-md disabled:opacity-40 disabled:cursor-not-allowed ${
                    hasUnsavedChanges
                      ? "bg-slate-200 text-slate-500 border border-slate-300 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700"
                      : isTogglingActive
                      ? "bg-blue-600 text-white"
                      : autoBlast && isActive
                      ? "bg-amber-600 hover:bg-amber-500 text-white shadow-amber-600/30"
                      : autoBlast && !isActive
                      ? "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-600/30"
                      : blastState === "success"
                      ? "bg-emerald-600 text-white shadow-emerald-600/30"
                      : blastState === "error"
                      ? "bg-red-600 text-white shadow-red-600/30"
                      : "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-950 shadow-amber-500/20"
                  }`}
                >
                  {isTogglingActive || blastState === "blasting" || isBlasting ? (
                    <RefreshCw className="w-4 h-4 animate-spin text-white" />
                  ) : autoBlast && isActive ? (
                    <Pause className="w-4 h-4 fill-white" />
                  ) : autoBlast && !isActive ? (
                    <Play className="w-4 h-4 fill-white" />
                  ) : blastState === "success" ? (
                    <CheckCircle2 className="w-4 h-4 text-white animate-in zoom-in" />
                  ) : blastState === "error" ? (
                    <AlertCircle className="w-4 h-4 text-white" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  <span>
                    {isTogglingActive
                      ? isActive
                        ? "Pausing..."
                        : "Starting..."
                      : blastState === "blasting" || isBlasting
                      ? "Blasting..."
                      : blastState === "success"
                      ? "Delivered ✓"
                      : blastState === "error"
                      ? "Blast Failed"
                      : autoBlast
                      ? isActive
                        ? "Pause Blast"
                        : "Start Blast"
                      : "Start Blast"}
                  </span>
                </button>

                {blastMessage && (
                  <span className={`text-xs font-semibold flex items-center space-x-1 animate-in fade-in ${
                    blastState === "error" ? "text-red-400" : "text-emerald-400"
                  }`}>
                    {blastState === "error" ? (
                      <AlertCircle className="w-3.5 h-3.5 text-red-400" />
                    ) : (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    )}
                    <span>{blastMessage}</span>
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Live Messenger Mobile Mockup Preview (Right 5 Cols - Sticky on Desktop) */}
        <div className="lg:col-span-5 space-y-3 lg:sticky lg:top-20 z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
              <Smartphone className="w-4 h-4 text-blue-500 dark:text-blue-400" />
              <span>Customer Messenger Preview</span>
            </div>
            <button
              type="button"
              onClick={() => setPreviewSpinSeed((s) => s + 1)}
              className="text-[11px] font-semibold text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 bg-purple-50 dark:bg-purple-950/50 hover:bg-purple-100 dark:hover:bg-purple-900/40 border border-purple-200 dark:border-purple-800/60 px-2.5 py-1 rounded-lg transition flex items-center gap-1.5 cursor-pointer shadow-2xs active:scale-95"
              title="Shuffle Spintax text variation and poster flyer"
            >
              <Shuffle className="w-3.5 h-3.5" />
              <span>Spin Preview</span>
            </button>
          </div>

          {/* Phone Frame */}
          <div className="bg-slate-50 dark:bg-slate-950 border-4 border-slate-300 dark:border-slate-800 rounded-[2.5rem] p-4 shadow-2xl relative overflow-hidden max-h-[calc(100vh-7rem)] overflow-y-auto">
            {/* Speaker bar */}
            <div className="w-20 h-3 bg-slate-300 dark:bg-slate-800 rounded-full mx-auto mb-4" />

            {/* Messenger Header */}
            <div className="flex items-center space-x-2.5 pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center font-bold text-white text-xs shadow-md">
                SL
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                  {previewPageName}
                </div>
                <div className="text-[10px] text-emerald-600 dark:text-emerald-400 flex items-center space-x-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                  <span>Typically replies instantly</span>
                </div>
              </div>
            </div>

            {/* Chat Content */}
            <div className="py-4 space-y-3 min-h-[360px] flex flex-col justify-end text-xs">
              {/* Customer's previous inquiry */}
              <div className="flex justify-end">
                <div className="bg-blue-600 text-white rounded-2xl rounded-tr-sm px-3.5 py-2 max-w-[85%] text-xs shadow-sm font-medium">
                  Hi, do you have size L available in black?
                </div>
              </div>

              {/* Sales rep's single response */}
              <div className="flex justify-start">
                <div className="bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-2xl rounded-tl-sm px-3.5 py-2 max-w-[85%] text-xs shadow-sm font-normal">
                  Hello {previewCustomerName}! Yes, black in size L is in stock. Would you like me to reserve one for you today?
                </div>
              </div>

              {/* Inactivity Gap Marker */}
              <div className="py-2 text-center">
                <span className="bg-amber-500/10 text-amber-500 border border-amber-500/20 text-[10px] px-2.5 py-0.5 rounded-full font-medium">
                  ⏳ Customer went silent for {thresholdHours}h
                </span>
              </div>

              {/* SieReach Follow-Up Blast: Image */}
              {activePreviewImage && (
                <div className="flex flex-col items-start space-y-1 animate-in fade-in">
                  {enableImageSpin && filledPosters.length > 1 && (
                    <span className="text-[9px] font-mono text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800/60 px-1.5 py-0.5 rounded-md font-bold flex items-center gap-1">
                      <Shuffle className="w-2.5 h-2.5" />
                      <span>Poster Spun ({previewSpinSeed % filledPosters.length + 1} of {filledPosters.length})</span>
                    </span>
                  )}
                  <div className="max-w-[85%] rounded-2xl rounded-tl-sm overflow-hidden border border-slate-300 dark:border-slate-700 shadow-md">
                    <img
                      src={activePreviewImage}
                      alt="Promotional Attachment"
                      className="w-full h-36 object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=800&auto=format&fit=crop&q=80";
                      }}
                    />
                  </div>
                </div>
              )}

              {/* SieReach Follow-Up Blast: Message Text */}
              <div className="flex justify-start animate-in fade-in">
                <div className="bg-slate-900 text-white dark:bg-gradient-to-tr dark:from-slate-800 dark:to-slate-750 dark:text-white rounded-2xl rounded-tl-sm px-3.5 py-2.5 max-w-[85%] text-xs shadow-md border border-slate-800 dark:border-slate-750 leading-relaxed">
                  {previewRenderedText}
                </div>
              </div>
            </div>

            {/* Bottom Messenger Bar */}
            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center space-x-2">
              <div className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-full px-3 py-1.5 text-[11px] text-slate-500">
                Write a reply...
              </div>
              <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-white text-[10px]">
                👍
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CONFIRM_OFF WARNING MODAL */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-red-500/40 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center space-x-3 text-red-500 dark:text-red-400">
              <div className="p-2 rounded-xl bg-red-500/10 border border-red-500/30">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  High-Risk Action: Disable 24h Tag Safety
                </h3>
                <span className="text-xs text-red-600 dark:text-red-400 font-semibold">
                  Meta Facebook Messenger Policy Warning
                </span>
              </div>
            </div>

            <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-500/20 rounded-xl p-3.5 text-xs text-slate-700 dark:text-slate-300 space-y-2 leading-relaxed">
              <p>
                Meta strictly limits automated messaging outside the 24-hour standard window. Disabling this guard allows the bot to message customers whose last message was more than 24 hours ago using the <code className="font-mono font-semibold text-red-700 dark:text-red-400">HUMAN_AGENT</code> tag.
              </p>
              <p className="text-red-700 dark:text-red-300 font-medium">
                ⚠️ Sending promotional broadcasts or bulk blasts outside the 24-hour window violates Meta Platform Terms and can lead to Facebook permanently restricting or banning your Pages.
              </p>
            </div>

            <div className="space-y-2 text-xs">
              <label className="block text-slate-700 dark:text-slate-300 font-semibold">
                To confirm you understand the risks, type <span className="font-mono text-red-700 dark:text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded border border-red-500/30">CONFIRM_OFF</span> below:
              </label>
              <input
                type="text"
                value={confirmInput}
                onChange={(e) => setConfirmInput(e.target.value)}
                placeholder="Type CONFIRM_OFF here"
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white font-mono placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:border-red-500 transition"
              />
            </div>

            <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setShowConfirmModal(false);
                  setConfirmInput("");
                }}
                className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white"
              >
                Cancel & Keep Protected
              </button>

              <button
                type="button"
                disabled={confirmInput !== "CONFIRM_OFF"}
                onClick={handleConfirmTurnOff}
                className="bg-red-600 hover:bg-red-500 disabled:opacity-30 disabled:hover:bg-red-600 text-white text-xs font-bold px-4 py-2 rounded-xl transition shadow-md shadow-red-600/30"
              >
                Disable Safety Guard
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Rule Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={Boolean(campaignToDelete)}
        onClose={() => setCampaignToDelete(null)}
        onConfirm={handleConfirmDeleteRule}
        title="Delete Follow-Up Rule?"
        itemName={campaignToDelete?.name || "Follow-Up Rule"}
        itemType="Follow-Up Rule"
        isDeleting={isDeletingCampaign}
        details={[
          { label: "Rule Name", value: campaignToDelete?.name || "N/A" },
          {
            label: "Inactivity Trigger",
            value: `${campaignToDelete?.inactiveHoursThreshold ?? 24} hours without customer response`,
          },
          {
            label: "Target Scope",
            value: campaignToDelete?.pageId
              ? pages.find((p) => p.pageId === campaignToDelete.pageId)?.name || "Specific Page"
              : "All Connected Facebook Pages",
          },
          {
            label: "Message Tag",
            value: campaignToDelete?.messageTag || "HUMAN_AGENT",
          },
        ]}
        warningText="Deleting this rule will permanently remove its message template, blast schedule, and associated automation settings."
      />
    </div>
  );
}
