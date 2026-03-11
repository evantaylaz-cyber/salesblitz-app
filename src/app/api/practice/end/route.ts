export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import prisma from "@/lib/db";
import { buildScoringPrompt } from "@/lib/practice";
import { triggerEmbed } from "@/lib/trigger-worker";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// POST /api/practice/end
// Ends a session, scores the transcript against value selling framework, saves results
export async function POST(req: NextRequest) {
  try {
    const clerkUser = await currentUser();
    if (!clerkUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { clerkId: clerkUser.id },
      include: { userProfile: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const body = await req.json();
    const { sessionId, durationSeconds: rawDuration } = body;
    // Validate durationSeconds: must be positive and under 24 hours
    const durationSeconds = typeof rawDuration === "number" && rawDuration > 0 && rawDuration < 86400
      ? Math.round(rawDuration)
      : null;

    if (!sessionId) {
      return NextResponse.json({ error: "sessionId required" }, { status: 400 });
    }

    const session = await prisma.practiceSession.findUnique({
      where: { id: sessionId, userId: user.id },
    });

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const transcript = session.transcript as Array<{ role: string; text: string; speaker?: string }>;
    const persona = session.personaConfig as { name: string; title: string; company: string; _meetingType?: string };

    // Determine meeting type for scoring rubric selection
    const meetingType = persona._meetingType || "discovery";

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

    // Build seller context from user profile for scoring (resume-derived fields included)
    const p = user.userProfile;
    const keyStrengths = p?.keyStrengths as string[] | null;
    const dealStories = p?.dealStories as Array<{ company?: string; dealSize?: string; summary?: string }> | null;
    const sellerContext = p
      ? [
          p.companyName && `Company: ${p.companyName}`,
          p.companyProduct && `Product: ${p.companyProduct}`,
          p.sellingStyle && `Methodology: ${p.sellingStyle}`,
          p.sellerArchetype && `Archetype: ${p.sellerArchetype}`,
          p.careerNarrative && `Career: ${p.careerNarrative}`,
          p.linkedinExperience && `Experience:\n${(p.linkedinExperience as string).slice(0, 1500)}`,
          keyStrengths && keyStrengths.length > 0 && `Key Strengths: ${keyStrengths.join(", ")}`,
          dealStories && dealStories.length > 0 && `Deal Stories: ${dealStories.slice(0, 3).map(s => `${s.company || "Unnamed"} (${s.dealSize || "N/A"}): ${s.summary || ""}`).join("; ")}`,
        ].filter(Boolean).join("\n")
      : undefined;

    // Load research context from linked RunRequest (enables fact-checking in scoring)
    let researchContext: string | undefined;
    if (session.runRequestId) {
      try {
        const linkedRun = await prisma.runRequest.findUnique({
          where: { id: session.runRequestId },
          select: { researchData: true, jobDescription: true },
        });
        if (linkedRun?.researchData) {
          const raw = typeof linkedRun.researchData === "string"
            ? linkedRun.researchData
            : JSON.stringify(linkedRun.researchData);
          // Cap at 8K for scoring (don't need full 30K, just key facts)
          researchContext = raw.slice(0, 8000);
          if (linkedRun.jobDescription) {
            researchContext += `\n\nJOB DESCRIPTION:\n${linkedRun.jobDescription.slice(0, 2000)}`;
          }
        }
      } catch {
        // Non-fatal
      }
    }

    // Score the conversation (uses interview or sales rubric based on meetingType)
    const scoringPrompt = buildScoringPrompt(transcript, persona, meetingType, session.isPanelMode, sellerContext, researchContext);

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

    // Trigger async embedding for cross-session coaching intelligence (fire-and-forget)
    if (scoring.feedback) {
      triggerEmbed({
        type: "practice_session",
        id: sessionId,
        feedback: scoring.feedback,
        cotmScore: scoring.overall ? { overall: scoring.overall, outcome: scoring.outcome, biggest_miss: scoring.biggest_miss, top_moment: scoring.top_moment } : null,
        targetCompany: session.targetCompany,
      });
    }

    // Update Target.accumulatedIntel with key coaching points (context accumulation)
    if (session.targetId && scoring.feedback) {
      try {
        const target = await prisma.target.findUnique({
          where: { id: session.targetId },
          select: { accumulatedIntel: true },
        });

        // Build richer intel entry with dimension scores for pattern recognition
        const weakDims = scoring.scores ? Object.entries(scoring.scores)
          .filter(([, v]) => typeof v === "number" && (v as number) <= 2)
          .map(([k]) => k.replace(/_/g, " "))
          .slice(0, 3) : [];
        const strongDims = scoring.scores ? Object.entries(scoring.scores)
          .filter(([, v]) => typeof v === "number" && (v as number) >= 4)
          .map(([k]) => k.replace(/_/g, " "))
          .slice(0, 3) : [];
        const newIntel = [
          `[Session ${session.sessionSequence || 1} - ${new Date().toISOString().split("T")[0]}] Score: ${scoring.overall}/5 (${scoring.outcome}).`,
          weakDims.length > 0 ? `Weak areas: ${weakDims.join(", ")}.` : "",
          strongDims.length > 0 ? `Strong areas: ${strongDims.join(", ")}.` : "",
          scoring.biggest_miss ? `Key miss: ${scoring.biggest_miss.slice(0, 300)}` : "",
          scoring.top_moment ? `Strength: ${scoring.top_moment.slice(0, 300)}` : "",
        ].filter(Boolean).join(" ");

        const existingIntel = target?.accumulatedIntel || "";
        // Keep accumulated intel under 5K chars
        const combined = existingIntel
          ? `${existingIntel}\n\n${newIntel}`.slice(-5000)
          : newIntel;

        await prisma.target.update({
          where: { id: session.targetId },
          data: { accumulatedIntel: combined },
        });
      } catch (intelErr) {
        console.error("Failed to update target intel:", intelErr);
        // Non-fatal: don't fail the whole end request
      }
    }

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
