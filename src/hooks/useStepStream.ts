"use client";

import { useEffect, useRef, useCallback, useState } from "react";

export interface StepUpdate {
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
  liveInsights?: Array<{
    step: string;
    insight: string;
    timestamp: string;
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
  const stalenessTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [connected, setConnected] = useState(false);
  const retriesRef = useRef(0);
  const maxRetries = 3;
  const STALENESS_THRESHOLD = 15000; // 15s without SSE event triggers polling

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
    if (stalenessTimerRef.current) {
      clearTimeout(stalenessTimerRef.current);
      stalenessTimerRef.current = null;
    }
    setConnected(false);
  }, []);

  // Start polling alongside SSE when events go stale
  const startStalenessPolling = useCallback(() => {
    if (fallbackIntervalRef.current) return; // already polling
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
            liveInsights: req.liveInsights,
          });
          if (["delivered", "ready", "failed"].includes(req.status)) {
            onCompleteRef.current?.(req.status);
            cleanup();
          }
        }
      } catch {
        // Ignore fetch errors during polling
      }
    }, 5000);
  }, [requestId, cleanup]);

  const resetStalenessTimer = useCallback(() => {
    // Kill staleness polling since SSE is active
    if (fallbackIntervalRef.current) {
      clearInterval(fallbackIntervalRef.current);
      fallbackIntervalRef.current = null;
    }
    // Reset the staleness timer
    if (stalenessTimerRef.current) clearTimeout(stalenessTimerRef.current);
    stalenessTimerRef.current = setTimeout(() => {
      startStalenessPolling();
    }, STALENESS_THRESHOLD);
  }, [startStalenessPolling]);

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
        // Start staleness timer (will poll if SSE goes quiet)
        resetStalenessTimer();
      };

      es.onmessage = (event) => {
        // Reset staleness timer on every message (SSE is alive)
        resetStalenessTimer();
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
          // Fall back to polling immediately
          startStalenessPolling();
        }
      };
    };

    connect();

    return cleanup;
  }, [requestId, enabled, cleanup, resetStalenessTimer, startStalenessPolling]);

  return { connected };
}
