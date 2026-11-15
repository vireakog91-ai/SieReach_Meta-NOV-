"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Braces,
  Code2,
  Copy,
  Check,
  Save,
  Sparkles,
  Smartphone,
  ExternalLink,
  Phone,
  ShoppingBag,
  Camera,
  Image as ImageIcon,
  Mic,
  Smile,
  ThumbsUp,
  AlertCircle,
  CheckCircle2,
  Trash2,
  Plus,
  RefreshCw,
  Layers,
  FileJson,
  Eye,
  SlidersHorizontal,
  ChevronRight,
  ChevronLeft,
  Play,
  Pause,
  Volume2,
  Wand2,
  HelpCircle,
  MessageSquare,
  Link2,
  Square,
  RotateCcw,
  UploadCloud,
  Download,
  Loader2,
  Radio,
} from "lucide-react";

interface JsonBuilderTabProps {
  pages?: Array<{ pageId: string; name: string; businessName?: string; avatarUrl?: string }>;
  activeBusiness?: string;
  initialJsonPayload?: string;
  initialTemplateName?: string;
  onPayloadSave?: (json: string, name: string) => Promise<void> | void;
}

export interface SmartButton {
  id: string;
  type: "web_url" | "postback" | "phone_number";
  title: string;
  url?: string;
  payload?: string;
}

export interface SmartQuickReply {
  id: string;
  title: string;
  payload: string;
}

export interface SmartTemplateState {
  format: "button" | "generic_card" | "voice_note" | "quick_replies" | "image_text";
  text: string;
  cardTitle: string;
  cardSubtitle: string;
  cardImageUrl: string;
  audioUrl: string;
  audioDurationSec: number;
  audioName?: string;
  imageUrl: string;
  buttons: SmartButton[];
  quickReplies: SmartQuickReply[];
}

// Preset Meta Messenger Send API JSON Payloads (for Standard Mode)
export const PRESET_TEMPLATES: Record<
  string,
  { name: string; description: string; json: string }
> = {
  button_template: {
    name: "JSON 07/10/2026",
    description: "Meta Button Template (Web URL & Postback)",
    json: JSON.stringify(
      {
        message: {
          attachment: {
            type: "template",
            payload: {
              template_type: "button",
              text: "Hi! Please let us know how we can help you",
              buttons: [
                {
                  type: "web_url",
                  url: "https://www.example.com/",
                  title: "Show me the product!",
                },
                {
                  type: "postback",
                  title: "Tell me more",
                  payload: "USER_DEFINED_PAYLOAD",
                },
              ],
            },
          },
        },
      },
      null,
      2
    ),
  },
  generic_card: {
    name: "Product Showcase Card",
    description: "Rich card with image, title, subtitle & action buttons",
    json: JSON.stringify(
      {
        message: {
          attachment: {
            type: "template",
            payload: {
              template_type: "generic",
              elements: [
                {
                  title: "Premium Heavyweight Cotton Hoodie (40% OFF)",
                  image_url:
                    "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=800&auto=format&fit=crop&q=80",
                  subtitle: "Fast-action promo: only 15 units left in stock today.",
                  buttons: [
                    {
                      type: "web_url",
                      url: "https://sielab.shop/hoodie",
                      title: "Order Online",
                    },
                    {
                      type: "postback",
                      title: "Check Sizes",
                      payload: "CHECK_SIZES",
                    },
                  ],
                },
              ],
            },
          },
        },
      },
      null,
      2
    ),
  },
  voice_memo: {
    name: "VIP Welcome Voice Note",
    description: "Native playable audio voice message in Messenger",
    json: JSON.stringify(
      {
        message: {
          attachment: {
            type: "audio",
            payload: {
              url: "https://actions.google.com/sounds/v1/ambiences/coffee_shop.ogg",
              is_reusable: true,
            },
          },
        },
      },
      null,
      2
    ),
  },
  quick_replies: {
    name: "Quick Replies Icebreaker",
    description: "Text message with interactive tap chips",
    json: JSON.stringify(
      {
        message: {
          text: "Hi! Welcome to our store. What are you looking for today?",
          quick_replies: [
            {
              content_type: "text",
              title: "🔥 View Best Sellers",
              payload: "VIEW_BEST_SELLERS",
            },
            {
              content_type: "text",
              title: "🏷️ 20% Discount Code",
              payload: "CLAIM_DISCOUNT",
            },
            {
              content_type: "text",
              title: "💬 Chat with Human",
              payload: "TALK_TO_AGENT",
            },
          ],
        },
      },
      null,
      2
    ),
  },
  call_button: {
    name: "Call Concierge & Booking",
    description: "Button template with direct phone call & web link",
    json: JSON.stringify(
      {
        message: {
          attachment: {
            type: "template",
            payload: {
              template_type: "button",
              text: "Would you like to reserve a VIP table for brunch or dinner? Call us directly or book online:",
              buttons: [
                {
                  type: "phone_number",
                  title: "📞 Call VIP Line",
                  payload: "+85512888999",
                },
                {
                  type: "web_url",
                  url: "https://moewcafe.com/book",
                  title: "Book Online",
                },
              ],
            },
          },
        },
      },
      null,
      2
    ),
  },
};

// Helper: Compile Smart Visual State to Meta Send API JSON
function compileSmartStateToJson(state: SmartTemplateState): any {
  if (state.format === "voice_note") {
    return {
      message: {
        attachment: {
          type: "audio",
          payload: {
            url: state.audioUrl || "https://actions.google.com/sounds/v1/ambiences/coffee_shop.ogg",
            is_reusable: true,
          },
        },
      },
    };
  }

  if (state.format === "image_text") {
    return {
      message: {
        attachment: {
          type: "image",
          payload: {
            url: state.imageUrl || "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=800&auto=format&fit=crop&q=80",
            is_reusable: true,
          },
        },
      },
    };
  }

  if (state.format === "generic_card") {
    return {
      message: {
        attachment: {
          type: "template",
          payload: {
            template_type: "generic",
            elements: [
              {
                title: state.cardTitle || "Featured Product Promo",
                image_url:
                  state.cardImageUrl ||
                  "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=800&auto=format&fit=crop&q=80",
                subtitle: state.cardSubtitle || "",
                buttons: state.buttons.slice(0, 3).map((b) => {
                  if (b.type === "web_url") {
                    return {
                      type: "web_url",
                      url: b.url || "https://sielab.shop",
                      title: b.title || "Learn More",
                    };
                  }
                  if (b.type === "phone_number") {
                    return {
                      type: "phone_number",
                      title: b.title || "Call Us",
                      payload: b.payload || "+85512888999",
                    };
                  }
                  return {
                    type: "postback",
                    title: b.title || "Select Option",
                    payload: b.payload || "USER_ACTION",
                  };
                }),
              },
            ],
          },
        },
      },
    };
  }

  if (state.format === "quick_replies") {
    return {
      message: {
        text: state.text || "Hi! How can we assist you today?",
        quick_replies: state.quickReplies.map((qr) => ({
          content_type: "text",
          title: qr.title || "Option",
          payload: qr.payload || qr.title || "OPTION",
        })),
      },
    };
  }

  // Default: Button Template
  return {
    message: {
      attachment: {
        type: "template",
        payload: {
          template_type: "button",
          text: state.text || "Hi! Please let us know how we can help you",
          buttons: state.buttons.slice(0, 3).map((b) => {
            if (b.type === "web_url") {
              return {
                type: "web_url",
                url: b.url || "https://sielab.shop",
                title: b.title || "Learn More",
              };
            }
            if (b.type === "phone_number") {
              return {
                type: "phone_number",
                title: b.title || "Call Us",
                payload: b.payload || "+85512888999",
              };
            }
            return {
              type: "postback",
              title: b.title || "Select Option",
              payload: b.payload || "USER_ACTION",
            };
          }),
        },
      },
    },
  };
}

