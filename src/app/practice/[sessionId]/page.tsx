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
  speaker?: string;
  speakerTitle?: string;
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

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sessionRef = useRef<any>(null);
  const recognitionRef = useRef<ISpeechRecognition | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chromaKeyFrameRef = useRef<number | null>(null);
  const isSpeakingRef = useRef(false);  // tracks avatar speaking for mic gating
  const micActiveRef = useRef(false);   // tracks if user has mic toggled on
  const ttsVoiceRef = useRef("onyx");   // TTS voice: onyx (male) or nova (female)

  // Convert text to audio via OpenAI TTS, then send to LiveAvatar via repeatAudio()
  async function speakViaAvatar(text: string) {
    const session = sessionRef.current;
    if (!session) return;

    try {
      // Get PCM audio from our TTS endpoint
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

      // Send each ~1s chunk to LiveAvatar via repeatAudio (maps to agent.speak)
      for (const chunk of chunks) {
        session.repeatAudio(chunk);
      }
    } catch (err) {
      console.error("speakViaAvatar error:", err);
    }
  }

  // Chroma key: process video frames to remove green background
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

      // Match canvas size to video
      if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
      }

      ctx.drawImage(video, 0, 0);
      const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = frame.data;

      // Replace green pixels with dark gray (matching bg-gray-800 = #1f2937)
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        // Green screen detection: high green, low red, low blue
        if (g > 100 && g > r * 1.4 && g > b * 1.4) {
          data[i] = 31;      // R (gray-800)
          data[i + 1] = 41;  // G
          data[i + 2] = 55;  // B
          data[i + 3] = 255; // A
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

  // Load session data and initialize avatar
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

  async function initSession() {
    try {
      // Select avatar based on persona name (passed via URL query param)
      const personaName = searchParams.get("persona") || "";
      const FEMALE_AVATAR = "b4fc2d60-3b82-4694-b243-93e9d2bb0242"; // Anastasia in Grey Shirt
      const MALE_AVATAR = "bb1f6ebc-b388-4a39-9e2b-8df618e0377c";   // Graham in Black Shirt
      const femaleNames = ["sarah", "maria", "rachel", "jennifer", "jessica", "emily", "emma", "olivia", "sophia", "isabella", "ava", "mia", "charlotte", "amelia", "lisa", "patricia", "linda", "elizabeth", "barbara", "susan", "margaret", "dorothy", "sandra", "ashley", "kimberly", "donna", "carol", "michelle", "amanda", "melissa", "deborah", "stephanie", "rebecca", "laura", "helen", "anna", "samantha", "katherine", "christine", "debra", "diana", "natalie", "angela", "julie", "karen", "nancy", "betty", "parul", "aviva", "nina", "tracy"];
      const firstNameLower = personaName.split(" ")[0]?.toLowerCase() || "";
      const isFemale = femaleNames.includes(firstNameLower);
      const avatarId = isFemale ? FEMALE_AVATAR : MALE_AVATAR;
      ttsVoiceRef.current = isFemale ? "nova" : "onyx";

      // Get LiveAvatar session token from our backend
      const tokenRes = await fetch("/api/practice/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatarId }),
      });
      const tokenData = await tokenRes.json();

      if (!tokenData.sessionToken) {
        const detail = tokenData.detail || tokenData.error || "No token returned";
        console.error("Token endpoint response:", tokenData);
        setError(`Failed to get avatar session token: ${detail}`);
        setAvatarLoading(false);
        return;
      }

      // Dynamic import of LiveAvatar SDK (client-side only)
      const { LiveAvatarSession, SessionEvent, AgentEventsEnum } = await import(
        "@heygen/liveavatar-web-sdk"
      );

      // Create session in CUSTOM mode (voiceChat: false)
      // We handle STT (Web Speech API), LLM (Claude), and TTS (OpenAI) ourselves
      // LiveAvatar handles avatar video rendering + lip sync only
      const session = new LiveAvatarSession(tokenData.sessionToken, {
        voiceChat: false,
      });

      sessionRef.current = session;

      // Listen for session state changes
      session.on(SessionEvent.SESSION_STATE_CHANGED, (state: string) => {
        if (state === "CONNECTED") {
          setAvatarReady(true);
          setAvatarLoading(false);

          // Attach video stream to element
          if (videoRef.current) {
            session.attach(videoRef.current);
            videoRef.current.onplaying = () => startChromaKey();
          }

          // Start timer
          timerRef.current = setInterval(() => {
            setElapsed((prev) => prev + 1);
          }, 1000);
        } else if (state === "DISCONNECTED" || state === "INACTIVE") {
          setAvatarReady(false);
        }
      });

      session.on(SessionEvent.SESSION_STREAM_READY, () => {
        // Stream is ready, attach to video element
        if (videoRef.current) {
          session.attach(videoRef.current);
          // Start chroma key processing once video is playing
          videoRef.current.onplaying = () => startChromaKey();
        }
      });

      // Avatar speaking events: mute mic to prevent feedback loop
      session.on(AgentEventsEnum.AVATAR_SPEAK_STARTED, () => {
        setIsSpeaking(true);
        isSpeakingRef.current = true;
        // Pause speech recognition while avatar is speaking
        if (recognitionRef.current) {
          try { recognitionRef.current.abort(); } catch { /* ok */ }
        }
      });

      session.on(AgentEventsEnum.AVATAR_SPEAK_ENDED, () => {
        setIsSpeaking(false);
        isSpeakingRef.current = false;
        // Resume speech recognition if user had mic on
        if (micActiveRef.current && !recognitionRef.current) {
          resumeListening();
        }
      });

      // Start the LiveAvatar session
      await session.start();

      // Send opening line via our Claude-powered backend
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

        // Handle panel mode speaker info
        if (openingData.speaker) {
          entry.speaker = openingData.speaker;
          entry.speakerTitle = openingData.speakerTitle;
          setCurrentSpeaker(openingData.speaker);
          setIsPanelMode(true);
        }

        setTranscript([entry]);

        // Set persona info from the response if available
        if (openingData.persona) {
          setPersona(openingData.persona);
        }

        // Convert text to audio via OpenAI TTS, send to avatar for lip sync
        speakViaAvatar(openingData.response);
      }
    } catch (err) {
      console.error("Init error:", err);
      setError("Failed to initialize avatar session. Check console for details.");
      setAvatarLoading(false);
    }
  }

  // Helper: create and start a new speech recognition instance
  function createRecognition() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognitionCtor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) return null;

    const recognition = new SpeechRecognitionCtor() as ISpeechRecognition;
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognition.onresult = async (event) => {
      const last = event.results[event.results.length - 1];
      if (last.isFinal) {
        // Drop any transcript that arrives while avatar is speaking (safety net)
        if (isSpeakingRef.current) return;

        const userText = last[0].transcript.trim();
        if (!userText) return;

        // Add to transcript
        setTranscript((prev) => [
          ...prev,
          { role: "user", text: userText, timestamp: new Date().toISOString() },
        ]);

        // Send to Claude backend
        setIsProcessing(true);
        try {
          const res = await fetch("/api/practice/message", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sessionId, userMessage: userText }),
          });

          const data = await res.json();
          if (data.response) {
            const personaEntry: TranscriptEntry = {
              role: "persona",
              text: data.response,
              timestamp: new Date().toISOString(),
            };

            // Handle panel mode speaker info
            if (data.speaker) {
              personaEntry.speaker = data.speaker;
              personaEntry.speakerTitle = data.speakerTitle;
              setCurrentSpeaker(data.speaker);
            }

            setTranscript((prev) => [...prev, personaEntry]);

            // Convert text to audio via OpenAI TTS, send to avatar for lip sync
            speakViaAvatar(data.response);
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

    // Auto-restart if recognition ends while mic should be active
    recognition.onend = () => {
      if (micActiveRef.current && !isSpeakingRef.current) {
        // Recognition ended unexpectedly (Chrome does this), restart
        try {
          recognition.start();
        } catch {
          recognitionRef.current = null;
        }
      } else {
        recognitionRef.current = null;
      }
    };

    recognition.start();
    recognitionRef.current = recognition;
    return recognition;
  }

  // Resume listening after avatar finishes speaking
  function resumeListening() {
    if (!micActiveRef.current) return;
    if (isSpeakingRef.current) return;
    if (recognitionRef.current) return;
    createRecognition();
    setIsRecording(true);
  }

  // Speech recognition (Web Speech API)
  const startListening = useCallback(() => {
    if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
      setError("Speech recognition not supported in this browser. Use Chrome.");
      return;
    }

    // Don't start if avatar is currently speaking
    if (isSpeakingRef.current) {
      micActiveRef.current = true;  // flag so it auto-starts when avatar finishes
      setIsRecording(true);
      return;
    }

    micActiveRef.current = true;
    createRecognition();
    setIsRecording(true);
  }, [sessionId]);

  const stopListening = useCallback(() => {
    micActiveRef.current = false;
    try { recognitionRef.current?.stop(); } catch { /* ok */ }
    recognitionRef.current = null;
    setIsRecording(false);
  }, []);

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
    stopChromaKey();
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
          <button onClick={() => router.push("/practice")} className="text-gray-400 hover:text-white transition">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className={`h-2 w-2 rounded-full ${avatarReady ? "bg-emerald-400" : "bg-amber-400 animate-pulse"}`} />
            <span className="text-sm text-gray-300">
              {avatarReady ? "Live" : "Connecting..."}
            </span>
          </div>
          {persona && (
            <div className="hidden sm:flex items-center gap-2 ml-2 pl-3 border-l border-gray-700">
              <span className="text-sm font-medium text-gray-200">{persona.name}</span>
              <span className="text-xs text-gray-500">{persona.title}, {persona.company}</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-sm text-gray-400 tabular-nums">
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
            {/* Hidden video element receives the LiveAvatar stream */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="absolute opacity-0 pointer-events-none"
              style={{ width: 1, height: 1 }}
            />
            {/* Canvas displays chroma-keyed video (green screen removed) */}
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
                <span className="text-xs text-gray-300">
                  {isPanelMode && currentSpeaker ? currentSpeaker : "Speaking"}
                </span>
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
            {/* Mobile transcript toggle */}
            <button
              onClick={() => setShowMobileTranscript(!showMobileTranscript)}
              className="lg:hidden flex items-center gap-1.5 rounded-lg border border-gray-700 px-3 py-2 text-sm text-gray-400 hover:text-white hover:border-gray-500 transition"
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

        {/* Transcript Panel — desktop: sidebar, mobile: overlay */}
        <div className={`${showMobileTranscript ? "fixed inset-0 z-40 bg-gray-900" : "hidden"} lg:relative lg:block lg:w-96 border-l border-gray-800 flex flex-col`}>
          <div className="border-b border-gray-800 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-gray-400" />
              <span className="text-sm font-medium text-gray-300">Transcript</span>
            </div>
            <button
              onClick={() => setShowMobileTranscript(false)}
              className="lg:hidden text-sm text-gray-400 hover:text-white transition"
            >
              Close
            </button>
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
                  {entry.role === "persona" && (
                    <p className="mb-1 text-xs font-medium text-gray-400">
                      {entry.speaker || persona?.name || "Persona"}
                      {entry.speakerTitle && isPanelMode && (
                        <span className="ml-1 text-gray-500">&middot; {entry.speakerTitle}</span>
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
