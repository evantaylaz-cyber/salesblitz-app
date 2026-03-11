/**
 * Shared meeting transcript analysis pipeline.
 * Used by both /api/meeting/upload and /api/meeting/transcribe routes.
 */

import prisma from "@/lib/db";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface MeetingAnalysis {
  summary?: string;
  meetingType?: string;
  attendees?: Array<{
    name: string;
    title?: string;
    company?: string;
    role?: string;
  }>;
  keyMoments?: Array<{
    timestamp: string;
    what: string;
    why: string;
  }>;
  objections?: Array<{
    objection: string;
    response: string;
    effectiveness: string;
  }>;
  commitments?: Array<{
    who: string;
    what: string;
    deadline?: string;
  }>;
  dealQualification?: {
    gaps?: string[];
    strengths?: string[];
    riskLevel?: string;
  };
  coachingNotes?: Array<{
    dimension: string;
    observation: string;
    suggestion: string;
  }>;
  nextSteps?: string[];
  outcome?: string;
  overallScore?: number;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const MAX_TRANSCRIPT_CHARS = 50000;
const MAX_INTEL_CHARS = 5000;
const ANALYSIS_MODEL = process.env.MEETING_ANALYSIS_MODEL || "claude-sonnet-4-20250514";

const ANALYSIS_PROMPT = `You are analyzing a real sales or interview meeting transcript. Extract structured intelligence.

TRANSCRIPT:
{TRANSCRIPT}

Respond with ONLY valid JSON (no markdown, no code fences):
{
  "summary": "2-3 sentence summary of what happened in this meeting",
  "meetingType": "discovery | demo | negotiation | interview | follow_up | internal | other",
  "attendees": [{"name": "...", "title": "...", "company": "...", "role": "buyer | seller | interviewer | candidate | other"}],
  "keyMoments": [{"timestamp": "early | mid | late", "what": "...", "why": "why this matters for the deal/opportunity"}],
  "objections": [{"objection": "...", "response": "how it was handled", "effectiveness": "strong | adequate | weak | unaddressed"}],
  "commitments": [{"who": "...", "what": "...", "deadline": "..."}],
  "dealQualification": {
    "gaps": ["qualification gaps identified"],
    "strengths": ["areas where deal/opportunity is strong"],
    "riskLevel": "low | medium | high"
  },
  "coachingNotes": [{"dimension": "discovery | value_messaging | objection_handling | closing | rapport | qualification", "observation": "...", "suggestion": "..."}],
  "nextSteps": ["concrete next steps"],
  "outcome": "strong | developing | needs_work | unknown",
  "overallScore": 3.5
}

Score 0-5 where 5 = masterclass execution, 3 = competent, 1 = significant gaps.
Focus on actionable intelligence, not generic observations.
If the transcript is too short or unclear, still extract what you can and set outcome to "unknown".`;

// ─── Core Analysis ──────────────────────────────────────────────────────────

/**
 * Analyze a meeting transcript using Claude and store results.
 * Handles the full pipeline: Claude API call, parse response, update recording, accumulate intel.
 */
export async function analyzeMeetingTranscript(
  recordingId: string,
  rawTranscript: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _userId: string
): Promise<void> {
  const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
  if (!ANTHROPIC_API_KEY) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (prisma as any).meetingRecording.update({
      where: { id: recordingId },
      data: { status: "failed", errorMessage: "No API key configured" },
    });
    return;
  }

  try {
    // Truncate to stay within context window
    const truncated = rawTranscript.slice(0, MAX_TRANSCRIPT_CHARS);
    const prompt = ANALYSIS_PROMPT.replace("{TRANSCRIPT}", truncated);

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: ANALYSIS_MODEL,
        max_tokens: 4096,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(
        `Claude API error: ${response.status} ${errText.slice(0, 200)}`
      );
    }

    const data = await response.json();
    const text = data.content?.[0]?.text || "";

    // Parse JSON from response (handle potential markdown wrapping)
    let analysis: MeetingAnalysis;
    try {
      const jsonStr = text
        .replace(/^```json?\n?/m, "")
        .replace(/\n?```$/m, "")
        .trim();
      analysis = JSON.parse(jsonStr);
    } catch {
      throw new Error(`Failed to parse analysis JSON: ${text.slice(0, 200)}`);
    }

    // Validate critical fields
    if (typeof analysis !== "object" || analysis === null) {
      throw new Error("Analysis returned non-object");
    }

    // Structure transcript into segments if possible
    const transcriptSegments = parseTranscriptSegments(rawTranscript);

    // Update recording with analysis
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (prisma as any).meetingRecording.update({
      where: { id: recordingId },
      data: {
        transcript: transcriptSegments.length > 0 ? transcriptSegments : null,
        analysis,
        outcome: analysis.outcome || "unknown",
        overallScore:
          typeof analysis.overallScore === "number"
            ? analysis.overallScore
            : null,
        meetingType: analysis.meetingType || null,
        attendees: Array.isArray(analysis.attendees)
          ? analysis.attendees
          : null,
        status: "completed",
      },
    });

    // Accumulate intel into Target (if linked)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const recording = await (prisma as any).meetingRecording.findUnique({
      where: { id: recordingId },
      select: { targetId: true },
    });

    if (recording?.targetId) {
      await accumulateIntel(recording.targetId, analysis);
    }

    // Embed the transcript for cross-account semantic search
    await embedTranscript(recordingId, rawTranscript, analysis);
  } catch (error) {
    console.error("[MEETING] Analysis pipeline failed:", error);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (prisma as any).meetingRecording.update({
      where: { id: recordingId },
      data: {
        status: "failed",
        errorMessage:
          error instanceof Error ? error.message : "Analysis failed",
      },
    });
  }
}

