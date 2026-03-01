import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import prisma from "@/lib/db";

const ADMIN_EMAIL = "evan.tay.laz@gmail.com";

async function isAdmin(): Promise<boolean> {
  const clerkUser = await currentUser();
  if (!clerkUser) return false;
  const email = clerkUser.emailAddresses?.[0]?.emailAddress;
  return email === ADMIN_EMAIL;
}

/**
 * POST — Re-trigger worker execution for a stuck or failed request.
 * Admin only. Resets status to "submitted" and pings the worker webhook.
 */
export async function POST(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { requestId } = body;

  if (!requestId) {
    return NextResponse.json(
      { error: "requestId is required" },
      { status: 400 }
    );
  }

  const request = await prisma.runRequest.findUnique({
    where: { id: requestId },
  });

  if (!request) {
    return NextResponse.json(
      { error: "Request not found" },
      { status: 404 }
    );
  }

  const retriggerable = ["submitted", "failed", "awaiting_clarification"];
  if (!retriggerable.includes(request.status)) {
    return NextResponse.json(
      { error: `Cannot retrigger request in "${request.status}" state. Must be: ${retriggerable.join(", ")}` },
      { status: 400 }
    );
  }

  // Reset to submitted so worker picks it up
  await prisma.runRequest.update({
    where: { id: requestId },
    data: {
      status: "submitted",
      errorMessage: null,
    },
  });

  // Trigger worker
  let workerStatus = "not_configured";
  if (process.env.WORKER_WEBHOOK_URL) {
    try {
      const res = await fetch(process.env.WORKER_WEBHOOK_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": process.env.INTERNAL_API_KEY || "",
        },
        body: JSON.stringify({ requestId }),
      });
      workerStatus = `triggered (${res.status})`;
      console.log("Admin retrigger: worker response", res.status, "for request:", requestId);
    } catch (err) {
      workerStatus = "trigger_failed";
      console.error("Admin retrigger: worker trigger failed:", err);
    }
  }

  return NextResponse.json({
    success: true,
    requestId,
    previousStatus: request.status,
    newStatus: "submitted",
    workerStatus,
  });
}
