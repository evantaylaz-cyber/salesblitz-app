// ── Step Event Bus ──────────────────────────────────────────────────
// In-memory pub/sub for real-time step updates.
// The PATCH /api/requests/[id]/steps route publishes events here.
// The GET /api/requests/[id]/stream route subscribes SSE clients.
//
// This works in serverless (Vercel) because:
//   - The SSE connection and the PATCH request hit the same function instance
//     during active generation (requests come in rapid succession)
//   - Fallback: if an event is missed, the client re-fetches via HTTP
//
// For multi-instance setups (unlikely at current scale), upgrade to
// Supabase Realtime or Redis pub/sub.

type StepEventCallback = (data: StepEventPayload) => void;

export interface StepEventPayload {
  requestId: string;
  stepId: string;
  stepStatus: string;
  status: string;        // overall request status
  currentStep: string | null;
  progress: number;
  completedSteps: number;
  totalSteps: number;
  steps: Array<{
    id: string;
    label: string;
    status: string;
    startedAt?: string;
    completedAt?: string;
    error?: string;
  }>;
  assets: Array<{
    id: string;
    label: string;
    format: string;
    url: string | null;
  }>;
  timestamp: string;
}

class StepEventBus {
  private listeners: Map<string, Set<StepEventCallback>> = new Map();

  subscribe(requestId: string, callback: StepEventCallback): () => void {
    if (!this.listeners.has(requestId)) {
      this.listeners.set(requestId, new Set());
    }
    this.listeners.get(requestId)!.add(callback);

    // Return unsubscribe function
    return () => {
      const set = this.listeners.get(requestId);
      if (set) {
        set.delete(callback);
        if (set.size === 0) {
          this.listeners.delete(requestId);
        }
      }
    };
  }

  publish(requestId: string, data: StepEventPayload): void {
    const set = this.listeners.get(requestId);
    if (set) {
      for (const callback of set) {
        try {
          callback(data);
        } catch (err) {
          console.error("[STEP-EVENTS] Listener error:", err);
        }
      }
    }
  }
}

// Singleton: survives across requests in the same serverless instance
export const stepEventBus = new StepEventBus();
