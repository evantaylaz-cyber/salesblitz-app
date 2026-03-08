"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useUser } from "@clerk/nextjs";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Mic,
  MicOff,
  Square,
  Loader2,
  MessageSquare,
  Clock,
  Video,
  VideoOff,
  AlertCircle,
} from "lucide-react";

// Web Speech API type declarations (not in default TS lib)
interface ISpeechRecognition {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: { results: { [index: number]: { [index: number]: { transcript: string }; isFinal: boolean }; length: number } }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
}

interface TranscriptEntry {
  role: "user" | "persona";
  text: string;
  timestamp: string;
}

export default function PracticeSessionPage() {
  const { isLoaded } = useUser();
  const params = useParams();
  const router = useRouter();
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

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const avatarRef = useRef<unknown>(null);
  const recognitionRef = useRef<ISpeechRecognition | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  // Load session data and initialize avatar
  useEffect(() => {
    if (isLoaded && sessionId) {
      initSession();
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      cleanup();
    };
  }, [isLoaded, sessionId]);

  // Auto-scroll transcript
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcript]);

  async function initSession() {
    try {
      // Fetch session data to get persona
      const sessionRes = await fetch(`/api/practice/history`);
      const historyData = await sessionRes.json();
      // Find this session (or load directly)
      // For now, we proceed with avatar init and get persona from start response

      // Get HeyGen token
      const tokenRes = await fetch("/api/practice/token", { method: "POST" });
      const tokenData = await tokenRes.json();

      if (!tokenData.token) {
        setError("Failed to get avatar session token. Check your HeyGen API key.");
        setAvatarLoading(false);
        return;
      }

      // Dynamic import of HeyGen SDK (client-side only)
      const { default: StreamingAvatar, StreamingEvents, AvatarQuality, TaskType } = await import(
        "@heygen/streaming-avatar"
      );

      const avatar = new StreamingAvatar({ token: tokenData.token });
      avatarRef.current = avatar;

      // Listen for stream ready
      avatar.on(StreamingEvents.STREAM_READY, (event: { detail: MediaStream }) => {
        if (videoRef.current) {
          videoRef.current.srcObject = event.detail;
          videoRef.current.play().catch(() => {});
        }
        setAvatarReady(true);
        setAvatarLoading(false);

        // Start timer
        timerRef.current = setInterval(() => {
          setElapsed((prev) => prev + 1);
        }, 1000);
      });

      avatar.on(StreamingEvents.STREAM_DISCONNECTED, () => {
        setAvatarReady(false);
      });

      // Start the avatar with professional config
      // Uses Wayne (professional male) or Anna (professional female) avatar
      // Voice emotion set to FRIENDLY for natural conversational tone
      await avatar.createStartAvatar({
        avatarName: "Wayne_20240711",
        quality: AvatarQuality.High,
        language: "en",
        voice: {
          voiceId: "",  // Empty = use avatar's default voice
          rate: 1.0,
          emotion: "FRIENDLY" as never,
        },
      });

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
        setTranscript([
          {
            role: "persona",
            text: openingData.response,
            timestamp: new Date().toISOString(),
          },
        ]);

        // Have avatar speak the opening
        setIsSpeaking(true);
        await avatar.speak({ text: openingData.response, taskType: TaskType.REPEAT });
        setIsSpeaking(false);
      }
    } catch (err) {
      console.error("Init error:", err);
      setError("Failed to initialize avatar. Make sure @heygen/streaming-avatar is installed.");
      setAvatarLoading(false);
    }
  }

  // Speech recognition (Web Speech API)
  const startListening = useCallback(() => {
    if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
      setError("Speech recognition not supported in this browser. Use Chrome.");
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognitionCtor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognitionCtor) return;

    const recognition = new SpeechRecognitionCtor() as ISpeechRecognition;
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognition.onresult = async (event) => {
      const last = event.results[event.results.length - 1];
      if (last.isFinal) {
        const userText = last[0].transcript.trim();
        if (!userText) return;

        // Add to transcript
        setTranscript((prev) => [
          ...prev,
          { role: "user", text: userText, timestamp: new Date().toISOString() },
        ]);

        // Send to backend
        setIsProcessing(true);
        try {
          const res = await fetch("/api/practice/message", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sessionId, userMessage: userText }),
          });

          const data = await res.json();
          if (data.response) {
            setTranscript((prev) => [
              ...prev,
              { role: "persona", text: data.response, timestamp: new Date().toISOString() },
            ]);

            // Have avatar speak
            if (avatarRef.current) {
              setIsSpeaking(true);
              const { TaskType } = await import("@heygen/streaming-avatar");
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              await (avatarRef.current as any).speak({ text: data.response, taskType: TaskType.REPEAT });
              setIsSpeaking(false);
            }
          }
        } catch {
          setError("Failed to get response");
        } finally {
          setIsProcessing(false);
        }
      }
    };

    recognition.onerror = (event) => {
      if (event.error !== "aborted") {
        console.error("Speech error:", event.error);
      }
    };

    recognition.start();
    recognitionRef.current = recognition;
    setIsRecording(true);
  }, [sessionId]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setIsRecording(false);
  }, []);

  async function handleEndSession() {
    setEnding(true);
    stopListening();
    if (timerRef.current) clearInterval(timerRef.current);

    try {
      const res = await fetch("/api/practice/end", {
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
    try {
      const avatar = avatarRef.current as { stopAvatar: () => Promise<void> } | null;
      if (avatar) {
        await avatar.stopAvatar();
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

  if (!isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-900">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-900 text-white">
      {/* Top Bar */}
      <div className="flex items-center justify-between border-b border-gray-800 px-6 py-3">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/practice")} className="text-gray-400 hover:text-white">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className={`h-2 w-2 rounded-full ${avatarReady ? "bg-emerald-400" : "bg-amber-400 animate-pulse"}`} />
            <span className="text-sm text-gray-300">
              {avatarReady ? "Live" : "Connecting..."}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-sm text-gray-400">
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
          <div className="relative aspect-video w-full max-w-2xl overflow-hidden rounded-2xl bg-gray-800">
            {avatarLoading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                <Loader2 className="h-10 w-10 animate-spin text-emerald-400" />
                <p className="text-sm text-gray-400">Starting avatar...</p>
              </div>
            )}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className={`h-full w-full object-cover ${avatarLoading ? "opacity-0" : "opacity-100"} transition-opacity duration-500`}
            />
            {isSpeaking && (
              <div className="absolute bottom-4 left-4 flex items-center gap-2 rounded-full bg-black/60 px-3 py-1">
                <div className="flex gap-0.5">
                  <div className="h-3 w-1 animate-pulse rounded-full bg-emerald-400" style={{ animationDelay: "0ms" }} />
                  <div className="h-3 w-1 animate-pulse rounded-full bg-emerald-400" style={{ animationDelay: "150ms" }} />
                  <div className="h-3 w-1 animate-pulse rounded-full bg-emerald-400" style={{ animationDelay: "300ms" }} />
                </div>
                <span className="text-xs text-gray-300">Speaking</span>
              </div>
            )}
          </div>

          {/* Mic Controls */}
          <div className="mt-6 flex items-center gap-4">
            <button
              onClick={isRecording ? stopListening : startListening}
              disabled={!avatarReady || isProcessing}
              className={`flex h-14 w-14 items-center justify-center rounded-full transition ${
                isRecording
                  ? "bg-red-600 hover:bg-red-700 ring-4 ring-red-600/30"
                  : "bg-emerald-600 hover:bg-emerald-700"
              } disabled:opacity-50`}
            >
              {isRecording ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
            </button>
            <span className="text-sm text-gray-400">
              {isRecording ? "Listening... speak naturally" : isProcessing ? "Thinking..." : "Click mic to speak"}
            </span>
          </div>

          {error && (
            <div className="mt-4 flex items-center gap-2 rounded-lg bg-red-900/30 px-4 py-2 text-sm text-red-400">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}
        </div>

        {/* Transcript Panel */}
        <div className="w-96 border-l border-gray-800 flex flex-col">
          <div className="border-b border-gray-800 px-4 py-3">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-gray-400" />
              <span className="text-sm font-medium text-gray-300">Transcript</span>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {transcript.length === 0 && (
              <p className="text-sm text-gray-500 text-center mt-8">
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
                      : "bg-gray-800 text-gray-200"
                  }`}
                >
                  {entry.role === "persona" && persona && (
                    <p className="mb-1 text-xs font-medium text-gray-400">{persona.name}</p>
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
