/**
 * POST /api/chat/onboarding
 *
 * Streaming chat endpoint for the onboarding chatbot.
 * Uses Vercel AI SDK with Claude Sonnet 4.5 for structured context capture.
 */

import { streamText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { getOrCreateUser } from "@/lib/user";
import prisma from "@/lib/db";
import { buildOnboardingPromptWithContext } from "@/lib/onboarding-prompt";
import { createOnboardingTools } from "@/lib/onboarding-tools";

export async function POST(req: Request) {
  try {
    // Auth check - getOrCreateUser handles Clerk auth + DB record creation
    const dbUser = await getOrCreateUser();
    if (!dbUser) {
      return new Response("Unauthorized", { status: 401 });
    }

    // Load existing profile for context injection
    const existingProfile = await prisma.userProfile.findUnique({
      where: { userId: dbUser.id },
    });

    // Build system prompt with existing context
    const systemPrompt = buildOnboardingPromptWithContext(existingProfile);

    // Create tools bound to this user
    const tools = createOnboardingTools(dbUser.id);

    // Parse request body
    const { messages } = await req.json();

    // Stream response with prompt caching enabled
    // The system prompt is ~2K tokens and identical across calls for the same user.
    // Anthropic caches matching prefixes at 90% discount on input tokens.
    const result = streamText({
      model: anthropic("claude-sonnet-4-5-20250929", {
        cacheControl: true,
      }),
      system: [
        {
          type: "text" as const,
          text: systemPrompt,
          providerOptions: {
            anthropic: { cacheControl: { type: "ephemeral" } },
          },
        },
      ],
      messages,
      tools,
      maxSteps: 5, // Allow multiple tool calls per response
    });

    return result.toDataStreamResponse();
  } catch (err: any) {
    console.error("[ONBOARDING CHAT] Error:", err.message, err.stack);
    return new Response(
      JSON.stringify({
        error: err.message || "Failed to process chat request",
        type: err.name || "UnknownError",
        detail: err.cause?.message || err.responseBody || null,
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
