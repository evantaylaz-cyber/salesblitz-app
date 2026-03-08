import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";

// GET /api/practice/avatars
// Lists available LiveAvatar avatars (public presets + custom)
// Docs: https://docs.liveavatar.com
export async function GET() {
  try {
    const clerkUser = await currentUser();
    if (!clerkUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch both public and custom avatar lists, merge results
    const headers = {
      "X-API-KEY": process.env.LIVEAVATAR_API_KEY!,
      Accept: "application/json",
    };

    const [publicRes, customRes] = await Promise.allSettled([
      fetch("https://api.liveavatar.com/v1/avatars/public", { headers }),
      fetch("https://api.liveavatar.com/v1/avatars", { headers }),
    ]);

    const avatars: unknown[] = [];

    if (publicRes.status === "fulfilled" && publicRes.value.ok) {
      const publicData = await publicRes.value.json();
      if (Array.isArray(publicData?.data)) {
        avatars.push(...publicData.data.map((a: Record<string, unknown>) => ({ ...a, source: "public" })));
      } else if (Array.isArray(publicData)) {
        avatars.push(...publicData.map((a: Record<string, unknown>) => ({ ...a, source: "public" })));
      }
    }

    if (customRes.status === "fulfilled" && customRes.value.ok) {
      const customData = await customRes.value.json();
      if (Array.isArray(customData?.data)) {
        avatars.push(...customData.data.map((a: Record<string, unknown>) => ({ ...a, source: "custom" })));
      } else if (Array.isArray(customData)) {
        avatars.push(...customData.map((a: Record<string, unknown>) => ({ ...a, source: "custom" })));
      }
    }

    return NextResponse.json({
      avatars,
      count: avatars.length,
      platform: "liveavatar",
    });
  } catch (err) {
    console.error("Avatar list error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
