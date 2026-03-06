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
} from "lucide-react";
import { useVoiceInput } from "@/hooks/useVoiceInput";

const PHASES = [
  { id: "identity", label: "Identity & Role" },
  { id: "stories", label: "Deal Stories" },
  { id: "methodology", label: "Selling Style" },
  { id: "situation", label: "Current Situation" },
];

interface OnboardingChatBubbleProps {
  /** If true, the chat panel starts open */
  defaultOpen?: boolean;
  /** Callback when onboarding completes */
  onComplete?: () => void;
  /** Whether user already completed onboarding (from DB) */
  alreadyCompleted?: boolean;
}

export default function OnboardingChatBubble({
  defaultOpen = false,
  onComplete,
  alreadyCompleted = false,
}: OnboardingChatBubbleProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [isMinimized, setIsMinimized] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [completedPhases, setCompletedPhases] = useState<Set<string>>(new Set());
  const [onboardingDone, setOnboardingDone] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);

  const { messages, input, handleInputChange, handleSubmit, isLoading, setInput, append, error } =
    useChat({
      api: "/api/chat/onboarding",
      initialMessages: [],
      onError: (err) => {
        console.error("[OnboardingChat] Error:", err);
      },
      onToolCall: ({ toolCall }) => {
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
          onComplete?.();
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

  const showSuggestions = messages.length === 0;

  const profileDone = alreadyCompleted || onboardingDone;

  // Floating button when closed
  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full bg-indigo-600 px-5 py-3 text-white shadow-lg hover:bg-indigo-700 transition-all hover:shadow-xl group"
      >
        {profileDone ? (
          <>
            <MessageSquare className="h-5 w-5" />
            <span className="text-sm font-medium">AI Assistant</span>
          </>
        ) : (
          <>
            <Sparkles className="h-5 w-5" />
            <span className="text-sm font-medium">Set Up Profile</span>
            {completedPhases.size > 0 && (
              <span className="ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-white/20 text-xs">
                {completedPhases.size}/4
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
      <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-2xl bg-white border border-gray-200 shadow-xl px-4 py-3 cursor-pointer hover:shadow-2xl transition-all"
        onClick={() => setIsMinimized(false)}
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100">
          <Bot className="h-4 w-4 text-indigo-600" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-900">AltVest Setup</p>
          <p className="text-xs text-gray-500">
            {onboardingDone ? "Complete" : `${completedPhases.size}/4 sections`}
          </p>
        </div>
        {isLoading && <Loader2 className="h-4 w-4 animate-spin text-indigo-500" />}
        <button
          onClick={(e) => { e.stopPropagation(); setIsOpen(false); }}
          className="text-gray-400 hover:text-gray-600"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  // Full chat panel
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col w-[420px] h-[600px] max-h-[80vh] rounded-2xl bg-white border border-gray-200 shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-indigo-50 to-white">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100">
            <Bot className="h-4 w-4 text-indigo-600" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900">
              {profileDone ? "AI Assistant" : "Profile Setup"}
            </h3>
            <p className="text-xs text-gray-500">
              {profileDone ? "Ask anything about your runs or profile" : `${completedPhases.size}/4 complete`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {/* Progress dots — only during onboarding */}
          {!profileDone && (
            <div className="flex gap-1 mr-2">
              {PHASES.map((phase) => (
                <div
                  key={phase.id}
                  className={`h-2 w-2 rounded-full transition-colors ${
                    completedPhases.has(phase.id) ? "bg-green-500" : "bg-gray-200"
                  }`}
                  title={phase.label}
                />
              ))}
            </div>
          )}
          <button
            onClick={() => setIsMinimized(true)}
            className="p-1 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100"
            title="Minimize"
          >
            <ChevronDown className="h-4 w-4" />
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100"
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
              <div className="w-7 h-7 rounded-full bg-gray-900 flex items-center justify-center flex-shrink-0">
                <Bot className="w-3.5 h-3.5 text-white" />
              </div>
              <div className="bg-gray-50 border border-gray-100 rounded-2xl rounded-tl-md px-3.5 py-2.5 max-w-[300px]">
                {profileDone ? (
                  <>
                    <p className="text-sm text-gray-800 leading-relaxed">
                      Hey! Need to update your profile, add deal stories, or tweak your selling style?
                    </p>
                    <p className="text-sm text-gray-800 leading-relaxed mt-1.5">
                      Just tell me what to change.
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-gray-800 leading-relaxed">
                      Let's get you set up. This takes about 10 minutes and makes everything AltVest generates specific to you.
                    </p>
                    <p className="text-sm text-gray-800 leading-relaxed mt-1.5">
                      First, tell me what you sell and who you sell it to.
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
                        className="text-xs px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-full transition-colors border border-indigo-100"
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
                        className="text-xs px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-full transition-colors border border-indigo-100"
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
                    isUser ? "bg-indigo-600" : "bg-gray-900"
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
                      ? "bg-indigo-600 text-white rounded-2xl rounded-tr-md"
                      : "bg-gray-50 border border-gray-100 text-gray-800 rounded-2xl rounded-tl-md"
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
          <div className="mx-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-xs text-red-700 font-medium">Something went wrong</p>
            <p className="text-xs text-red-500 mt-1">{error.message}</p>
          </div>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="flex gap-2.5">
            <div className="w-7 h-7 rounded-full bg-gray-900 flex items-center justify-center flex-shrink-0">
              <Bot className="w-3.5 h-3.5 text-white" />
            </div>
            <div className="bg-gray-50 border border-gray-100 rounded-2xl rounded-tl-md px-3.5 py-2.5">
              <div className="flex gap-1">
                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}

        {/* Completion CTA */}
        {onboardingDone && (
          <div className="mx-auto text-center py-3">
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-50 border border-green-200 text-green-700 text-xs font-medium">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Profile setup complete
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-gray-100 px-4 py-3 bg-white">
        {/* Voice transcript preview */}
        {isListening && interimTranscript && (
          <div className="mb-2 px-3 py-1.5 bg-red-50 border border-red-100 rounded-lg">
            <p className="text-xs text-red-600 font-medium flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
              Listening...
            </p>
            <p className="text-xs text-gray-600 mt-0.5 italic">{interimTranscript}</p>
          </div>
        )}
        {isListening && !interimTranscript && (
          <div className="mb-2 px-3 py-1.5 bg-red-50 border border-red-100 rounded-lg">
            <p className="text-xs text-red-600 font-medium flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
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
                onboardingDone ? "Ask anything or close this chat." : "Type your response..."
              }
              rows={1}
              className="w-full resize-none rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent placeholder:text-gray-400 max-h-24 overflow-y-auto"
              style={{ height: "auto", minHeight: "40px" }}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = "auto";
                target.style.height = Math.min(target.scrollHeight, 96) + "px";
              }}
            />
          </div>
          {voiceSupported && (
            <button
              type="button"
              onClick={toggleListening}
              className={`flex items-center justify-center w-9 h-9 rounded-xl transition-colors flex-shrink-0 ${
                isListening
                  ? "bg-red-500 text-white hover:bg-red-600 animate-pulse"
                  : "bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700"
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
            className="flex items-center justify-center w-9 h-9 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors flex-shrink-0"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
        {!hasInteracted && messages.length === 0 && (
          <div className="flex items-center justify-center mt-2">
            <a
              href="/onboarding/ai-setup"
              className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              Prefer manual setup? Use the paste-based wizard instead.
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
