/**
 * GET /api/chat/test
 * Quick health check to verify Anthropic API key works.
 * DELETE THIS FILE after debugging.
 */

import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";

export async function GET() {
  try {
    const hasKey = !!process.env.ANTHROPIC_API_KEY;
    const keyPrefix = process.env.ANTHROPIC_API_KEY?.slice(0, 10) || "NOT SET";

    if (!hasKey) {
      return Response.json({ status: "error", reason: "ANTHROPIC_API_KEY not set" });
    }

    const result = await generateText({
      model: anthropic("claude-sonnet-4-5-20250929"),
      prompt: "Say hello in exactly 3 words.",
      maxTokens: 20,
    });

    return Response.json({
      status: "ok",
      keyPrefix,
      model: "claude-sonnet-4-5-20250929",
      response: result.text,
    });
  } catch (err: any) {
    return Response.json({
      status: "error",
      reason: err.message,
      type: err.name,
      detail: err.cause?.message || null,
    });
  }
}
