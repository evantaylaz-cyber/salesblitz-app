"use client";

import { useEffect, useRef, useCallback, useState } from "react";

interface StepUpdate {
  type: "connected" | "step_update" | "complete";
  requestId?: string;
  stepId?: string;
  stepStatus?: string;
  status?: string;
  currentStep?: string | null;
  progress?: number;
  completedSteps?: number;
  totalSteps?: number;
  steps?: Array<{
    id: string;
    label: string;
    status: string;
    startedAt?: string;
    completedAt?: string;
    error?: string;
  }>;
  assets?: Array<{
    id: string;
    label: string;
    format: string;
    url: string | null;
  }>;
}

interface UseStepStreamOptions {
  requestId: string | null;
  enabled: boolean; // only connect when request is active
  onUpdate?: (data: StepUpdate) => void;
  onComplete?: (status: string) => void;
}

/**
 * Subscribes to real-time step updates via SSE.
 * Falls back to polling if SSE fails or disconnects.
 */
export function useStepStream({
  requestId,
  enabled,
  onUpdate,
  onComplete,
}: UseStepStreamOptions) {
  const eventSourceRef = useRef<EventSource | null>(null);
  const fallbackIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [connected, setConnected] = useState(false);
  const retriesRef = useRef(0);
  const maxRetries = 3;

  // Store latest callbacks in refs for stability
  const onUpdateRef = useRef(onUpdate);
  const onCompleteRef = useRef(onComplete);
  onUpdateRef.current = onUpdate;
  onCompleteRef.current = onComplete;

  const cleanup = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (fallbackIntervalRef.current) {
      clearInterval(fallbackIntervalRef.current);
      fallbackIntervalRef.current = null;
    }
    setConnected(false);
  }, []);

  useEffect(() => {
    if (!requestId || !enabled) {
      cleanup();
      return;
    }

    const connect = () => {
      const es = new EventSource(`/api/requests/${requestId}/stream`);
      eventSourceRef.current = es;

      es.onopen = () => {
        setConnected(true);
        retriesRef.current = 0;
        // Kill any fallback polling
        if (fallbackIntervalRef.current) {
          clearInterval(fallbackIntervalRef.current);
          fallbackIntervalRef.current = null;
        }
      };

      es.onmessage = (event) => {
        try {
          const data: StepUpdate = JSON.parse(event.data);

          if (data.type === "step_update") {
            onUpdateRef.current?.(data);
          }

          if (data.type === "complete") {
            onCompleteRef.current?.(data.status || "delivered");
            cleanup();
          }
        } catch {
          // Ignore parse errors (heartbeats, etc.)
        }
      };

      es.onerror = () => {
        es.close();
        eventSourceRef.current = null;
        setConnected(false);

        // Retry with backoff, then fall back to polling
        if (retriesRef.current < maxRetries) {
          retriesRef.current++;
          const delay = 1000 * Math.pow(2, retriesRef.current);
          setTimeout(connect, delay);
        } else {
          // Fall back to polling every 3 seconds
          if (!fallbackIntervalRef.current) {
            fallbackIntervalRef.current = setInterval(async () => {
              try {
                const res = await fetch(`/api/requests/${requestId}`);
                if (res.ok) {
                  const json = await res.json();
                  const req = json.request;
                  onUpdateRef.current?.({
                    type: "step_update",
                    status: req.status,
                    steps: req.steps,
                    progress: req.progress,
                    completedSteps: req.completedSteps,
                    totalSteps: req.totalSteps,
                    currentStep: req.currentStep,
                    assets: req.assets,
                  });

                  // Check if terminal
                  if (["delivered", "ready", "failed"].includes(req.status)) {
                    onCompleteRef.current?.(req.status);
                    cleanup();
                  }
                }
              } catch {
                // Ignore fetch errors during polling
              }
            }, 3000);
          }
        }
      };
    };

    connect();

    return cleanup;
  }, [requestId, enabled, cleanup]);

  return { connected };
}
