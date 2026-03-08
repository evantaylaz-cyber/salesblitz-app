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
    let linkedRunRequestId: string | null = null;
    let linkedTargetId: string | null = null;
    let linkedMeetingType: string | null = null;
    let panelData: Array<{ name: string; title: string | null; roleInMeeting: string; personalityVibe: string | null; evaluationFocus: string | null }> | null = null;
    if (runRequestId) {
      const runRequest = await prisma.runRequest.findUnique({
        where: { id: runRequestId, userId: user.id },
        select: {
          id: true,
          researchData: true,
          targetCompany: true,
          targetName: true,
          targetRole: true,
          targetId: true,
          meetingType: true,
          interviewPanel: {
            include: { members: { orderBy: { order: "asc" } } },
          },
        },
      });
      if (runRequest) {
        linkedRunRequestId = runRequest.id;
        linkedTargetId = runRequest.targetId;
        linkedMeetingType = runRequest.meetingType;
        if (runRequest.researchData) {
          researchContext = typeof runRequest.researchData === "string"
            ? runRequest.researchData
            : JSON.stringify(runRequest.researchData);
        }
        // Extract panel data if available
        if (runRequest.interviewPanel?.members && runRequest.interviewPanel.members.length > 0) {
          panelData = runRequest.interviewPanel.members.map((m: { name: string; title: string | null; roleInMeeting: string; personalityVibe: string | null; evaluationFocus: string | null; order: number }) => ({
            name: m.name,
            title: m.title,
            roleInMeeting: m.roleInMeeting,
            personalityVibe: m.personalityVibe,
            evaluationFocus: m.evaluationFocus,
          }));
        }
      }
    }

    // Resolve Target (from RunRequest link or upsert)
    if (!linkedTargetId) {
      const target = await prisma.target.upsert({
        where: {
          userId_companyName_contactName: {
            userId: user.id,
            companyName: targetCompany,
            contactName: null,
          },
        },
        update: {},
        create: {
          userId: user.id,
          companyName: targetCompany,
          type: meetingType === "interview" ? "interview" : "prospect",
        },
      });
      linkedTargetId = target.id;
    }

    // Check for prior sessions on this target (session chaining)
    const previousSession = await prisma.practiceSession.findFirst({
      where: {
        userId: user.id,
        targetId: linkedTargetId,
        status: "completed",
      },
      orderBy: { createdAt: "desc" },
      select: { id: true, sessionSequence: true, feedback: true, cotmScore: true },
    });

    // Load user profile for seller context (use ALL available fields)
    const p = user.userProfile;
    const sellerContext = p
      ? [
          p.companyName && `Company: ${p.companyName}`,
          p.companyProduct && `Product: ${p.companyProduct}`,
          p.companyDescription && `Description: ${p.companyDescription}`,
          p.companyDifferentiators && `Differentiators: ${p.companyDifferentiators}`,
          p.companyCompetitors && `Competitors: ${p.companyCompetitors}`,
          p.companyTargetMarket && `Target Market: ${p.companyTargetMarket}`,
          p.sellingStyle && `Selling Methodology: ${p.sellingStyle}`,
          p.sellingPhilosophy && `Selling Philosophy: ${p.sellingPhilosophy}`,
          p.sellerArchetype && `Seller Archetype: ${p.sellerArchetype}`,
          p.careerNarrative && `Career Narrative: ${p.careerNarrative}`,
          p.lifecycleStage && `Lifecycle: ${p.lifecycleStage}`,
          p.territoryFocus && `Territory Focus: ${p.territoryFocus}`,
          p.currentQuotaContext && `Quota Context: ${p.currentQuotaContext}`,
          p.linkedinAbout && `LinkedIn About: ${p.linkedinAbout}`,
        ].filter(Boolean).join("\n")
      : "";

    // Use the most specific meeting type available
    const effectiveMeetingType = meetingType || linkedMeetingType || "discovery";
    const isInterview = effectiveMeetingType === "interview" || ["phone_screen", "hiring_manager", "mock_pitch", "panel", "final", "executive"].includes(effectiveMeetingType);
    // Build prior session context for session chaining
    const priorSessionContext = previousSession?.feedback
      ? `\nPRIOR SESSION FEEDBACK (session #${previousSession.sessionSequence}):\n${previousSession.feedback.slice(0, 1000)}\nPush harder on the areas where the candidate/rep was weakest. Don't repeat the same opening; pick up where they left off.`
      : "";

    const personaPrompt = isInterview
      ? `Generate a realistic interviewer persona for a practice interview at ${targetCompany}. The user is the CANDIDATE being interviewed.

${researchContext ? `RESEARCH DATA ON THE COMPANY:\n${researchContext.slice(0, 12000)}` : "No prior research available. Generate a plausible persona based on the company name."}

${sellerContext ? `CANDIDATE CONTEXT:\n${sellerContext}` : ""}
${priorSessionContext}
MEETING TYPE: ${effectiveMeetingType}

Generate a JSON object with this EXACT structure (no markdown, no code blocks, just the JSON):
{
  "name": "<realistic full name>",
  "title": "<realistic hiring manager or panel member title at this company>",
  "company": "${targetCompany}",
  "personality": "<2-3 sentence personality description as an interviewer>",
  "priorities": ["<what they care about in a candidate 1>", "<priority 2>", "<priority 3>"],
  "objections": ["<tough interview question 1>", "<tough question 2>", "<tough question 3>", "<tough question 4>"],
  "communication_style": "<1-2 sentence description of their interview style>",
  "knowledge": {},
  "discovery_triggers": {
    "current_situation": "<what's happening at the company that created this opening>",
    "pain_points": ["<team challenge 1>", "<challenge 2>", "<challenge 3>"],
    "decision_criteria": ["<what they evaluate candidates on 1>", "<criterion 2>", "<criterion 3>"],
    "competitors_they_know": ["<competitor 1>", "<competitor 2>"]
  }
}

Make the persona feel like a REAL interviewer. They should ask probing follow-ups, challenge vague answers, and test for depth. The questions should be specific to ${targetCompany}'s actual business challenges.`
      : `Generate a realistic persona for a practice sales call. The rep is selling to ${targetCompany}.

${researchContext ? `RESEARCH DATA ON THE COMPANY:\n${researchContext.slice(0, 12000)}` : "No prior research available. Generate a plausible persona based on the company name."}

${sellerContext ? `SELLER CONTEXT:\n${sellerContext}` : ""}
${priorSessionContext}
MEETING TYPE: ${effectiveMeetingType}

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

    // Store meetingType in personaConfig so message route can adapt behavior
    persona._meetingType = effectiveMeetingType;

    // Panel mode: if we have panel data, store it for the message route
    const isPanelMode = panelData !== null && panelData.length > 1;
    if (isPanelMode) {
      persona._panelMembers = panelData;
      persona._isPanelMode = true;
    }

    // Create PracticeSession in DB (linked to Target, RunRequest, and prior session)
    const session = await prisma.practiceSession.create({
      data: {
        userId: user.id,
        targetId: linkedTargetId,
        runRequestId: linkedRunRequestId,
        targetCompany,
        targetRole: persona.title,
        personaName: isPanelMode ? panelData![0].name : persona.name,
        personaConfig: persona,
        isPanelMode,
        panelMemberStates: isPanelMode ? {
          currentSpeakerIndex: 0,
          turnCounts: Object.fromEntries(panelData!.map(m => [m.name, 0])),
          members: panelData,
        } : undefined,
        previousSessionId: previousSession?.id || null,
        sessionSequence: previousSession ? previousSession.sessionSequence + 1 : 1,
        focusAreas: previousSession?.feedback
          ? [previousSession.feedback.slice(0, 500)]
          : [],
        status: "created",
        transcript: [],
      },
    });

    return NextResponse.json({
      sessionId: session.id,
      persona: {
        name: isPanelMode ? panelData![0].name : persona.name,
        title: isPanelMode ? panelData![0].title : persona.title,
        company: targetCompany,
        personality: persona.personality,
      },
      isPanelMode,
      panelMembers: isPanelMode ? panelData!.map(m => ({ name: m.name, title: m.title, roleInMeeting: m.roleInMeeting })) : undefined,
      remaining: (capCheck.remaining ?? 0) - 1,
      cap: capCheck.cap,
    });
  } catch (err) {
    console.error("Practice start error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