// ─── Transcript Parsing ─────────────────────────────────────────────────────

/**
 * Parse raw transcript text into structured segments.
 * Detects speaker labels like "John:", "[Speaker 1]", etc.
 */
export function parseTranscriptSegments(
  raw: string
): Array<{ speaker?: string; text: string }> {
  const lines = raw.split("\n").filter((l) => l.trim());
  const segments: Array<{ speaker?: string; text: string }> = [];

  // Require speaker label to start with uppercase and have at least 2 chars
  const speakerPattern = /^(?:\[([^\]]+)\]|([A-Z][a-zA-Z\s.'-]{1,30}):)\s*(.+)/;

  for (const line of lines) {
    const match = line.match(speakerPattern);
    if (match) {
      segments.push({
        speaker: (match[1] || match[2]).trim(),
        text: match[3].trim(),
      });
    } else if (line.trim()) {
      // No speaker label, append to previous segment or create new
      if (segments.length > 0 && !segments[segments.length - 1].speaker) {
        segments[segments.length - 1].text += " " + line.trim();
      } else {
        segments.push({ text: line.trim() });
      }
    }
  }

  return segments;
}

// ─── Intel Accumulation ─────────────────────────────────────────────────────

/**
 * Accumulate meeting intel into Target.accumulatedIntel.
 * Prepends new intel, caps at MAX_INTEL_CHARS.
 */
async function accumulateIntel(
  targetId: string,
  analysis: MeetingAnalysis
): Promise<void> {
  try {
    const target = await prisma.target.findUnique({
      where: { id: targetId },
      select: { accumulatedIntel: true },
    });

    const intelLines = [
      `[Real Call ${new Date().toISOString().slice(0, 10)}]`,
      analysis.outcome
        ? `Outcome: ${analysis.outcome} (${analysis.overallScore ?? "N/A"}/5)`
        : "",
      analysis.summary ? `Summary: ${analysis.summary}` : "",
      analysis.objections?.length
        ? `Objections: ${analysis.objections.map((o) => o.objection).join("; ")}`
        : "",
      analysis.dealQualification?.gaps?.length
        ? `Gaps: ${analysis.dealQualification.gaps.join("; ")}`
        : "",
      analysis.commitments?.length
        ? `Commitments: ${analysis.commitments.map((c) => c.what).join("; ")}`
        : "",
      analysis.nextSteps?.length
        ? `Next: ${analysis.nextSteps.join("; ")}`
        : "",
    ]
      .filter(Boolean)
      .join(" | ");

    const existing = target?.accumulatedIntel || "";
    const combined = `${intelLines}\n${existing}`.slice(0, MAX_INTEL_CHARS);

    await prisma.target.update({
      where: { id: targetId },
      data: { accumulatedIntel: combined },
    });
  } catch (err) {
    console.warn("[MEETING] Intel accumulation failed (non-fatal):", err);
  }
}

// ─── Transcript Embedding ──────────────────────────────────────────────────

const GEMINI_EMBED_MODEL = "text-embedding-004";
const GEMINI_EMBED_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_EMBED_MODEL}:embedContent`;

/**
 * Embed the meeting transcript + analysis summary for cross-account semantic search.
 * Uses Gemini text-embedding-004 (768 dims) to match the existing embedding infrastructure.
 * Stores the vector in MeetingRecording.transcriptEmbedding via raw SQL (Prisma doesn't support vector).
 */
async function embedTranscript(
  recordingId: string,
  rawTranscript: string,
  analysis: MeetingAnalysis
): Promise<void> {
  const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
  if (!GOOGLE_API_KEY) {
    console.warn("[MEETING] No GOOGLE_API_KEY, skipping transcript embedding");
    return;
  }

  try {
    // Build embedding text: analysis summary + key signals + truncated transcript
    // This gives semantic search the best of both worlds: structured intel + raw context
    const embeddingText = [
      analysis.summary || "",
      analysis.meetingType ? `Meeting type: ${analysis.meetingType}` : "",
      analysis.objections?.length
        ? `Objections: ${analysis.objections.map((o) => o.objection).join("; ")}`
        : "",
      analysis.dealQualification?.gaps?.length
        ? `Gaps: ${analysis.dealQualification.gaps.join("; ")}`
        : "",
      analysis.dealQualification?.strengths?.length
        ? `Strengths: ${analysis.dealQualification.strengths.join("; ")}`
        : "",
      analysis.nextSteps?.length
        ? `Next steps: ${analysis.nextSteps.join("; ")}`
        : "",
      // Include truncated transcript for richer semantic matching
      rawTranscript.slice(0, 2000),
    ]
      .filter(Boolean)
      .join("\n");

    const response = await fetch(`${GEMINI_EMBED_URL}?key=${GOOGLE_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: { parts: [{ text: embeddingText.slice(0, 4000) }] },
        taskType: "RETRIEVAL_DOCUMENT",
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.warn(`[MEETING] Embedding API error: ${response.status} ${errText.slice(0, 200)}`);
      return;
    }

    const data = await response.json();
    const values = data?.embedding?.values;
    if (!values || !Array.isArray(values)) {
      console.warn("[MEETING] Embedding API returned no values");
      return;
    }

    // Store via raw SQL (Prisma doesn't support pgvector type)
    const vectorStr = `[${values.join(",")}]`;
    await prisma.$executeRawUnsafe(
      `UPDATE "MeetingRecording" SET "transcriptEmbedding" = $1::vector WHERE id = $2`,
      vectorStr,
      recordingId
    );

    console.log(`[MEETING] Embedded transcript for recording ${recordingId} (${values.length} dims)`);
  } catch (err) {
    // Non-fatal: embedding failure shouldn't block the analysis pipeline
    console.warn("[MEETING] Transcript embedding failed (non-fatal):", err);
  }
}
