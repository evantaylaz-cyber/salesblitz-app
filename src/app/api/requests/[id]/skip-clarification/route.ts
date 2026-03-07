import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import prisma from "@/lib/db";

/**
 * GET — Skip clarification and proceed with best-effort execution.
 * Called when user clicks "Skip — run it now" link in clarification email.
 * Uses GET because it's a link in an email (no JS, no POST).
 * Redirects to the request status page after skipping.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const clerkUser = await currentUser();
    if (!clerkUser) {
      // Redirect to sign-in, then back here
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://salesblitz.ai";
      return NextResponse.redirect(`${appUrl}/sign-in?redirect_url=/api/requests/${params.id}/skip-clarification`);
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

    // Only skip if actually awaiting clarification
    if (request.status !== "awaiting_clarification") {
      // Already running or done — just redirect to status page
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://salesblitz.ai";
      return NextResponse.redirect(`${appUrl}/requests/${params.id}`);
    }

    // Reset to "submitted" so worker picks it up again
    await prisma.runRequest.update({
      where: { id: params.id },
      data: {
        status: "submitted",
      },
    });

    // Trigger worker re-execution (MUST await — unawaited fetch dies on Vercel serverless)
    if (process.env.WORKER_WEBHOOK_URL) {
      try {
        const res = await fetch(process.env.WORKER_WEBHOOK_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": process.env.INTERNAL_API_KEY || "",
          },
          body: JSON.stringify({ requestId: params.id }),
        });
        console.log("Worker re-trigger response:", res.status, "for request:", params.id);
      } catch (err) {
        console.error("Worker re-trigger failed:", err);
      }
    }

    // Redirect to request status page
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://salesblitz.ai";
    return NextResponse.redirect(`${appUrl}/requests/${params.id}`);
  } catch (error) {
    console.error("Skip clarification error:", error);
    return NextResponse.json(
      { error: "Failed to skip clarification" },
      { status: 500 }
    );
  }
}
