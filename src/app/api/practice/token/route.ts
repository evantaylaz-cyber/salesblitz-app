import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";

// Generate a LiveAvatar session token with retry logic
// Docs: https://docs.liveavatar.com/reference/create_session_token_v1_sessions_token_post
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1500;

async function createLiveAvatarToken(avatarId: string, attempt: number = 1): Promise<{
  sessionToken: string;
  sessionId: string;
}> {
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
    const isRetryable = [429, 500, 502, 503].includes(res.status);

    if (isRetryable && attempt < MAX_RETRIES) {
      const delay = RETRY_DELAY_MS * attempt;
      console.warn(`[PRACTICE] LiveAvatar token attempt ${attempt}/${MAX_RETRIES} failed (${res.status}), retrying in ${delay}ms...`);
      await new Promise((r) => setTimeout(r, delay));
      return createLiveAvatarToken(avatarId, attempt + 1);
    }

    console.error(`[PRACTICE] LiveAvatar token error after ${attempt} attempt(s):`, res.status, err);
    throw new Error(`LiveAvatar returned ${res.status}: ${err}`);
  }

  const raw = await res.json();
  console.log(`[PRACTICE] LiveAvatar token response (attempt ${attempt}):`, JSON.stringify(raw).slice(0, 300));

  // LiveAvatar API wraps responses in { code: 1000, data: { session_id, session_token } }
  const payload = raw.data || raw;
  const sessionToken = payload.session_token || payload.token || payload.sessionToken;
  const sessionId = payload.session_id || payload.sessionId;

  if (!sessionToken) {
    // Token field missing from response — retry if possible
    if (attempt < MAX_RETRIES) {
      console.warn(`[PRACTICE] LiveAvatar returned 200 but no token (attempt ${attempt}/${MAX_RETRIES}). Keys: ${Object.keys(payload).join(", ")}. Retrying...`);
      await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
      return createLiveAvatarToken(avatarId, attempt + 1);
    }

    console.error("[PRACTICE] LiveAvatar returned no session token after all retries. Response keys:", Object.keys(raw), "Payload keys:", Object.keys(payload));
    throw new Error("LiveAvatar returned no session token");
  }

  return { sessionToken, sessionId };
}

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

    const { sessionToken, sessionId } = await createLiveAvatarToken(avatarId);

    return NextResponse.json({
      sessionToken,
      sessionId,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("[PRACTICE] Token route error:", message);

    // Return a user-friendly error that the frontend can display
    return NextResponse.json(
      {
        error: "Practice mode is temporarily unavailable. Please try again in a moment.",
        detail: message,
        retryable: true,
      },
      { status: 503 }
    );
  }
}
