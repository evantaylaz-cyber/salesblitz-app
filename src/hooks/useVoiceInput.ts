"use client";

import { useState, useRef, useCallback, useEffect } from "react";

interface UseVoiceInputOptions {
  /** Called with the final transcript when speech ends */
  onTranscript?: (text: string) => void;
  /** Language for recognition (default: en-US) */
  language?: string;
}

interface UseVoiceInputReturn {
  /** Whether the mic is actively listening */
  isListening: boolean;
  /** Whether Web Speech API is supported in this browser */
  isSupported: boolean;
  /** Interim transcript while speaking */
  interimTranscript: string;
  /** Start listening */
  startListening: () => void;
  /** Stop listening */
  stopListening: () => void;
  /** Toggle listening on/off */
  toggleListening: () => void;
}

/**
 * Custom hook for browser-native voice-to-text using the Web Speech API.
 *
 * Covers Chrome, Edge, and Safari (partial). For Firefox, isSupported
 * will be false and the UI should show a fallback message.
 *
 * No external API calls, no cost. All processing happens in the browser.
 */
export function useVoiceInput({
  onTranscript,
  language = "en-US",
}: UseVoiceInputOptions = {}): UseVoiceInputReturn {
  const [isListening, setIsListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState("");
  const [isSupported, setIsSupported] = useState(false);
  const recognitionRef = useRef<any>(null);
  const onTranscriptRef = useRef(onTranscript);

  // Keep callback ref current without re-creating recognition
  useEffect(() => {
    onTranscriptRef.current = onTranscript;
  }, [onTranscript]);

  // Check support on mount
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    setIsSupported(!!SpeechRecognition);
  }, []);

  const startListening = useCallback(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) return;

    // Clean up any existing instance
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (_) {}
    }

    const recognition = new SpeechRecognition();
    recognition.lang = language;
    recognition.continuous = true;
    recognition.interimResults = true;

    let finalText = "";

    recognition.onstart = () => {
      setIsListening(true);
      setInterimTranscript("");
      finalText = "";
    };

    recognition.onresult = (event: any) => {
      let interim = "";
      let accumulated = "";

      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          accumulated += result[0].transcript;
        } else {
          interim += result[0].transcript;
        }
      }

      finalText = accumulated;
      setInterimTranscript(interim || accumulated);
    };

    recognition.onerror = (event: any) => {
      console.error("[VoiceInput] Error:", event.error);
      // "no-speech" and "aborted" are expected, not real errors
      if (event.error !== "no-speech" && event.error !== "aborted") {
        setIsListening(false);
      }
    };

    recognition.onend = () => {
      setIsListening(false);
      const text = finalText.trim();
      if (text && onTranscriptRef.current) {
        onTranscriptRef.current(text);
      }
      setInterimTranscript("");
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [language]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (_) {}
    }
  }, []);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (_) {}
      }
    };
  }, []);

  return {
    isListening,
    isSupported,
    interimTranscript,
    startListening,
    stopListening,
    toggleListening,
  };
}
