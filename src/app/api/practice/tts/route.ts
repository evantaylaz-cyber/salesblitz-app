import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";

// POST /api/practice/tts
// Converts text to PCM 16-bit 24KHz audio via OpenAI TTS API
// Returns base64-encoded audio chunks for LiveAvatar's agent.speak command
export async function POST(req: NextRequest) {
  try {
    const clerkUser = await currentUser();
    if (!clerkUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { text, voice: requestedVoice } = await req.json();
    if (!text || typeof text !== "string") {
      return NextResponse.json({ error: "text is required" }, { status: 400 });
    }
    // OpenAI TTS voices: alloy, echo, fable, onyx, nova, shimmer
    // onyx = deep male, nova = warm female
    const voice = requestedVoice || "onyx";

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.error("OPENAI_API_KEY not configured");
      return NextResponse.json({ error: "TTS not configured" }, { status: 500 });
    }

    // Call OpenAI TTS API with PCM output (raw 16-bit 24KHz, no headers)
    const ttsRes = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "tts-1",
        input: text,
        voice,
        response_format: "pcm", // raw PCM 16-bit signed LE, 24KHz mono
        speed: 1.0,
      }),
    });

    if (!ttsRes.ok) {
      const errText = await ttsRes.text();
      console.error("OpenAI TTS error:", ttsRes.status, errText);
      return NextResponse.json(
        { error: "TTS generation failed", detail: errText },
        { status: 500 }
      );
    }

    // Get the raw PCM bytes
    const audioBuffer = await ttsRes.arrayBuffer();
    const audioBase64 = Buffer.from(audioBuffer).toString("base64");

    // LiveAvatar recommends ~1 second chunks (24000 samples * 2 bytes = 48000 bytes)
    // but also accepts up to 1MB per string. For simplicity, send the full audio.
    // If responses are long, we can chunk later.
    const CHUNK_SIZE = 48000; // ~1 second of PCM 16-bit 24KHz mono
    const fullBuffer = Buffer.from(audioBuffer);
    const chunks: string[] = [];

    for (let i = 0; i < fullBuffer.length; i += CHUNK_SIZE) {
      const chunk = fullBuffer.subarray(i, Math.min(i + CHUNK_SIZE, fullBuffer.length));
      chunks.push(chunk.toString("base64"));
    }

    return NextResponse.json({
      audio: audioBase64,
      chunks,
      format: "pcm_16bit_24khz",
      byteLength: audioBuffer.byteLength,
    });
  } catch (err) {
    console.error("TTS endpoint error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
