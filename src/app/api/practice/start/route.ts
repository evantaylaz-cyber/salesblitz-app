import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import prisma from "@/lib/db";
import { canStartPracticeSession, cleanupStaleSessions } from "@/lib/practice";
import Anthropic from "@anthropic-ai/sdk";
import { aiLimiter, rateLimitResponse } from "@/lib/rate-limit";
import { auditPracticeStarted } from "@/lib/audit-log";

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

    // Rate limit: AI tier (practice start generates persona via Claude)
    const rlResult = aiLimiter.check(user.id);
    if (!rlResult.allowed) return rateLimitResponse(rlResult);

    // Clean up stale sessions before checking cap (non-blocking)
    cleanupStaleSessions().catch((err) => console.error("Stale session cleanup error:", err));

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
    let linkedTargetName: string | null = null;
    let linkedTargetRole: string | null = null;
    let linkedJobDescription = "";
    let linkedInterviewInstructions = "";
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
          jobDescription: true,
          interviewInstructions: true,
          interviewPanel: {
            include: { members: { orderBy: { order: "asc" } } },
          },
        },
      });
      if (runRequest) {
        linkedRunRequestId = runRequest.id;
        linkedTargetId = runRequest.targetId;
        linkedMeetingType = runRequest.meetingType;
        linkedTargetName = runRequest.targetName;
        linkedTargetRole = runRequest.targetRole;
        linkedJobDescription = runRequest.jobDescription || "";
        linkedInterviewInstructions = runRequest.interviewInstructions || "";
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
            contactName: "",
          },
        },
        update: {},
        create: {
          userId: user.id,
          companyName: targetCompany,
          contactName: "",
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
      select: { id: true, sessionSequence: true, feedback: true, cotmScore: true, userNotes: true },
    });

    // Load accumulated intel + round info from Target (full learning history across all sessions)
    let accumulatedIntel = "";
    let targetRoundCount = 0;
    let targetCurrentRound = 1;
    if (linkedTargetId) {
      const target = await prisma.target.findUnique({
        where: { id: linkedTargetId },
        select: { accumulatedIntel: true, roundCount: true, currentRound: true },
      });
      accumulatedIntel = target?.accumulatedIntel || "";
      targetRoundCount = target?.roundCount ?? 0;
      targetCurrentRound = target?.currentRound ?? 1;
    }

    // Load meeting recordings for this target (real call intel to inform persona behavior)
    let meetingRecordingsContext = "";
    if (linkedTargetId) {
      const recordings = await prisma.meetingRecording.findMany({
        where: { targetId: linkedTargetId, status: "completed" },
        orderBy: { createdAt: "desc" },
        take: 3,
        select: {
          meetingType: true,
          outcome: true,
          overallScore: true,
          analysis: true,
          createdAt: true,
        },
      });
      if (recordings.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const recSummaries = recordings.map((rec: any) => {
          const analysis = rec.analysis as Record<string, unknown> | null;
          const objections = (analysis?.objections as Array<{ objection?: string }>) || [];
          const coachingNotes = (analysis?.coachingNotes as Array<{ dimension?: string; observation?: string }>) || [];
          const dq = analysis?.dealQualification as { gaps?: string[]; strengths?: string[] } | undefined;
          return [
            `Meeting: ${rec.meetingType || "unknown"} (${rec.createdAt?.toISOString?.()?.slice(0, 10) || "unknown date"})`,
            rec.outcome ? `Outcome: ${rec.outcome}` : null,
            rec.overallScore != null ? `Score: ${rec.overallScore}/100` : null,
            objections.length > 0 ? `Objections raised: ${objections.slice(0, 5).map(o => o.objection).filter(Boolean).join("; ")}` : null,
            dq?.gaps && dq.gaps.length > 0 ? `Qualification gaps: ${dq.gaps.slice(0, 3).join("; ")}` : null,
            dq?.strengths && dq.strengths.length > 0 ? `Strengths: ${dq.strengths.slice(0, 3).join("; ")}` : null,
            coachingNotes.length > 0 ? `Coaching: ${coachingNotes.slice(0, 3).map(n => `${n.dimension}: ${n.observation}`).join("; ")}` : null,
          ].filter(Boolean).join("\n");
        });
        meetingRecordingsContext = `REAL MEETING RECORDINGS (${recordings.length} prior calls with this company):\n${recSummaries.join("\n---\n")}\n`;
      }
    }

    // Load knowledge documents for the user's company context (case studies, research docs)
    let knowledgeDocsContext = "";
    try {
      const knowledgeDocs = await prisma.knowledgeDocument.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: { title: true, content: true, category: true },
      });
      if (knowledgeDocs.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const docSummaries = knowledgeDocs.map((d: any) =>
          `[${d.category}] ${d.title}: ${(d.content || "").slice(0, 500)}`
        );
        knowledgeDocsContext = `KNOWLEDGE BASE (${knowledgeDocs.length} documents):\n${docSummaries.join("\n")}\n`;
      }
    } catch {
      // Non-fatal
    }

    // Load user profile for seller context (use ALL available fields including resume-derived data)
    const p = user.userProfile;
    const keyStrengths = p?.keyStrengths as string[] | null;
    const dealStories = p?.dealStories as Array<{ company?: string; dealSize?: string; summary?: string }> | null;
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
          p.linkedinExperience && `Experience:\n${(p.linkedinExperience as string).slice(0, 1500)}`,
          keyStrengths && keyStrengths.length > 0 && `Key Strengths: ${keyStrengths.join(", ")}`,
          dealStories && dealStories.length > 0 && `Deal Stories (${dealStories.length}): ${dealStories.slice(0, 3).map(s => `${s.company || "Unnamed"} (${s.dealSize || "N/A"})`).join("; ")}`,
          p.writingStyle && `Writing Style: ${p.writingStyle}`,
        ].filter(Boolean).join("\n")
      : "";

    // Use the most specific meeting type available
    const effectiveMeetingType = meetingType || linkedMeetingType || "discovery";
    const isInterview = effectiveMeetingType === "interview" || ["phone_screen", "hiring_manager", "mock_pitch", "panel", "final", "executive"].includes(effectiveMeetingType);
    // Build prior session context for session chaining (use accumulated intel + last session)
    let priorSessionContext = "";
    if (accumulatedIntel) {
      priorSessionContext += `\nACCUMULATED COACHING HISTORY (across all prior sessions for this target):\n${accumulatedIntel.slice(0, 2000)}\n`;
    }
    if (previousSession?.feedback) {
      priorSessionContext += `\nMOST RECENT SESSION FEEDBACK (session #${previousSession.sessionSequence}):\n${previousSession.feedback.slice(0, 1000)}\n`;
    }
    if (previousSession?.userNotes) {
      priorSessionContext += `\nUSER'S OWN NOTES FROM LAST SESSION:\n${previousSession.userNotes.slice(0, 500)}\nUse these notes to understand what the candidate/rep wants to work on. Probe these areas.\n`;
    }
    // Fetch cross-session coaching intelligence from worker (non-blocking, with timeout)
    try {
      const workerUrl = process.env.WORKER_WEBHOOK_URL?.replace("/execute", "/coaching-context");
      if (workerUrl && user.id) {
        const coachingRes = await Promise.race([
          fetch(workerUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-api-key": process.env.INTERNAL_API_KEY || "" },
            body: JSON.stringify({ userId: user.id, targetCompany, meetingType: effectiveMeetingType }),
          }),
          new Promise<Response>((_, reject) => setTimeout(() => reject(new Error("timeout")), 3000)),
        ]);
        if (coachingRes.ok) {
          const { coaching } = await coachingRes.json();
          if (coaching && coaching.length > 0) {
            priorSessionContext += `\nCROSS-SESSION COACHING (patterns from similar practice sessions at other companies):\n`;
            for (const c of coaching.slice(0, 3)) {
              priorSessionContext += `- ${c.target_company} (${c.outcome || "no outcome"}): ${c.feedback?.slice(0, 250) || ""}\n`;
            }
          }
        }
      }
    } catch {
      // Non-fatal — coaching context is a bonus, not a requirement
    }

    if (priorSessionContext) {
      priorSessionContext += `\nCOACHING DIRECTIVE: Push harder on the areas where the candidate/rep was weakest in prior sessions. Test whether they've improved. Don't repeat the same opening; pick up where they left off. If they've been strong in certain areas, probe at a deeper level.`;
    }

    // Build smarter research extraction: prioritize structured sections over raw dump
    const maxResearchChars = 30000;
    let trimmedResearch = researchContext;
    if (researchContext.length > maxResearchChars) {
      // Try to extract the most useful sections first
      const sections = ["executive summary", "key findings", "company overview", "competitive", "stakeholder", "pain point", "challenge", "opportunity", "decision"];
      const lines = researchContext.split("\n");
      let prioritized: string[] = [];
      let rest: string[] = [];
      let inPrioritySection = false;
      for (const line of lines) {
        const lower = line.toLowerCase();
        if (sections.some(s => lower.includes(s))) {
          inPrioritySection = true;
        } else if (line.startsWith("# ") || line.startsWith("## ")) {
          inPrioritySection = false;
        }
        if (inPrioritySection) {
          prioritized.push(line);
        } else {
          rest.push(line);
        }
      }
      const prioritizedText = prioritized.join("\n");
      const restText = rest.join("\n");
      trimmedResearch = prioritizedText.length > maxResearchChars
        ? prioritizedText.slice(0, maxResearchChars)
        : prioritizedText + "\n" + restText.slice(0, maxResearchChars - prioritizedText.length);
    }

    // Build name/title instructions for persona prompt
    const nameInstruction = linkedTargetName
      ? `"name": "${linkedTargetName}"`
      : `"name": "<realistic full name>"`;
    const titleInstructionInterview = linkedTargetRole
      ? `"title": "${linkedTargetRole}"`
      : `"title": "<realistic hiring manager or panel member title at this company>"`;
    const titleInstructionSales = linkedTargetRole
      ? `"title": "${linkedTargetRole}"`
      : `"title": "<realistic title at this company>"`;
    const nameGuidance = linkedTargetName
      ? `IMPORTANT: The interviewer's name is ${linkedTargetName}${linkedTargetRole ? ` and their title is ${linkedTargetRole}` : ""}. Build the persona around this REAL person. Use any research data about them to inform personality, communication style, and priorities. Do NOT invent a different name.`
      : "";
    const nameGuidanceSales = linkedTargetName
      ? `IMPORTANT: The prospect's name is ${linkedTargetName}${linkedTargetRole ? ` and their title is ${linkedTargetRole}` : ""}. Build the persona around this REAL person. Use any research data about them to inform personality, communication style, and priorities. Do NOT invent a different name.`
      : "";

    // Build round context string
    const roundContext = targetRoundCount > 0
      ? `ROUND CONTEXT: This is Round ${targetCurrentRound} of ${targetRoundCount} total interactions with ${targetCompany}. ${targetCurrentRound > 1 ? "This is NOT a first meeting. The candidate/rep has prior experience with this company. Adjust your expectations accordingly; skip basic introductions and go deeper." : "This is the first interaction."}`
      : "";

    const personaPrompt = isInterview
      ? `Generate a realistic interviewer persona for a practice interview at ${targetCompany}. The user is the CANDIDATE being interviewed.
${nameGuidance}

${trimmedResearch ? `RESEARCH DATA ON THE COMPANY:\n${trimmedResearch}` : "No prior research available. Generate a plausible persona based on the company name."}

${linkedJobDescription ? `JOB DESCRIPTION:\n${linkedJobDescription.slice(0, 3000)}` : ""}
${linkedInterviewInstructions ? `INTERVIEW INSTRUCTIONS/ASSIGNMENT:\n${linkedInterviewInstructions.slice(0, 2000)}\nIMPORTANT: Evaluate the candidate against these specific instructions. Ask questions that test whether they completed or understood the assignment.` : ""}

${sellerContext ? `CANDIDATE CONTEXT:\n${sellerContext}` : ""}
${knowledgeDocsContext}
${meetingRecordingsContext}
${priorSessionContext}
${roundContext}
MEETING TYPE: ${effectiveMeetingType}

Generate a JSON object with this EXACT structure (no markdown, no code blocks, just the JSON):
{
  ${nameInstruction},
  ${titleInstructionInterview},
  "gender": "<male or female, inferred from the name>",
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
${nameGuidanceSales}

${trimmedResearch ? `RESEARCH DATA ON THE COMPANY:\n${trimmedResearch}` : "No prior research available. Generate a plausible persona based on the company name."}

${sellerContext ? `SELLER CONTEXT:\n${sellerContext}` : ""}
${knowledgeDocsContext}
${meetingRecordingsContext}
${priorSessionContext}
${roundContext}
MEETING TYPE: ${effectiveMeetingType}

Generate a JSON object with this EXACT structure (no markdown, no code blocks, just the JSON):
{
  ${nameInstruction},
  ${titleInstructionSales},
  "gender": "<male or female, inferred from the name>",
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

    // Validate persona has required fields (Claude may return incomplete JSON)
    const requiredPersonaFields = ["name", "company"];
    for (const field of requiredPersonaFields) {
      if (!persona[field]) {
        console.error(`Persona missing required field '${field}':`, JSON.stringify(persona).slice(0, 500));
        return NextResponse.json({ error: `Generated persona missing required field: ${field}` }, { status: 500 });
      }
    }
    // Ensure optional fields have safe defaults
    persona.title = persona.title || "Unknown Title";
    persona.personality = persona.personality || "Professional and direct.";
    persona.priorities = Array.isArray(persona.priorities) ? persona.priorities : [];
    persona.objections = Array.isArray(persona.objections) ? persona.objections : [];
    persona.communication_style = persona.communication_style || "";
    persona.discovery_triggers = persona.discovery_triggers || {};

    // Store meetingType in personaConfig so message route can adapt behavior
    persona._meetingType = effectiveMeetingType;

    // Panel mode: if we have valid panel data with 2+ members, enable panel mode
    const isPanelMode = panelData !== null && Array.isArray(panelData) && panelData.length > 1 && panelData.every(m => m.name?.trim());
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
        focusAreas: accumulatedIntel
          ? [accumulatedIntel.slice(0, 1500)]
          : previousSession?.feedback
            ? [previousSession.feedback.slice(0, 500)]
            : [],
        status: "created",
        transcript: [],
      },
    });

    // Fire-and-forget audit log (non-blocking)
    auditPracticeStarted(user.id, clerkUser.id, session.id, { targetCompany, meetingType: effectiveMeetingType }, req)
      .catch((err) => console.error("Audit log failed:", err));

    return NextResponse.json({
      sessionId: session.id,
      persona: {
        name: isPanelMode ? panelData![0].name : persona.name,
        title: isPanelMode ? panelData![0].title : persona.title,
        company: targetCompany,
        personality: persona.personality,
        gender: persona.gender || null,
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
