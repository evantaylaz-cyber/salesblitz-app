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
} from "lucide-react";

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
  const [completedPhases, setCompletedPhases] = useState<Set<string>>(new Set());
  const [onboardingDone, setOnboardingDone] = useState(false);

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

  // Show suggestions only when conversation is empty
  const showSuggestions = messages.length === 0;

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar: Progress Tracker */}
      <aside className="hidden md:flex w-72 flex-col border-r border-gray-200 bg-white p-6">
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900">Setup Progress</h2>
          <p className="text-sm text-gray-500 mt-1">
            Your context powers every AltVest output.
          </p>
        </div>

        <nav className="flex-1 space-y-4">
          {PHASES.map((phase) => {
            const done = completedPhases.has(phase.id);
            return (
              <div
                key={phase.id}
                className={`flex items-start gap-3 p-3 rounded-lg transition-colors ${
                  done ? "bg-green-50" : "bg-gray-50"
                }`}
              >
                {done ? (
                  <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                ) : (
                  <Circle className="w-5 h-5 text-gray-300 mt-0.5 flex-shrink-0" />
                )}
                <div>
                  <p
                    className={`text-sm font-medium ${
                      done ? "text-green-800" : "text-gray-700"
                    }`}
                  >
                    {phase.label}
                  </p>
                  <p className="text-xs text-gray-500">{phase.description}</p>
                </div>
              </div>
            );
          })}
        </nav>

        {onboardingDone && (
          <button
            onClick={() => router.push("/dashboard")}
            className="mt-6 flex items-center justify-center gap-2 w-full px-4 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors text-sm font-medium"
          >
            Go to Dashboard
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </aside>

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col">
        {/* Header */}
        <header className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">AltVest Setup</h1>
            <p className="text-sm text-gray-500">
              {onboardingDone
                ? "Setup complete. Head to the dashboard."
                : "Tell me about yourself, your deals, and how you sell."}
            </p>
          </div>

          {/* Mobile phase counter */}
          <div className="md:hidden text-sm text-gray-500">
            {completedPhases.size}/4 complete
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
                <div className="w-8 h-8 rounded-full bg-gray-900 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-md px-4 py-3 max-w-lg">
                  <p className="text-sm text-gray-800 leading-relaxed">
                    Let's get you set up. This takes about 10 minutes and makes everything AltVest generates specific to you, your deals, and how you sell.
                  </p>
                  <p className="text-sm text-gray-800 leading-relaxed mt-2">
                    First, tell me what you sell and who you sell it to.
                  </p>
                </div>
              </div>

              {/* Suggestion chips */}
              {showSuggestions && (
                <div className="ml-11 flex flex-wrap gap-2">
                  {[
                    "I sell enterprise SaaS to mid-market companies",
                    "I'm in tech sales, mostly selling to F500",
                    "I sell into healthcare/pharma",
                    "I'm between roles and prepping for interviews",
                  ].map((suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => handleSuggestion(suggestion)}
                      className="text-xs px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full transition-colors border border-gray-200"
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
                      isUser ? "bg-blue-600" : "bg-gray-900"
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
                        ? "bg-blue-600 text-white rounded-2xl rounded-tr-md"
                        : "bg-white border border-gray-200 text-gray-800 rounded-2xl rounded-tl-md"
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
                <div className="w-8 h-8 rounded-full bg-gray-900 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-md px-4 py-3">
                  <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="border-t border-gray-200 bg-white px-4 md:px-6 py-4">
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
                className="w-full resize-none rounded-xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent placeholder:text-gray-400 max-h-32 overflow-y-auto"
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
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="flex items-center justify-center w-10 h-10 rounded-xl bg-gray-900 text-white hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex-shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
