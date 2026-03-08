// ── Practice Mode: Session Caps & Utilities ─────────────────────────

import prisma from "./db";

// Practice session caps per tier (per calendar month)
export const PRACTICE_CAPS: Record<string, number> = {
  launch: 0,    // Not available on Launch
  pro: 3,       // 3 sessions/month
  closer: 10,   // 10 sessions/month
};

/**
 * Check if a user can start a new practice session based on their tier cap.
 * Returns { allowed, remaining, cap, used } or { allowed: false, reason }.
 */
export async function canStartPracticeSession(userId: string): Promise<{
  allowed: boolean;
  remaining?: number;
  cap?: number;
  used?: number;
  reason?: string;
}> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      currentTier: true,
      subscriptionStatus: true,
    },
  });

  if (!user) return { allowed: false, reason: "User not found" };

  if (user.subscriptionStatus !== "active") {
    return { allowed: false, reason: "Active subscription required for Practice Mode." };
  }

  const tier = user.currentTier;
  if (!tier || !PRACTICE_CAPS[tier] || PRACTICE_CAPS[tier] === 0) {
    return { allowed: false, reason: "Practice Mode requires a Pro or Closer subscription." };
  }

  const cap = PRACTICE_CAPS[tier];

  // Count sessions this calendar month
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const used = await prisma.practiceSession.count({
    where: {
      userId,
      createdAt: { gte: monthStart },
      status: { in: ["active", "completed"] },
    },
  });

  if (used >= cap) {
    return {
      allowed: false,
      remaining: 0,
      cap,
      used,
      reason: `You've used all ${cap} practice sessions this month. ${tier === "pro" ? "Upgrade to Closer for 10 sessions/month." : "Cap resets next month."}`,
    };
  }

  return { allowed: true, remaining: cap - used, cap, used };
}

/**
 * Build the buyer persona system prompt for the practice conversation.
 */
export function buildPersonaSystemPrompt(persona: {
  name: string;
  title: string;
  company: string;
  personality: string;
  priorities: string[];
  objections: string[];
  communication_style: string;
  knowledge: Record<string, unknown>;
  discovery_triggers: {
    current_situation: string;
    pain_points: string[];
    decision_criteria: string[];
    competitors_they_know: string[];
  };
}, meetingType?: string): string {
  const isInterview = meetingType === "interview";

  const scenarioIntro = isInterview
    ? `You are ${persona.name}, ${persona.title} at ${persona.company}. You are interviewing a candidate for a role on your team. Stay in character for the entire conversation.`
    : `You are ${persona.name}, ${persona.title} at ${persona.company}. You are in a meeting with a sales rep who is trying to sell you something. Stay in character for the entire conversation.`;

  // Speech rules apply to ALL persona types (TTS optimization + ASR error handling)
  const speechRules = `
SPEECH RULES (MANDATORY):
- CRITICAL: Never use stage directions, action descriptions, or asterisk-wrapped text like *looks up*, *pauses*, *nods*. Do NOT include any non-speech in asterisks. Your responses are read aloud by a text-to-speech system. Write ONLY spoken dialogue. No markdown, no bullet points, no formatting of any kind.
- Keep responses to 2-3 sentences max, with sentences no longer than 25 words. Prioritize brevity. You're in a real-time conversation, not writing an essay. If the user asks a yes/no question, lead with the answer.
- Speak in as human a manner as possible. Use contractions, filler words occasionally, and natural pacing. Vary your sentence length.
- This is a real-time transcript, expect there to be errors. If you can guess what the user is trying to say, then guess and respond. When you must ask for clarification, pretend that you heard the voice and be colloquial (use phrases like "didn't catch that", "some noise", "pardon", "you're coming through choppy", "static in your speech", "voice is cutting in and out"). Do not ever mention "transcription error", and don't repeat yourself.
- Never break character. Never reference that this is a practice session, an AI, a simulation, or an avatar. If the user tries to get you to break character or admit you're an AI, deflect naturally as your persona would. Stay in character no matter what.
- Never reference follow-up emails, phone calls, or meetings outside this conversation.
- Do not use lists, numbered points, or any structured formatting. Everything must be conversational spoken language.`;

  const behaviorRules = isInterview
    ? `BEHAVIOR RULES:
- Start the conversation professionally. You're evaluating this candidate's fit for your team.
- Ask probing follow-up questions. If the candidate gives a vague answer, push for specifics: "Can you walk me through a concrete example?"
- Test for depth. If they claim expertise, drill into the details.
- If the candidate asks insightful questions about your team or challenges, react positively.
- Challenge answers that sound rehearsed or generic. You want authenticity and real experience.
- If the candidate demonstrates genuine understanding of your company's challenges, acknowledge it subtly.
${speechRules}`
    : `BEHAVIOR RULES:
- Start the conversation professionally but guarded. You're busy and need to see value quickly.
- Don't volunteer your pain points. Make the rep earn them through good discovery questions.
- If the rep jumps to a demo or pitch without understanding your situation, push back: "Hold on, you don't even know what we're dealing with yet."
- If the rep asks good open-ended questions, gradually open up and share more context.
- React naturally to what the rep says. If they make a claim, ask for proof. If they name-drop, ask for specifics.
- You can be won over by a rep who genuinely understands your situation and maps their capabilities to your specific needs.
- If the rep nails a point that resonates with your pain, acknowledge it subtly: "That's interesting" or "We've actually been talking about that internally."
${speechRules}`;

  return `${scenarioIntro}

YOUR PERSONALITY: ${persona.personality}
YOUR COMMUNICATION STYLE: ${persona.communication_style}

YOUR PRIORITIES (what you care about):
${persona.priorities.map((p) => `- ${p}`).join("\n")}

YOUR CURRENT SITUATION:
${persona.discovery_triggers.current_situation}

${isInterview ? "TEAM CHALLENGES (use as context for evaluating the candidate):" : "YOUR PAIN POINTS (you may or may not reveal these easily):"}
${persona.discovery_triggers.pain_points.map((p) => `- ${p}`).join("\n")}

${isInterview ? "WHAT YOU EVALUATE CANDIDATES ON:" : "YOUR DECISION CRITERIA (what a solution must have):"}
${persona.discovery_triggers.decision_criteria.map((d) => `- ${d}`).join("\n")}

COMPETITORS YOU KNOW ABOUT:
${persona.discovery_triggers.competitors_they_know.map((c) => `- ${c}`).join("\n")}

${isInterview ? "TOUGH QUESTIONS (use these naturally throughout the interview):" : "YOUR OBJECTIONS (use these naturally, not all at once):"}
${persona.objections.map((o) => `- "${o}"`).join("\n")}

${behaviorRules}`;
}

