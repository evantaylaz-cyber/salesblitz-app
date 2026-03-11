import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { authLimiter, rateLimitResponse } from "@/lib/rate-limit";
import { auditTokenGenerated } from "@/lib/audit-log";

/**
 * GET /api/auth/extension-token
 *
 * Returns a Clerk session token for the Chrome extension.
 * The extension calls this from the authenticated app domain
 * to sync auth state without requiring separate OAuth.
 *
 * Only works when user is already signed in to app.salesblitz.ai.
 */
export async function GET() {
  try {
    const { getToken, userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    // Rate limit: auth tier
    const rlResult = authLimiter.check(userId);
    if (!rlResult.allowed) return rateLimitResponse(rlResult);

    // Get a fresh session token
    const token = await getToken();

    if (!token) {
      return NextResponse.json(
        { error: "Could not generate token" },
        { status: 500 }
      );
    }

    // Fire-and-forget audit log (non-blocking)
    auditTokenGenerated(userId, { source: "chrome_extension" })
      .catch((err) => console.error("Audit log failed:", err));

    return NextResponse.json({
      token,
      userId,
    });
  } catch (error) {
    console.error("[AUTH] Extension token error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
