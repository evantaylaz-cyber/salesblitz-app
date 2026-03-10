import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";

// POST /api/practice/realtime-token
// Creates an ephemeral token for the OpenAI Realtime API.
// The client uses this token to connect via WebSocket for speech-to-text.
// We use the Realtime API ONLY for STT (Whisper transcription + server-side VAD).
// Claude remains the conversation engine; OpenAI TTS + HeyGen handle audio output.
export async function POST() {
  try {
    const clerkUser = await currentUser();
    if (!clerkUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.error("OPENAI_API_KEY not configured");
      return NextResponse.json({ error: "Realtime API not configured" }, { status: 500 });
    }

    // Create an ephemeral session with the Realtime API
    // We configure it for STT-only: text modality, Whisper transcription, server VAD
    const res = await fetch("https://api.openai.com/v1/realtime/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-realtime-preview-2024-12-17",
        modalities: ["text"], // text-only output (no audio generation from model)
        input_audio_transcription: {
          model: "whisper-1",
        },
        turn_detection: {
          type: "server_vad",
          threshold: 0.5,
          prefix_padding_ms: 300,
          silence_duration_ms: 800, // 800ms silence = end of speech
        },
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("Realtime session creation error:", res.status, errText);
      return NextResponse.json(
        { error: "Failed to create Realtime session", detail: errText },
        { status: 500 }
      );
    }

    const data = await res.json();

    // The response contains client_secret.value (ephemeral key) and session config
    const ephemeralKey = data.client_secret?.value;
    if (!ephemeralKey) {
      console.error("Realtime API returned no client_secret:", JSON.stringify(data).slice(0, 500));
      return NextResponse.json(
        { error: "No ephemeral key returned", detail: JSON.stringify(data).slice(0, 300) },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ephemeralKey,
      expiresAt: data.client_secret?.expires_at,
      sessionId: data.id,
    });
  } catch (err) {
    console.error("Realtime token error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
