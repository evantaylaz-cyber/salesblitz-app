import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";

/**
 * GET /api/auth/check
 * Simple auth verification endpoint for the Chrome extension.
 */
export async function GET() {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }
    return NextResponse.json({
      authenticated: true,
      userId: user.id,
      email: user.emailAddresses[0]?.emailAddress,
    });
  } catch {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
}
