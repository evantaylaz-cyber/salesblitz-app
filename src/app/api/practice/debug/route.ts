import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";

// Diagnostic endpoint: tests the full LiveAvatar token + session start flow
// Returns detailed error info to help debug connection failures
export async function GET(req: NextRequest) {
  try {
    const clerkUser = await currentUser();
    if (!clerkUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const apiKey = process.env.LIVEAVATAR_API_KEY;
    const results: Record<string, unknown> = {
      apiKeyPresent: !!apiKey,
      apiKeyLength: apiKey?.length || 0,
      apiKeyLast4: apiKey ? apiKey.slice(-4) : "N/A",
    };

    // Step 1: Get session token
    const avatarId = "bb1f6ebc-b388-4a39-9e2b-8df618e0377c"; // Graham in Black Shirt
    const tokenRes = await fetch("https://api.liveavatar.com/v1/sessions/token", {
      method: "POST",
      headers: {
        "X-API-KEY": apiKey!,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        mode: "CUSTOM",
        avatar_id: avatarId,
      }),
    });

    const tokenRaw = await tokenRes.json();
    results.tokenStatus = tokenRes.status;
    results.tokenCode = tokenRaw.code;
    results.tokenMessage = tokenRaw.message;
    results.tokenDataKeys = tokenRaw.data ? Object.keys(tokenRaw.data) : null;

    const sessionToken = tokenRaw.data?.session_token;
    results.hasSessionToken = !!sessionToken;
    results.sessionTokenLength = sessionToken?.length || 0;

    if (!sessionToken) {
      results.error = "No session token returned from LiveAvatar";
      return NextResponse.json(results);
    }

    // Step 2: Try to start the session (same call the SDK makes)
    const startRes = await fetch("https://api.liveavatar.com/v1/sessions/start", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${sessionToken}`,
        "Content-Type": "application/json",
      },
    });

    const startRaw = await startRes.json();
    results.startStatus = startRes.status;
    results.startCode = startRaw.code;
    results.startMessage = startRaw.message;
    results.startDataKeys = startRaw.data ? Object.keys(startRaw.data) : null;
    results.startOk = startRes.ok && startRaw.code === 1000;

    // Expose the LiveKit URL and WS URL for debugging signal connection failures
    if (startRaw.data) {
      results.livekitUrl = startRaw.data.livekit_url || null;
      results.wsUrl = startRaw.data.ws_url || null;
      results.maxSessionDuration = startRaw.data.max_session_duration || null;
    }

    // Step 3: If session started, stop it immediately to not waste credits
    if (results.startOk && sessionToken) {
      try {
        await fetch("https://api.liveavatar.com/v1/sessions/stop", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${sessionToken}`,
            "Content-Type": "application/json",
          },
        });
        results.sessionStopped = true;
      } catch {
        results.sessionStopped = false;
      }
    }

    return NextResponse.json(results);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
