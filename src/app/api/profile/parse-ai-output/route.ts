import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { parseAIOutput } from "@/lib/parse-ai-profile";

// POST — parse raw AI output into structured profile data (does NOT save)
export async function POST(req: NextRequest) {
  try {
    const clerkUser = await currentUser();
    if (!clerkUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { rawText, promptType } = body;

    if (!rawText || typeof rawText !== "string") {
      return NextResponse.json(
        { error: "rawText is required and must be a string" },
        { status: 400 }
      );
    }

    const result = parseAIOutput(rawText, promptType || "one_shot");

    return NextResponse.json(result);
  } catch (error) {
    console.error("Parse AI output error:", error);
    return NextResponse.json(
      { error: "Failed to parse AI output" },
      { status: 500 }
    );
  }
}
