"use client";

import { useChat } from "ai/react";
import { useEffect, useRef, useState } from "react";
import {
  Send,
  Bot,
  User,
  CheckCircle2,
  Circle,
  Loader2,
  X,
  MessageSquare,
  Sparkles,
  ChevronDown,
  Mic,
  MicOff,
  Paperclip,
} from "lucide-react";
import { useVoiceInput } from "@/hooks/useVoiceInput";

const LAYERS = [
  { depth: 1, label: "Essentials" },
  { depth: 2, label: "Methodology" },
  { depth: 3, label: "Territory" },
  { depth: 4, label: "Writing Style" },
];

interface OnboardingChatBubbleProps {
  /** If true, the chat panel starts open */
  defaultOpen?: boolean;
  /** Callback when onboarding depth changes */
  onDepthChange?: (depth: number) => void;
  /** Current onboarding depth from DB (0-4) */
  currentDepth?: number;
}

export default function OnboardingChatBubble({
  defaultOpen = false,
  onDepthChange,
  currentDepth = 0,
}: OnboardingChatBubbleProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [isMinimized, setIsMinimized] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const resumeFileRef = useRef<HTMLInputElement>(null);
  const [depth, setDepth] = useState(currentDepth);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);

  const { messages, input, handleInputChange, handleSubmit, isLoading, setInput, append, error } =
    useChat({
      api: "/api/chat/onboarding",
      initialMessages: [],
      onError: (err) => {
        console.error("[OnboardingChat] Error:", err);
      },
      onToolCall: ({ toolCall }) => {
        if (toolCall.toolName === "advance_onboarding_depth") {
          const args = toolCall.args as any;
          const newDepth = args.depth || 1;
          setDepth(newDepth);
          onDepthChange?.(newDepth);
        }
      },
    });

  // Track input value in a ref so the voice callback always sees current state
  const inputValueRef = useRef(input);
  useEffect(() => {
    inputValueRef.current = input;
  }, [input]);

  const { isListening, isSupported: voiceSupported, interimTranscript, toggleListening } =
    useVoiceInput({
      onTranscript: (text) => {
        // When speech ends, populate the input field for review before sending
        const current = inputValueRef.current;
        const combined = current ? current + " " + text : text;
        setInput(combined);
        // Resize the textarea after voice input
        setTimeout(() => {
          if (inputRef.current) {
            inputRef.current.style.height = "auto";
            inputRef.current.style.height =
              Math.min(inputRef.current.scrollHeight, 96) + "px";
          }
        }, 50);
      },
    });

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen && !isMinimized) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, isMinimized]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (input.trim() && !isLoading) {
        setHasInteracted(true);
        handleSubmit(e as any);
      }
    }
  };

  const handleSuggestion = (text: string) => {
    setHasInteracted(true);
    append({ role: "user", content: text });
  };

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
        setHasInteracted(true);
        append({
          role: "user",
          content: `Here's my resume (uploaded from ${data.fileName}):\n\n${data.text}`,
        });
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

  const showSuggestions = messages.length === 0;

  const profileDone = depth >= 4;

  // Floating button when closed
  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full bg-emerald-600 px-5 py-3 text-white shadow-lg hover:bg-emerald-600 transition-all hover:shadow-xl group"
      >
        {profileDone ? (
          <>
            <MessageSquare className="h-5 w-5" />
            <span className="text-sm font-medium">AI Assistant</span>
          </>
        ) : (
          <>
            <Sparkles className="h-5 w-5" />
            <span className="text-sm font-medium">{depth === 0 ? "Set Up Profile" : "Continue Setup"}</span>
            {depth > 0 && (
              <span className="ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#141414]/20 text-xs">
                {depth}/4
              </span>
            )}
          </>
        )}
      </button>
    );
  }

  // Minimized bar at bottom
  if (isMinimized) {
    return (
      <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-2xl bg-[#141414] border border-[#262626] shadow-xl px-4 py-3 cursor-pointer hover:shadow-2xl transition-all"
        onClick={() => setIsMinimized(false)}
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/15">
          <Bot className="h-4 w-4 text-emerald-400" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-white">Sales Blitz Setup</p>
          <p className="text-xs text-neutral-400">
            {profileDone ? "Complete" : `${depth}/4 layers`}
          </p>
        </div>
        {isLoading && <Loader2 className="h-4 w-4 animate-spin text-emerald-400" />}
        <button
          onClick={(e) => { e.stopPropagation(); setIsOpen(false); }}
          className="text-neutral-500 hover:text-neutral-300"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  // Full chat panel
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col w-[420px] h-[600px] max-h-[80vh] rounded-2xl bg-[#141414] border border-[#262626] shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#262626] bg-gradient-to-r from-emerald-950/40 to-[#141414]">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/15">
            <Bot className="h-4 w-4 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">
              {profileDone ? "AI Assistant" : "Profile Setup"}
            </h3>
            <p className="text-xs text-neutral-400">
              {profileDone ? "Ask anything about your runs or profile" : `Layer ${depth}/4`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {/* Progress dots — only during onboarding */}
          {!profileDone && (
            <div className="flex gap-1 mr-2">
              {LAYERS.map((layer) => (
                <div
                  key={layer.depth}
                  className={`h-2 w-2 rounded-full transition-colors ${
                    depth >= layer.depth ? "bg-green-500/100" : "bg-[#262626]"
                  }`}
                  title={layer.label}
                />
              ))}
            </div>
          )}
          <button
            onClick={() => setIsMinimized(true)}
            className="p-1 text-neutral-500 hover:text-neutral-300 rounded-md hover:bg-[#1a1a1a]"
            title="Minimize"
          >
            <ChevronDown className="h-4 w-4" />
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1 text-neutral-500 hover:text-neutral-300 rounded-md hover:bg-[#1a1a1a]"
            title="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Messages area */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-4"
      >
        {/* Welcome message */}
        {messages.length === 0 && (
          <>
            <div className="flex gap-2.5">
              <div className="w-7 h-7 rounded-full bg-[#141414] flex items-center justify-center flex-shrink-0">
                <Bot className="w-3.5 h-3.5 text-white" />
              </div>
              <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-2xl rounded-tl-md px-3.5 py-2.5 max-w-[300px]">
                {profileDone ? (
                  <>
                    <p className="text-sm text-neutral-100 leading-relaxed">
                      Hey! Need to update your profile, add deal stories, or tweak your selling style?
                    </p>
                    <p className="text-sm text-neutral-100 leading-relaxed mt-1.5">
                      Just tell me what to change.
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-neutral-100 leading-relaxed">
                      Let's get you set up. Takes about 3 minutes, and I do the heavy lifting.
                    </p>
                    <p className="text-sm text-neutral-100 leading-relaxed mt-1.5">
                      Are you actively selling, prepping for interviews, or both?
                    </p>
                  </>
                )}
              </div>
            </div>

            {/* Suggestion chips */}
            {showSuggestions && (
              <div className="ml-9 flex flex-wrap gap-1.5">
                {profileDone ? (
                  <>
                    {[
                      "Add a new deal story",
                      "Update my current situation",
                      "Change my selling style",
                    ].map((suggestion) => (
                      <button
                        key={suggestion}
                        onClick={() => handleSuggestion(suggestion)}
                        className="text-xs px-2.5 py-1 bg-emerald-500/10 hover:bg-emerald-500/100/15 text-emerald-400 rounded-full transition-colors border border-emerald-100"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </>
                ) : (
                  <>
                    {[
                      "I sell enterprise SaaS",
                      "Tech sales, mostly F500",
                      "Between roles, prepping for interviews",
                    ].map((suggestion) => (
                      <button
                        key={suggestion}
                        onClick={() => handleSuggestion(suggestion)}
                        className="text-xs px-2.5 py-1 bg-emerald-500/10 hover:bg-emerald-500/100/15 text-emerald-400 rounded-full transition-colors border border-emerald-100"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </>
                )}
              </div>
            )}
          </>
        )}

        {/* Conversation */}
        {messages.map((message) => {
          if ((message.role as string) === "tool" || message.role === "data") return null;

          const isUser = message.role === "user";
          const isAssistant = message.role === "assistant";

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

          if (isAssistant && !textContent.trim()) return null;

          return (
            <div key={message.id}>
              <div className={`flex gap-2.5 ${isUser ? "flex-row-reverse" : ""}`}>
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                    isUser ? "bg-emerald-600" : "bg-[#141414]"
                  }`}
                >
                  {isUser ? (
                    <User className="w-3.5 h-3.5 text-white" />
                  ) : (
                    <Bot className="w-3.5 h-3.5 text-white" />
                  )}
                </div>
                <div
                  className={`px-3.5 py-2.5 max-w-[300px] text-sm leading-relaxed whitespace-pre-wrap ${
                    isUser
                      ? "bg-emerald-600 text-white rounded-2xl rounded-tr-md"
                      : "bg-[#0a0a0a] border border-[#1a1a1a] text-neutral-100 rounded-2xl rounded-tl-md"
                  }`}
                >
                  {textContent}
                </div>
              </div>
            </div>
          );
        })}

        {/* Error display */}
        {error && (
          <div className="mx-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
            <p className="text-xs text-red-400 font-medium">Something went wrong</p>
            <p className="text-xs text-red-500 mt-1">{error.message}</p>
          </div>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="flex gap-2.5">
            <div className="w-7 h-7 rounded-full bg-[#141414] flex items-center justify-center flex-shrink-0">
              <Bot className="w-3.5 h-3.5 text-white" />
            </div>
            <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-2xl rounded-tl-md px-3.5 py-2.5">
              <div className="flex gap-1">
                <div className="w-1.5 h-1.5 bg-neutral-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <div className="w-1.5 h-1.5 bg-neutral-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <div className="w-1.5 h-1.5 bg-neutral-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}

        {/* Layer completion CTA */}
        {profileDone && (
          <div className="mx-auto text-center py-3">
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-500/10 border border-green-200 text-green-400 text-xs font-medium">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Profile fully tuned (4/4)
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-[#1a1a1a] px-4 py-3 bg-[#141414]">
        {/* Voice transcript preview */}
        {isListening && interimTranscript && (
          <div className="mb-2 px-3 py-1.5 bg-red-500/10 border border-red-100 rounded-lg">
            <p className="text-xs text-red-400 font-medium flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-red-500/100 rounded-full animate-pulse" />
              Listening...
            </p>
            <p className="text-xs text-neutral-300 mt-0.5 italic">{interimTranscript}</p>
          </div>
        )}
        {isListening && !interimTranscript && (
          <div className="mb-2 px-3 py-1.5 bg-red-500/10 border border-red-100 rounded-lg">
            <p className="text-xs text-red-400 font-medium flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-red-500/100 rounded-full animate-pulse" />
              Listening... start speaking
            </p>
          </div>
        )}
        <form
          id="bubble-chat-form"
          onSubmit={(e) => { setHasInteracted(true); handleSubmit(e); }}
          className="flex items-end gap-2"
        >
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder={
                profileDone ? "Ask anything or update your profile." : "Type your response..."
              }
              rows={1}
              className="w-full resize-none rounded-xl border border-[#262626] bg-white text-neutral-900 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent placeholder:text-neutral-500 max-h-24 overflow-y-auto"
              style={{ height: "auto", minHeight: "40px" }}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = "auto";
                target.style.height = Math.min(target.scrollHeight, 96) + "px";
              }}
            />
          </div>
          <input
            type="file"
            ref={resumeFileRef}
            accept=".pdf,.docx,.txt"
            className="hidden"
            onChange={handleFileUpload}
          />
          <button
            type="button"
            onClick={() => resumeFileRef.current?.click()}
            disabled={uploadingFile || isLoading}
            className="flex items-center justify-center w-9 h-9 rounded-xl bg-[#1a1a1a] text-neutral-400 hover:bg-[#262626] hover:text-neutral-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex-shrink-0"
            title="Upload resume (PDF, DOCX, TXT)"
          >
            {uploadingFile ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Paperclip className="w-3.5 h-3.5" />}
          </button>
          {voiceSupported && (
            <button
              type="button"
              onClick={toggleListening}
              className={`flex items-center justify-center w-9 h-9 rounded-xl transition-colors flex-shrink-0 ${
                isListening
                  ? "bg-red-500/100 text-white hover:bg-red-600 animate-pulse"
                  : "bg-[#1a1a1a] text-neutral-400 hover:bg-[#262626] hover:text-neutral-200"
              }`}
              title={isListening ? "Stop recording" : "Voice input"}
            >
              {isListening ? (
                <MicOff className="w-3.5 h-3.5" />
              ) : (
                <Mic className="w-3.5 h-3.5" />
              )}
            </button>
          )}
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="flex items-center justify-center w-9 h-9 rounded-xl bg-emerald-600 text-white hover:bg-emerald-600 disabled:bg-[#262626] disabled:text-neutral-500 disabled:cursor-not-allowed transition-colors flex-shrink-0"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
        {!hasInteracted && messages.length === 0 && (
          <div className="flex items-center justify-center mt-2">
            <a
              href="/profile"
              className="text-xs text-neutral-500 hover:text-neutral-300 transition-colors"
            >
              Prefer manual setup? Edit your profile directly.
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
