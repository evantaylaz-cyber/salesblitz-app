import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

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

    // Get a fresh session token
    const token = await getToken();

    if (!token) {
      return NextResponse.json(
        { error: "Could not generate token" },
        { status: 500 }
      );
    }

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
