import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import prisma from "@/lib/db";

// Admin email — only this user can access admin routes
const ADMIN_EMAIL = "evan.tay.laz@gmail.com";

async function isAdmin(): Promise<boolean> {
  const clerkUser = await currentUser();
  if (!clerkUser) return false;
  const email = clerkUser.emailAddresses?.[0]?.emailAddress;
  return email === ADMIN_EMAIL;
}

// GET — list all run requests (admin only)
export async function GET(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status"); // filter by status

  const where = status ? { status } : {};

  const requests = await prisma.runRequest.findMany({
    where,
    include: {
      user: {
        select: {
          email: true,
          name: true,
          currentTier: true,
          priorityProcessing: true,
        },
      },
    },
    orderBy: [
      { priority: "desc" },
      { createdAt: "asc" }, // oldest first (FIFO)
    ],
    take: 100,
  });

  return NextResponse.json({ requests });
}

// PATCH — update a run request status (admin only)
export async function PATCH(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { requestId, status, deliveryUrl, deliveryNotes, adminNotes } = body;

  if (!requestId || !status) {
    return NextResponse.json(
      { error: "requestId and status are required" },
      { status: 400 }
    );
  }

  const validStatuses = ["submitted", "in_progress", "ready", "delivered", "failed"];
  if (!validStatuses.includes(status)) {
    return NextResponse.json(
      { error: `Invalid status. Must be one of: ${validStatuses.join(", ")}` },
      { status: 400 }
    );
  }

  const updateData: Record<string, unknown> = { status };

  if (status === "in_progress") {
    updateData.startedAt = new Date();
  } else if (status === "ready" || status === "delivered") {
    updateData.completedAt = new Date();
  }
  if (status === "delivered") {
    updateData.deliveredAt = new Date();
  }
  if (deliveryUrl !== undefined) updateData.deliveryUrl = deliveryUrl;
  if (deliveryNotes !== undefined) updateData.deliveryNotes = deliveryNotes;
  if (adminNotes !== undefined) updateData.adminNotes = adminNotes;

  const updated = await prisma.runRequest.update({
    where: { id: requestId },
    data: updateData,
    include: {
      user: {
        select: { email: true, name: true },
      },
    },
  });

  return NextResponse.json({ request: updated });
}
