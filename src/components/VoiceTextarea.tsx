"use client";

import { useRef, useEffect } from "react";
import { Mic, MicOff } from "lucide-react";
import { useVoiceInput } from "@/hooks/useVoiceInput";

interface VoiceTextareaProps {
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  placeholder?: string;
  required?: boolean;
  className?: string;
  /** If true, voice replaces instead of appending */
  replaceMode?: boolean;
  onBlur?: () => void;
}

/**
 * Drop-in textarea replacement with a browser-native voice input button.
 * Uses the Web Speech API (Chrome, Edge, Safari). Falls back to a plain
 * textarea on unsupported browsers (Firefox) with no visible mic button.
 */
export default function VoiceTextarea({
  value,
  onChange,
  rows = 3,
  placeholder,
  required,
  className = "",
  replaceMode = false,
  onBlur,
}: VoiceTextareaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const valueRef = useRef(value);

  // Keep ref in sync so the voice callback always sees the latest value
  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  const { isListening, isSupported, interimTranscript, toggleListening } =
    useVoiceInput({
      onTranscript: (text) => {
        if (replaceMode) {
          onChange(text);
        } else {
          const current = valueRef.current;
          const combined = current ? current.trimEnd() + " " + text : text;
          onChange(combined);
        }
        // Auto-resize after voice input
        setTimeout(() => {
          if (textareaRef.current) {
            textareaRef.current.style.height = "auto";
            textareaRef.current.style.height =
              Math.min(textareaRef.current.scrollHeight, 300) + "px";
          }
        }, 50);
      },
    });

  const baseClass =
    "w-full rounded-lg border bg-[#0a0a0a] px-3.5 py-2.5 text-sm text-white placeholder-neutral-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none resize-y";
  const borderClass = isListening
    ? "border-red-300 ring-1 ring-red-200"
    : "border-[#333333]";

  return (
    <div className="relative">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        rows={rows}
        placeholder={placeholder}
        required={required}
        className={`${baseClass} ${borderClass} ${isSupported ? "pr-12" : ""} ${className}`}
      />

      {/* Interim transcript preview */}
      {isListening && interimTranscript && (
        <div className="absolute left-0 right-0 -bottom-8 px-1">
          <p className="truncate rounded bg-[#1a1a1a] px-2 py-1 text-xs text-neutral-400 italic">
            {interimTranscript}
          </p>
        </div>
      )}

      {/* Mic button — only shown on supported browsers */}
      {isSupported && (
        <button
          type="button"
          onClick={toggleListening}
          title={isListening ? "Stop listening" : "Voice input"}
          className={`absolute right-2 top-2 rounded-md p-1.5 transition ${
            isListening
              ? "bg-red-500/15 text-red-400 animate-pulse"
              : "bg-[#1a1a1a] text-neutral-500 hover:bg-[#262626] hover:text-neutral-300"
          }`}
        >
          {isListening ? (
            <MicOff className="h-4 w-4" />
          ) : (
            <Mic className="h-4 w-4" />
          )}
        </button>
      )}
    </div>
  );
}
