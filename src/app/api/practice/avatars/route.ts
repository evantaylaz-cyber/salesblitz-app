import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";

// GET /api/practice/avatars
// Lists available HeyGen streaming avatars for Practice Mode
export async function GET() {
  try {
    const clerkUser = await currentUser();
    if (!clerkUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const res = await fetch("https://api.heygen.com/v1/streaming/avatar.list", {
      method: "GET",
      headers: {
        "x-api-key": process.env.HEYGEN_API_KEY!,
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("HeyGen avatar list error:", err);
      return NextResponse.json({ error: "Failed to list avatars" }, { status: 500 });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error("Avatar list error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
