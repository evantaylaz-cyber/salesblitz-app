/**
 * Trigger the worker webhook with retry logic.
 *
 * Vercel serverless -> Railway can drop the initial POST intermittently.
 * This helper retries up to 3 times with exponential backoff (500ms, 1s, 2s)
 * so the stale-run recovery loop doesn't need to be the primary safety net.
 */

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 500;

interface TriggerResult {
  success: boolean;
  status?: number;
  attempt: number;
  error?: string;
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function triggerWorker(
  payload: Record<string, unknown>,
  urlOverride?: string
): Promise<TriggerResult> {
  const url = urlOverride || process.env.WORKER_WEBHOOK_URL;

  if (!url) {
    console.warn("WORKER_WEBHOOK_URL not set — skipping worker trigger");
    return { success: false, attempt: 0, error: "WORKER_WEBHOOK_URL not set" };
  }

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": process.env.INTERNAL_API_KEY || "",
        },
        body: JSON.stringify(payload),
      });

      console.log(
        `Worker trigger response: ${res.status} (attempt ${attempt}/${MAX_RETRIES})`,
        JSON.stringify(payload)
      );

      // 2xx = success, stop retrying
      if (res.ok) {
        return { success: true, status: res.status, attempt };
      }

      // 4xx client error = don't retry (bad request, auth issue, etc.)
      if (res.status >= 400 && res.status < 500) {
        const body = await res.text().catch(() => "");
        console.error(
          `Worker trigger got ${res.status} — not retrying. Body: ${body}`
        );
        return {
          success: false,
          status: res.status,
          attempt,
          error: `HTTP ${res.status}: ${body}`,
        };
      }

      // 5xx = retry after backoff
      console.warn(
        `Worker trigger got ${res.status} — retrying (${attempt}/${MAX_RETRIES})`
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(
        `Worker trigger failed (attempt ${attempt}/${MAX_RETRIES}): ${message}`
      );

      if (attempt === MAX_RETRIES) {
        return { success: false, attempt, error: message };
      }
    }

    // Exponential backoff: 500ms, 1000ms, 2000ms
    if (attempt < MAX_RETRIES) {
      await sleep(BASE_DELAY_MS * Math.pow(2, attempt - 1));
    }
  }

  return { success: false, attempt: MAX_RETRIES, error: "All retries exhausted" };
}

/**
 * Convenience: trigger the batch execution endpoint.
 * Replaces /execute with /execute-batch in the URL.
 */
export async function triggerWorkerBatch(
  payload: Record<string, unknown>
): Promise<TriggerResult> {
  const baseUrl = process.env.WORKER_WEBHOOK_URL;
  if (!baseUrl) {
    console.warn("WORKER_WEBHOOK_URL not set — skipping batch trigger");
    return { success: false, attempt: 0, error: "WORKER_WEBHOOK_URL not set" };
  }
  const batchUrl = baseUrl.replace("/execute", "/execute-batch");
  return triggerWorker(payload, batchUrl);
}
