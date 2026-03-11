/**
 * In-memory rate limiter for API route protection.
 *
 * Uses a sliding window counter per key (typically userId or IP).
 * On Vercel serverless, each instance maintains its own map, so this
 * provides burst protection per-instance. For cross-instance enforcement,
 * swap the store to Upstash Redis (drop-in replacement planned).
 *
 * Usage:
 *   const limiter = createRateLimiter({ maxRequests: 10, windowMs: 60_000 });
 *   const result = limiter.check(userId);
 *   if (!result.allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

interface RateLimiterConfig {
  /** Max requests allowed in the window */
  maxRequests: number;
  /** Window duration in milliseconds */
  windowMs: number;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  retryAfterMs: number;
}

const stores = new Map<string, Map<string, RateLimitEntry>>();

// Periodic cleanup to prevent memory leaks (runs every 60s per store)
const cleanupIntervals = new Map<string, NodeJS.Timeout>();

function getStore(name: string): Map<string, RateLimitEntry> {
  if (!stores.has(name)) {
    const store = new Map<string, RateLimitEntry>();
    stores.set(name, store);

    // Schedule cleanup for expired entries
    if (!cleanupIntervals.has(name)) {
      const interval = setInterval(() => {
        const now = Date.now();
        const s = stores.get(name);
        if (s) {
          for (const [key, entry] of s) {
            if (now >= entry.resetAt) s.delete(key);
          }
        }
      }, 60_000);
      // Don't block process exit
      if (interval.unref) interval.unref();
      cleanupIntervals.set(name, interval);
    }
  }
  return stores.get(name)!;
}

export function createRateLimiter(name: string, config: RateLimiterConfig) {
  const store = getStore(name);

  return {
    check(key: string): RateLimitResult {
      const now = Date.now();
      const entry = store.get(key);

      // Window expired or no entry: start fresh
      if (!entry || now >= entry.resetAt) {
        const resetAt = now + config.windowMs;
        store.set(key, { count: 1, resetAt });
        return {
          allowed: true,
          remaining: config.maxRequests - 1,
          resetAt,
          retryAfterMs: 0,
        };
      }

      // Within window: increment
      entry.count += 1;
      const allowed = entry.count <= config.maxRequests;
      return {
        allowed,
        remaining: Math.max(0, config.maxRequests - entry.count),
        resetAt: entry.resetAt,
        retryAfterMs: allowed ? 0 : entry.resetAt - now,
      };
    },

    /** Reset a specific key (useful after successful auth, etc.) */
    reset(key: string): void {
      store.delete(key);
    },
  };
}

// ─── Pre-configured limiters for different route tiers ────────────────────

/** Expensive AI routes: blitz submission, practice start, transcript analysis */
export const aiLimiter = createRateLimiter("ai", {
  maxRequests: 10,
  windowMs: 60_000, // 10 per minute
});

/** Medium-cost routes: profile saves, chat messages, practice messages */
export const standardLimiter = createRateLimiter("standard", {
  maxRequests: 30,
  windowMs: 60_000, // 30 per minute
});

/** Auth routes: token generation, extension auth */
export const authLimiter = createRateLimiter("auth", {
  maxRequests: 10,
  windowMs: 60_000, // 10 per minute
});

/** Read-heavy routes: list requests, list targets, analytics */
export const readLimiter = createRateLimiter("read", {
  maxRequests: 60,
  windowMs: 60_000, // 60 per minute
});

// ─── Helper to build a 429 response with proper headers ──────────────────

import { NextResponse } from "next/server";

export function rateLimitResponse(result: RateLimitResult): NextResponse {
  const retryAfterSec = Math.ceil(result.retryAfterMs / 1000);
  return NextResponse.json(
    {
      error: "Too many requests. Please try again shortly.",
      retryAfterMs: result.retryAfterMs,
    },
    {
      status: 429,
      headers: {
        "Retry-After": String(retryAfterSec),
        "X-RateLimit-Remaining": String(result.remaining),
        "X-RateLimit-Reset": String(Math.ceil(result.resetAt / 1000)),
      },
    }
  );
}
