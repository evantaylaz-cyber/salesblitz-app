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
    let avatarId = "bb1f6ebc-b388-4a39-9e2b-8df618e0377c"; // Graham in Black Shirt
    try {
      const body = await req.json();
      if (body?.avatarId) avatarId = body.avatarId;
    } catch {
      // No body provided, use default
    }

    // Create LiveAvatar session token in CUSTOM mode
    // CUSTOM = we control the LLM (Claude), avatar handles TTS + lip sync only
    // Cost: 1 credit/min (vs 2 credits/min for FULL mode)
    const res = await fetch("https://api.liveavatar.com/v1/sessions/token", {
      method: "POST",
      headers: {
        "X-API-KEY": process.env.LIVEAVATAR_API_KEY!,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        mode: "CUSTOM",
        avatar_id: avatarId,
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

    const raw = await res.json();
    console.log("LiveAvatar token response:", JSON.stringify(raw).slice(0, 300));

    // LiveAvatar API wraps responses in { code: 1000, data: { session_id, session_token } }
    const payload = raw.data || raw;
    const sessionToken = payload.session_token || payload.token || payload.sessionToken;
    const sessionId = payload.session_id || payload.sessionId;

    if (!sessionToken) {
      console.error("LiveAvatar returned 200 but no token found. Response keys:", Object.keys(raw), "Payload keys:", Object.keys(payload));
      return NextResponse.json(
        { error: "LiveAvatar returned no session token", detail: JSON.stringify(raw).slice(0, 500) },
        { status: 500 }
      );
    }

    return NextResponse.json({
      sessionToken,
      sessionId,
    });
  } catch (err) {
    console.error("Practice token error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