// Helper: Decompile JSON into Smart Visual State
function decompileJsonToSmartState(jsonObj: any): Partial<SmartTemplateState> | null {
  try {
    if (!jsonObj?.message) return null;
    const msg = jsonObj.message;

    // 1. Audio Voice Note
    if (msg.attachment?.type === "audio") {
      return {
        format: "voice_note",
        audioUrl: msg.attachment.payload?.url || "",
        audioDurationSec: 24,
      };
    }

    // 2. Image
    if (msg.attachment?.type === "image") {
      return {
        format: "image_text",
        imageUrl: msg.attachment.payload?.url || "",
      };
    }

    // 3. Generic Template (Card)
    if (msg.attachment?.payload?.template_type === "generic") {
      const el = msg.attachment.payload.elements?.[0] || {};
      const btns: SmartButton[] = (el.buttons || []).map((b: any, idx: number) => ({
        id: `btn-${idx}`,
        type: b.type === "phone_number" ? "phone_number" : b.type === "postback" ? "postback" : "web_url",
        title: b.title || "",
        url: b.url || "",
        payload: b.payload || "",
      }));
      return {
        format: "generic_card",
        cardTitle: el.title || "",
        cardSubtitle: el.subtitle || "",
        cardImageUrl: el.image_url || "",
        buttons: btns,
      };
    }

    // 4. Button Template
    if (msg.attachment?.payload?.template_type === "button") {
      const btns: SmartButton[] = (msg.attachment.payload.buttons || []).map((b: any, idx: number) => ({
        id: `btn-${idx}`,
        type: b.type === "phone_number" ? "phone_number" : b.type === "postback" ? "postback" : "web_url",
        title: b.title || "",
        url: b.url || "",
        payload: b.payload || "",
      }));
      return {
        format: "button",
        text: msg.attachment.payload.text || "",
        buttons: btns,
      };
    }

    // 5. Quick Replies
    if (msg.quick_replies && Array.isArray(msg.quick_replies)) {
      const qrs: SmartQuickReply[] = msg.quick_replies.map((q: any, idx: number) => ({
        id: `qr-${idx}`,
        title: q.title || "",
        payload: q.payload || "",
      }));
      return {
        format: "quick_replies",
        text: msg.text || "",
        quickReplies: qrs,
      };
    }

    // 6. Plain Text
    if (msg.text) {
      return {
        format: "button",
        text: msg.text,
        buttons: [],
      };
    }
  } catch {}
  return null;
}

