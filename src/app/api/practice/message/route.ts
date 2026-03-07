import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import prisma from "@/lib/db";
import { buildPersonaSystemPrompt } from "@/lib/practice";
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

    // Get persona response from Claude
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 500,
      system: buildPersonaSystemPrompt(persona as Parameters<typeof buildPersonaSystemPrompt>[0]),
      messages: conversationHistory,
    });

    let responseText = "";
    for (const block of response.content) {
      if (block.type === "text") responseText += block.text;
    }

    // Add persona response to transcript
    const finalTranscript = [
      ...updatedTranscript,
      { role: "persona", text: responseText, timestamp: new Date().toISOString() },
    ];

    // Save updated transcript
    await prisma.practiceSession.update({
      where: { id: sessionId },
      data: { transcript: finalTranscript },
    });

    return NextResponse.json({ response: responseText });
  } catch (err) {
    console.error("Practice message error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
