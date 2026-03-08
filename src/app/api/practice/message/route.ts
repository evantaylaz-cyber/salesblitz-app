import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import prisma from "@/lib/db";
import { buildPersonaSystemPrompt, buildPanelSystemPrompt, extractPanelSpeaker, cleanForTTS } from "@/lib/practice";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// POST /api/practice/message
// Sends user message to Claude (in persona), returns the persona's response
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
    const { sessionId, userMessage } = body;

    if (!sessionId || !userMessage) {
      return NextResponse.json({ error: "sessionId and userMessage required" }, { status: 400 });
    }

    const session = await prisma.practiceSession.findUnique({
      where: { id: sessionId, userId: user.id },
    });

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    if (session.status !== "active" && session.status !== "created") {
      return NextResponse.json({ error: "Session is not active" }, { status: 400 });
    }

    // Mark as active if first message
    if (session.status === "created") {
      await prisma.practiceSession.update({
        where: { id: sessionId },
        data: { status: "active" },
      });
    }

    const persona = session.personaConfig as Record<string, unknown>;
    const transcript = (session.transcript as Array<{ role: string; text: string }>) || [];

    // Add user message to transcript
    const updatedTranscript = [
      ...transcript,
      { role: "user", text: userMessage, timestamp: new Date().toISOString() },
    ];

    // Build conversation history for Claude
    const conversationHistory: Array<{ role: "user" | "assistant"; content: string }> = [];

    for (const msg of updatedTranscript) {
      conversationHistory.push({
        role: msg.role === "user" ? "user" : "assistant",
        content: msg.text,
      });
    }

    // Build system prompt (panel mode uses different prompt)
    const isPanelMode = session.isPanelMode && persona._isPanelMode && persona._panelMembers;
    let systemPrompt: string;
    if (isPanelMode) {
      systemPrompt = buildPanelSystemPrompt(
        persona._panelMembers as Array<{ name: string; title: string | null; roleInMeeting: string; personalityVibe: string | null; evaluationFocus: string | null }>,
        session.targetCompany,
        persona._meetingType as string | undefined,
      );
    } else {
      systemPrompt = buildPersonaSystemPrompt(persona as Parameters<typeof buildPersonaSystemPrompt>[0], persona._meetingType as string | undefined);
    }

    // Get persona response from Claude
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 500,
      system: systemPrompt,
      messages: conversationHistory,
    });

    let responseText = "";
    for (const block of response.content) {
      if (block.type === "text") responseText += block.text;
    }

    // Extract speaker info for panel mode
    let speaker: string | null = null;
    let speakerTitle: string | null = null;
    let displayText = responseText;
    if (isPanelMode) {
      const extracted = extractPanelSpeaker(responseText);
      speaker = extracted.speaker;
      displayText = extracted.text;
      // Look up title from panel members
      if (speaker && persona._panelMembers) {
        const member = (persona._panelMembers as Array<{ name: string; title: string | null }>).find(
          m => m.name.toLowerCase() === speaker!.toLowerCase()
        );
        speakerTitle = member?.title || null;
      }
    }

    // Add persona response to transcript (with speaker info for panel mode)
    const finalTranscript = [
      ...updatedTranscript,
      {
        role: "persona",
        text: displayText,
        timestamp: new Date().toISOString(),
        ...(speaker ? { speaker, speakerTitle } : {}),
      },
    ];

    // Save updated transcript
    await prisma.practiceSession.update({
      where: { id: sessionId },
      data: { transcript: finalTranscript },
    });

    // Clean stage directions for TTS, but keep raw text in transcript
    const ttsText = cleanForTTS(displayText);

    return NextResponse.json({
      response: ttsText,
      rawResponse: displayText,
      ...(speaker ? { speaker, speakerTitle } : {}),
    });
  } catch (err) {
    console.error("Practice message error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
