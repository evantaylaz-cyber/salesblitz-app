"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useUser } from "@clerk/nextjs";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Mic,
  MicOff,
  Square,
  Loader2,
  MessageSquare,
  Clock,
  AlertCircle,
} from "lucide-react";

interface TranscriptEntry {
  role: "user" | "persona";
  text: string;
  timestamp: string;
  speaker?: string;
  speakerTitle?: string;
}

// Helper: convert Int16Array (PCM16) to base64 string for Realtime API
function int16ToBase64(int16Array: Int16Array): string {
  const bytes = new Uint8Array(int16Array.buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export default function PracticeSessionPage() {
  const { isLoaded } = useUser();
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = params.sessionId as string;

  // State
  const [persona, setPersona] = useState<{
    name: string;
    title: string;
    company: string;
  } | null>(null);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [avatarReady, setAvatarReady] = useState(false);
  const [avatarLoading, setAvatarLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [ending, setEnding] = useState(false);
  const [currentSpeaker, setCurrentSpeaker] = useState<string | null>(null);
  const [isPanelMode, setIsPanelMode] = useState(false);
  const [showMobileTranscript, setShowMobileTranscript] = useState(false);
  const [sttMode, setSttMode] = useState<"realtime" | "webspeech" | "none">("none");
  const [avatarRetryCount, setAvatarRetryCount] = useState(0);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [avatarProgress, setAvatarProgress] = useState<string>("Initializing...");
  const [textOnlyMode, setTextOnlyMode] = useState(false);

  // Refs - Avatar & video
  const videoRef = useRef<HTMLVideoElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sessionRef = useRef<any>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const avatarTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chromaKeyFrameRef = useRef<number | null>(null);
  const isSpeakingRef = useRef(false);
  const micActiveRef = useRef(false);
  const ttsVoiceRef = useRef("onyx");

  // Refs - OpenAI Realtime API (STT)
  const realtimeWsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  // Refs - Web Speech API fallback
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);

  // ─── TTS + HeyGen ─────────────────────────────────────────────────────

  async function speakViaAvatar(text: string) {
    const session = sessionRef.current;
    if (!session) return;

    try {
      const ttsRes = await fetch("/api/practice/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, voice: ttsVoiceRef.current }),
      });

      if (!ttsRes.ok) {
        console.error("TTS failed:", ttsRes.status);
        return;
      }

      const { chunks } = await ttsRes.json();
      if (!chunks || chunks.length === 0) {
        console.error("TTS returned no audio chunks");
        return;
      }

      for (const chunk of chunks) {
        try {
          await session.repeatAudio(chunk);
        } catch (audioErr) {
          console.error("Avatar audio playback failed:", audioErr);
          // Don't crash the whole flow; skip this chunk and continue
        }
      }
    } catch (err) {
      console.error("speakViaAvatar error:", err);
    }
  }

  // ─── Chroma Key ────────────────────────────────────────────────────────

  function startChromaKey() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    function processFrame() {
      if (!video || !canvas || !ctx) return;
      if (video.videoWidth === 0) {
        chromaKeyFrameRef.current = requestAnimationFrame(processFrame);
        return;
      }

      if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
      }

      ctx.drawImage(video, 0, 0);
      const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = frame.data;

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        if (g > 100 && g > r * 1.4 && g > b * 1.4) {
          data[i] = 31;
          data[i + 1] = 41;
          data[i + 2] = 55;
          data[i + 3] = 255;
        }
      }

      ctx.putImageData(frame, 0, 0);
      chromaKeyFrameRef.current = requestAnimationFrame(processFrame);
    }

    chromaKeyFrameRef.current = requestAnimationFrame(processFrame);
  }

  function stopChromaKey() {
    if (chromaKeyFrameRef.current) {
      cancelAnimationFrame(chromaKeyFrameRef.current);
      chromaKeyFrameRef.current = null;
    }
  }

  // ─── Process User Speech (shared between Realtime & Web Speech) ────────

  const handleUserTranscript = useCallback(async (userText: string) => {
    if (!userText.trim()) return;
    // Drop transcriptions that arrive while avatar is speaking (echo safety net)
    if (isSpeakingRef.current) return;

    setTranscript((prev) => [
      ...prev,
      { role: "user", text: userText.trim(), timestamp: new Date().toISOString() },
    ]);

    setIsProcessing(true);
    try {
      const res = await fetch("/api/practice/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, userMessage: userText.trim() }),
      });

      const data = await res.json();
      if (data.response) {
        const personaEntry: TranscriptEntry = {
          role: "persona",
          text: data.response,
          timestamp: new Date().toISOString(),
        };

        if (data.speaker) {
          personaEntry.speaker = data.speaker;
          personaEntry.speakerTitle = data.speakerTitle;
          setCurrentSpeaker(data.speaker);
        }

        setTranscript((prev) => [...prev, personaEntry]);
        speakViaAvatar(data.response);
      }
    } catch {
      setError("Failed to get response");
    } finally {
      setIsProcessing(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  // ─── OpenAI Realtime API STT ──────────────────────────────────────────

  async function initRealtimeSTT() {
    try {
      // 1. Get ephemeral token from our backend
      const tokenRes = await fetch("/api/practice/realtime-token", { method: "POST" });
      if (!tokenRes.ok) {
        console.warn("[Realtime] Token endpoint failed, falling back to Web Speech API");
        return false;
      }

      const { ephemeralKey } = await tokenRes.json();
      if (!ephemeralKey) {
        console.warn("[Realtime] No ephemeral key returned, falling back to Web Speech API");
        return false;
      }

      // 2. Connect to Realtime API via WebSocket
      const ws = new WebSocket(
        "wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17",
        [
          "realtime",
          `openai-insecure-api-key.${ephemeralKey}`,
          "openai-beta.realtime-v1",
        ]
      );

      // 3. Handle WebSocket events
      ws.onopen = () => {
        console.log("[Realtime] WebSocket connected");

        // Update session config (in case defaults differ from token creation)
        ws.send(JSON.stringify({
          type: "session.update",
          session: {
            modalities: ["text"],
            input_audio_transcription: { model: "whisper-1" },
            turn_detection: {
              type: "server_vad",
              threshold: 0.5,
              prefix_padding_ms: 300,
              silence_duration_ms: 800,
            },
          },
        }));
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          handleRealtimeEvent(msg);
        } catch {
          // ignore parse errors
        }
      };

      ws.onerror = (err) => {
        console.error("[Realtime] WebSocket error:", err);
      };

      ws.onclose = (event) => {
        console.log("[Realtime] WebSocket closed:", event.code, event.reason);
        realtimeWsRef.current = null;
      };

      realtimeWsRef.current = ws;

      // 4. Start mic capture via AudioWorklet
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000,
        },
      });
      mediaStreamRef.current = stream;

      const audioCtx = new AudioContext({ sampleRate: 48000 });
      audioContextRef.current = audioCtx;

      await audioCtx.audioWorklet.addModule("/audio-processor.js");

      const source = audioCtx.createMediaStreamSource(stream);
      const worklet = new AudioWorkletNode(audioCtx, "realtime-audio-processor");

      worklet.port.onmessage = (e) => {
        if (e.data.type === "audio" && realtimeWsRef.current?.readyState === WebSocket.OPEN) {
          // Convert ArrayBuffer to Int16Array, then to base64
          const pcm16 = new Int16Array(e.data.buffer);
          const base64Audio = int16ToBase64(pcm16);

          realtimeWsRef.current.send(JSON.stringify({
            type: "input_audio_buffer.append",
            audio: base64Audio,
          }));
        }
      };

      source.connect(worklet);
      worklet.connect(audioCtx.destination); // required to keep worklet running
      workletNodeRef.current = worklet;

      return true;
    } catch (err) {
      console.warn("[Realtime] Init failed, falling back to Web Speech API:", err);
      return false;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function handleRealtimeEvent(msg: any) {
    switch (msg.type) {
      case "session.created":
        console.log("[Realtime] Session created");
        break;

      case "session.updated":
        console.log("[Realtime] Session config updated");
        break;

      case "input_audio_buffer.speech_started":
        // VAD detected user started speaking
        console.log("[Realtime] Speech started");
        break;

      case "input_audio_buffer.speech_stopped":
        // VAD detected user stopped speaking
        console.log("[Realtime] Speech stopped");
        break;

      case "input_audio_buffer.committed":
        // Audio buffer committed, transcription will follow
        console.log("[Realtime] Buffer committed");
        break;

      case "conversation.item.input_audio_transcription.completed":
        // Got the transcription from Whisper
        if (msg.transcript) {
          console.log("[Realtime] Transcription:", msg.transcript);
          handleUserTranscript(msg.transcript);
        }
        break;

      case "response.created":
        // The Realtime model auto-started a response. Cancel it immediately.
        // We use Claude for responses, not the Realtime model.
        if (realtimeWsRef.current?.readyState === WebSocket.OPEN) {
          realtimeWsRef.current.send(JSON.stringify({
            type: "response.cancel",
          }));
        }
        break;

      case "response.cancelled":
        // Expected after our cancel. No action needed.
        break;

      case "error":
        console.error("[Realtime] Error:", msg.error);
        break;

      default:
        // Ignore other events (response.done, etc.)
        break;
    }
  }

  function stopRealtimeSTT() {
    // Close WebSocket
    if (realtimeWsRef.current) {
      try { realtimeWsRef.current.close(); } catch { /* ok */ }
      realtimeWsRef.current = null;
    }

    // Disconnect AudioWorklet
    if (workletNodeRef.current) {
      try { workletNodeRef.current.disconnect(); } catch { /* ok */ }
      workletNodeRef.current = null;
    }

    // Close AudioContext
    if (audioContextRef.current) {
      try { audioContextRef.current.close(); } catch { /* ok */ }
      audioContextRef.current = null;
    }

    // Stop media stream tracks
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
  }

  // ─── Web Speech API Fallback ──────────────────────────────────────────

  function createWebSpeechRecognition() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognitionCtor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) return null;

    const recognition = new SpeechRecognitionCtor();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = async (event: any) => {
      const last = event.results[event.results.length - 1];
      if (last.isFinal) {
        if (isSpeakingRef.current) return;
        const userText = last[0].transcript.trim();
        if (userText) handleUserTranscript(userText);
      }
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onerror = (event: any) => {
      if (event.error !== "aborted") {
        console.error("[WebSpeech] Error:", event.error);
      }
    };

    recognition.onend = () => {
      if (micActiveRef.current && !isSpeakingRef.current) {
        try { recognition.start(); } catch { recognitionRef.current = null; }
      } else {
        recognitionRef.current = null;
      }
    };

    recognition.start();
    recognitionRef.current = recognition;
    return recognition;
  }

  function stopWebSpeechRecognition() {
    try { recognitionRef.current?.stop(); } catch { /* ok */ }
    recognitionRef.current = null;
  }

  // Resume Web Speech after avatar finishes (fallback mode only)
  function resumeWebSpeechListening() {
    if (sttMode !== "webspeech") return;
    if (!micActiveRef.current) return;
    if (isSpeakingRef.current) return;
    if (recognitionRef.current) return;
    createWebSpeechRecognition();
  }

  // ─── Mic Toggle ───────────────────────────────────────────────────────

  const startListening = useCallback(async () => {
    micActiveRef.current = true;
    setIsRecording(true);

    // If already initialized in a mode, it's running. Just flag active.
    if (sttMode === "realtime" && realtimeWsRef.current?.readyState === WebSocket.OPEN) return;
    if (sttMode === "webspeech" && recognitionRef.current) return;

    // Try Realtime API first
    const realtimeOk = await initRealtimeSTT();
    if (realtimeOk) {
      setSttMode("realtime");
      return;
    }

    // Fallback to Web Speech API
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const hasSpeechApi = ("webkitSpeechRecognition" in window) || ("SpeechRecognition" in window);
    if (hasSpeechApi) {
      if (!isSpeakingRef.current) {
        createWebSpeechRecognition();
      }
      setSttMode("webspeech");
      return;
    }

    // Neither available
    setError("Speech recognition not available. Check microphone permissions.");
    setIsRecording(false);
    micActiveRef.current = false;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sttMode]);

  const stopListening = useCallback(() => {
    micActiveRef.current = false;
    setIsRecording(false);

    if (sttMode === "realtime") {
      stopRealtimeSTT();
      setSttMode("none");
    } else if (sttMode === "webspeech") {
      stopWebSpeechRecognition();
      setSttMode("none");
    }
  }, [sttMode]);

  // ─── Init Session & Avatar ─────────────────────────────────────────────

  useEffect(() => {
    if (isLoaded && sessionId) {
      initSession();
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, sessionId]);

  // Auto-scroll transcript
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcript]);

  async function initSession(isAutoRetry = false) {
    try {
      // Clear any previous timeout
      if (avatarTimeoutRef.current) {
        clearTimeout(avatarTimeoutRef.current);
        avatarTimeoutRef.current = null;
      }

      setAvatarError(null);
      setAvatarLoading(true);
      setAvatarProgress("Getting avatar token...");
      const personaGender = searchParams.get("gender") || "male";
      const FEMALE_AVATAR = "b4fc2d60-3b82-4694-b243-93e9d2bb0242";
      const MALE_AVATAR = "bb1f6ebc-b388-4a39-9e2b-8df618e0377c";
      const isFemale = personaGender === "female";
      const avatarId = isFemale ? FEMALE_AVATAR : MALE_AVATAR;
      ttsVoiceRef.current = isFemale ? "nova" : "onyx";

      // Get LiveAvatar session token
      const tokenRes = await fetch("/api/practice/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatarId }),
      });
      const tokenData = await tokenRes.json();

      if (!tokenData.sessionToken) {
        const detail = tokenData.detail || tokenData.error || "No token returned";
        console.error("Token endpoint response:", tokenData);
        throw new Error(`Token error: ${detail}`);
      }

      setAvatarProgress("Loading avatar SDK...");

      // Dynamic import of LiveAvatar SDK
      const { LiveAvatarSession, SessionEvent, AgentEventsEnum } = await import(
        "@heygen/liveavatar-web-sdk"
      );

      const session = new LiveAvatarSession(tokenData.sessionToken, {
        voiceChat: false,
      });

      sessionRef.current = session;

      setAvatarProgress("Connecting to avatar...");

      // Set 20-second timeout for avatar connection (was 30, tighter for auto-retry)
      const timeoutPromise = new Promise<boolean>((_, reject) => {
        avatarTimeoutRef.current = setTimeout(() => {
          reject(new Error("Avatar connection timed out"));
        }, 20000);
      });

      // Race between session connection and timeout
      let connectionEstablished = false;

      session.on(SessionEvent.SESSION_STATE_CHANGED, (state: string) => {
        if (state === "CONNECTED") {
          connectionEstablished = true;
          if (avatarTimeoutRef.current) {
            clearTimeout(avatarTimeoutRef.current);
            avatarTimeoutRef.current = null;
          }

          setAvatarReady(true);
          setAvatarLoading(false);
          setAvatarError(null);

          if (videoRef.current) {
            session.attach(videoRef.current);
            videoRef.current.onplaying = () => startChromaKey();
          }

          timerRef.current = setInterval(() => {
            if (!isSpeakingRef.current) {
              setElapsed((prev) => prev + 1);
            }
          }, 1000);
        } else if (state === "DISCONNECTED" || state === "INACTIVE") {
          setAvatarReady(false);
        }
      });

      session.on(SessionEvent.SESSION_STREAM_READY, () => {
        connectionEstablished = true;
        if (avatarTimeoutRef.current) {
          clearTimeout(avatarTimeoutRef.current);
          avatarTimeoutRef.current = null;
        }

        if (videoRef.current) {
          session.attach(videoRef.current);
          videoRef.current.onplaying = () => startChromaKey();
        }
      });

      // Avatar speaking events
      session.on(AgentEventsEnum.AVATAR_SPEAK_STARTED, () => {
        setIsSpeaking(true);
        isSpeakingRef.current = true;

        if (sttMode === "webspeech" && recognitionRef.current) {
          try { recognitionRef.current.abort(); } catch { /* ok */ }
        }
      });

      session.on(AgentEventsEnum.AVATAR_SPEAK_ENDED, () => {
        setIsSpeaking(false);
        isSpeakingRef.current = false;

        if (sttMode === "webspeech" && micActiveRef.current && !recognitionRef.current) {
          resumeWebSpeechListening();
        }
      });

      try {
        await Promise.race([session.start(), timeoutPromise]);
      } catch (timeoutErr) {
        if (!connectionEstablished) {
          throw timeoutErr;
        }
      }

      setAvatarProgress("Starting conversation...");

      // Send opening line
      const openingRes = await fetch("/api/practice/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          userMessage: "[Session started. Please introduce yourself and open the meeting.]",
        }),
      });

      const openingData = await openingRes.json();
      if (openingData.response) {
        const entry: TranscriptEntry = {
          role: "persona",
          text: openingData.response,
          timestamp: new Date().toISOString(),
        };

        if (openingData.speaker) {
          entry.speaker = openingData.speaker;
          entry.speakerTitle = openingData.speakerTitle;
          setCurrentSpeaker(openingData.speaker);
          setIsPanelMode(true);
        }

        setTranscript([entry]);

        if (openingData.persona) {
          setPersona(openingData.persona);
        }

        speakViaAvatar(openingData.response);
      }
    } catch (err) {
      console.error("Init error:", err);
      const errorMsg = err instanceof Error ? err.message : "Failed to initialize avatar session";

      // Auto-retry once before showing error to user
      if (!isAutoRetry && avatarRetryCount === 0) {
        console.log("[PRACTICE] Auto-retrying avatar init...");
        setAvatarProgress("Retrying connection...");
        setAvatarRetryCount(1);
        // Clean up failed session before retry
        try { if (sessionRef.current) await sessionRef.current.stop(); } catch { /* ok */ }
        sessionRef.current = null;
        // Short delay before retry
        await new Promise((r) => setTimeout(r, 2000));
        return initSession(true);
      }

      setAvatarError(errorMsg);
      setAvatarLoading(false);
    }
  }

  function retryAvatarConnection() {
    setAvatarRetryCount((prev) => prev + 1);
    setAvatarLoading(true);
    setAvatarError(null);
    initSession(false);
  }

  function switchToTextOnly() {
    setTextOnlyMode(true);
    setAvatarLoading(false);
    setAvatarError(null);

    // Start session in text-only mode
    initiateTextOnlySession();
  }

  async function initiateTextOnlySession() {
    try {
      setIsProcessing(true);

      const openingRes = await fetch("/api/practice/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          userMessage: "[Session started. Please introduce yourself and open the meeting.]",
        }),
      });

      const openingData = await openingRes.json();
      if (openingData.response) {
        const entry: TranscriptEntry = {
          role: "persona",
          text: openingData.response,
          timestamp: new Date().toISOString(),
        };

        if (openingData.speaker) {
          entry.speaker = openingData.speaker;
          entry.speakerTitle = openingData.speakerTitle;
          setCurrentSpeaker(openingData.speaker);
          setIsPanelMode(true);
        }

        setTranscript([entry]);

        if (openingData.persona) {
          setPersona(openingData.persona);
        }
      }

      timerRef.current = setInterval(() => {
        setElapsed((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Text-only session error:", err);
      setError("Failed to start text-only session");
    } finally {
      setIsProcessing(false);
    }
  }

  // ─── Session End & Cleanup ─────────────────────────────────────────────

  async function handleEndSession() {
    setEnding(true);
    stopListening();
    if (timerRef.current) clearInterval(timerRef.current);

    try {
      await fetch("/api/practice/end", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, durationSeconds: elapsed }),
      });

      await cleanup();
      router.push(`/practice/${sessionId}/review`);
    } catch {
      setError("Failed to end session");
      setEnding(false);
    }
  }

  async function cleanup() {
    if (avatarTimeoutRef.current) {
      clearTimeout(avatarTimeoutRef.current);
      avatarTimeoutRef.current = null;
    }

    stopChromaKey();
    stopRealtimeSTT();
    stopWebSpeechRecognition();

    try {
      const session = sessionRef.current;
      if (session) {
        await session.stop();
        sessionRef.current = null;
      }
    } catch {
      // silent cleanup
    }
  }

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  // ─── Render ────────────────────────────────────────────────────────────

  if (!isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a]">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#0a0a0a] text-white">
      {/* Top Bar */}
      <div className="flex items-center justify-between border-b border-[#1a1a1a] px-6 py-3">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/practice")} className="text-neutral-500 hover:text-white transition">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className={`h-2 w-2 rounded-full ${avatarReady ? "bg-emerald-400" : "bg-amber-400 animate-pulse"}`} />
            <span className="text-sm text-neutral-400">
              {avatarReady ? "Live" : "Connecting..."}
            </span>
          </div>
          {persona && (
            <div className="hidden sm:flex items-center gap-2 ml-2 pl-3 border-l border-[#262626]">
              <span className="text-sm font-medium text-neutral-200">{persona.name}</span>
              <span className="text-xs text-neutral-400">{persona.title}, {persona.company}</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-4">
          {/* STT mode indicator */}
          {isRecording && (
            <span className="hidden sm:inline text-xs text-neutral-400 tabular-nums">
              {sttMode === "realtime" ? "Realtime STT" : sttMode === "webspeech" ? "Web Speech" : ""}
            </span>
          )}
          <div className="flex items-center gap-1.5 text-sm text-neutral-500 tabular-nums" title="Your active time (pauses while persona speaks)">
            <Clock className="h-4 w-4" />
            {formatTime(elapsed)}
          </div>
          <button
            onClick={handleEndSession}
            disabled={ending}
            className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium transition hover:bg-red-700 disabled:opacity-50"
          >
            {ending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Square className="h-4 w-4" />}
            End Session
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Video Panel */}
        <div className="flex flex-1 flex-col items-center justify-center p-8">
          {!textOnlyMode && (
            <div className="relative aspect-video w-full max-w-2xl overflow-hidden rounded-2xl bg-[#141414]">
              {avatarLoading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                  <Loader2 className="h-10 w-10 animate-spin text-emerald-400" />
                  <p className="text-sm text-neutral-500">{avatarProgress}</p>
                </div>
              )}
              {avatarError && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-[#0a0a0a]/80 backdrop-blur">
                  <div className="flex flex-col items-center gap-3">
                    <AlertCircle className="h-8 w-8 text-red-400" />
                    <div className="text-center">
                      <p className="text-sm font-medium text-red-400">Avatar connection failed</p>
                      <p className="text-xs text-neutral-500 mt-1 max-w-xs">{avatarError}</p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={retryAvatarConnection}
                      className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 transition"
                    >
                      Retry Connection
                    </button>
                    <button
                      onClick={switchToTextOnly}
                      className="rounded-lg bg-[#262626] px-4 py-2 text-sm font-medium text-white hover:bg-[#333333] transition"
                    >
                      Continue in Text Mode
                    </button>
                  </div>
                </div>
              )}
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="absolute opacity-0 pointer-events-none"
                style={{ width: 1, height: 1 }}
              />
              <canvas
                ref={canvasRef}
                className={`h-full w-full object-cover ${avatarLoading ? "opacity-0" : "opacity-100"} transition-opacity duration-500`}
              />
              {isSpeaking && (
                <div className="absolute bottom-4 left-4 flex items-center gap-2 rounded-full bg-black/60 px-3 py-1">
                  <div className="flex gap-0.5">
                    <div className="h-3 w-1 animate-pulse rounded-full bg-emerald-400" style={{ animationDelay: "0ms" }} />
                    <div className="h-3 w-1 animate-pulse rounded-full bg-emerald-400" style={{ animationDelay: "150ms" }} />
                    <div className="h-3 w-1 animate-pulse rounded-full bg-emerald-400" style={{ animationDelay: "300ms" }} />
                  </div>
                  <span className="text-xs text-neutral-400">
                    {isPanelMode && currentSpeaker ? currentSpeaker : "Speaking"}
                  </span>
                </div>
              )}
            </div>
          )}
          {textOnlyMode && (
            <div className="w-full max-w-2xl rounded-2xl bg-[#141414] p-6 text-center">
              <p className="text-sm text-neutral-400">Running in text-only mode</p>
              <p className="text-xs text-neutral-400 mt-2">Avatar video is unavailable, but you can continue practicing with text chat</p>
            </div>
          )}

          {/* Mic Controls */}
          <div className="mt-6 flex items-center gap-4">
            <button
              onClick={isRecording ? stopListening : startListening}
              disabled={(!avatarReady && !textOnlyMode) || isProcessing}
              className={`flex h-14 w-14 items-center justify-center rounded-full transition ${
                isRecording
                  ? "bg-red-600 hover:bg-red-700 ring-4 ring-red-600/30"
                  : "bg-emerald-600 hover:bg-emerald-600"
              } disabled:opacity-50`}
            >
              {isRecording ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
            </button>
            <span className="text-sm text-neutral-500">
              {isRecording ? "Listening... speak naturally" : isProcessing ? "Thinking..." : "Click mic to speak"}
            </span>
            <button
              onClick={() => setShowMobileTranscript(!showMobileTranscript)}
              className="lg:hidden flex items-center gap-1.5 rounded-lg border border-[#262626] px-3 py-2 text-sm text-neutral-500 hover:text-white hover:border-[#404040] transition"
            >
              <MessageSquare className="h-4 w-4" />
              {transcript.length > 0 && (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-xs text-white">
                  {transcript.length}
                </span>
              )}
            </button>
          </div>

          {error && (
            <div className="mt-4 flex items-center gap-2 rounded-lg bg-red-900/30 px-4 py-2 text-sm text-red-400">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}
        </div>

        {/* Transcript Panel */}
        <div className={`${showMobileTranscript ? "fixed inset-0 z-40 bg-[#0a0a0a]" : "hidden"} lg:relative lg:block lg:w-96 border-l border-[#1a1a1a] flex flex-col`}>
          <div className="border-b border-[#1a1a1a] px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-neutral-500" />
              <span className="text-sm font-medium text-neutral-400">Transcript</span>
            </div>
            <button
              onClick={() => setShowMobileTranscript(false)}
              className="lg:hidden text-sm text-neutral-500 hover:text-white transition"
            >
              Close
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {transcript.length === 0 && (
              <p className="text-sm text-neutral-400 text-center mt-8">
                Conversation will appear here...
              </p>
            )}
            {transcript.map((entry, i) => (
              <div
                key={i}
                className={`flex ${entry.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                    entry.role === "user"
                      ? "bg-emerald-600 text-white"
                      : "bg-[#141414] text-neutral-200"
                  }`}
                >
                  {entry.role === "persona" && (
                    <p className="mb-1 text-xs font-medium text-neutral-500">
                      {entry.speaker || persona?.name || "Persona"}
                      {entry.speakerTitle && isPanelMode && (
                        <span className="ml-1 text-neutral-400">&middot; {entry.speakerTitle}</span>
                      )}
                    </p>
                  )}
                  {entry.text}
                </div>
              </div>
            ))}
            <div ref={transcriptEndRef} />
          </div>
        </div>
      </div>
    </div>
  );
}
