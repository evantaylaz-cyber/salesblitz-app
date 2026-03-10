/**
 * POST /api/chat/onboarding
 *
 * Streaming chat endpoint for the onboarding + lifecycle chatbot.
 * Uses Vercel AI SDK with Claude Sonnet 4.5 for structured context capture.
 *
 * Loads full user journey context: profile, blitz history, debriefs,
 * practice sessions, and knowledge base stats. The chatbot uses this
 * to guide onboarding AND provide lifecycle coaching.
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

    // Load journey context in parallel (blitz history, debriefs, practice sessions, KB stats)
    const [recentBlitzes, recentDebriefs, recentPractice, kbStats] = await Promise.all([
      // Last 5 completed blitzes
      prisma.runRequest.findMany({
        where: { userId: dbUser.id, status: "completed" },
        select: {
          id: true,
          toolName: true,
          targetCompany: true,
          meetingType: true,
          completedAt: true,
          createdAt: true,
        },
        orderBy: { completedAt: "desc" },
        take: 5,
      }),
      // Last 5 debriefs
      prisma.runDebrief.findMany({
        where: { userId: dbUser.id },
        select: {
          id: true,
          content: true,
          outcome: true,
          nextSteps: true,
          createdAt: true,
          runRequest: {
            select: { targetCompany: true, toolName: true },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
      // Last 5 practice sessions
      prisma.practiceSession.findMany({
        where: { userId: dbUser.id, status: "completed" },
        select: {
          id: true,
          targetCompany: true,
          meetingType: true,
          outcome: true,
          feedback: true,
          cotmScore: true,
          durationSeconds: true,
          completedAt: true,
        },
        orderBy: { completedAt: "desc" },
        take: 5,
      }),
      // KB doc count by category
      prisma.knowledgeDocument.groupBy({
        by: ["category"],
        where: { userId: dbUser.id },
        _count: true,
      }),
    ]);

    // Build journey context block
    let journeyBlock = "";

    if (recentBlitzes.length > 0) {
      journeyBlock += `\n## BLITZ HISTORY (${recentBlitzes.length} most recent)\n`;
      for (const blitz of recentBlitzes) {
        const date = blitz.completedAt ? new Date(blitz.completedAt).toLocaleDateString() : "pending";
        journeyBlock += `- ${blitz.targetCompany} (${blitz.toolName}${blitz.meetingType ? `, ${blitz.meetingType}` : ""}) — ${date}\n`;
      }
    }

    if (recentDebriefs.length > 0) {
      journeyBlock += `\n## RECENT DEBRIEFS\n`;
      for (const debrief of recentDebriefs) {
        const company = debrief.runRequest?.targetCompany || "Unknown";
        const tool = debrief.runRequest?.toolName || "";
        const date = new Date(debrief.createdAt).toLocaleDateString();
        journeyBlock += `- ${company} (${tool}, ${date}): ${debrief.outcome || "no outcome"}\n`;
        if (debrief.content) {
          journeyBlock += `  Summary: ${debrief.content.slice(0, 200)}\n`;
        }
        if (debrief.nextSteps) {
          journeyBlock += `  Next steps: ${debrief.nextSteps.slice(0, 150)}\n`;
        }
      }
    }

    if (recentPractice.length > 0) {
      journeyBlock += `\n## PRACTICE SESSION HISTORY\n`;
      for (const session of recentPractice) {
        const date = session.completedAt ? new Date(session.completedAt).toLocaleDateString() : "unknown";
        const score = (session.cotmScore as any)?.overall;
        journeyBlock += `- ${session.targetCompany || "General"} (${session.meetingType || "discovery"}, ${date}): ${session.outcome || "no outcome"}`;
        if (score) journeyBlock += ` — Score: ${score}/5`;
        journeyBlock += `\n`;
        if (session.feedback) {
          journeyBlock += `  Feedback: ${(session.feedback as string).slice(0, 200)}\n`;
        }
      }
    }

    if (kbStats.length > 0) {
      journeyBlock += `\n## KNOWLEDGE BASE\n`;
      for (const stat of kbStats) {
        journeyBlock += `- ${stat.category}: ${stat._count} doc(s)\n`;
      }
    }

    // Build system prompt with existing context + journey context
    const systemPrompt = buildOnboardingPromptWithContext(existingProfile, journeyBlock);

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
      system: systemPrompt,
      messages,
      tools,
      maxSteps: 8, // Allow multiple tool calls per response (6 tool types + follow-ups)
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
