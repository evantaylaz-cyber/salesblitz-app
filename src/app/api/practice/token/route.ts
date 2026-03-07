import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";

// Generate a HeyGen streaming avatar session token
export async function POST() {
  try {
    const clerkUser = await currentUser();
    if (!clerkUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const res = await fetch("https://api.heygen.com/v1/streaming.create_token", {
      method: "POST",
      headers: {
        "x-api-key": process.env.HEYGEN_API_KEY!,
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("HeyGen token error:", err);
      return NextResponse.json(
        { error: "Failed to create HeyGen session token" },
        { status: 500 }
      );
    }

    const data = await res.json();
    return NextResponse.json({ token: data.data?.token || data.token });
  } catch (err) {
    console.error("Practice token error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
