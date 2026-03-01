import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import prisma from "@/lib/db";

// POST — submit clarification answers and resume execution
// Called when user clicks "Answer Questions" link in clarification email
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const clerkUser = await currentUser();
    if (!clerkUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { clerkId: clerkUser.id },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const request = await prisma.runRequest.findUnique({
      where: { id: params.id },
    });

    if (!request) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    // User can only answer their own requests
    if (request.userId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Only accept answers for requests awaiting clarification
    if (request.status !== "awaiting_clarification") {
      return NextResponse.json(
        { error: "Request is not awaiting clarification", currentStatus: request.status },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { answers } = body;

    if (!answers || typeof answers !== "object") {
      return NextResponse.json(
        { error: "Answers object is required" },
        { status: 400 }
      );
    }

    // Merge answers into additionalNotes for the executor
    const existingNotes = request.additionalNotes || "";
    const answerText = Object.entries(answers)
      .map(([questionId, answer]) => `[${questionId}]: ${answer}`)
      .join("\n");
    const mergedNotes = existingNotes
      ? `${existingNotes}\n\n--- CLARIFICATION ANSWERS ---\n${answerText}`
      : `--- CLARIFICATION ANSWERS ---\n${answerText}`;

    // Update request with answers and reset to "submitted" to trigger re-execution
    await prisma.runRequest.update({
      where: { id: params.id },
      data: {
        clarificationAnswers: answers as object,
        additionalNotes: mergedNotes,
        status: "submitted",
      },
    });

    // Trigger worker re-execution (same pattern as requests/route.ts)
    if (process.env.WORKER_WEBHOOK_URL) {
      fetch(process.env.WORKER_WEBHOOK_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": process.env.INTERNAL_API_KEY || "",
        },
        body: JSON.stringify({ requestId: params.id }),
      }).catch((err) => console.error("Worker re-trigger failed:", err));
    }

    return NextResponse.json({
      success: true,
      message: "Answers received. Your research is now running.",
    });
  } catch (error) {
    console.error("Clarification answer error:", error);
    return NextResponse.json(
      { error: "Failed to process clarification answers" },
      { status: 500 }
    );
  }
}

// GET — fetch clarification questions for a request
// Used by the clarification UI page
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const clerkUser = await currentUser();
    if (!clerkUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { clerkId: clerkUser.id },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const request = await prisma.runRequest.findUnique({
      where: { id: params.id },
    });

    if (!request) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    if (request.userId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({
      requestId: request.id,
      toolName: request.toolName,
      targetCompany: request.targetCompany,
      targetName: request.targetName,
      status: request.status,
      clarificationQuestions: request.clarificationQuestions,
      clarificationAnswers: request.clarificationAnswers,
    });
  } catch (error) {
    console.error("Clarification fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch clarification data" },
      { status: 500 }
    );
  }
}
