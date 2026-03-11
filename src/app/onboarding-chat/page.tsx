"use client";

import { useChat } from "ai/react";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Send,
  Bot,
  User,
  CheckCircle2,
  Circle,
  Loader2,
  ArrowRight,
  ArrowLeft,
  Mic,
  MicOff,
  Paperclip,
} from "lucide-react";
import { useVoiceInput } from "@/hooks/useVoiceInput";

// Phase tracking for the sidebar progress indicator
const PHASES = [
  { id: "identity", label: "Identity & Role", description: "Company, product, market" },
  { id: "stories", label: "Deal Stories", description: "2-4 reusable stories" },
  { id: "methodology", label: "Selling Style", description: "Methodology & preferences" },
  { id: "situation", label: "Current Situation", description: "What you need right now" },
];

export default function OnboardingChatPage() {
  const router = useRouter();
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const resumeFileRef = useRef<HTMLInputElement>(null);
  const [completedPhases, setCompletedPhases] = useState<Set<string>>(new Set());
  const [onboardingDone, setOnboardingDone] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);

  const { isListening, isSupported: voiceSupported, interimTranscript, toggleListening } =
    useVoiceInput({
      onTranscript: (text) => {
        setInput((prev: string) => (prev ? prev.trimEnd() + " " + text : text));
      },
    });

  const { messages, input, handleInputChange, handleSubmit, isLoading, setInput } =
    useChat({
      api: "/api/chat/onboarding",
      initialMessages: [],
      onToolCall: ({ toolCall }) => {
        // Track phase completion from tool calls
        if (toolCall.toolName === "save_profile_section") {
          const args = toolCall.args as any;
          if (args.section === "identity") setCompletedPhases((p) => new Set(p).add("identity"));
          if (args.section === "methodology") setCompletedPhases((p) => new Set(p).add("methodology"));
          if (args.section === "situation") setCompletedPhases((p) => new Set(p).add("situation"));
        }
        if (toolCall.toolName === "save_deal_story") {
          setCompletedPhases((p) => new Set(p).add("stories"));
        }
        if (toolCall.toolName === "mark_onboarding_complete") {
          setOnboardingDone(true);
        }
      },
    });

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Handle textarea submit on Enter (without shift)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (input.trim() && !isLoading) {
        handleSubmit(e as any);
      }
    }
  };

  // Quick suggestion handler
  const handleSuggestion = (text: string) => {
    setInput(text);
    // Auto-submit after a brief delay
    setTimeout(() => {
      const form = document.getElementById("chat-form") as HTMLFormElement;
      if (form) form.requestSubmit();
    }, 50);
  };

  // Handle resume file upload in chat
  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingFile(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/profile/upload-resume", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (res.ok && data.success) {
        // Inject extracted text as a user message so the AI can process it
        const resumeMessage = `Here's my resume (uploaded from ${data.fileName}):\n\n${data.text}`;
        setInput(resumeMessage);
        // Auto-submit after brief delay
        setTimeout(() => {
          const form = document.getElementById("chat-form") as HTMLFormElement;
          if (form) form.requestSubmit();
        }, 50);
      } else {
        setInput(`I tried uploading my resume but got an error: ${data.error || "processing failed"}. Let me paste it instead.`);
      }
    } catch {
      setInput("I tried uploading my resume but the upload failed. Let me paste it instead.");
    } finally {
      setUploadingFile(false);
      if (resumeFileRef.current) resumeFileRef.current.value = "";
    }
  }

  // Show suggestions only when conversation is empty
  const showSuggestions = messages.length === 0;

  return (
    <div className="flex h-screen bg-[#0a0a0a]">
      {/* Sidebar: Progress Tracker */}
      <aside className="hidden md:flex w-72 flex-col border-r border-[#262626] bg-[#141414] p-6">
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-white">Setup Progress</h2>
          <p className="text-sm text-neutral-400 mt-1">
            Your context powers every Sales Blitz output.
          </p>
        </div>

        <nav className="flex-1 space-y-4">
          {PHASES.map((phase) => {
            const done = completedPhases.has(phase.id);
            return (
              <div
                key={phase.id}
                className={`flex items-start gap-3 p-3 rounded-lg transition-colors ${
                  done ? "bg-green-500/10" : "bg-[#0a0a0a]"
                }`}
              >
                {done ? (
                  <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                ) : (
                  <Circle className="w-5 h-5 text-neutral-500 mt-0.5 flex-shrink-0" />
                )}
                <div>
                  <p
                    className={`text-sm font-medium ${
                      done ? "text-green-400" : "text-neutral-200"
                    }`}
                  >
                    {phase.label}
                  </p>
                  <p className="text-xs text-neutral-400">{phase.description}</p>
                </div>
              </div>
            );
          })}
        </nav>

        {onboardingDone && (
          <button
            onClick={() => router.push("/dashboard")}
            className="mt-6 flex items-center justify-center gap-2 w-full px-4 py-3 bg-[#141414] text-white rounded-lg hover:bg-[#1a1a1a] transition-colors text-sm font-medium"
          >
            Go to Dashboard
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </aside>

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col">
        {/* Header */}
        <header className="flex items-center justify-between px-6 py-4 border-b border-[#262626] bg-[#141414]">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/dashboard")}
              className="flex items-center justify-center w-8 h-8 rounded-lg text-neutral-500 hover:text-neutral-300 hover:bg-[#1a1a1a] transition-colors"
              title="Back to dashboard"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h1 className="text-lg font-semibold text-white">Sales Blitz Setup</h1>
              <p className="text-sm text-neutral-400">
                {onboardingDone
                  ? "Setup complete. Head to the dashboard."
                  : "Company name & URL. We'll research the rest."}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Mobile phase counter */}
            <div className="md:hidden text-sm text-neutral-400">
              {completedPhases.size}/4 complete
            </div>
            {!onboardingDone && (
              <button
                onClick={() => router.push("/dashboard")}
                className="hidden md:inline-flex text-xs text-neutral-500 hover:text-neutral-300 transition-colors"
              >
                Skip for now
              </button>
            )}
          </div>
        </header>

        {/* Messages */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto px-4 md:px-6 py-6 space-y-6"
        >
          {/* Welcome message (always shown at top) */}
          {messages.length === 0 && (
            <div className="max-w-2xl mx-auto">
              <div className="flex gap-3 mb-6">
                <div className="w-8 h-8 rounded-full bg-[#141414] flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div className="bg-[#141414] border border-[#262626] rounded-2xl rounded-tl-md px-4 py-3 max-w-lg">
                  <p className="text-sm text-neutral-100 leading-relaxed">
                    Let's get you set up. Two things to start: your company name and website URL. I'll research the rest so you don't have to.
                  </p>
                  <p className="text-sm text-neutral-100 leading-relaxed mt-2">
                    Takes about 3 minutes. Most of that is me doing homework, not you.
                  </p>
                </div>
              </div>

              {/* Suggestion chips */}
              {showSuggestions && (
                <div className="ml-11 flex flex-wrap gap-2">
                  {[
                    "I work at Salesforce, salesforce.com",
                    "I'm at a startup called Acme, acme.io",
                    "I work at Gong, gong.io",
                    "I'm between roles, prepping for interviews",
                  ].map((suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => handleSuggestion(suggestion)}
                      className="text-xs px-3 py-1.5 bg-[#1a1a1a] hover:bg-[#262626] text-neutral-200 rounded-full transition-colors border border-[#262626]"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Conversation messages */}
          {messages.map((message) => {
            // Skip tool/data results from rendering
            if ((message.role as string) === "tool" || message.role === "data") return null;

            const isUser = message.role === "user";
            const isAssistant = message.role === "assistant";

            // For assistant messages, filter out tool call parts
            // Only render text content
            let textContent = "";
            const content: any = message.content;
            if (typeof content === "string") {
              textContent = content;
            } else if (Array.isArray(content)) {
              textContent = content
                .filter((part: any) => part.type === "text")
                .map((part: any) => part.text)
                .join("");
            }

            // Don't render empty assistant messages (tool-only responses)
            if (isAssistant && !textContent.trim()) return null;

            return (
              <div key={message.id} className="max-w-2xl mx-auto">
                <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}>
                  {/* Avatar */}
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      isUser ? "bg-emerald-600" : "bg-[#141414]"
                    }`}
                  >
                    {isUser ? (
                      <User className="w-4 h-4 text-white" />
                    ) : (
                      <Bot className="w-4 h-4 text-white" />
                    )}
                  </div>

                  {/* Message bubble */}
                  <div
                    className={`px-4 py-3 max-w-lg text-sm leading-relaxed whitespace-pre-wrap ${
                      isUser
                        ? "bg-emerald-600 text-white rounded-2xl rounded-tr-md"
                        : "bg-[#141414] border border-[#262626] text-neutral-100 rounded-2xl rounded-tl-md"
                    }`}
                  >
                    {textContent}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Loading indicator */}
          {isLoading && (
            <div className="max-w-2xl mx-auto">
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-[#141414] flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div className="bg-[#141414] border border-[#262626] rounded-2xl rounded-tl-md px-4 py-3">
                  <Loader2 className="w-4 h-4 text-neutral-500 animate-spin" />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="border-t border-[#262626] bg-[#141414] px-4 md:px-6 py-4">
          {isListening && interimTranscript && (
            <div className="max-w-2xl mx-auto mb-2">
              <p className="truncate rounded bg-[#1a1a1a] px-3 py-1.5 text-xs text-neutral-400 italic">
                {interimTranscript}
              </p>
            </div>
          )}
          <form
            id="chat-form"
            onSubmit={handleSubmit}
            className="max-w-2xl mx-auto flex items-end gap-3"
          >
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={input}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder={
                  onboardingDone
                    ? "Onboarding complete. Ask me anything or head to the dashboard."
                    : "Type your response..."
                }
                rows={1}
                className="w-full resize-none rounded-xl border border-[#333333] bg-[#0a0a0a] px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent placeholder:text-neutral-500 max-h-32 overflow-y-auto"
                style={{
                  height: "auto",
                  minHeight: "44px",
                }}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = "auto";
                  target.style.height = Math.min(target.scrollHeight, 128) + "px";
                }}
              />
            </div>
            {/* File attachment */}
            <input
              ref={resumeFileRef}
              type="file"
              accept=".pdf,.docx,.txt"
              onChange={handleFileUpload}
              className="hidden"
              id="chat-file-upload"
            />
            <button
              type="button"
              onClick={() => resumeFileRef.current?.click()}
              disabled={uploadingFile || isLoading}
              title="Upload resume (PDF, DOCX, TXT)"
              className={`flex items-center justify-center w-10 h-10 rounded-xl transition-colors flex-shrink-0 ${
                uploadingFile
                  ? "bg-emerald-500/15 text-emerald-400 animate-pulse"
                  : "bg-[#1a1a1a] text-neutral-500 hover:bg-[#262626] hover:text-neutral-300"
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {uploadingFile ? <Loader2 className="w-4 h-4 animate-spin" /> : <Paperclip className="w-4 h-4" />}
            </button>
            {voiceSupported && (
              <button
                type="button"
                onClick={toggleListening}
                title={isListening ? "Stop listening" : "Voice input"}
                className={`flex items-center justify-center w-10 h-10 rounded-xl transition-colors flex-shrink-0 ${
                  isListening
                    ? "bg-red-500/15 text-red-400 animate-pulse"
                    : "bg-[#1a1a1a] text-neutral-500 hover:bg-[#262626] hover:text-neutral-300"
                }`}
              >
                {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>
            )}
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="flex items-center justify-center w-10 h-10 rounded-xl bg-[#141414] text-white hover:bg-[#1a1a1a] disabled:bg-neutral-700 disabled:cursor-not-allowed transition-colors flex-shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
