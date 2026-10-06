"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Mic,
  Square,
  Upload,
  Play,
  Pause,
  Trash2,
  RefreshCw,
  Volume2,
  AlertCircle,
  CheckCircle2,
  Radio,
  FileAudio,
} from "lucide-react";

interface VoiceRecorderProps {
  value?: string | null;
  onChange: (url: string | null) => void;
  label?: string;
  compact?: boolean;
  placeholderText?: string;
}

export function VoiceRecorder({
  value,
  onChange,
  label = "Voice Note Attachment",
  compact = false,
  placeholderText = "Record a voice note or upload an audio file (.mp3, .m4a, .wav, .webm)",
}: VoiceRecorderProps) {
  // Tab mode: "record" | "upload"
  const [mode, setMode] = useState<"record" | "upload">("record");

  // Recording states
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [micError, setMicError] = useState<string | null>(null);

  // Upload states
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Playback states for audio preview
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const [audioLevels, setAudioLevels] = useState<number[]>([15, 25, 45, 60, 35, 20, 40, 55, 30, 20]);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Clean up timers & media streams on unmount
  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (audioContextRef.current && audioContextRef.current.state !== "closed") {
        audioContextRef.current.close().catch(() => {});
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  // Format seconds to mm:ss
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  // Upload helper for Blobs or Files
  const uploadAudioBlob = async (blob: Blob, filename: string) => {
    setIsUploading(true);
    setUploadError(null);
    try {
      const formData = new FormData();
      formData.append("file", blob, filename);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Upload failed with status ${res.status}`);
      }

      const data = await res.json();
      if (!data.success || !data.url) {
        throw new Error(data.error || "Server did not return a valid audio URL");
      }

      onChange(data.url);
    } catch (err: any) {
      setUploadError(err.message || "Failed to upload audio");
    } finally {
      setIsUploading(false);
    }
  };

  // Start in-browser microphone recording
  const startRecording = async () => {
    setMicError(null);
    setUploadError(null);
    audioChunksRef.current = [];

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Your browser does not support audio recording.");
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      // Setup audio analyzer for live waveform visualization
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          const audioCtx = new AudioCtx();
          audioContextRef.current = audioCtx;
          const source = audioCtx.createMediaStreamSource(stream);
          const analyser = audioCtx.createAnalyser();
          analyser.fftSize = 32;
          source.connect(analyser);
          analyserRef.current = analyser;

          const dataArray = new Uint8Array(analyser.frequencyBinCount);
          const updateLevels = () => {
            if (!analyserRef.current) return;
            analyserRef.current.getByteFrequencyData(dataArray);
            // Sample 10 bar levels normalized to 10 - 80%
            const sampled = [
              Math.max(15, (dataArray[1] / 255) * 80),
              Math.max(20, (dataArray[2] / 255) * 85),
              Math.max(25, (dataArray[3] / 255) * 90),
              Math.max(30, (dataArray[4] / 255) * 95),
              Math.max(20, (dataArray[5] / 255) * 90),
              Math.max(25, (dataArray[6] / 255) * 85),
              Math.max(20, (dataArray[7] / 255) * 80),
              Math.max(15, (dataArray[8] / 255) * 75),
              Math.max(25, (dataArray[9] / 255) * 85),
              Math.max(15, (dataArray[10] / 255) * 70),
            ];
            setAudioLevels(sampled);
            animFrameRef.current = requestAnimationFrame(updateLevels);
          };
          updateLevels();
        }
      } catch {
        // Fallback gracefully if AudioContext is blocked
      }

      // Check supported MIME type
      let mimeType = "audio/webm;codecs=opus";
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        if (MediaRecorder.isTypeSupported("audio/webm")) {
          mimeType = "audio/webm";
        } else if (MediaRecorder.isTypeSupported("audio/mp4")) {
          mimeType = "audio/mp4";
        } else {
          mimeType = ""; // Browser default
        }
      }

      const mediaRecorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        // Stop audio tracks
        stream.getTracks().forEach((track) => track.stop());

        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
        if (audioContextRef.current && audioContextRef.current.state !== "closed") {
          audioContextRef.current.close().catch(() => {});
        }

        const ext = mimeType.includes("mp4") ? "m4a" : "webm";
        const actualType = mimeType || "audio/webm";
        const audioBlob = new Blob(audioChunksRef.current, { type: actualType });

        if (audioBlob.size > 0) {
          await uploadAudioBlob(audioBlob, `voice_note_${Date.now()}.${ext}`);
        }
      };

      mediaRecorder.start(250); // Slice data every 250ms
      setIsRecording(true);
      setRecordingSeconds(0);

      timerIntervalRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setMicError("Microphone permission denied. Please allow microphone access in your browser settings.");
      } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
        setMicError("No microphone found. Please connect a microphone or use audio file upload.");
      } else {
        setMicError(err.message || "Unable to start audio recording.");
      }
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  // Cancel recording without saving
  const cancelRecording = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);

    if (mediaRecorderRef.current) {
      // Discard chunks so onstop does not upload
      audioChunksRef.current = [];
      if (mediaRecorderRef.current.state === "recording") {
        mediaRecorderRef.current.stop();
      }
    }
    setIsRecording(false);
    setRecordingSeconds(0);
  };

  // Handle direct file upload
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    await uploadAudioBlob(file, file.name);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Audio player controls
  const togglePlay = () => {
    if (!audioPlayerRef.current) return;
    if (isPlaying) {
      audioPlayerRef.current.pause();
      setIsPlaying(false);
    } else {
      audioPlayerRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  const handleAudioTimeUpdate = () => {
    if (audioPlayerRef.current) {
      setCurrentTime(audioPlayerRef.current.currentTime);
    }
  };

  const handleAudioLoadedMetadata = () => {
    if (audioPlayerRef.current) {
      setDuration(audioPlayerRef.current.duration || 0);
    }
  };

  const handleAudioEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (audioPlayerRef.current) {
      audioPlayerRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  return (
    <div className={`space-y-3 ${compact ? "text-xs" : ""}`}>
      {/* Hidden audio player element when an audioUrl exists */}
      {value && (
        <audio
          ref={audioPlayerRef}
          src={value}
          onTimeUpdate={handleAudioTimeUpdate}
          onLoadedMetadata={handleAudioLoadedMetadata}
          onEnded={handleAudioEnded}
          preload="metadata"
        />
      )}

      {/* When audio is attached and not in middle of recording */}
      {value && !isRecording ? (
        <div className="bg-slate-900 border border-purple-500/30 rounded-2xl p-3.5 space-y-2.5 shadow-md shadow-purple-950/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-full bg-purple-600/20 text-purple-400 border border-purple-500/40 flex items-center justify-center shrink-0">
                <Volume2 className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-100 flex items-center gap-1.5">
                  <span>{label}</span>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-1.5 py-0.2 rounded font-mono font-medium">
                    Ready ✓
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 font-mono">
                  {formatTime(currentTime)} / {duration > 0 ? formatTime(duration) : "--:--"}
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-1.5">
              <button
                type="button"
                onClick={togglePlay}
                className="w-8 h-8 rounded-full bg-purple-600 hover:bg-purple-500 text-white flex items-center justify-center transition shadow-sm active:scale-95 cursor-pointer"
                title={isPlaying ? "Pause audio" : "Play preview"}
              >
                {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
              </button>

              <button
                type="button"
                onClick={() => onChange(null)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-red-950/60 text-slate-400 hover:text-red-400 border border-slate-700 hover:border-red-500/40 flex items-center justify-center transition cursor-pointer"
                title="Remove voice note"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Interactive Scrub Bar & Waveform Preview */}
          <div className="space-y-1">
            <input
              type="range"
              min={0}
              max={duration || 100}
              step={0.1}
              value={currentTime}
              onChange={handleSeek}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
            />
            <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
              <span className="truncate max-w-[200px]" title={value}>
                {value.split("/").pop()}
              </span>
              <span>Messenger Audio Note</span>
            </div>
          </div>

          {/* Replace / Re-record bar */}
          <div className="pt-1.5 border-t border-slate-800 flex items-center justify-between text-[11px]">
            <span className="text-slate-400">Want to replace this voice note?</span>
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => {
                  onChange(null);
                  setMode("record");
                }}
                className="text-purple-400 hover:text-purple-300 font-semibold flex items-center gap-1 cursor-pointer"
              >
                <Mic className="w-3 h-3" />
                <span>Re-record</span>
              </button>
              <span className="text-slate-600">|</span>
              <button
                type="button"
                onClick={() => {
                  fileInputRef.current?.click();
                }}
                className="text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1 cursor-pointer"
              >
                <Upload className="w-3 h-3" />
                <span>Upload New</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Recording / Uploading Empty Container */
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5 space-y-3">
          {/* Header & Mode Switcher */}
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-300 flex items-center space-x-1.5">
              <Mic className="w-4 h-4 text-purple-400" />
              <span>{label}</span>
            </label>

            {!isRecording && (
              <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-[11px]">
                <button
                  type="button"
                  onClick={() => setMode("record")}
                  className={`px-2.5 py-1 rounded-md font-semibold transition cursor-pointer ${
                    mode === "record"
                      ? "bg-purple-600 text-white shadow-xs"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  🎙️ Record Mic
                </button>
                <button
                  type="button"
                  onClick={() => setMode("upload")}
                  className={`px-2.5 py-1 rounded-md font-semibold transition cursor-pointer ${
                    mode === "upload"
                      ? "bg-purple-600 text-white shadow-xs"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  📁 Upload File
                </button>
              </div>
            )}
          </div>

          {/* MIC RECORDING MODE */}
          {mode === "record" && (
            <div className="space-y-3">
              {isRecording ? (
                /* Active Recording UI */
                <div className="bg-slate-950 border border-red-500/40 rounded-xl p-4 flex flex-col items-center justify-center space-y-3 text-center">
                  <div className="flex items-center space-x-2">
                    <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                    </span>
                    <span className="text-xs font-bold text-red-400 uppercase tracking-wider font-mono">
                      Recording Voice Note...
                    </span>
                    <span className="text-sm font-mono font-bold text-white ml-2 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                      {formatTime(recordingSeconds)}
                    </span>
                  </div>

                  {/* Live Equalizer Waveform Visualization */}
                  <div className="flex items-center justify-center gap-1.5 h-12 w-full max-w-[280px]">
                    {audioLevels.map((height, idx) => (
                      <div
                        key={idx}
                        className="w-2 bg-gradient-to-t from-purple-500 to-red-400 rounded-full transition-all duration-75"
                        style={{ height: `${height}%` }}
                      />
                    ))}
                  </div>

                  <p className="text-[11px] text-slate-400">
                    Speak clearly into your microphone. Click Stop when finished.
                  </p>

                  {/* Stop / Cancel Buttons */}
                  <div className="flex items-center space-x-3 pt-1">
                    <button
                      type="button"
                      onClick={stopRecording}
                      className="flex items-center space-x-2 bg-red-600 hover:bg-red-500 text-white font-semibold text-xs px-4 py-2 rounded-xl transition shadow-lg shadow-red-950/40 active:scale-95 cursor-pointer"
                    >
                      <Square className="w-3.5 h-3.5 fill-current" />
                      <span>Stop & Save Recording</span>
                    </button>

                    <button
                      type="button"
                      onClick={cancelRecording}
                      className="text-xs text-slate-400 hover:text-slate-200 px-3 py-2 rounded-xl border border-slate-800 hover:border-slate-700 transition cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : isUploading ? (
                /* Uploading in progress spinner */
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 flex flex-col items-center justify-center space-y-2 text-center">
                  <RefreshCw className="w-6 h-6 text-purple-400 animate-spin" />
                  <span className="text-xs font-semibold text-slate-200">
                    Saving & uploading voice note to cloud...
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Optimizing audio format for Meta Messenger API
                  </span>
                </div>
              ) : (
                /* Idle Record Ready UI */
                <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-left">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-600/10 text-purple-400 border border-purple-500/20 flex items-center justify-center shrink-0">
                      <Mic className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-slate-200">
                        Record with Web Microphone
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Record personalized audio voice note directly in your browser.
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={startRecording}
                    className="flex items-center space-x-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold px-4 py-2 rounded-xl transition shadow-md shadow-purple-950/30 shrink-0 cursor-pointer active:scale-95"
                  >
                    <Radio className="w-3.5 h-3.5" />
                    <span>Start Recording</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* FILE UPLOAD MODE */}
          {mode === "upload" && (
            <div className="space-y-3">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="bg-slate-950 border border-dashed border-slate-700 hover:border-purple-500 rounded-xl p-5 flex flex-col items-center justify-center text-center cursor-pointer transition group"
              >
                <div className="w-10 h-10 rounded-xl bg-purple-600/10 text-purple-400 group-hover:scale-110 group-hover:bg-purple-600/20 flex items-center justify-center mb-2 transition">
                  {isUploading ? (
                    <RefreshCw className="w-5 h-5 animate-spin" />
                  ) : (
                    <Upload className="w-5 h-5" />
                  )}
                </div>
                <div className="text-xs font-semibold text-slate-200 group-hover:text-purple-300 transition">
                  {isUploading ? "Uploading audio file..." : "Click or Drag Audio File to Upload"}
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Supports MP3, M4A, WAV, WebM, OGG (Max 25MB)
                </p>
              </div>

              {/* Direct audio URL paste input */}
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  placeholder="Or paste direct public audio URL (https://...)..."
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      const val = (e.target as HTMLInputElement).value.trim();
                      if (val) onChange(val);
                    }
                  }}
                  onBlur={(e) => {
                    const val = e.target.value.trim();
                    if (val) onChange(val);
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-500 transition"
                />
              </div>
            </div>
          )}

          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*,.mp3,.m4a,.wav,.webm,.ogg,.aac"
            onChange={handleFileChange}
            className="hidden"
          />

          {/* Error notifications */}
          {micError && (
            <div className="p-2.5 rounded-xl bg-red-950/40 border border-red-500/30 text-red-300 text-xs flex items-start space-x-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
              <span>{micError}</span>
            </div>
          )}

          {uploadError && (
            <div className="p-2.5 rounded-xl bg-red-950/40 border border-red-500/30 text-red-300 text-xs flex items-start space-x-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
              <span>{uploadError}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