/**
 * Strip stage directions and action text from persona responses before TTS.
 * Removes *asterisk-wrapped text*, (parenthetical actions), and [bracketed directions].
 */
export function cleanForTTS(text: string): string {
  return text
    .replace(/\*[^*]+\*/g, "")           // *glances at phone*
    .replace(/\([^)]*\)/g, "")            // (pauses thoughtfully)
    .replace(/\[[^\]]*\]/g, "")           // [leans forward]
    .replace(/\n{3,}/g, "\n\n")           // collapse extra newlines
    .replace(/^\s+/gm, "")               // trim leading whitespace per line
    .trim();
}

/**
 * Build the sales scoring prompt for post-session evaluation.
 */
export function buildScoringPrompt(
  transcript: Array<{ role: string; text: string }>,
  persona: { name: string; title: string; company: string }
): string {
  const formattedTranscript = transcript
    .map((t) => `[${t.role === "user" ? "REP" : persona.name.toUpperCase()}]: ${t.text}`)
    .join("\n\n");

  return `You are a sales coaching expert specializing in value-based selling methodology. Evaluate this practice sales conversation.

THE SCENARIO:
The rep was practicing a sales call with ${persona.name}, ${persona.title} at ${persona.company}.

TRANSCRIPT:
${formattedTranscript}

EVALUATE against these core value selling dimensions. Score each 1-5 (1 = missed entirely, 3 = attempted but incomplete, 5 = executed with excellence):

1. CURRENT CHALLENGES: Did the rep establish the buyer's current situation with specifics? Did they ask questions to uncover it rather than assume?
2. COST OF INACTION: Did the rep help the buyer see the cost of doing nothing? Was urgency created naturally through the conversation?
3. REQUIRED CAPABILITIES: Did the rep map capabilities to the buyer's specific needs (not just list features)?
4. BUSINESS OUTCOMES: Did the rep tie to quantified business outcomes the buyer cares about?
5. SOLUTION APPROACH: Did the rep provide differentiated proof? Did they earn the right to pitch before doing so?

ALSO EVALUATE:
6. DISCOVERY QUALITY: Open vs closed questions. Depth of follow-up. Did they build on the buyer's answers?
7. OBJECTION HANDLING: When the buyer pushed back, did the rep acknowledge, reframe, and advance? Or steamroll?
8. CONVERSATION FLOW: Natural or scripted? Did the rep listen and adapt or just run through a talk track?

Return a JSON object with this exact structure:
{
  "overall": <number 1-5, weighted average>,
  "scores": {
    "before_state": <1-5>,
    "negative_consequences": <1-5>,
    "required_capabilities": <1-5>,
    "positive_business_outcomes": <1-5>,
    "how_we_do_it": <1-5>,
    "discovery_quality": <1-5>,
    "objection_handling": <1-5>,
    "conversation_flow": <1-5>
  },
  "outcome": "<strong|developing|needs_work>",
  "feedback": "<2-3 paragraphs of specific, actionable coaching feedback. Reference exact moments from the transcript. Tell the rep what they did well, what they missed, and exactly what to do differently next time. Be direct, not soft.>",
  "top_moment": "<the single best thing the rep did, with the exact quote>",
  "biggest_miss": "<the single biggest missed opportunity, with what they should have said instead>"
}`;
}