export function JsonBuilderTab({
  pages = [],
  activeBusiness = "ALL",
  initialJsonPayload,
  initialTemplateName,
  onPayloadSave,
}: JsonBuilderTabProps) {
  // Mode: "smart" (No-code visual block builder) vs "standard" (Raw JSON Meta Ads Editor)
  const [activeMode, setActiveMode] = useState<"smart" | "standard">("smart");

  // Selected Preset
  const [selectedPreset, setSelectedPreset] = useState<string>("button_template");

  // Raw JSON state
  const [rawJson, setRawJson] = useState<string>(
    initialJsonPayload || PRESET_TEMPLATES.button_template.json
  );
  const [templateName, setTemplateName] = useState<string>(
    initialTemplateName || "JSON 07/10/2026"
  );

  // Synchronize if initialJsonPayload or initialTemplateName changes from parent
  useEffect(() => {
    if (initialJsonPayload) {
      setRawJson(initialJsonPayload);
      if (initialTemplateName) setTemplateName(initialTemplateName);
      try {
        const parsed = JSON.parse(initialJsonPayload);
        const decompiled = decompileJsonToSmartState(parsed);
        if (decompiled) {
          setSmartState((prev) => ({ ...prev, ...decompiled }));
        }
      } catch {}
    }
  }, [initialJsonPayload, initialTemplateName]);

  // Smart Visual Builder State
  const [smartState, setSmartState] = useState<SmartTemplateState>({
    format: "button",
    text: "Hi! Please let us know how we can help you",
    cardTitle: "Premium Heavyweight Cotton Hoodie (40% OFF)",
    cardSubtitle: "Fast-action promo: only 15 units left in stock today.",
    cardImageUrl: "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=800&auto=format&fit=crop&q=80",
    audioUrl: "https://actions.google.com/sounds/v1/ambiences/coffee_shop.ogg",
    audioDurationSec: 24,
    audioName: "Sample Audio Note",
    imageUrl: "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=800&auto=format&fit=crop&q=80",
    buttons: [
      {
        id: "btn-1",
        type: "web_url",
        title: "Show me product!",
        url: "https://www.example.com/",
      },
      {
        id: "btn-2",
        type: "postback",
        title: "Tell me more",
        payload: "USER_DEFINED_PAYLOAD",
      },
    ],
    quickReplies: [
      { id: "qr-1", title: "🔥 Best Sellers", payload: "BEST_SELLERS" },
      { id: "qr-2", title: "🏷️ 20% Discount", payload: "DISCOUNT" },
      { id: "qr-3", title: "💬 Chat Agent", payload: "AGENT" },
    ],
  });

  // Selected preview page brand
  const [selectedPageId, setSelectedPageId] = useState<string>(
    pages[0]?.pageId || "default_page"
  );

  // Copy status feedback
  const [copied, setCopied] = useState<boolean>(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved">("idle");

  // =====================================================================
  // DIRECT IN-BROWSER VOICE RECORDING SYSTEM (MediaRecorder API)
  // =====================================================================
  const [recordingState, setRecordingState] = useState<"idle" | "recording" | "recorded" | "uploading">("idle");
  const [recordingSeconds, setRecordingSeconds] = useState<number>(0);
  const [recordingError, setRecordingError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<any>(null);
  const recordingStartTimeRef = useRef<number>(0);

  // File upload input ref
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Clean up audio stream on unmount
  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // Start live microphone recording
  const startDirectRecording = async () => {
    setRecordingError(null);
    audioChunksRef.current = [];
    setRecordingSeconds(0);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Microphone access is not supported by your browser.");
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStreamRef.current = stream;

      // Select supported mimeType
      let mimeType = "audio/webm";
      if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
        mimeType = "audio/webm;codecs=opus";
      } else if (MediaRecorder.isTypeSupported("audio/mp4")) {
        mimeType = "audio/mp4";
      } else if (MediaRecorder.isTypeSupported("audio/ogg")) {
        mimeType = "audio/ogg";
      }

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = handleRecordingStopped;

      recordingStartTimeRef.current = Date.now();
      recorder.start(250); // collect chunks every 250ms
      setRecordingState("recording");

      recordingTimerRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - recordingStartTimeRef.current) / 1000);
        setRecordingSeconds(elapsed);
        if (elapsed >= 60) {
          // Automatically stop at 60s (Meta Messenger recommended voice memo duration)
          stopDirectRecording();
        }
      }, 500);
    } catch (err: any) {
      console.error("Microphone access error:", err);
      setRecordingError(err?.message || "Could not access microphone. Please check browser permissions.");
      setRecordingState("idle");
    }
  };

  // Stop recording and process audio
  const stopDirectRecording = () => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
    }

    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach((track) => track.stop());
      audioStreamRef.current = null;
    }
  };

  // Cancel/Discard recording
  const cancelDirectRecording = () => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
    }

    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach((track) => track.stop());
      audioStreamRef.current = null;
    }

    audioChunksRef.current = [];
    setRecordingSeconds(0);
    setRecordingState("idle");
  };

  // Process completed recording
  const handleRecordingStopped = async () => {
    const duration = Math.max(1, recordingSeconds || Math.round((Date.now() - recordingStartTimeRef.current) / 1000));
    const mime = mediaRecorderRef.current?.mimeType || "audio/webm";
    const audioBlob = new Blob(audioChunksRef.current, { type: mime });

    // 1. Generate local blob URL for instant zero-latency playback
    const localBlobUrl = URL.createObjectURL(audioBlob);

    // Update state immediately with local URL so preview works right away
    updateSmartState((prev) => ({
      ...prev,
      format: "voice_note",
      audioUrl: localBlobUrl,
      audioDurationSec: duration,
      audioName: `Voice Note (${duration}s)`,
    }));

    setRecordingState("uploading");

    // 2. Upload to backend `/api/upload` to persist the audio file
    try {
      const ext = mime.includes("mp4") ? "m4a" : mime.includes("ogg") ? "ogg" : "webm";
      const fileName = `voice_memo_${Date.now()}.${ext}`;
      const file = new File([audioBlob], fileName, { type: mime });

      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (data.success && data.url) {
        // Update to permanent endpoint URL
        updateSmartState((prev) => ({
          ...prev,
          audioUrl: data.url,
          audioName: `Voice Note (${duration}s)`,
        }));
      }
    } catch (uploadErr) {
      console.warn("Could not save to server storage, using local blob audio URL:", uploadErr);
    } finally {
      setRecordingState("recorded");
    }
  };

  // Handle Audio File Upload from Computer
  const handleAudioFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setRecordingState("uploading");
    setRecordingError(null);

    try {
      const localUrl = URL.createObjectURL(file);

      // Estimate duration with Audio object
      const tempAudio = new Audio(localUrl);
      tempAudio.addEventListener("loadedmetadata", () => {
        const sec = Math.round(tempAudio.duration) || 20;
        updateSmartState((prev) => ({
          ...prev,
          audioDurationSec: sec,
        }));
      });

      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      const finalUrl = data.success && data.url ? data.url : localUrl;

      updateSmartState((prev) => ({
        ...prev,
        format: "voice_note",
        audioUrl: finalUrl,
        audioName: file.name,
      }));

      setRecordingState("recorded");
    } catch (err: any) {
      console.error("Audio file upload error:", err);
      setRecordingError("Failed to upload audio file.");
      setRecordingState("idle");
    }
  };

  // =====================================================================
  // REAL AUDIO PLAYBACK IN LIVE PHONE PREVIEW
  // =====================================================================
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [audioPlaybackSec, setAudioPlaybackSec] = useState(0);
  const previewAudioElementRef = useRef<HTMLAudioElement | null>(null);

  // Toggle live audio playback
  const handleTogglePreviewAudio = () => {
    if (!smartState.audioUrl) return;

    // If currently playing, pause it
    if (isPlayingAudio && previewAudioElementRef.current) {
      previewAudioElementRef.current.pause();
      setIsPlayingAudio(false);
      return;
    }

    // Stop existing audio if any
    if (previewAudioElementRef.current) {
      previewAudioElementRef.current.pause();
      previewAudioElementRef.current = null;
    }

    try {
      const audio = new Audio(smartState.audioUrl);
      previewAudioElementRef.current = audio;

      audio.ontimeupdate = () => {
        setAudioPlaybackSec(Math.floor(audio.currentTime));
      };

      audio.onended = () => {
        setIsPlayingAudio(false);
        setAudioPlaybackSec(0);
      };

      audio.onerror = (e) => {
        console.warn("Audio playback simulation notice:", e);
        // Fallback simulation timer if remote audio fails CORS
        simulateAudioTimer();
      };

      audio.play().then(() => {
        setIsPlayingAudio(true);
      }).catch((playErr) => {
        console.info("Direct audio.play() prevented, falling back to simulated timer:", playErr);
        simulateAudioTimer();
      });
    } catch {
      simulateAudioTimer();
    }
  };

  // Fallback visual timer simulation if browser blocks auto-audio or CORS
  const simulateAudioTimer = () => {
    setIsPlayingAudio(true);
    let sec = 0;
    const interval = setInterval(() => {
      sec += 1;
      setAudioPlaybackSec(sec);
      if (sec >= smartState.audioDurationSec) {
        clearInterval(interval);
        setIsPlayingAudio(false);
        setAudioPlaybackSec(0);
      }
    }, 1000);
  };

  // Simulated interactive chat thread inside preview
  const [simulatedReplies, setSimulatedReplies] = useState<
    Array<{ text: string; from: "user" | "bot"; time: string }>
  >([]);

  // Synchronize Smart State to Raw JSON whenever in "smart" mode
  const updateSmartState = (updater: (prev: SmartTemplateState) => SmartTemplateState) => {
    setSmartState((prev) => {
      const next = updater(prev);
      const compiled = compileSmartStateToJson(next);
      setRawJson(JSON.stringify(compiled, null, 2));
      return next;
    });
  };

  // When switching from Standard to Smart, attempt to decompile raw JSON into visual fields
  const handleSwitchToSmart = () => {
    try {
      const parsed = JSON.parse(rawJson);
      const decompiled = decompileJsonToSmartState(parsed);
      if (decompiled) {
        setSmartState((prev) => ({ ...prev, ...decompiled }));
      }
    } catch {}
    setActiveMode("smart");
  };

  // When switching from Smart to Standard, compile smart state to JSON
  const handleSwitchToStandard = () => {
    const compiled = compileSmartStateToJson(smartState);
    setRawJson(JSON.stringify(compiled, null, 2));
    setActiveMode("standard");
  };

  // Parse JSON & validation state
  const { parsedJson, jsonError, validationWarnings } = useMemo(() => {
    let parsed: any = null;
    let err: string | null = null;
    const warnings: string[] = [];

    try {
      parsed = JSON.parse(rawJson);

      // Meta Send API validation checks
      if (!parsed.message) {
        warnings.push("Missing top-level 'message' object.");
      } else {
        const msg = parsed.message;
        if (msg.attachment?.payload?.template_type === "button") {
          const buttons = msg.attachment.payload.buttons || [];
          if (buttons.length > 3) {
            warnings.push("Meta limits Button Templates to a maximum of 3 buttons.");
          }
          buttons.forEach((b: any, idx: number) => {
            if (b.title && b.title.length > 20) {
              warnings.push(`Button #${idx + 1} title exceeds Meta's 20-character limit (${b.title.length} chars).`);
            }
            if (b.type === "web_url" && b.url && !b.url.startsWith("http")) {
              warnings.push(`Button #${idx + 1} URL must start with http:// or https://`);
            }
          });
        }

        if (msg.quick_replies && msg.quick_replies.length > 13) {
          warnings.push("Meta limits Quick Replies to a maximum of 13 chips.");
        }
      }
    } catch (e: any) {
      err = e.message || "Invalid JSON syntax";
    }

    return { parsedJson: parsed, jsonError: err, validationWarnings: warnings };
  }, [rawJson]);

  // Selected preview page info
  const previewPage = useMemo(() => {
    const found = pages.find((p) => p.pageId === selectedPageId);
    if (found) return found;
    return {
      name: "SDP Fertilizer",
      avatarUrl: "https://images.unsplash.com/photo-1557804506-669a67965ba0?w=120&auto=format&fit=crop&q=80",
      businessName: "AgriTech Business",
    };
  }, [pages, selectedPageId]);

  // Load Preset
  const handleSelectPreset = (key: string) => {
    const preset = PRESET_TEMPLATES[key];
    if (preset) {
      setSelectedPreset(key);
      setRawJson(preset.json);
      setTemplateName(preset.name);
      setSimulatedReplies([]);
      setIsPlayingAudio(false);
      setAudioPlaybackSec(0);

      try {
        const parsed = JSON.parse(preset.json);
        const decompiled = decompileJsonToSmartState(parsed);
        if (decompiled) {
          setSmartState((prev) => ({ ...prev, ...decompiled }));
        }
      } catch {}
    }
  };

  // Prettify / Format JSON
  const handleFormatJson = () => {
    try {
      const obj = JSON.parse(rawJson);
      setRawJson(JSON.stringify(obj, null, 2));
    } catch {}
  };

  // Copy JSON to Clipboard
  const handleCopyJson = () => {
    navigator.clipboard.writeText(rawJson);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // Save Template
  const handleSaveTemplate = async () => {
    if (onPayloadSave) {
      await onPayloadSave(rawJson, templateName);
    }
    setSaveStatus("saved");
    setTimeout(() => setSaveStatus("idle"), 3000);
  };

  // Handle Button Click inside preview
  const handlePreviewButtonClick = (button: any) => {
    const timeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    if (button.type === "web_url") {
      setSimulatedReplies((prev) => [
        ...prev,
        { text: `🔗 Opened Link: ${button.url}`, from: "user", time: timeStr },
      ]);
    } else if (button.type === "postback") {
      setSimulatedReplies((prev) => [
        ...prev,
        { text: button.title, from: "user", time: timeStr },
        {
          text: `Simulated Bot Response to: "${button.payload || button.title}"`,
          from: "bot",
          time: timeStr,
        },
      ]);
    } else if (button.type === "phone_number") {
      setSimulatedReplies((prev) => [
        ...prev,
        { text: `📞 Call Dialed: ${button.payload}`, from: "user", time: timeStr },
      ]);
    }
  };

  const handleQuickReplyClick = (qr: any) => {
    const timeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    setSimulatedReplies((prev) => [
      ...prev,
      { text: qr.title, from: "user", time: timeStr },
      { text: `Bot recognized response: "${qr.payload || qr.title}"!`, from: "bot", time: timeStr },
    ]);
  };

  // Button management in Smart mode
  const handleAddButton = () => {
    if (smartState.buttons.length >= 3) return;
    updateSmartState((prev) => ({
      ...prev,
      buttons: [
        ...prev.buttons,
        {
          id: `btn-${Date.now()}`,
          type: "web_url",
          title: "New Action",
          url: "https://sielab.shop",
        },
      ],
    }));
  };

  const handleUpdateButton = (id: string, updates: Partial<SmartButton>) => {
    updateSmartState((prev) => ({
      ...prev,
      buttons: prev.buttons.map((b) => (b.id === id ? { ...b, ...updates } : b)),
    }));
  };

  const handleRemoveButton = (id: string) => {
    updateSmartState((prev) => ({
      ...prev,
      buttons: prev.buttons.filter((b) => b.id !== id),
    }));
  };

  // Quick Reply management
  const handleAddQuickReply = () => {
    if (smartState.quickReplies.length >= 10) return;
    updateSmartState((prev) => ({
      ...prev,
      quickReplies: [
        ...prev.quickReplies,
        {
          id: `qr-${Date.now()}`,
          title: "💬 New Option",
          payload: `OPTION_${Date.now()}`,
        },
      ],
    }));
  };

  const handleUpdateQuickReply = (id: string, title: string) => {
    updateSmartState((prev) => ({
      ...prev,
      quickReplies: prev.quickReplies.map((q) =>
        q.id === id ? { ...q, title, payload: title.toUpperCase().replace(/\s+/g, "_") } : q
      ),
    }));
  };

  const handleRemoveQuickReply = (id: string) => {
    updateSmartState((prev) => ({
      ...prev,
      quickReplies: prev.quickReplies.filter((q) => q.id !== id),
    }));
  };

  // Quick AI Assistant Presets
  const applySmartPreset = (type: "ecommerce" | "restaurant" | "voice" | "support") => {
    if (type === "ecommerce") {
      updateSmartState((prev) => ({
        ...prev,
        format: "generic_card",
        cardTitle: "Flash Sale: 40% OFF Signature Hoodie",
        cardSubtitle: "Limited stock available. Free delivery in Phnom Penh.",
        cardImageUrl: "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=800&auto=format&fit=crop&q=80",
        buttons: [
          { id: "btn-1", type: "web_url", title: "Order Now (40% OFF)", url: "https://sielab.shop/hoodie" },
          { id: "btn-2", type: "postback", title: "Check Available Sizes", payload: "CHECK_SIZES" },
        ],
      }));
      setTemplateName("E-Commerce Flash Sale");
    } else if (type === "restaurant") {
      updateSmartState((prev) => ({
        ...prev,
        format: "button",
        text: "Welcome to Moew Cafe! Would you like to reserve a VIP table or order takeout today?",
        buttons: [
          { id: "btn-1", type: "phone_number", title: "📞 Reserve VIP Table", payload: "+85512888999" },
          { id: "btn-2", type: "web_url", title: "View Today's Menu", url: "https://moewcafe.com/menu" },
        ],
      }));
      setTemplateName("VIP Table Reservation");
    } else if (type === "voice") {
      updateSmartState((prev) => ({
        ...prev,
        format: "voice_note",
        audioUrl: "https://actions.google.com/sounds/v1/ambiences/coffee_shop.ogg",
        audioDurationSec: 18,
        audioName: "Founder Welcome Memo",
      }));
      setTemplateName("Founder Welcome Voice Note");
    } else if (type === "support") {
      updateSmartState((prev) => ({
        ...prev,
        format: "quick_replies",
        text: "Hi there! Thanks for reaching out. How can our team assist you right now?",
        quickReplies: [
          { id: "qr-1", title: "💬 Talk to Human Agent", payload: "AGENT" },
          { id: "qr-2", title: "📍 Store Location", payload: "LOCATION" },
          { id: "qr-3", title: "📦 Order Status Tracking", payload: "TRACKING" },
        ],
      }));
      setTemplateName("Customer Support Icebreaker");
    }
  };

  // Extract preview payload components
  const messageData = parsedJson?.message;
  const attachment = messageData?.attachment;
  const payload = attachment?.payload;
  const templateType = payload?.template_type;
  const isAudioMessage = attachment?.type === "audio";
  const isImageMessage = attachment?.type === "image";
  const quickReplies = messageData?.quick_replies;

  return (
    <div className="space-y-4">
      {/* Top Header / Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 sm:p-4 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Left: Branding & Subtitle */}
          <div className="flex items-center space-x-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 flex items-center justify-center font-bold shrink-0">
              {activeMode === "smart" ? <Sparkles className="w-5 h-5" /> : <Braces className="w-5 h-5" />}
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-2">
                <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate">
                  Meta Messenger Builder
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/30 font-bold uppercase tracking-wider shrink-0">
                  Ad Spec
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                Build no-code visual blocks, live direct voice notes, or raw JSON for Meta Ads.
              </p>
            </div>
          </div>

          {/* Right: Mode Selector & Action Toolbar (Single Crisp Row) */}
          <div className="flex items-center gap-2 shrink-0 flex-wrap sm:flex-nowrap">
            {/* Smart vs Standard Mode Switcher */}
            <div className="p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700/60 flex items-center shrink-0 shadow-2xs">
              <button
                type="button"
                onClick={handleSwitchToSmart}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  activeMode === "smart"
                    ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-2xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                <span>Smart (No-Code)</span>
              </button>
              <button
                type="button"
                onClick={handleSwitchToStandard}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  activeMode === "standard"
                    ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-2xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                }`}
              >
                <Code2 className="w-3.5 h-3.5 text-slate-500" />
                <span>Standard (JSON)</span>
              </button>
            </div>

            {/* Page Preview Switcher with Truncated Name */}
            {pages.length > 0 && (
              <div className="flex items-center space-x-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-2.5 py-1.5 text-xs shrink-0 max-w-[150px] sm:max-w-[190px]">
                <Layers className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <select
                  value={selectedPageId}
                  onChange={(e) => setSelectedPageId(e.target.value)}
                  className="bg-transparent text-slate-800 dark:text-slate-200 font-medium focus:outline-none cursor-pointer truncate w-full pr-1"
                  title="Select Page Preview"
                >
                  {pages.map((p) => (
                    <option key={p.pageId} value={p.pageId}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Copy Button (Clean, Non-wrapping Solid Blue Pill) */}
            <button
              onClick={handleCopyJson}
              className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition cursor-pointer shadow-xs shrink-0 whitespace-nowrap active:scale-95"
              title="Copy clean JSON payload for Meta Ads Manager"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-200" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Meta JSON</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Main Two-Panel Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column: Smart Visual Builder OR Standard JSON Editor (7 cols) */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
          {/* ========================================================= */}
          {/* MODE 1: SMART VISUAL BUILDER (No JSON knowledge required) */}
          {/* ========================================================= */}
          {activeMode === "smart" && (
            <div className="space-y-4">
              {/* Format Switcher Pills */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center justify-between">
                  <span>Message Format</span>
                  <span className="text-[11px] text-blue-600 dark:text-blue-400 font-normal">
                    Auto-compiles to Meta Send API
                  </span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                  {[
                    { id: "button", label: "Button Card", icon: MessageSquare, desc: "Text & CTAs" },
                    { id: "generic_card", label: "Product Card", icon: ShoppingBag, desc: "Image & Links" },
                    { id: "voice_note", label: "Voice Note", icon: Mic, desc: "Live Recording" },
                    { id: "image_text", label: "Image Flyer", icon: ImageIcon, desc: "Banner Media" },
                    { id: "quick_replies", label: "Quick Chips", icon: Sparkles, desc: "Icebreaker Chips" },
                  ].map((fmt) => {
                    const Icon = fmt.icon;
                    const isSelected = smartState.format === fmt.id;
                    return (
                      <button
                        key={fmt.id}
                        type="button"
                        onClick={() => updateSmartState((prev) => ({ ...prev, format: fmt.id as any }))}
                        className={`p-2.5 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? "bg-blue-50 border-blue-500 text-blue-700 dark:bg-blue-950/40 dark:border-blue-500/80 dark:text-blue-300 font-bold shadow-2xs"
                            : "bg-slate-50 border-slate-200 text-slate-700 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-300 hover:border-slate-300"
                        }`}
                      >
                        <Icon className={`w-4 h-4 mb-1.5 ${isSelected ? "text-blue-600 dark:text-blue-400" : "text-slate-400"}`} />
                        <span className="text-xs leading-none">{fmt.label}</span>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 font-normal mt-0.5">{fmt.desc}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Fast AI Assist Hooks */}
              <div className="bg-gradient-to-r from-blue-50/60 to-indigo-50/60 dark:from-blue-950/20 dark:to-indigo-950/20 p-3 rounded-xl border border-blue-100 dark:border-blue-900/40 space-y-1.5">
                <div className="flex items-center space-x-1.5 text-xs font-bold text-blue-900 dark:text-blue-200">
                  <Wand2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  <span>Instant High-Converting Campaign Templates:</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => applySmartPreset("ecommerce")}
                    className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:text-blue-600 text-[11px] font-medium transition cursor-pointer shadow-2xs"
                  >
                    🛍️ 40% Off Product Promo
                  </button>
                  <button
                    type="button"
                    onClick={() => applySmartPreset("restaurant")}
                    className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:text-blue-600 text-[11px] font-medium transition cursor-pointer shadow-2xs"
                  >
                    ☕ VIP Table Booking
                  </button>
                  <button
                    type="button"
                    onClick={() => applySmartPreset("voice")}
                    className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:text-blue-600 text-[11px] font-medium transition cursor-pointer shadow-2xs"
                  >
                    🎙️ Founder Voice Note
                  </button>
                  <button
                    type="button"
                    onClick={() => applySmartPreset("support")}
                    className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:text-blue-600 text-[11px] font-medium transition cursor-pointer shadow-2xs"
                  >
                    💬 Support Icebreaker
                  </button>
                </div>
              </div>

              {/* 1. TEXT / GREETING FIELD (For Button, Quick Replies) */}
              {(smartState.format === "button" || smartState.format === "quick_replies") && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      Message Greeting Text
                    </label>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {smartState.text.length}/640
                    </span>
                  </div>
                  <textarea
                    rows={3}
                    value={smartState.text}
                    onChange={(e) => updateSmartState((prev) => ({ ...prev, text: e.target.value }))}
                    className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 leading-relaxed"
                    placeholder="Enter the automated greeting your leads see when clicking your Meta ad..."
                  />
                  <div className="flex items-center space-x-1.5 text-[11px] text-slate-500">
                    <span>Personalize:</span>
                    <button
                      type="button"
                      onClick={() => updateSmartState((prev) => ({ ...prev, text: prev.text + " {{first_name}}" }))}
                      className="px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 text-[10px] cursor-pointer"
                    >
                      + First Name
                    </button>
                    <button
                      type="button"
                      onClick={() => updateSmartState((prev) => ({ ...prev, text: prev.text + " {{business_name}}" }))}
                      className="px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 text-[10px] cursor-pointer"
                    >
                      + Business Name
                    </button>
                  </div>
                </div>
              )}

              {/* 2. PRODUCT CARD FIELDS (Generic Template) */}
              {smartState.format === "generic_card" && (
                <div className="space-y-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                  <div className="flex items-center space-x-2 text-xs font-bold text-slate-900 dark:text-white">
                    <ImageIcon className="w-4 h-4 text-blue-500" />
                    <span>Card Media & Details</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-medium text-slate-600 dark:text-slate-400">
                        Image URL (Product Photo / Banner)
                      </label>
                      <input
                        type="url"
                        value={smartState.cardImageUrl}
                        onChange={(e) => updateSmartState((prev) => ({ ...prev, cardImageUrl: e.target.value }))}
                        className="w-full p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                        placeholder="https://..."
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-medium text-slate-600 dark:text-slate-400">
                        Card Title (Max 80 chars)
                      </label>
                      <input
                        type="text"
                        maxLength={80}
                        value={smartState.cardTitle}
                        onChange={(e) => updateSmartState((prev) => ({ ...prev, cardTitle: e.target.value }))}
                        className="w-full p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                        placeholder="e.g. Signature Cotton Hoodie (40% OFF)"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-slate-600 dark:text-slate-400">
                      Card Subtitle / Description
                    </label>
                    <input
                      type="text"
                      maxLength={80}
                      value={smartState.cardSubtitle}
                      onChange={(e) => updateSmartState((prev) => ({ ...prev, cardSubtitle: e.target.value }))}
                      className="w-full p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                      placeholder="e.g. Flash promo valid today only. Click below to claim."
                    />
                  </div>
                </div>
              )}

              {/* 3. VOICE NOTE: DIRECT IN-BROWSER RECORDING STUDIO */}
              {smartState.format === "voice_note" && (
                <div className="space-y-4 p-4 rounded-2xl bg-gradient-to-br from-slate-50 to-blue-50/30 dark:from-slate-950 dark:to-blue-950/20 border border-slate-200 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                        <Mic className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                          Direct Voice Note Recording Studio
                        </h4>
                        <p className="text-[11px] text-slate-500">
                          Record your voice message right here using your microphone.
                        </p>
                      </div>
                    </div>

                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 font-bold uppercase tracking-wider">
                      Messenger Audio
                    </span>
                  </div>

                  {/* Hidden file input for uploading audio files */}
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="audio/*"
                    onChange={handleAudioFileUpload}
                    className="hidden"
                  />

                  {/* Recording Error Alert */}
                  {recordingError && (
                    <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-center space-x-2">
                      <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                      <span>{recordingError}</span>
                    </div>
                  )}

                  {/* State 1: IDLE - Ready to record */}
                  {recordingState === "idle" && (
                    <div className="space-y-3">
                      <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center text-center space-y-3">
                        <button
                          type="button"
                          onClick={startDirectRecording}
                          className="w-16 h-16 rounded-full bg-rose-500 hover:bg-rose-600 text-white flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition cursor-pointer group"
                          title="Click to start recording voice note"
                        >
                          <Mic className="w-7 h-7 group-hover:animate-pulse" />
                        </button>
                        <div>
                          <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                            Click to Record Voice Note
                          </p>
                          <p className="text-[11px] text-slate-400 max-w-xs mt-0.5">
                            Speak clearly into your microphone. Meta Messenger will deliver it as an authentic voice note.
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                        <span className="text-[11px]">Or upload an audio file:</span>
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:text-blue-600 text-xs font-semibold cursor-pointer shadow-2xs"
                        >
                          <UploadCloud className="w-3.5 h-3.5 text-blue-500" />
                          <span>Upload Audio (.mp3, .wav, .m4a)</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* State 2: RECORDING LIVE */}
                  {recordingState === "recording" && (
                    <div className="p-4 rounded-xl bg-rose-50/80 dark:bg-rose-950/40 border-2 border-rose-400 dark:border-rose-600 space-y-3 animate-pulse-subtle">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="relative flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-600"></span>
                          </span>
                          <span className="text-xs font-bold text-rose-700 dark:text-rose-300 uppercase tracking-wider">
                            Recording Live Voice Note
                          </span>
                        </div>
                        <span className="text-sm font-mono font-bold text-rose-600 dark:text-rose-400">
                          0:{recordingSeconds < 10 ? `0${recordingSeconds}` : recordingSeconds} / 1:00
                        </span>
                      </div>

                      {/* Live Waveform Indicator */}
                      <div className="flex items-center justify-center space-x-1 h-10 py-1 bg-white/70 dark:bg-slate-900/70 rounded-lg">
                        {[40, 75, 95, 60, 85, 100, 70, 90, 50, 85, 100, 65, 45, 80, 95, 60, 40].map((h, idx) => (
                          <div
                            key={idx}
                            style={{ height: `${Math.min(100, h + ((idx % 3) * 15))}%` }}
                            className="w-1.5 bg-rose-500 rounded-full animate-pulse"
                          />
                        ))}
                      </div>

                      {/* Controls: Stop or Cancel */}
                      <div className="flex items-center justify-between pt-1">
                        <button
                          type="button"
                          onClick={cancelDirectRecording}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-800 dark:text-slate-400 cursor-pointer"
                        >
                          Cancel / Discard
                        </button>

                        <button
                          type="button"
                          onClick={stopDirectRecording}
                          className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition shadow-xs cursor-pointer"
                        >
                          <Square className="w-3.5 h-3.5 fill-current" />
                          <span>Stop & Save Voice Note</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* State 3: UPLOADING / PROCESSING */}
                  {recordingState === "uploading" && (
                    <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center space-x-2 text-xs text-blue-600 dark:text-blue-400 font-semibold">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Saving and encoding your voice note...</span>
                    </div>
                  )}

                  {/* State 4: RECORDED - Preview & Actions */}
                  {recordingState === "recorded" && (
                    <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-700/60 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                            {smartState.audioName || "Voice Note"} ({smartState.audioDurationSec}s)
                          </span>
                        </div>
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                          Ready & Synced
                        </span>
                      </div>

                      {/* Native HTML5 Audio Preview Bar */}
                      <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center space-x-2">
                        <audio
                          controls
                          src={smartState.audioUrl}
                          className="w-full h-8 accent-blue-600 focus:outline-none"
                        />
                      </div>

                      {/* Action buttons: Re-record, Replace, or Upload */}
                      <div className="flex items-center justify-between pt-1">
                        <button
                          type="button"
                          onClick={startDirectRecording}
                          className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5 text-blue-500" />
                          <span>Re-record Voice</span>
                        </button>

                        <div className="flex items-center space-x-2">
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="text-xs text-slate-500 hover:text-blue-600 cursor-pointer"
                          >
                            Replace with File
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Manual Audio URL Input (Collapsible/Advanced) */}
                  <details className="text-xs text-slate-500 pt-1">
                    <summary className="cursor-pointer hover:text-slate-700 dark:hover:text-slate-300 font-medium">
                      Advanced: Direct Audio CDN / Stream URL
                    </summary>
                    <div className="mt-2 space-y-2 p-2.5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
                      <input
                        type="url"
                        value={smartState.audioUrl}
                        onChange={(e) => updateSmartState((prev) => ({ ...prev, audioUrl: e.target.value }))}
                        className="w-full p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-mono text-slate-900 dark:text-white focus:outline-none"
                        placeholder="https://..."
                      />
                      <p className="text-[10px] text-slate-400">
                        Meta Send API requires a public URL. When blasting via SieReach, local uploads are automatically served via your public webhook domain.
                      </p>
                    </div>
                  </details>
                </div>
              )}

              {/* 4. IMAGE MEDIA ONLY */}
              {smartState.format === "image_text" && (
                <div className="space-y-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                  <div className="flex items-center space-x-2 text-xs font-bold text-slate-900 dark:text-white">
                    <ImageIcon className="w-4 h-4 text-blue-500" />
                    <span>Direct Image Attachment</span>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-slate-600 dark:text-slate-400">
                      High-Resolution Image URL
                    </label>
                    <input
                      type="url"
                      value={smartState.imageUrl}
                      onChange={(e) => updateSmartState((prev) => ({ ...prev, imageUrl: e.target.value }))}
                      className="w-full p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 font-mono"
                      placeholder="https://images.unsplash.com/..."
                    />
                  </div>
                </div>
              )}

              {/* 5. INTERACTIVE BUTTONS SECTION (For Button & Generic Card formats) */}
              {(smartState.format === "button" || smartState.format === "generic_card") && (
                <div className="space-y-2.5 pt-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1.5">
                      <label className="text-xs font-bold text-slate-900 dark:text-white">
                        Call-To-Action Buttons
                      </label>
                      <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-mono">
                        {smartState.buttons.length}/3 (Meta Max)
                      </span>
                    </div>

                    {smartState.buttons.length < 3 && (
                      <button
                        type="button"
                        onClick={handleAddButton}
                        className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-semibold cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Button</span>
                      </button>
                    )}
                  </div>

                  {smartState.buttons.map((btn, idx) => (
                    <div
                      key={btn.id}
                      className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                          <span className="w-4 h-4 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-600 text-[10px] flex items-center justify-center font-bold">
                            {idx + 1}
                          </span>
                          <span>Button #{idx + 1}</span>
                        </span>

                        <button
                          type="button"
                          onClick={() => handleRemoveButton(btn.id)}
                          className="text-rose-500 hover:text-rose-700 text-xs cursor-pointer p-1"
                          title="Remove Button"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                        {/* Button Type */}
                        <div className="sm:col-span-4">
                          <label className="text-[10px] font-semibold text-slate-500 block mb-1">
                            Type
                          </label>
                          <select
                            value={btn.type}
                            onChange={(e) => handleUpdateButton(btn.id, { type: e.target.value as any })}
                            className="w-full p-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-200 focus:outline-none"
                          >
                            <option value="web_url">Website URL (web_url)</option>
                            <option value="postback">Bot Reply (postback)</option>
                            <option value="phone_number">Direct Call (phone_number)</option>
                          </select>
                        </div>

                        {/* Button Title (Max 20 chars per Meta rule) */}
                        <div className="sm:col-span-4">
                          <div className="flex justify-between items-center mb-1">
                            <label className="text-[10px] font-semibold text-slate-500 block">
                              Title
                            </label>
                            <span
                              className={`text-[9px] font-mono ${
                                btn.title.length > 20 ? "text-rose-500 font-bold" : "text-slate-400"
                              }`}
                            >
                              {btn.title.length}/20
                            </span>
                          </div>
                          <input
                            type="text"
                            maxLength={25}
                            value={btn.title}
                            onChange={(e) => handleUpdateButton(btn.id, { title: e.target.value })}
                            className={`w-full p-1.5 rounded-lg bg-white dark:bg-slate-900 border text-xs text-slate-900 dark:text-white focus:outline-none ${
                              btn.title.length > 20
                                ? "border-rose-500 text-rose-600"
                                : "border-slate-200 dark:border-slate-800 focus:border-blue-500"
                            }`}
                            placeholder="e.g. Order Online"
                          />
                        </div>

                        {/* Target Value (URL / Payload / Phone) */}
                        <div className="sm:col-span-4">
                          <label className="text-[10px] font-semibold text-slate-500 block mb-1">
                            {btn.type === "web_url"
                              ? "Destination URL"
                              : btn.type === "phone_number"
                              ? "Phone Number"
                              : "Payload Key"}
                          </label>
                          <input
                            type="text"
                            value={btn.type === "web_url" ? btn.url || "" : btn.payload || ""}
                            onChange={(e) => {
                              if (btn.type === "web_url") {
                                handleUpdateButton(btn.id, { url: e.target.value });
                              } else {
                                handleUpdateButton(btn.id, { payload: e.target.value });
                              }
                            }}
                            className="w-full p-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 font-mono"
                            placeholder={
                              btn.type === "web_url"
                                ? "https://..."
                                : btn.type === "phone_number"
                                ? "+85512888999"
                                : "ACTION_PAYLOAD"
                            }
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* 6. QUICK REPLIES CHIPS SECTION */}
              {smartState.format === "quick_replies" && (
                <div className="space-y-2.5 pt-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <span>Quick Reply Chips</span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        ({smartState.quickReplies.length}/10)
                      </span>
                    </label>

                    <button
                      type="button"
                      onClick={handleAddQuickReply}
                      className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-semibold cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Chip</span>
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {smartState.quickReplies.map((qr) => (
                      <div
                        key={qr.id}
                        className="flex items-center space-x-1.5 px-2.5 py-1 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800"
                      >
                        <input
                          type="text"
                          maxLength={20}
                          value={qr.title}
                          onChange={(e) => handleUpdateQuickReply(qr.id, e.target.value)}
                          className="bg-transparent text-xs font-semibold text-blue-700 dark:text-blue-300 focus:outline-none w-28"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveQuickReply(qr.id)}
                          className="text-blue-400 hover:text-rose-500 cursor-pointer"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Template Name Input */}
              <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Template name
                </label>
                <div className="relative">
                  <input
                    type="text"
                    maxLength={80}
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 pr-16"
                    placeholder="e.g. Smart Template 2026"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-slate-400 font-mono">
                    {templateName.length}/80
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* MODE 2: STANDARD JSON CODE (For Meta Ads Manager Direct)   */}
          {/* ========================================================= */}
          {activeMode === "standard" && (
            <div className="space-y-3">
              {/* Header Text */}
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Paste JSON code for your message flow. If you make updates on the partner app, you will need to paste the JSON code and save your ad again.
              </p>

              <div className="flex items-center justify-between pt-1">
                <label className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  JSON
                </label>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={handleFormatJson}
                    className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline cursor-pointer font-medium"
                  >
                    Format / Prettify
                  </button>
                </div>
              </div>

              {/* Code Editor Box with Monospace font */}
              <div className="relative border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-slate-50 dark:bg-slate-950">
                <textarea
                  value={rawJson}
                  onChange={(e) => setRawJson(e.target.value)}
                  rows={16}
                  spellCheck={false}
                  className="w-full p-4 font-mono text-xs leading-relaxed text-slate-900 dark:text-slate-100 bg-transparent focus:outline-none resize-y selection:bg-blue-500/30"
                  placeholder="Paste Meta Messenger Send API JSON here..."
                />

                {/* Status Badge */}
                <div className="absolute top-2 right-2 flex items-center space-x-1.5 pointer-events-none">
                  {jsonError ? (
                    <span className="px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30 text-[10px] font-bold flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      <span>Syntax Error</span>
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-[10px] font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Valid JSON</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Syntax Error Message */}
              {jsonError && (
                <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                  <span className="truncate">{jsonError}</span>
                </div>
              )}

              {/* Meta Compliance Warnings */}
              {validationWarnings.length > 0 && (
                <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-300 text-xs space-y-1">
                  {validationWarnings.map((w, idx) => (
                    <div key={idx} className="flex items-center space-x-2">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      <span>{w}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Template Name Input */}
              <div className="space-y-1.5 pt-2">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Template name
                </label>
                <div className="relative">
                  <input
                    type="text"
                    maxLength={80}
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 pr-16"
                    placeholder="e.g. JSON 07/10/2026"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-slate-400 font-mono">
                    {templateName.length}/80
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Footer Actions (< Reset Default and Save) */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <button
              type="button"
              onClick={() => handleSelectPreset("button_template")}
              className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 text-xs font-semibold border border-slate-200 dark:border-slate-700 transition cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Reset Default</span>
            </button>

            <button
              type="button"
              onClick={handleSaveTemplate}
              disabled={Boolean(jsonError)}
              className="flex items-center space-x-2 px-6 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-50"
            >
              {saveStatus === "saved" ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Saved!</span>
                </>
              ) : (
                <span>Save</span>
              )}
            </button>
          </div>
        </div>

        {/* Right Column: Realistic Meta Messenger Mobile Device Preview (5 cols) */}
        <div className="lg:col-span-5 bg-slate-100 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-6 flex flex-col items-center justify-center">
          {/* Smartphone Frame Container */}
          <div className="w-full max-w-[340px] bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-3xl shadow-xl overflow-hidden flex flex-col min-h-[520px]">
            {/* Messenger Top Header */}
            <div className="px-3.5 py-3 border-b border-slate-100 dark:border-slate-800/80 bg-white dark:bg-slate-900 flex items-center justify-between shrink-0">
              <div className="flex items-center space-x-2.5">
                <div className="relative">
                  <img
                    src={previewPage.avatarUrl || "https://images.unsplash.com/photo-1557804506-669a67965ba0?w=100&auto=format&fit=crop&q=80"}
                    alt={previewPage.name}
                    className="w-9 h-9 rounded-full object-cover ring-1 ring-slate-200 dark:ring-slate-700"
                  />
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white dark:border-slate-900" />
                </div>
                <div>
                  <div className="flex items-center space-x-1">
                    <span className="font-bold text-xs text-slate-900 dark:text-white truncate max-w-[130px]">
                      {previewPage.name}
                    </span>
                    {/* Blue Verified Checkmark Badge */}
                    <div className="w-3 h-3 rounded-full bg-blue-500 text-white flex items-center justify-center shrink-0">
                      <Check className="w-2 h-2 stroke-[3]" />
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-400">Business chat</p>
                </div>
              </div>

              {/* Right Action Icons */}
              <div className="flex items-center space-x-3 text-blue-500">
                <button type="button" title="Call Page" className="cursor-pointer hover:opacity-80">
                  <Phone className="w-4 h-4" />
                </button>
                <button type="button" title="View Store / Profile" className="cursor-pointer hover:opacity-80">
                  <ShoppingBag className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Chat Body Area */}
            <div className="flex-1 p-3.5 bg-slate-50/70 dark:bg-slate-950/60 overflow-y-auto space-y-3.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {/* Ad Context Disclaimer Bubble */}
              <div className="text-center px-4 py-2 text-[10px] leading-relaxed text-slate-600 dark:text-slate-400">
                You opened this conversation through an ad. When you reply, {previewPage.name} will be able to see your public info and which ad you clicked.
              </div>

              {/* Incoming Bot Message Card */}
              {jsonError ? (
                <div className="p-3 rounded-2xl bg-rose-50 text-rose-600 text-xs border border-rose-200 text-center">
                  Fix JSON syntax error on the left to render preview.
                </div>
              ) : (
                <div className="flex items-start space-x-2">
                  {/* Small Avatar Thumbnail on bottom left of bubble */}
                  <img
                    src={previewPage.avatarUrl || "https://images.unsplash.com/photo-1557804506-669a67965ba0?w=100&auto=format&fit=crop&q=80"}
                    alt="avatar"
                    className="w-6 h-6 rounded-full object-cover shrink-0 mt-auto"
                  />

                  {/* Bubble Content */}
                  <div className="space-y-2 max-w-[85%]">
                    {/* 1. BUTTON TEMPLATE RENDER */}
                    {templateType === "button" && (
                      <div className="bg-slate-200/80 dark:bg-slate-800 text-slate-900 dark:text-white rounded-2xl overflow-hidden shadow-2xs border border-slate-200 dark:border-slate-700/60">
                        {/* Text */}
                        <div className="p-3 text-xs leading-relaxed font-normal">
                          {payload.text || "No text specified"}
                        </div>

                        {/* Stacked Divider Buttons */}
                        {payload.buttons && payload.buttons.length > 0 && (
                          <div className="border-t border-slate-300 dark:border-slate-700/80 divide-y divide-slate-300 dark:divide-slate-700/80 bg-white/60 dark:bg-slate-850">
                            {payload.buttons.map((btn: any, bIdx: number) => (
                              <button
                                key={bIdx}
                                type="button"
                                onClick={() => handlePreviewButtonClick(btn)}
                                className="w-full py-2.5 px-3 text-center text-xs font-semibold text-blue-600 dark:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer flex items-center justify-center space-x-1"
                              >
                                <span>{btn.title || `Button ${bIdx + 1}`}</span>
                                {btn.type === "web_url" && <ExternalLink className="w-2.5 h-2.5 opacity-60 ml-0.5" />}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* 2. GENERIC CAROUSEL / CARD RENDER */}
                    {templateType === "generic" && payload.elements?.[0] && (
                      <div className="bg-slate-200/80 dark:bg-slate-800 text-slate-900 dark:text-white rounded-2xl overflow-hidden shadow-2xs border border-slate-200 dark:border-slate-700/60 max-w-[240px]">
                        {payload.elements[0].image_url && (
                          <img
                            src={payload.elements[0].image_url}
                            alt="card"
                            className="w-full h-28 object-cover"
                          />
                        )}
                        <div className="p-2.5 space-y-1">
                          <h4 className="font-bold text-xs leading-tight">
                            {payload.elements[0].title}
                          </h4>
                          {payload.elements[0].subtitle && (
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-snug">
                              {payload.elements[0].subtitle}
                            </p>
                          )}
                        </div>

                        {payload.elements[0].buttons && (
                          <div className="border-t border-slate-300 dark:border-slate-700/80 divide-y divide-slate-300 dark:divide-slate-700/80 bg-white/60 dark:bg-slate-850">
                            {payload.elements[0].buttons.map((btn: any, bIdx: number) => (
                              <button
                                key={bIdx}
                                type="button"
                                onClick={() => handlePreviewButtonClick(btn)}
                                className="w-full py-2 px-2.5 text-center text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                              >
                                {btn.title}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* 3. VOICE NOTE / AUDIO BUBBLE WITH REAL PLAYBACK */}
                    {isAudioMessage && (
                      <div className="bg-blue-600 text-white rounded-2xl p-3 shadow-md flex items-center space-x-3 min-w-[210px]">
                        {/* Play/Pause Button */}
                        <button
                          type="button"
                          onClick={handleTogglePreviewAudio}
                          className="w-9 h-9 rounded-full bg-white text-blue-600 flex items-center justify-center shrink-0 shadow-xs hover:scale-105 active:scale-95 transition cursor-pointer"
                          title={isPlayingAudio ? "Pause Audio" : "Play Voice Note"}
                        >
                          {isPlayingAudio ? (
                            <Pause className="w-4 h-4 fill-current" />
                          ) : (
                            <Play className="w-4 h-4 fill-current ml-0.5" />
                          )}
                        </button>

                        {/* Animated Sound Waveform Bars */}
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center space-x-0.5 h-6">
                            {[40, 70, 90, 50, 80, 100, 60, 85, 45, 95, 75, 55, 90, 65, 30].map(
                              (heightPercent, bIdx) => {
                                const isPlayed =
                                  smartState.audioDurationSec > 0
                                    ? (bIdx / 15) * smartState.audioDurationSec <= audioPlaybackSec
                                    : false;
                                return (
                                  <div
                                    key={bIdx}
                                    style={{ height: `${heightPercent}%` }}
                                    className={`w-1 rounded-full transition-all duration-150 ${
                                      isPlayed ? "bg-white" : "bg-white/40"
                                    } ${isPlayingAudio ? "animate-pulse" : ""}`}
                                  />
                                );
                              }
                            )}
                          </div>
                          <div className="flex items-center justify-between text-[10px] text-white/80 font-mono">
                            <span>0:{audioPlaybackSec < 10 ? `0${audioPlaybackSec}` : audioPlaybackSec}</span>
                            <span>
                              0:
                              {smartState.audioDurationSec < 10
                                ? `0${smartState.audioDurationSec}`
                                : smartState.audioDurationSec}
                            </span>
                          </div>
                        </div>

                        {/* Mic Icon Badge */}
                        <Mic className="w-3.5 h-3.5 text-white/60 shrink-0" />
                      </div>
                    )}

                    {/* 4. IMAGE ATTACHMENT */}
                    {isImageMessage && (
                      <div className="rounded-2xl overflow-hidden shadow-2xs border border-slate-200 dark:border-slate-700/60 max-w-[240px]">
                        <img
                          src={payload?.url || "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=800&auto=format&fit=crop&q=80"}
                          alt="attached media"
                          className="w-full h-auto object-cover max-h-56"
                        />
                      </div>
                    )}

                    {/* 5. SIMPLE TEXT MESSAGE */}
                    {messageData?.text && (
                      <div className="bg-slate-200/80 dark:bg-slate-800 text-slate-900 dark:text-white rounded-2xl p-3 text-xs leading-relaxed shadow-2xs">
                        {messageData.text}
                      </div>
                    )}

                    {/* Quick Replies Chips */}
                    {quickReplies && quickReplies.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {quickReplies.map((qr: any, qrIdx: number) => (
                          <button
                            key={qrIdx}
                            type="button"
                            onClick={() => handleQuickReplyClick(qr)}
                            className="px-2.5 py-1 rounded-full bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 text-[10px] font-semibold transition cursor-pointer shadow-2xs"
                          >
                            {qr.title}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Simulated Customer Interaction Replies */}
              {simulatedReplies.map((reply, rIdx) => (
                <div
                  key={rIdx}
                  className={`flex ${reply.from === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-3 py-1.5 text-xs ${
                      reply.from === "user"
                        ? "bg-blue-600 text-white rounded-br-xs"
                        : "bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-bl-xs"
                    }`}
                  >
                    <span>{reply.text}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Bottom Messenger Controls Bar */}
            <div className="p-2.5 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center space-x-2 shrink-0">
              <div className="flex items-center space-x-2 text-blue-500 shrink-0">
                <Camera className="w-4 h-4 cursor-pointer hover:opacity-80" />
                <ImageIcon className="w-4 h-4 cursor-pointer hover:opacity-80" />
                <Mic className="w-4 h-4 cursor-pointer hover:opacity-80" />
              </div>

              {/* "Aa" input bar */}
              <div className="flex-1 bg-slate-100 dark:bg-slate-800 rounded-full px-3 py-1.5 flex items-center justify-between text-xs text-slate-400">
                <span className="text-[11px]">Aa</span>
                <Smile className="w-3.5 h-3.5 text-slate-400 cursor-pointer" />
              </div>

              {/* Thumbs up icon */}
              <ThumbsUp className="w-4 h-4 text-blue-500 cursor-pointer shrink-0 hover:opacity-80" />
            </div>
          </div>

          {/* Device Disclaimer Footer */}
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-3 text-center">
            This message may look different across devices.
          </p>
        </div>
      </div>
    </div>
  );
}
