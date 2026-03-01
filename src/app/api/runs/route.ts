import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import prisma from "@/lib/db";
import { consumeRun } from "@/lib/runs";
import { ToolName } from "@/lib/tools";

export async function POST(req: NextRequest) {
  try {
    const clerkUser = await currentUser();
    if (!clerkUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { toolName } = await req.json();
    if (!toolName) {
      return NextResponse.json({ error: "toolName required" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { clerkId: clerkUser.id },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const result = await consumeRun(user.id, toolName as ToolName);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 403 });
    }

    return NextResponse.json({
      success: true,
      source: result.source,
      runsRemaining: result.runsRemaining,
    });
  } catch (error) {
    console.error("Run error:", error);
    return NextResponse.json(
      { error: "Failed to process run" },
      { status: 500 }
    );
  }
}
