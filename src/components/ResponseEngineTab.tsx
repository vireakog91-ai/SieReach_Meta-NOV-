"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Zap,
  Sliders,
  FileJson,
  FlaskConical,
  Plus,
  Bot,
  Check,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  Layers,
  Trash2,
  Edit2,
  Copy,
  ExternalLink,
  MessageSquare,
  Image as ImageIcon,
  Mic,
  Video,
  FileText,
  ShieldAlert,
  ArrowRight,
  Send,
  RefreshCw,
  Search,
  Filter,
  Play,
  RotateCcw,
  Smartphone,
  ChevronRight,
  Code2,
  Braces,
  X,
  Minus,
  HelpCircle,
} from "lucide-react";
import { ResponseTemplateItem, DEFAULT_TEMPLATES } from "@/app/api/response-templates/route";
import { ResponseRuleItem, DEFAULT_RULES } from "@/app/api/response-rules/route";
import { JsonBuilderTab } from "@/components/JsonBuilderTab";

interface ResponseEngineTabProps {
  pages?: Array<{ pageId: string; name: string; businessName?: string; avatarUrl?: string }>;
  activeBusiness?: string;
  activeSubTab?: "rules" | "templates" | "simulator";
  onSubTabChange?: (tab: "rules" | "templates" | "simulator") => void;
  hideHeaderBar?: boolean;
}

