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
      // LiveAvatar API returns { code: 1000, data: { count, next, previous, results: [...] } }
      const publicList = publicData?.data?.results ?? (Array.isArray(publicData?.data) ? publicData.data : Array.isArray(publicData) ? publicData : []);
      avatars.push(...publicList.map((a: Record<string, unknown>) => ({ ...a, source: "public" })));
    }

    if (customRes.status === "fulfilled" && customRes.value.ok) {
      const customData = await customRes.value.json();
      const customList = customData?.data?.results ?? (Array.isArray(customData?.data) ? customData.data : Array.isArray(customData) ? customData : []);
      avatars.push(...customList.map((a: Record<string, unknown>) => ({ ...a, source: "custom" })));
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
