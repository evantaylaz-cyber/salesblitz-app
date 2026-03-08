import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";

// Generate a LiveAvatar session token (replaces HeyGen streaming token)
// Docs: https://docs.liveavatar.com/reference/create_session_token_v1_sessions_token_post
export async function POST(req: NextRequest) {
  try {
    const clerkUser = await currentUser();
    if (!clerkUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse optional body for avatar_id override
    let avatarId = "Graham_in_Black_Suit"; // Default professional male avatar
    try {
      const body = await req.json();
      if (body?.avatarId) avatarId = body.avatarId;
    } catch {
      // No body provided, use default
    }

    // Create LiveAvatar session token in LITE mode
    // LITE = we control the LLM (Claude), avatar handles TTS + lip sync only
    // Cost: 1 credit/min (vs 2 credits/min for FULL mode)
    const res = await fetch("https://api.liveavatar.com/v1/sessions/token", {
      method: "POST",
      headers: {
        "X-API-KEY": process.env.LIVEAVATAR_API_KEY!,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        mode: "FULL",
        avatar_id: avatarId,
        avatar_persona: {
          language: "en",
        },
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("LiveAvatar token error:", res.status, err);
      return NextResponse.json(
        { error: "Failed to create LiveAvatar session token", detail: err },
        { status: 500 }
      );
    }

    const data = await res.json();
    return NextResponse.json({
      sessionToken: data.session_token,
      sessionId: data.session_id,
    });
  } catch (err) {
    console.error("Practice token error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
