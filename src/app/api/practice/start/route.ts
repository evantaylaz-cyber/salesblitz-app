import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import prisma from "@/lib/db";
import { canStartPracticeSession } from "@/lib/practice";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// POST /api/practice/start
// Creates a practice session: generates persona from existing run research, returns session config
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

    // Check practice session cap
    const capCheck = await canStartPracticeSession(user.id);
    if (!capCheck.allowed) {
      return NextResponse.json(
        { error: capCheck.reason, remaining: capCheck.remaining, cap: capCheck.cap },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { targetCompany, runRequestId, meetingType } = body;

    if (!targetCompany) {
      return NextResponse.json({ error: "targetCompany is required" }, { status: 400 });
    }

    // Load research data from existing run if provided
    let researchContext = "";
    if (runRequestId) {
      const runRequest = await prisma.runRequest.findUnique({
        where: { id: runRequestId, userId: user.id },
        select: { researchData: true, targetCompany: true, targetName: true, targetRole: true },
      });
      if (runRequest?.researchData) {
        researchContext = typeof runRequest.researchData === "string"
          ? runRequest.researchData
          : JSON.stringify(runRequest.researchData);
      }
    }

    // Load user profile for seller context
    const sellerContext = user.userProfile
      ? `Seller's company: ${user.userProfile.companyName || "Unknown"}
Seller's product: ${user.userProfile.companyProduct || "Unknown"}
Seller's differentiators: ${user.userProfile.companyDifferentiators || "Unknown"}
Seller's target market: ${user.userProfile.companyTargetMarket || "Unknown"}`
      : "";

    // Generate buyer persona via Claude
    const personaPrompt = `Generate a realistic buyer persona for a practice sales call. The rep is selling to ${targetCompany}.

${researchContext ? `RESEARCH DATA ON THE COMPANY:\n${researchContext.slice(0, 8000)}` : "No prior research available. Generate a plausible persona based on the company name."}

${sellerContext ? `SELLER CONTEXT:\n${sellerContext}` : ""}

${meetingType ? `MEETING TYPE: ${meetingType}` : "MEETING TYPE: discovery"}

Generate a JSON object with this EXACT structure (no markdown, no code blocks, just the JSON):
{
  "name": "<realistic full name>",
  "title": "<realistic title at this company>",
  "company": "${targetCompany}",
  "personality": "<2-3 sentence personality description>",
  "priorities": ["<priority 1>", "<priority 2>", "<priority 3>"],
  "objections": ["<objection 1>", "<objection 2>", "<objection 3>", "<objection 4>"],
  "communication_style": "<1-2 sentence description of how they communicate>",
  "knowledge": {},
  "discovery_triggers": {
    "current_situation": "<specific description of their current situation and pain>",
    "pain_points": ["<pain 1>", "<pain 2>", "<pain 3>"],
    "decision_criteria": ["<criterion 1>", "<criterion 2>", "<criterion 3>"],
    "competitors_they_know": ["<competitor 1>", "<competitor 2>"]
  }
}

Make the persona feel REAL. Specific details, not generic business-speak. The objections should be challenging but surmountable. The pain points should be things a good rep can uncover through discovery.`;

    const personaResponse = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2000,
      messages: [{ role: "user", content: personaPrompt }],
    });

    let personaText = "";
    for (const block of personaResponse.content) {
      if (block.type === "text") personaText += block.text;
    }

    // Parse persona JSON (handle potential markdown wrapping)
    let persona;
    try {
      const jsonMatch = personaText.match(/\{[\s\S]*\}/);
      persona = JSON.parse(jsonMatch ? jsonMatch[0] : personaText);
    } catch {
      console.error("Failed to parse persona:", personaText);
      return NextResponse.json({ error: "Failed to generate persona" }, { status: 500 });
    }

    // Create PracticeSession in DB
    const session = await prisma.practiceSession.create({
      data: {
        userId: user.id,
        targetCompany,
        targetRole: persona.title,
        personaName: persona.name,
        personaConfig: persona,
        status: "created",
        transcript: [],
      },
    });

    return NextResponse.json({
      sessionId: session.id,
      persona: {
        name: persona.name,
        title: persona.title,
        company: persona.company,
        personality: persona.personality,
      },
      remaining: (capCheck.remaining ?? 0) - 1,
      cap: capCheck.cap,
    });
  } catch (err) {
    console.error("Practice start error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
