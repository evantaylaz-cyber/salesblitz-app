import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import prisma from "@/lib/db";
import { buildScoringPrompt } from "@/lib/practice";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// POST /api/practice/end
// Ends a session, scores the transcript against CotM, saves results
export async function POST(req: NextRequest) {
  try {
    const clerkUser = await currentUser();
    if (!clerkUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { clerkId: clerkUser.id },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const body = await req.json();
    const { sessionId, durationSeconds } = body;

    if (!sessionId) {
      return NextResponse.json({ error: "sessionId required" }, { status: 400 });
    }

    const session = await prisma.practiceSession.findUnique({
      where: { id: sessionId, userId: user.id },
    });

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const transcript = session.transcript as Array<{ role: string; text: string }>;
    const persona = session.personaConfig as { name: string; title: string; company: string };

    // Need at least a couple exchanges to score meaningfully
    if (transcript.length < 4) {
      await prisma.practiceSession.update({
        where: { id: sessionId },
        data: {
          status: "completed",
          durationSeconds: durationSeconds || null,
          completedAt: new Date(),
          feedback: "Session too short to score. Try to have at least a few exchanges to get meaningful feedback.",
          outcome: "needs_work",
        },
      });

      return NextResponse.json({
        score: null,
        feedback: "Session too short to score. Try to have at least a few exchanges to get meaningful feedback.",
        outcome: "needs_work",
      });
    }

    // Score the conversation
    const scoringPrompt = buildScoringPrompt(transcript, persona);

    const scoringResponse = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2000,
      messages: [{ role: "user", content: scoringPrompt }],
    });

    let scoringText = "";
    for (const block of scoringResponse.content) {
      if (block.type === "text") scoringText += block.text;
    }

    // Parse scoring JSON
    let scoring;
    try {
      const jsonMatch = scoringText.match(/\{[\s\S]*\}/);
      scoring = JSON.parse(jsonMatch ? jsonMatch[0] : scoringText);
    } catch {
      console.error("Failed to parse scoring:", scoringText);
      scoring = {
        overall: 0,
        scores: {},
        outcome: "needs_work",
        feedback: "Scoring failed. Review your transcript manually.",
        top_moment: "",
        biggest_miss: "",
      };
    }

    // Save scoring results
    await prisma.practiceSession.update({
      where: { id: sessionId },
      data: {
        status: "completed",
        durationSeconds: durationSeconds || null,
        completedAt: new Date(),
        cotmScore: {
          overall: scoring.overall,
          scores: scoring.scores,
          top_moment: scoring.top_moment,
          biggest_miss: scoring.biggest_miss,
        },
        feedback: scoring.feedback,
        outcome: scoring.outcome,
      },
    });

    return NextResponse.json({
      score: scoring,
      feedback: scoring.feedback,
      outcome: scoring.outcome,
    });
  } catch (err) {
    console.error("Practice end error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