export function ResponseEngineTab({
  pages = [],
  activeBusiness = "SieLab Retail Group",
  activeSubTab,
  onSubTabChange,
  hideHeaderBar = false,
}: ResponseEngineTabProps) {
  // Local subtab fallback if not controlled by parent dock
  const [internalSubTab, setInternalSubTab] = useState<"rules" | "templates" | "simulator">("rules");
  const currentSubTab = activeSubTab || internalSubTab;

  const setSubTab = (tab: "rules" | "templates" | "simulator") => {
    if (onSubTabChange) {
      onSubTabChange(tab);
    } else {
      setInternalSubTab(tab);
    }
  };

  // State: Templates & Rules
  const [templates, setTemplates] = useState<ResponseTemplateItem[]>(DEFAULT_TEMPLATES);
  const [rules, setRules] = useState<ResponseRuleItem[]>(DEFAULT_RULES);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(DEFAULT_TEMPLATES[0]?.id || "tmpl_price_khmer");
  const [isLoading, setIsLoading] = useState(false);

  // Edit / Create Rule Modal
  const [editingRule, setEditingRule] = useState<ResponseRuleItem | null>(null);
  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);
  const [keywordInput, setKeywordInput] = useState("");

  // Simulator State
  const [simulatedCustomerInput, setSimulatedCustomerInput] = useState("");
  const [simulatedAttachmentType, setSimulatedAttachmentType] = useState<"none" | "image" | "audio" | "video">("none");
  const [simulatedClickCount, setSimulatedClickCount] = useState(0);
  const [simulatedChatHistory, setSimulatedChatHistory] = useState<
    Array<{ sender: "customer" | "bot" | "system"; text: string; time: string; badge?: string; templateId?: string }>
  >([
    {
      sender: "system",
      text: "⚡ Response Engine Simulator Ready. Type in English or Khmer (e.g. 'តម្លៃប៉ុន្មាន' or 'how much'), test an image upload, or test consecutive clicks to test anti-spam.",
      time: "Just now",
    },
  ]);
  const [lastMatchExplanation, setLastMatchExplanation] = useState<string | null>(null);
  const [lastMatchedRuleId, setLastMatchedRuleId] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Anti-Spam Active Postpone / Cooldown State
  const [antiSpamCooldownUntil, setAntiSpamCooldownUntil] = useState<number | null>(null);
  const [antiSpamIgnoredCount, setAntiSpamIgnoredCount] = useState<number>(0);
  const [antiSpamPostponeHours, setAntiSpamPostponeHours] = useState<number>(3.0);
  const [, setCooldownTicker] = useState<number>(0);

  useEffect(() => {
    if (!antiSpamCooldownUntil) return;
    const interval = setInterval(() => setCooldownTicker((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, [antiSpamCooldownUntil]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [simulatedChatHistory]);
  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [resTemplates, resRules] = await Promise.all([
        fetch(`/api/response-templates?businessName=${encodeURIComponent(activeBusiness)}`),
        fetch(`/api/response-rules?businessName=${encodeURIComponent(activeBusiness)}`),
      ]);

      const dataT = await resTemplates.json();
      const dataR = await resRules.json();

      if (dataT.success && Array.isArray(dataT.templates)) {
        setTemplates(dataT.templates);
        if (!selectedTemplateId && dataT.templates[0]) {
          setSelectedTemplateId(dataT.templates[0].id);
        }
      }

      if (dataR.success && Array.isArray(dataR.rules)) {
        setRules(dataR.rules);
      }
    } catch (err) {
      console.error("Failed to load response engine data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeBusiness]);

  // Selected Active Template for JSON Builder
  const activeTemplate = useMemo(() => {
    return templates.find((t) => t.id === selectedTemplateId) || templates[0];
  }, [templates, selectedTemplateId]);

  // Toggle Rule Active State
  const handleToggleRule = async (ruleId: string, currentActive: boolean) => {
    try {
      await fetch("/api/response-rules", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: ruleId,
          isActive: !currentActive,
          businessName: activeBusiness,
        }),
      });

      setRules((prev) =>
        prev.map((r) => (r.id === ruleId ? { ...r, isActive: !currentActive } : r))
      );
    } catch (err) {
      console.error("Toggle rule error:", err);
    }
  };

  // Delete Rule
  const handleDeleteRule = async (ruleId: string) => {
    if (!confirm("Are you sure you want to delete this response rule?")) return;
    try {
      await fetch(`/api/response-rules?id=${ruleId}&businessName=${encodeURIComponent(activeBusiness)}`, {
        method: "DELETE",
      });
      setRules((prev) => prev.filter((r) => r.id !== ruleId));
    } catch (err) {
      console.error("Delete rule error:", err);
    }
  };

  // Open New Rule Modal
  const handleOpenNewRule = () => {
    setEditingRule({
      id: `rule_${Date.now()}`,
      name: "New Automatic Response Rule",
      businessName: activeBusiness,
      pageId: "ALL",
      isActive: true,
      priority: rules.length + 1,
      triggerType: "KEYWORD",
      keywords: ["price", "តម្លៃ"],
      keywordMatchType: "contains",
      attachmentTypes: [],
      clickPostponeConfig: {
        maxClicksWithoutResponse: 3,
        postponeHours: 3.0,
        actionOnTrigger: "postpone_and_notify_agent",
        cooldownMessageTemplateId: "tmpl_click_cooldown",
      },
      targetTemplateId: templates[0]?.id || "tmpl_price_khmer",
      triggerCount: 0,
      createdAt: new Date().toISOString(),
    });
    setKeywordInput("");
    setIsRuleModalOpen(true);
  };

  // Save Rule from Modal
  const handleSaveRule = async () => {
    if (!editingRule) return;
    try {
      const res = await fetch("/api/response-rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rule: editingRule,
          businessName: activeBusiness,
        }),
      });

      const data = await res.json();
      if (data.success && data.rules) {
        setRules(data.rules);
      }
      setIsRuleModalOpen(false);
      setEditingRule(null);
    } catch (err) {
      console.error("Save rule error:", err);
    }
  };

  // Create New Template
  const handleCreateNewTemplate = async () => {
    const newTmpl: ResponseTemplateItem = {
      id: `tmpl_${Date.now()}`,
      name: `New Response Flow ${templates.length + 1}`,
      description: "Custom automated response template",
      format: "button",
      jsonPayload: JSON.stringify(
        {
          message: {
            attachment: {
              type: "template",
              payload: {
                template_type: "button",
                text: "Hi! How can our team assist you today?",
                buttons: [
                  {
                    type: "web_url",
                    url: "https://sielab.shop",
                    title: "Visit Website",
                  },
                ],
              },
            },
          },
        },
        null,
        2
      ),
      businessName: activeBusiness,
      updatedAt: new Date().toISOString(),
    };

    try {
      const res = await fetch("/api/response-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          template: newTmpl,
          businessName: activeBusiness,
        }),
      });
      const data = await res.json();
      if (data.success && data.templates) {
        setTemplates(data.templates);
        setSelectedTemplateId(newTmpl.id);
      }
    } catch (err) {
      console.error("Create template error:", err);
    }
  };

  // Duplicate Template
  const handleDuplicateTemplate = async (tmpl: ResponseTemplateItem) => {
    const dup: ResponseTemplateItem = {
      ...tmpl,
      id: `tmpl_${Date.now()}`,
      name: `${tmpl.name} (Copy)`,
      updatedAt: new Date().toISOString(),
    };

    try {
      const res = await fetch("/api/response-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          template: dup,
          businessName: activeBusiness,
        }),
      });
      const data = await res.json();
      if (data.success && data.templates) {
        setTemplates(data.templates);
        setSelectedTemplateId(dup.id);
      }
    } catch (err) {
      console.error("Duplicate template error:", err);
    }
  };

  // Delete Template
  const handleDeleteTemplate = async (tmplId: string) => {
    if (templates.length <= 1) {
      alert("At least one template must be preserved.");
      return;
    }
    if (!confirm("Are you sure you want to delete this template?")) return;

    try {
      const res = await fetch(
        `/api/response-templates?id=${tmplId}&businessName=${encodeURIComponent(activeBusiness)}`,
        { method: "DELETE" }
      );
      const data = await res.json();
      if (data.success && data.templates) {
        setTemplates(data.templates);
        setSelectedTemplateId(data.templates[0]?.id || "");
      }
    } catch (err) {
      console.error("Delete template error:", err);
    }
  };

  // Save edited template payload back to API
  const handleSaveTemplatePayload = async (templateId: string, newJson: string, newName?: string) => {
    const existing = templates.find((t) => t.id === templateId);
    if (!existing) return;
    const updated: ResponseTemplateItem = {
      ...existing,
      name: newName || existing.name,
      jsonPayload: newJson,
      updatedAt: new Date().toISOString(),
    };
    try {
      const res = await fetch("/api/response-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          template: updated,
          businessName: activeBusiness,
        }),
      });
      const data = await res.json();
      if (data.success && data.templates) {
        setTemplates(data.templates);
      }
    } catch (err) {
      console.error("Save template error:", err);
    }
  };

  // =========================================================================
  // SIMULATOR ENGINE: Evaluate customer message & triggers against active rules
  // =========================================================================
  const evaluateSimulatorMessage = (
    textInput: string,
    attachmentType: "none" | "image" | "audio" | "video",
    isButtonClick = false
  ) => {
    const timeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    // 0. Anti-Spam Gate: If customer previously exceeded limit and is in active cooldown -> MUST BE IGNORED!
    if (antiSpamCooldownUntil !== null) {
      const now = Date.now();
      if (now < antiSpamCooldownUntil) {
        // Cooldown still active -> Customer MUST BE IGNORED!
        const remainingMs = antiSpamCooldownUntil - now;
        const remainingMinutes = Math.max(1, Math.ceil(remainingMs / (1000 * 60)));
        const remainingHours = (remainingMs / (1000 * 60 * 60)).toFixed(1);

        const newIgnored = antiSpamIgnoredCount + 1;
        setAntiSpamIgnoredCount(newIgnored);

        const incomingText = isButtonClick
          ? `[Clicked Button #${simulatedClickCount + 1} while in Cooldown]`
          : attachmentType !== "none"
          ? `[Sent ${attachmentType.toUpperCase()} Attachment while in Cooldown]`
          : textInput || "[Inbound Customer Message]";

        setLastMatchExplanation(
          `🛑 Anti-Spam Active: Incoming customer message was IGNORED. Automated responses are suspended for ${remainingHours}h (${remainingMinutes}m remaining). The bot will resume only after the cooldown expires.`
        );

        setSimulatedChatHistory((prev) => [
          ...prev,
          {
            sender: "customer",
            text: incomingText,
            time: timeStr,
          },
          {
            sender: "system",
            text: `🔇 Inbound Message IGNORED (#${newIgnored}): Customer exceeded click limit. Automated bot responses are paused (${remainingMinutes}m remaining). The bot will resume only once time becomes valid again.`,
            time: timeStr,
          },
        ]);

        return; // IGNORE! Do NOT dispatch any bot response!
      } else {
        // Cooldown has elapsed -> Things become normal again!
        setAntiSpamCooldownUntil(null);
        setSimulatedClickCount(0);
        setAntiSpamIgnoredCount(0);

        setSimulatedChatHistory((prev) => [
          ...prev,
          {
            sender: "system",
            text: `✅ Anti-Spam cooldown has expired (${antiSpamPostponeHours}h elapsed). Time is valid again! Automated responses have resumed.`,
            time: timeStr,
          },
        ]);
        // Continue down to normal message evaluation!
      }
    }

    // 1. Check Anti-Spam Click Fatigue Postpone Rule
    const clickRule = rules.find((r) => r.isActive && r.triggerType === "CLICK_POSTPONE");
    if (isButtonClick && clickRule && clickRule.clickPostponeConfig) {
      const threshold = clickRule.clickPostponeConfig.maxClicksWithoutResponse || 3;
      const newCount = simulatedClickCount + 1;
      setSimulatedClickCount(newCount);

      if (newCount >= threshold) {
        const postponeH = clickRule.clickPostponeConfig.postponeHours || 3.0;
        const cooldownTimestamp = Date.now() + postponeH * 60 * 60 * 1000;
        setAntiSpamCooldownUntil(cooldownTimestamp);
        setAntiSpamPostponeHours(postponeH);
        setAntiSpamIgnoredCount(0);
        setLastMatchedRuleId(clickRule.id);

        setLastMatchExplanation(
          `🛑 Anti-Spam Triggered: Customer clicked ${newCount}/${threshold} times without typing text response. Pausing bot automated responses for ${postponeH} hours. All subsequent customer messages will now be IGNORED until time becomes valid again.`
        );

        setSimulatedChatHistory((prev) => [
          ...prev,
          {
            sender: "customer",
            text: `[Clicked Button #${newCount} without typing message]`,
            time: timeStr,
          },
          {
            sender: "system",
            text: `⚠️ Anti-Spam Triggered: Click limit exceeded (${newCount}/${threshold}). Automated response POSTPONED for ${postponeH}h. From now on, customer messages will be IGNORED until cooldown expires.`,
            time: timeStr,
          },
          {
            sender: "bot",
            text: `We noticed you tapped buttons multiple times without replying. Automated responses are now paused for ${postponeH} hours and escalated to a human specialist. Further automated messages are temporarily muted.`,
            time: timeStr,
            badge: "Postpone & Escalation Flow",
            templateId: clickRule.targetTemplateId,
          },
        ]);
        return;
      }
    }

    // If user types text, reset consecutive click count
    if (textInput.trim()) {
      setSimulatedClickCount(0);
    }

    // 2. Check Inbound Attachment Rules (Image, Audio, Video)
    if (attachmentType !== "none") {
      const attachRule = rules.find(
        (r) => r.isActive && r.triggerType === "ATTACHMENT" && r.attachmentTypes.includes(attachmentType as any)
      );

      if (attachRule) {
        const targetTmpl = templates.find((t) => t.id === attachRule.targetTemplateId);
        setLastMatchedRuleId(attachRule.id);
        setLastMatchExplanation(
          `📸 Matched Attachment Rule: "${attachRule.name}" (Type: ${attachmentType.toUpperCase()}) -> Dispatched Template: "${targetTmpl?.name || attachRule.targetTemplateId}"`
        );

        setSimulatedChatHistory((prev) => [
          ...prev,
          {
            sender: "customer",
            text: `[Sent ${attachmentType.toUpperCase()} Attachment / Slip]`,
            time: timeStr,
          },
          {
            sender: "bot",
            text: `Received your ${attachmentType}! Automatically triggering configured flow "${targetTmpl?.name}".`,
            time: timeStr,
            badge: attachRule.name,
            templateId: targetTmpl?.id,
          },
        ]);
        return;
      }

      // If an attachment was sent without text, and no attachment rule matched
      if (!textInput.trim()) {
        const catchAllRule = rules.find((r) => r.isActive && r.triggerType === "DEFAULT_FALLBACK");
        if (catchAllRule) {
          const targetTmpl = templates.find((t) => t.id === catchAllRule.targetTemplateId);
          setLastMatchedRuleId(catchAllRule.id);
          setLastMatchExplanation(
            `🌐 Unmatched ${attachmentType.toUpperCase()} received. Dispatched Catch-All rule: "${catchAllRule.name}" -> Template: "${targetTmpl?.name || catchAllRule.targetTemplateId}"`
          );
          setSimulatedChatHistory((prev) => [
            ...prev,
            {
              sender: "customer",
              text: `[Sent ${attachmentType.toUpperCase()} Attachment]`,
              time: timeStr,
            },
            {
              sender: "bot",
              text: `Catch-All fallback: Dispatched "${targetTmpl?.name}".`,
              time: timeStr,
              badge: catchAllRule.name,
              templateId: targetTmpl?.id,
            },
          ]);
        } else {
          // NO CATCH-ALL APPLY -> BOT SHOULD NOT REPLY!
          setLastMatchedRuleId(null);
          setLastMatchExplanation(
            `🔇 No attachment rule matched for ${attachmentType.toUpperCase()}, and no Catch-All rule is applied. Bot remains silent.`
          );
          setSimulatedChatHistory((prev) => [
            ...prev,
            {
              sender: "customer",
              text: `[Sent ${attachmentType.toUpperCase()} Attachment]`,
              time: timeStr,
            },
          ]);
        }
        return;
      }
    }

    // 3. Check Keyword Catch Rules (English & Khmer)
    const normalized = textInput.toLowerCase().trim();
    const sortedActiveRules = [...rules]
      .filter((r) => r.isActive && r.triggerType === "KEYWORD")
      .sort((a, b) => a.priority - b.priority);

    let matchedRule: ResponseRuleItem | null = null;
    let matchedKeyword: string | null = null;

    for (const rule of sortedActiveRules) {
      for (const kw of rule.keywords) {
        const kwNorm = kw.toLowerCase().trim();
        if (rule.keywordMatchType === "exact") {
          if (normalized === kwNorm) {
            matchedRule = rule;
            matchedKeyword = kw;
            break;
          }
        } else {
          // "contains" or Khmer substring match
          if (normalized.includes(kwNorm)) {
            matchedRule = rule;
            matchedKeyword = kw;
            break;
          }
        }
      }
      if (matchedRule) break;
    }

    if (matchedRule && matchedKeyword) {
      const targetTmpl = templates.find((t) => t.id === matchedRule.targetTemplateId);
      setLastMatchedRuleId(matchedRule.id);
      setLastMatchExplanation(
        `🎯 Matched Keyword: "${matchedKeyword}" in rule "${matchedRule.name}" (Priority #${matchedRule.priority}) -> Dispatched Template: "${targetTmpl?.name || matchedRule.targetTemplateId}"`
      );

      setSimulatedChatHistory((prev) => [
        ...prev,
        {
          sender: "customer",
          text: textInput,
          time: timeStr,
        },
        {
          sender: "bot",
          text: `Matched keyword "${matchedKeyword}". Sent response: "${targetTmpl?.name}"`,
          time: timeStr,
          badge: matchedRule?.name,
          templateId: targetTmpl?.id,
        },
      ]);
    } else {
      // 4. Default Fallback or Silent / No-Reply
      // Check if an active Catch-All / DEFAULT_FALLBACK rule is configured
      const catchAllRule = rules.find((r) => r.isActive && r.triggerType === "DEFAULT_FALLBACK");

      if (catchAllRule) {
        const targetTmpl = templates.find((t) => t.id === catchAllRule.targetTemplateId);
        setLastMatchedRuleId(catchAllRule.id);
        setLastMatchExplanation(
          `🌐 No keyword matched. Dispatched Catch-All rule: "${catchAllRule.name}" -> Template: "${targetTmpl?.name || catchAllRule.targetTemplateId}"`
        );
        setSimulatedChatHistory((prev) => [
          ...prev,
          {
            sender: "customer",
            text: textInput,
            time: timeStr,
          },
          {
            sender: "bot",
            text: `Catch-All fallback: Dispatched "${targetTmpl?.name}".`,
            time: timeStr,
            badge: catchAllRule.name,
            templateId: targetTmpl?.id,
          },
        ]);
      } else {
        // NO CATCH-ALL APPLY -> BOT SHOULD NOT REPLY!
        setLastMatchedRuleId(null);
        setLastMatchExplanation(
          `🔇 No keyword or attachment matched, and NO Catch-All rule is applied. The bot remains silent (human agent / handoff).`
        );
        setSimulatedChatHistory((prev) => [
          ...prev,
          {
            sender: "customer",
            text: textInput,
            time: timeStr,
          },
        ]);
      }
    }
  };

  const handleSendSimulatorMessage = () => {
    if (!simulatedCustomerInput.trim() && simulatedAttachmentType === "none") return;
    evaluateSimulatorMessage(simulatedCustomerInput, simulatedAttachmentType);
    setSimulatedCustomerInput("");
    setSimulatedAttachmentType("none");
  };

  return (
    <div className="space-y-6">
      {/* Unified Hero Banner */}
      <div className="tool-hero-banner response-hero-banner bg-gradient-to-r from-amber-50 via-orange-50/50 to-white dark:from-amber-950 dark:via-orange-950 dark:to-slate-900 border border-amber-200/80 dark:border-amber-800/40 rounded-3xl p-6 sm:p-7 text-slate-900 dark:text-white shadow-sm dark:shadow-xl relative overflow-hidden transition-all">
        <div className="absolute -right-16 -top-16 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-40 -bottom-10 w-48 h-48 bg-orange-500/15 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div>
            <div className="flex items-center space-x-2.5">
              <span className="response-badge-pill px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-400/30 text-[11px] font-bold uppercase tracking-wider">
                Automation Engine
              </span>
              <span className="text-xs text-slate-600 dark:text-amber-200/70 font-medium">
                Inbound Rules: <strong className="text-slate-900 dark:text-white font-bold">{rules.length}</strong>
              </span>
              <span className="text-xs text-slate-600 dark:text-amber-200/70 font-medium">
                JSON Flows: <strong className="text-slate-900 dark:text-white font-bold">{templates.length}</strong>
              </span>
              <span className="px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-400/30 text-[10px] font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Active Listener
              </span>
            </div>

            <h1 className="tool-heading text-2xl sm:text-3xl font-extrabold tracking-tight mt-2 text-slate-900 dark:text-white flex items-center gap-2">
              <Sliders className="w-7 h-7 text-amber-600 dark:text-amber-400" />
              Response Engine · Inbound Automation & Flows
            </h1>
            <p className="tool-desc text-sm text-slate-600 dark:text-amber-100/80 mt-1 max-w-2xl leading-relaxed">
              Keyword triggers (EN/KH), multi-format JSON Messenger flows, anti-spam click protection, and live sandbox simulation.
            </p>
          </div>

          {/* SubTab Navigation Switcher */}
          <div className="tool-subtab-container flex items-center p-1.5 bg-white/90 dark:bg-black/40 backdrop-blur-md rounded-2xl border border-slate-200 dark:border-white/10 shrink-0 self-start md:self-auto shadow-xs gap-1.5">
            <button
              type="button"
              onClick={() => setSubTab("rules")}
              className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                currentSubTab === "rules"
                  ? "bg-amber-600 text-white shadow-md shadow-amber-600/25"
                  : "tool-subtab-btn-inactive text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5"
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Inbound Rules ({rules.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setSubTab("templates")}
              className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                currentSubTab === "templates"
                  ? "bg-amber-600 text-white shadow-md shadow-amber-600/25"
                  : "tool-subtab-btn-inactive text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5"
              }`}
            >
              <FileJson className="w-3.5 h-3.5" />
              <span>JSON Templates ({templates.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setSubTab("simulator")}
              className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                currentSubTab === "simulator"
                  ? "bg-amber-600 text-white shadow-md shadow-amber-600/25"
                  : "tool-subtab-btn-inactive text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5"
              }`}
            >
              <FlaskConical className="w-3.5 h-3.5" />
              <span>Flow Simulator</span>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* VIEW 1: RESPONSE RULES ENGINE                                             */}
      {/* ========================================================================= */}
      {currentSubTab === "rules" && (
        <div className="space-y-4">
          {/* Rules Header Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Inbound Trigger Rules</span>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 font-semibold border border-emerald-200 dark:border-emerald-800">
                  {rules.filter((r) => r.isActive).length} of {rules.length} Active
                </span>
              </h3>
              <p className="text-xs text-slate-500">
                Incoming audience messages are evaluated top-to-bottom. The first matching rule immediately triggers its linked JSON flow.
              </p>
            </div>

            <div className="flex items-center space-x-2 shrink-0">
              <button
                type="button"
                onClick={handleOpenNewRule}
                className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-xs font-bold transition shadow-xs cursor-pointer active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>Create Response Rule</span>
              </button>
            </div>
          </div>

          {/* Rules List Cards */}
          <div className="grid grid-cols-1 gap-3">
            {rules.map((rule, idx) => {
              const targetTmpl = templates.find((t) => t.id === rule.targetTemplateId);
              return (
                <div
                  key={rule.id}
                  className={`bg-white dark:bg-slate-900 border rounded-2xl p-4 transition shadow-2xs ${
                    rule.isActive
                      ? "border-slate-200 dark:border-slate-800 hover:border-slate-300"
                      : "border-slate-200/50 dark:border-slate-800/50 opacity-60 bg-slate-50/50 dark:bg-slate-950/50"
                  }`}
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center space-x-2.5 flex-wrap gap-y-1">
                        <span className="w-5 h-5 rounded-full bg-amber-500/10 text-amber-600 font-bold text-[10px] flex items-center justify-center shrink-0">
                          #{idx + 1}
                        </span>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                          {rule.name}
                        </h4>

                        {/* Trigger Type Badge */}
                        {rule.triggerType === "KEYWORD" && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-semibold border border-blue-200 dark:border-blue-800">
                            🔤 Keyword Catch
                          </span>
                        )}
                        {rule.triggerType === "ATTACHMENT" && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 font-semibold border border-purple-200 dark:border-purple-800">
                            📸 Attachment Received
                          </span>
                        )}
                        {rule.triggerType === "CLICK_POSTPONE" && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 font-semibold border border-rose-200 dark:border-rose-800">
                            🛑 Anti-Spam Click Postpone
                          </span>
                        )}
                        {rule.triggerType === "DEFAULT_FALLBACK" && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 font-semibold border border-emerald-200 dark:border-emerald-800">
                            🌐 Catch-All Fallback
                          </span>
                        )}
                      </div>

                      {/* Rule Specific Details */}
                      {rule.triggerType === "KEYWORD" && (
                        <div className="flex flex-wrap items-center gap-1.5 pt-1">
                          <span className="text-[11px] text-slate-500 font-medium">Catches:</span>
                          {rule.keywords.map((kw, kIdx) => (
                            <span
                              key={kIdx}
                              className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-mono border border-slate-200 dark:border-slate-700"
                            >
                              {kw}
                            </span>
                          ))}
                        </div>
                      )}

                      {rule.triggerType === "ATTACHMENT" && (
                        <div className="flex items-center space-x-2 text-xs text-slate-600 dark:text-slate-300 pt-1">
                          <span>Listens for incoming:</span>
                          <span className="font-semibold text-purple-600 dark:text-purple-400">
                            {rule.attachmentTypes.map((a) => a.toUpperCase()).join(", ")}
                          </span>
                          <span className="text-[11px] text-slate-400">(e.g. Payment Slip, QR, Voice Note)</span>
                        </div>
                      )}

                      {rule.triggerType === "CLICK_POSTPONE" && (
                        <div className="flex items-center space-x-2 text-xs text-slate-600 dark:text-slate-300 pt-1">
                          <span>Condition:</span>
                          <span className="font-semibold text-rose-600 dark:text-rose-400">
                            &gt; {rule.clickPostponeConfig?.maxClicksWithoutResponse || 3} consecutive clicks without response
                          </span>
                          <span>→</span>
                          <span>Postpone automated messages for {rule.clickPostponeConfig?.postponeHours || 3} hours</span>
                        </div>
                      )}

                      {rule.triggerType === "DEFAULT_FALLBACK" && (
                        <div className="flex items-center space-x-2 text-xs text-slate-600 dark:text-slate-300 pt-1">
                          <span>Condition:</span>
                          <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                            Fires ONLY when NO keyword or attachment matches (Safety Net)
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Target JSON Template Link & Actions */}
                    <div className="flex items-center space-x-3 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100 dark:border-slate-800">
                      {/* Destination Template Badge */}
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 block">Dispatches Template:</span>
                        <button
                          type="button"
                          onClick={() => {
                            if (targetTmpl) {
                              setSelectedTemplateId(targetTmpl.id);
                              setSubTab("templates");
                            }
                          }}
                          className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <span>{targetTmpl?.name || "Template not found"}</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>

                      {/* Active Toggle Switch */}
                      <button
                        type="button"
                        onClick={() => handleToggleRule(rule.id, rule.isActive)}
                        className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer p-0.5 ${
                          rule.isActive ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-700"
                        }`}
                        title={rule.isActive ? "Deactivate Rule" : "Activate Rule"}
                      >
                        <div
                          className={`w-5 h-5 rounded-full bg-white shadow-xs transition-transform transform ${
                            rule.isActive ? "translate-x-5" : "translate-x-0"
                          }`}
                        />
                      </button>

                      {/* Edit button */}
                      <button
                        type="button"
                        onClick={() => {
                          setEditingRule(rule);
                          setKeywordInput("");
                          setIsRuleModalOpen(true);
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                        title="Edit Rule"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>

                      {/* Delete button */}
                      <button
                        type="button"
                        onClick={() => handleDeleteRule(rule.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                        title="Delete Rule"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 2: MULTI-TEMPLATE JSON BUILDER                                       */}
      {/* ========================================================================= */}
      {currentSubTab === "templates" && (
        <div className="space-y-4">
          {/* Templates Selector Shelf */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>Response JSON Templates Library</span>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 font-semibold">
                    {templates.length} Templates
                  </span>
                </h3>
                <p className="text-xs text-slate-500">
                  Select a template to customize visually or edit code. Each template can be linked to multiple trigger rules.
                </p>
              </div>

              <div className="flex items-center space-x-2 shrink-0">
                <button
                  type="button"
                  onClick={handleCreateNewTemplate}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-xs cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ New Template</span>
                </button>
              </div>
            </div>

            {/* Horizontal Template Chips Carousel */}
            <div className="flex items-center gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden py-1">
              {templates.map((tmpl) => {
                const isSelected = tmpl.id === selectedTemplateId;
                const linkedRules = rules.filter((r) => r.targetTemplateId === tmpl.id);

                return (
                  <div
                    key={tmpl.id}
                    onClick={() => setSelectedTemplateId(tmpl.id)}
                    className={`p-3 rounded-xl border text-left transition shrink-0 cursor-pointer min-w-[200px] max-w-[240px] flex flex-col justify-between ${
                      isSelected
                        ? "bg-blue-50/70 border-blue-500 text-blue-900 dark:bg-blue-950/40 dark:border-blue-500/80 dark:text-blue-200 shadow-2xs ring-1 ring-blue-500/40"
                        : "bg-slate-50 border-slate-200 text-slate-700 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-300 hover:border-slate-300"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500">
                          {tmpl.format}
                        </span>
                        {linkedRules.length > 0 && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-amber-500/10 text-amber-600 font-bold">
                            {linkedRules.length} rule{linkedRules.length > 1 ? "s" : ""}
                          </span>
                        )}
                      </div>
                      <h4 className="text-xs font-bold truncate">{tmpl.name}</h4>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 dark:border-slate-800/60 mt-2 text-[10px]">
                      <span className="text-slate-400">Edit below</span>
                      <div className="flex items-center space-x-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDuplicateTemplate(tmpl);
                          }}
                          className="hover:text-blue-600 p-0.5"
                          title="Duplicate Template"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteTemplate(tmpl.id);
                          }}
                          className="hover:text-rose-600 p-0.5"
                          title="Delete Template"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Embedded Full JSON Builder with Smart & Standard Modes */}
          <div className="pt-1">
            {(() => {
              const selectedTmpl = templates.find((t) => t.id === selectedTemplateId) || templates[0];
              return (
                <JsonBuilderTab
                  key={selectedTmpl?.id}
                  pages={pages}
                  activeBusiness={activeBusiness}
                  initialJsonPayload={selectedTmpl?.jsonPayload}
                  initialTemplateName={selectedTmpl?.name}
                  onPayloadSave={async (newJson, newName) => {
                    if (selectedTmpl) {
                      await handleSaveTemplatePayload(selectedTmpl.id, newJson, newName);
                    }
                  }}
                />
              );
            })()}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 3: FLOW SIMULATOR & AUDIENCE SANDBOX                                 */}
      {/* ========================================================================= */}
      {currentSubTab === "simulator" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Left Column: Interactive Chat Sandbox (7 cols) */}
          <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <FlaskConical className="w-4 h-4 text-emerald-500" />
                  <span>Inbound Flow & Dialogue Simulator</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Simulate incoming customer questions, payment slips, voice notes, or rapid clicking to test rules in real-time.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setSimulatedChatHistory([]);
                  setSimulatedClickCount(0);
                  setAntiSpamCooldownUntil(null);
                  setAntiSpamIgnoredCount(0);
                  setLastMatchExplanation(null);
                  setLastMatchedRuleId(null);
                }}
                className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs text-slate-600 dark:text-slate-300 font-medium transition cursor-pointer"
                title="Clear simulator chat history"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Chat</span>
              </button>
            </div>

            {/* Match Decision HUD Callout */}
            {lastMatchExplanation && (
              <div
                className={`p-3.5 rounded-2xl border text-xs flex items-center justify-between gap-3 shadow-2xs animate-in fade-in duration-200 ${
                  lastMatchedRuleId
                    ? "bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-blue-500/10 border-emerald-500/30 dark:border-emerald-500/40 text-emerald-950 dark:text-emerald-200"
                    : "bg-slate-50 dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200"
                }`}
              >
                <div className="flex items-start space-x-2.5 min-w-0">
                  <div
                    className={`w-7 h-7 rounded-xl flex items-center justify-center font-bold shrink-0 mt-0.5 ${
                      lastMatchedRuleId
                        ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                        : "bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
                    }`}
                  >
                    {lastMatchedRuleId ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center space-x-2">
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded ${
                          lastMatchedRuleId
                            ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                            : "bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                        }`}
                      >
                        {lastMatchedRuleId ? "Rule Engine Decision" : "No Catch-All Applied (Bot Silent)"}
                      </span>
                    </div>
                    <p className="text-xs font-mono font-medium text-slate-800 dark:text-slate-200 mt-1 leading-relaxed truncate-2-lines">
                      {lastMatchExplanation}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setLastMatchExplanation(null)}
                  className="text-slate-400 hover:text-slate-600 p-1 text-xs shrink-0 cursor-pointer"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Active Anti-Spam Postpone Lockdown Banner */}
            {(() => {
              const isAntiSpamActive = antiSpamCooldownUntil !== null && Date.now() < antiSpamCooldownUntil;
              const remainingCooldownSec = isAntiSpamActive
                ? Math.max(0, Math.ceil((antiSpamCooldownUntil! - Date.now()) / 1000))
                : 0;
              const remainingCooldownMin = Math.ceil(remainingCooldownSec / 60);
              const remainingCooldownHours = (remainingCooldownSec / 3600).toFixed(1);

              if (!isAntiSpamActive) return null;

              return (
                <div className="p-3.5 rounded-2xl bg-rose-50/95 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 text-rose-950 dark:text-rose-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs animate-in fade-in duration-200">
                  <div className="flex items-start space-x-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold shrink-0 mt-0.5">
                      <ShieldAlert className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-rose-900 dark:text-rose-200">
                          Anti-Spam Active: Bot is IGNORING Customer
                        </span>
                        <span className="text-[10px] px-2 py-0.2 rounded-full bg-rose-200 dark:bg-rose-900 text-rose-800 dark:text-rose-200 font-mono font-bold">
                          MUTED
                        </span>
                      </div>
                      <p className="text-[11px] text-rose-700 dark:text-rose-300 mt-0.5">
                        Consecutive click limit exceeded. Any inbound customer messages are <strong>IGNORED</strong> until cooldown expires ({remainingCooldownHours}h / {remainingCooldownMin}m left).
                        {antiSpamIgnoredCount > 0 && ` • ${antiSpamIgnoredCount} message(s) dropped.`}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        // Fast forward time so cooldown is expired and time becomes valid again
                        setAntiSpamCooldownUntil(Date.now() - 1000);
                        setSimulatedChatHistory((prev) => [
                          ...prev,
                          {
                            sender: "system",
                            text: `⏩ Fast-Forward: Cooldown duration elapsed. Time is now valid again! Normal automated responses will resume on next message.`,
                            time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                          },
                        ]);
                        setLastMatchExplanation("✅ Time is now valid again! Next customer message will be answered normally.");
                      }}
                      className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs transition cursor-pointer flex items-center gap-1 active:scale-95"
                      title="Simulate time elapsed so cooldown expires and time becomes valid"
                    >
                      <span>⏩ Fast-Forward (Make Time Valid)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setAntiSpamCooldownUntil(null);
                        setSimulatedClickCount(0);
                        setAntiSpamIgnoredCount(0);
                        setSimulatedChatHistory((prev) => [
                          ...prev,
                          {
                            sender: "system",
                            text: "🔓 Anti-Spam lock cleared manually. Automated responses restored to normal.",
                            time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                          },
                        ]);
                        setLastMatchExplanation("✅ Anti-Spam cleared. Normal responses restored.");
                      }}
                      className="px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-xs font-semibold hover:bg-slate-50 cursor-pointer"
                    >
                      Reset
                    </button>
                  </div>
                </div>
              );
            })()}

            {/* Quick Test Triggers Shelf */}
            <div className="space-y-2 p-3 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200/80 dark:border-slate-800/80">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Play className="w-3 h-3 text-amber-500 fill-current" />
                  <span>1-Click Test Scenarios:</span>
                </span>
                <span className="text-[10px] text-slate-400">Click to simulate audience responses</span>
              </div>

              {/* Row 1: Common Customer Inquiries */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] font-semibold text-slate-400 shrink-0 uppercase tracking-wider">
                  Keywords:
                </span>
                <button
                  type="button"
                  onClick={() => evaluateSimulatorMessage("តម្លៃប៉ុន្មានបង?", "none")}
                  className="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 dark:bg-slate-850 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-medium border border-slate-200 dark:border-slate-700 shadow-2xs transition cursor-pointer hover:border-amber-400"
                >
                  🇰🇭 &quot;តម្លៃប៉ុន្មានបង?&quot; (Price)
                </button>
                <button
                  type="button"
                  onClick={() => evaluateSimulatorMessage("how much is this?", "none")}
                  className="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 dark:bg-slate-850 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-medium border border-slate-200 dark:border-slate-700 shadow-2xs transition cursor-pointer hover:border-amber-400"
                >
                  🇬🇧 &quot;How much is this?&quot;
                </button>
                <button
                  type="button"
                  onClick={() => evaluateSimulatorMessage("ហាងនៅឯណា?", "none")}
                  className="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 dark:bg-slate-850 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-medium border border-slate-200 dark:border-slate-700 shadow-2xs transition cursor-pointer hover:border-amber-400"
                >
                  📍 &quot;ហាងនៅឯណា?&quot; (Location)
                </button>
                <button
                  type="button"
                  onClick={() => evaluateSimulatorMessage("មានដឹកជញ្ជូនទេ?", "none")}
                  className="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 dark:bg-slate-850 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-medium border border-slate-200 dark:border-slate-700 shadow-2xs transition cursor-pointer hover:border-amber-400"
                >
                  📦 &quot;មានដឹកជញ្ជូនទេ?&quot; (Delivery)
                </button>
              </div>

              {/* Row 2: Attachments & Click Fatigue */}
              <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                <span className="text-[10px] font-semibold text-slate-400 shrink-0 uppercase tracking-wider">
                  Triggers:
                </span>
                <button
                  type="button"
                  onClick={() => evaluateSimulatorMessage("", "image")}
                  className="px-2.5 py-1 rounded-lg bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 text-xs font-medium cursor-pointer border border-purple-200 dark:border-purple-800 transition shadow-2xs"
                >
                  📸 Send Payment Slip (Image)
                </button>
                <button
                  type="button"
                  onClick={() => evaluateSimulatorMessage("", "audio")}
                  className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-xs font-medium cursor-pointer border border-emerald-200 dark:border-emerald-800 transition shadow-2xs"
                >
                  🎙️ Send Voice Note (Audio)
                </button>
                <button
                  type="button"
                  onClick={() => evaluateSimulatorMessage("", "none", true)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer transition shadow-2xs ${
                    antiSpamCooldownUntil !== null && Date.now() < antiSpamCooldownUntil
                      ? "bg-rose-600 text-white animate-pulse"
                      : "bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800"
                  }`}
                  title={
                    antiSpamCooldownUntil !== null && Date.now() < antiSpamCooldownUntil
                      ? "Cooldown active: clicking will be IGNORED"
                      : `Click consecutive button (${simulatedClickCount}/3)`
                  }
                >
                  🛑 {antiSpamCooldownUntil !== null && Date.now() < antiSpamCooldownUntil ? `Muted in Cooldown (${antiSpamIgnoredCount} dropped)` : `Click Button (${simulatedClickCount}/3)`}
                </button>
              </div>
            </div>

            {/* Simulated Chat Dialogue Stream (Customer on LEFT, Our System on RIGHT) */}
            <div className="h-96 overflow-y-auto p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-950/90 border border-slate-200 dark:border-slate-800 space-y-4 [scrollbar-width:none]">
              {simulatedChatHistory.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-2">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center">
                    <MessageSquare className="w-6 h-6" />
                  </div>
                  <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Dialogue Simulator Ready
                  </h4>
                  <p className="text-[11px] text-slate-400 max-w-xs">
                    Click a preset scenario above or type customer text below to test rule triggers.
                  </p>
                </div>
              ) : (
                simulatedChatHistory.map((item, idx) => {
                  // Centered System Notice Pill
                  if (item.sender === "system") {
                    return (
                      <div key={idx} className="flex items-center justify-center my-2">
                        <div className="px-3.5 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200/80 dark:border-amber-800/60 text-amber-900 dark:text-amber-200 text-xs font-medium flex items-center gap-2 shadow-2xs max-w-md text-center">
                          <ShieldAlert className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                          <span>{item.text}</span>
                        </div>
                      </div>
                    );
                  }

                  // 1. CUSTOMER RESPONSE (ALIGNED ON THE LEFT)
                  if (item.sender === "customer") {
                    const isImageAttachment =
                      item.text.includes("[Sent IMAGE") || item.text.includes("Payment Slip");
                    const isAudioAttachment =
                      item.text.includes("[Sent AUDIO") || item.text.includes("Voice Note");
                    const isButtonClick = item.text.includes("[Clicked Button");

                    return (
                      <div
                        key={idx}
                        className="flex items-start space-x-2.5 justify-start animate-in fade-in duration-200"
                      >
                        {/* Customer Avatar */}
                        <div
                          className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center text-xs font-bold shrink-0 ring-2 ring-slate-300/50 dark:ring-slate-600/50 select-none shadow-2xs"
                          title="Customer (Audience)"
                        >
                          👤
                        </div>

                        <div className="space-y-1 max-w-[85%] sm:max-w-[78%]">
                          {/* Customer Header */}
                          <div className="flex items-center space-x-1.5 px-1">
                            <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200">
                              Customer (Audience)
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {item.time}
                            </span>
                            <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-slate-200/80 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-medium">
                              Inbound
                            </span>
                          </div>

                          {/* Customer Message Bubble */}
                          <div className="p-3.5 rounded-2xl rounded-tl-xs bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200/90 dark:border-slate-700/80 text-xs leading-relaxed shadow-2xs space-y-2">
                            {isImageAttachment ? (
                              <div className="p-2.5 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/60 flex items-center space-x-2.5">
                                <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/60 text-purple-600 dark:text-purple-300 flex items-center justify-center text-base shrink-0">
                                  📸
                                </div>
                                <div>
                                  <span className="text-xs font-bold text-purple-900 dark:text-purple-200 block">
                                    Payment Slip / QR Photo
                                  </span>
                                  <span className="text-[10px] text-purple-600 dark:text-purple-400 block font-mono">
                                    ABA PayWay KHQR / Bank Transfer Slip
                                  </span>
                                </div>
                              </div>
                            ) : isAudioAttachment ? (
                              <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 flex items-center space-x-2.5">
                                <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-300 flex items-center justify-center text-base shrink-0">
                                  🎙️
                                </div>
                                <div>
                                  <span className="text-xs font-bold text-emerald-900 dark:text-emerald-200 block">
                                    Voice Note Memo
                                  </span>
                                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 block font-mono">
                                    Direct audio memo recording (0:18s)
                                  </span>
                                </div>
                              </div>
                            ) : isButtonClick ? (
                              <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 flex items-center space-x-2">
                                <span className="text-base">🛑</span>
                                <span className="text-xs font-semibold text-rose-700 dark:text-rose-300 font-mono">
                                  {item.text}
                                </span>
                              </div>
                            ) : (
                              <p className="whitespace-pre-wrap">{item.text}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  }

                  // 2. OUR SYSTEM / BOT RESPONSE (ALIGNED ON THE RIGHT)
                  const targetTemplate = item.templateId
                    ? templates.find((t) => t.id === item.templateId)
                    : null;

                  return (
                    <div
                      key={idx}
                      className="flex items-start space-x-2.5 justify-end ml-auto animate-in fade-in duration-200"
                    >
                      <div className="space-y-1 max-w-[85%] sm:max-w-[78%] flex flex-col items-end">
                        {/* Bot Header */}
                        <div className="flex items-center space-x-1.5 px-1">
                          <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 font-mono border border-amber-500/20 font-bold">
                            SYSTEM RESPONSE
                          </span>
                          <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400">
                            SieReach Bot
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {item.time}
                          </span>
                        </div>

                        {/* Bot Message Bubble */}
                        <div className="p-3.5 rounded-2xl rounded-tr-xs bg-gradient-to-br from-blue-600 via-indigo-600 to-blue-700 text-white text-xs leading-relaxed shadow-md shadow-blue-500/15 space-y-2 text-left">
                          {item.badge && (
                            <div className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-white/20 text-white text-[10px] font-semibold tracking-wide backdrop-blur-xs">
                              <Sparkles className="w-3 h-3 text-amber-300 shrink-0" />
                              <span>Triggered: {item.badge}</span>
                            </div>
                          )}

                          <p className="text-white/95 leading-relaxed whitespace-pre-wrap">{item.text}</p>

                          {targetTemplate && (
                            <div className="pt-2 border-t border-white/20 flex items-center justify-between gap-3">
                              <div className="min-w-0">
                                <span className="text-[9px] text-white/70 block uppercase font-mono">
                                  Dispatched Flow
                                </span>
                                <span className="text-xs font-bold text-white truncate block">
                                  {targetTemplate.name}
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedTemplateId(targetTemplate.id);
                                  setSubTab("templates");
                                }}
                                className="px-2.5 py-1 rounded-lg bg-white text-blue-700 hover:bg-blue-50 text-[10px] font-bold flex items-center gap-1 shrink-0 transition shadow-xs cursor-pointer active:scale-95"
                                title="Inspect and edit this template flow"
                              >
                                <span>Inspect Flow</span>
                                <ArrowRight className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Bot / System Avatar */}
                      <div
                        className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center text-xs font-bold shrink-0 shadow-md shadow-blue-500/20 ring-2 ring-blue-400/30 select-none"
                        title="SieReach Automated Bot Engine"
                      >
                        <Bot className="w-4 h-4 text-white" />
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={chatEndRef} />
            </div>

            {/* User Input Bar for Custom Testing */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center space-x-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={simulatedCustomerInput}
                    onChange={(e) => setSimulatedCustomerInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSendSimulatorMessage()}
                    placeholder="Type customer question in Khmer or English (e.g. តម្លៃ, how much, where?)..."
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-amber-500 transition"
                  />
                  <span className="absolute left-3 top-2.5 text-xs text-slate-400">💬</span>
                </div>

                {/* Staged Attachment Trigger Selectors */}
                <button
                  type="button"
                  onClick={() =>
                    setSimulatedAttachmentType((prev) => (prev === "image" ? "none" : "image"))
                  }
                  className={`p-2.5 rounded-xl border text-xs transition cursor-pointer ${
                    simulatedAttachmentType === "image"
                      ? "bg-purple-600 text-white border-purple-600 shadow-xs"
                      : "bg-slate-50 hover:bg-slate-100 dark:bg-slate-950 dark:hover:bg-slate-850 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800"
                  }`}
                  title="Stage Payment Slip (Image) attachment"
                >
                  📸
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setSimulatedAttachmentType((prev) => (prev === "audio" ? "none" : "audio"))
                  }
                  className={`p-2.5 rounded-xl border text-xs transition cursor-pointer ${
                    simulatedAttachmentType === "audio"
                      ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                      : "bg-slate-50 hover:bg-slate-100 dark:bg-slate-950 dark:hover:bg-slate-850 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800"
                  }`}
                  title="Stage Voice Note (Audio) attachment"
                >
                  🎙️
                </button>

                <button
                  type="button"
                  onClick={handleSendSimulatorMessage}
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95 shrink-0"
                >
                  <span>Send Inbound</span>
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>

              {simulatedAttachmentType !== "none" && (
                <div className="flex items-center space-x-2 text-[11px] text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-3 py-1.5 rounded-lg border border-amber-200 dark:border-amber-800">
                  <span>📎 Attached with inbound message:</span>
                  <strong className="uppercase font-mono">{simulatedAttachmentType}</strong>
                  <button
                    type="button"
                    onClick={() => setSimulatedAttachmentType("none")}
                    className="text-amber-600 hover:text-amber-800 font-bold ml-auto cursor-pointer"
                  >
                    ✕ Remove
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Matched Rules Evaluation Guide (5 cols) */}
          <div className="lg:col-span-5 bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Rule Execution Priority Stack
              </h4>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-200/80 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold">
                {rules.filter((r) => r.isActive).length} Active
              </span>
            </div>
            <p className="text-xs text-slate-500">
              When an inbound message arrives, SieReach checks rules top-to-bottom. The first matching rule executes:
            </p>

            <div className="space-y-2 pt-2">
              {rules
                .filter((r) => r.isActive)
                .sort((a, b) => a.priority - b.priority)
                .map((r, idx) => {
                  const isLastMatched = lastMatchedRuleId === r.id;
                  const targetTmpl = templates.find((t) => t.id === r.targetTemplateId);

                  return (
                    <div
                      key={r.id}
                      className={`p-3 rounded-xl border transition ${
                        isLastMatched
                          ? "bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-500 ring-2 ring-emerald-500/30 shadow-xs"
                          : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300"
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs mb-1">
                        <div className="flex items-center space-x-2">
                          <span
                            className={`w-5 h-5 rounded-full font-bold text-[10px] flex items-center justify-center shrink-0 ${
                              isLastMatched
                                ? "bg-emerald-600 text-white"
                                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                            }`}
                          >
                            {idx + 1}
                          </span>
                          <span className="font-bold text-slate-800 dark:text-slate-200">{r.name}</span>
                        </div>

                        <div className="flex items-center space-x-1.5">
                          {isLastMatched && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-emerald-600 text-white font-bold animate-pulse">
                              MATCHED
                            </span>
                          )}
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-mono">
                            {r.triggerType}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100 dark:border-slate-800/80">
                        <span className="truncate">
                          → Dispatches: <strong className="text-slate-700 dark:text-slate-300">{targetTmpl?.name || r.targetTemplateId}</strong>
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingRule(r);
                            setKeywordInput("");
                            setIsRuleModalOpen(true);
                          }}
                          className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline cursor-pointer shrink-0 ml-2"
                        >
                          Edit
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* HIGH-END MODAL: CONFIGURE INBOUND RESPONSE RULE                           */}
      {/* ========================================================================= */}
      {isRuleModalOpen && editingRule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl max-w-xl w-full space-y-5 max-h-[92vh] overflow-y-auto [scrollbar-width:none]">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-4">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500/10 to-orange-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center justify-center font-bold shrink-0">
                  <Sliders className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Configure Inbound Response Rule
                  </h3>
                  <p className="text-xs text-slate-500">
                    Set triggering conditions and connect automated JSON payload
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsRuleModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Field 1: Rule Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center justify-between">
                <span>Rule Name</span>
                <span className="text-[10px] text-slate-400 font-normal">Internal reference</span>
              </label>
              <input
                type="text"
                value={editingRule.name}
                onChange={(e) => setEditingRule({ ...editingRule, name: e.target.value })}
                className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-amber-500 transition"
                placeholder="e.g. Price Inquiries (Khmer & English)"
              />
            </div>

            {/* Field 2: Visual Trigger Condition Selector */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                Inbound Trigger Condition
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  {
                    id: "KEYWORD",
                    title: "Keyword Catch",
                    desc: "English & Khmer words",
                    icon: "🔤",
                  },
                  {
                    id: "ATTACHMENT",
                    title: "Attachment Received",
                    desc: "Payment slip, voice, video",
                    icon: "📸",
                  },
                  {
                    id: "CLICK_POSTPONE",
                    title: "Anti-Spam Postpone",
                    desc: "Click fatigue cooldown",
                    icon: "🛑",
                  },
                  {
                    id: "DEFAULT_FALLBACK",
                    title: "Catch-All Fallback",
                    desc: "Reply when nothing matches",
                    icon: "🌐",
                  },
                ].map((trig) => {
                  const isSelected = editingRule.triggerType === trig.id;
                  return (
                    <button
                      key={trig.id}
                      type="button"
                      onClick={() => setEditingRule({ ...editingRule, triggerType: trig.id as any })}
                      className={`p-3 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? "bg-amber-50/70 border-amber-500 text-amber-900 dark:bg-amber-950/30 dark:border-amber-500/80 dark:text-amber-200 ring-1 ring-amber-500/40 shadow-xs"
                          : "bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-base">{trig.icon}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />}
                      </div>
                      <div>
                        <span className="text-xs font-bold block">{trig.title}</span>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 block">{trig.desc}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Dynamic Condition Block 1: Keyword Catch */}
            {editingRule.triggerType === "KEYWORD" && (
              <div className="space-y-3 p-4 rounded-2xl bg-blue-50/40 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-900/40">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-blue-900 dark:text-blue-200">
                    Keywords to Match (English & Khmer)
                  </span>
                  <span className="text-[10px] text-blue-600 dark:text-blue-400">
                    Case-insensitive substring match
                  </span>
                </div>

                {/* Active Keyword Chips */}
                <div className="flex flex-wrap gap-1.5 min-h-[32px]">
                  {editingRule.keywords.map((kw, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-800 text-xs font-mono text-blue-700 dark:text-blue-300 shadow-2xs"
                    >
                      <span>{kw}</span>
                      <button
                        type="button"
                        onClick={() =>
                          setEditingRule({
                            ...editingRule,
                            keywords: editingRule.keywords.filter((_, i) => i !== idx),
                          })
                        }
                        className="text-blue-400 hover:text-rose-500 cursor-pointer"
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                </div>

                {/* Input & Suggested Quick Presets */}
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={keywordInput}
                    onChange={(e) => setKeywordInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && keywordInput.trim()) {
                        e.preventDefault();
                        if (!editingRule.keywords.includes(keywordInput.trim())) {
                          setEditingRule({
                            ...editingRule,
                            keywords: [...editingRule.keywords, keywordInput.trim()],
                          });
                        }
                        setKeywordInput("");
                      }
                    }}
                    placeholder="Type keyword and press Enter (e.g. price, តម្លៃ, how much)..."
                    className="flex-1 p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (keywordInput.trim() && !editingRule.keywords.includes(keywordInput.trim())) {
                        setEditingRule({
                          ...editingRule,
                          keywords: [...editingRule.keywords, keywordInput.trim()],
                        });
                        setKeywordInput("");
                      }
                    }}
                    className="px-3.5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition cursor-pointer"
                  >
                    Add
                  </button>
                </div>

                {/* Suggested Chips */}
                <div className="flex flex-wrap items-center gap-1 text-[11px] text-slate-500">
                  <span className="text-[10px]">Suggestions:</span>
                  {[
                    "price",
                    "how much",
                    "តម្លៃ",
                    "ថ្លៃប៉ុន្មាន",
                    "ទីតាំង",
                    "location",
                    "ដឹកជញ្ជូន",
                  ].map((sug) => (
                    <button
                      key={sug}
                      type="button"
                      onClick={() => {
                        if (!editingRule.keywords.includes(sug)) {
                          setEditingRule({
                            ...editingRule,
                            keywords: [...editingRule.keywords, sug],
                          });
                        }
                      }}
                      className="px-2 py-0.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:text-blue-600 text-[10px] cursor-pointer"
                    >
                      + {sug}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Dynamic Condition Block 2: Attachment Received */}
            {editingRule.triggerType === "ATTACHMENT" && (
              <div className="space-y-3 p-4 rounded-2xl bg-purple-50/40 dark:bg-purple-950/20 border border-purple-200/60 dark:border-purple-900/40">
                <span className="text-xs font-bold text-purple-900 dark:text-purple-200 block">
                  Listen for Inbound Attachments:
                </span>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {[
                    { id: "image", label: "Image / Payment Slip (ABA QR)", icon: ImageIcon },
                    { id: "audio", label: "Voice Note / Audio Memo", icon: Mic },
                    { id: "video", label: "Video Unboxing / Problem", icon: Video },
                    { id: "file", label: "Document / Invoice PDF", icon: FileText },
                  ].map((att) => {
                    const isChecked = editingRule.attachmentTypes.includes(att.id as any);
                    const Icon = att.icon;
                    return (
                      <label
                        key={att.id}
                        className={`flex items-center space-x-2.5 p-2.5 rounded-xl border transition cursor-pointer ${
                          isChecked
                            ? "bg-white dark:bg-slate-900 border-purple-500 text-purple-700 dark:text-purple-300 shadow-2xs font-bold"
                            : "bg-white/60 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setEditingRule({
                                ...editingRule,
                                attachmentTypes: [...editingRule.attachmentTypes, att.id as any],
                              });
                            } else {
                              setEditingRule({
                                ...editingRule,
                                attachmentTypes: editingRule.attachmentTypes.filter((a) => a !== att.id),
                              });
                            }
                          }}
                          className="rounded text-purple-600 focus:ring-purple-500"
                        />
                        <Icon className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                        <span className="text-[11px] leading-tight">{att.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Dynamic Condition Block 3: Anti-Spam Click Postpone (Cleanly Styled) */}
            {editingRule.triggerType === "CLICK_POSTPONE" && (
              <div className="space-y-4 p-4 rounded-2xl bg-gradient-to-br from-rose-50/60 to-orange-50/40 dark:from-rose-950/20 dark:to-orange-950/20 border border-rose-200/60 dark:border-rose-900/40">
                <div className="flex items-center space-x-2">
                  <ShieldAlert className="w-4 h-4 text-rose-500" />
                  <span className="text-xs font-bold text-rose-900 dark:text-rose-200">
                    Anti-Spam Click Fatigue Protection
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {/* Stepper 1: Max Clicks */}
                  <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-rose-100 dark:border-rose-900/40 space-y-1.5 shadow-2xs">
                    <label className="text-[10px] font-semibold text-slate-600 dark:text-slate-400 block">
                      Max Consecutive Button Clicks (without typing)
                    </label>
                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={() => {
                          const curr = editingRule.clickPostponeConfig?.maxClicksWithoutResponse || 3;
                          if (curr > 2) {
                            setEditingRule({
                              ...editingRule,
                              clickPostponeConfig: {
                                ...(editingRule.clickPostponeConfig || {
                                  postponeHours: 3.0,
                                  actionOnTrigger: "postpone_and_notify_agent",
                                }),
                                maxClicksWithoutResponse: curr - 1,
                              },
                            });
                          }
                        }}
                        className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center justify-center font-bold cursor-pointer"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>

                      <span className="flex-1 text-center font-bold font-mono text-sm text-slate-900 dark:text-white">
                        {editingRule.clickPostponeConfig?.maxClicksWithoutResponse || 3} clicks
                      </span>

                      <button
                        type="button"
                        onClick={() => {
                          const curr = editingRule.clickPostponeConfig?.maxClicksWithoutResponse || 3;
                          if (curr < 10) {
                            setEditingRule({
                              ...editingRule,
                              clickPostponeConfig: {
                                ...(editingRule.clickPostponeConfig || {
                                  postponeHours: 3.0,
                                  actionOnTrigger: "postpone_and_notify_agent",
                                }),
                                maxClicksWithoutResponse: curr + 1,
                              },
                            });
                          }
                        }}
                        className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center justify-center font-bold cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Stepper 2: Postpone Hours */}
                  <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-rose-100 dark:border-rose-900/40 space-y-1.5 shadow-2xs">
                    <label className="text-[10px] font-semibold text-slate-600 dark:text-slate-400 block">
                      Postpone / Cooldown Duration
                    </label>
                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={() => {
                          const curr = editingRule.clickPostponeConfig?.postponeHours || 3.0;
                          if (curr > 1.0) {
                            setEditingRule({
                              ...editingRule,
                              clickPostponeConfig: {
                                ...(editingRule.clickPostponeConfig || {
                                  maxClicksWithoutResponse: 3,
                                  actionOnTrigger: "postpone_and_notify_agent",
                                }),
                                postponeHours: curr - 1.0,
                              },
                            });
                          }
                        }}
                        className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center justify-center font-bold cursor-pointer"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>

                      <span className="flex-1 text-center font-bold font-mono text-sm text-slate-900 dark:text-white">
                        {editingRule.clickPostponeConfig?.postponeHours || 3.0} hours
                      </span>

                      <button
                        type="button"
                        onClick={() => {
                          const curr = editingRule.clickPostponeConfig?.postponeHours || 3.0;
                          if (curr < 72.0) {
                            setEditingRule({
                              ...editingRule,
                              clickPostponeConfig: {
                                ...(editingRule.clickPostponeConfig || {
                                  maxClicksWithoutResponse: 3,
                                  actionOnTrigger: "postpone_and_notify_agent",
                                }),
                                postponeHours: curr + 1.0,
                              },
                            });
                          }
                        }}
                        className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center justify-center font-bold cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Friendly Behavior Summary */}
                <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed bg-white/70 dark:bg-slate-900/70 p-2.5 rounded-xl border border-rose-100 dark:border-rose-900/30">
                  💡 <strong>Rule Behavior:</strong> If a customer taps template buttons{" "}
                  <strong>{editingRule.clickPostponeConfig?.maxClicksWithoutResponse || 3} times</strong> consecutively without typing any reply, automated responses will pause for{" "}
                  <strong>{editingRule.clickPostponeConfig?.postponeHours || 3.0} hours</strong> and notify human staff.
                </p>
              </div>
            )}

            {/* Dynamic Condition Block 4: Catch-All Fallback */}
            {editingRule.triggerType === "DEFAULT_FALLBACK" && (
              <div className="space-y-3 p-4 rounded-2xl bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/40 text-xs">
                <div className="flex items-center space-x-2">
                  <span className="text-sm">🌐</span>
                  <span className="font-bold text-emerald-900 dark:text-emerald-200">
                    Catch-All Fallback Safety Net
                  </span>
                </div>
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-xs">
                  This rule automatically fires when an incoming customer message does not match any specific Keyword or Attachment rule above.
                </p>
                <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-emerald-200/80 dark:border-emerald-800/80 text-[11px] text-emerald-800 dark:text-emerald-300">
                  ℹ️ <strong>Silence Behavior:</strong> If no Catch-All rule is active, the bot will <strong>stay completely silent</strong> and not reply to unmatched customer messages.
                </div>
              </div>
            )}

            {/* Field 3: Target Dispatch Template */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center justify-between">
                <span>Action: Dispatch JSON Template</span>
                <span className="text-[10px] text-blue-600 dark:text-blue-400">
                  {templates.find((t) => t.id === editingRule.targetTemplateId)?.format}
                </span>
              </label>
              <select
                value={editingRule.targetTemplateId}
                onChange={(e) => setEditingRule({ ...editingRule, targetTemplateId: e.target.value })}
                className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-amber-500 font-medium"
              >
                {templates.map((tmpl) => (
                  <option key={tmpl.id} value={tmpl.id}>
                    {tmpl.name} ({tmpl.format})
                  </option>
                ))}
              </select>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end space-x-2.5 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsRuleModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveRule}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-xs font-bold transition shadow-xs cursor-pointer active:scale-95"
              >
                Save Rule
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
