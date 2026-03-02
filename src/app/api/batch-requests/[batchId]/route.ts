import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import prisma from "@/lib/db";

// GET — get a single batch job with full child request details
export async function GET(
  req: NextRequest,
  { params }: { params: { batchId: string } }
) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const dbUser = await prisma.user.findUnique({
      where: { clerkId: user.id },
    });

    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const batchJob = await prisma.batchJob.findUnique({
      where: { id: params.batchId },
      include: {
        childRequests: {
          orderBy: { batchIndex: "asc" },
        },
      },
    });

    if (!batchJob) {
      return NextResponse.json({ error: "Batch job not found" }, { status: 404 });
    }

    if (batchJob.userId !== dbUser.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Calculate progress
    const totalChildren = batchJob.childRequests.length;
    const completedChildren = batchJob.childRequests.filter(
      (r: { status: string }) => r.status === "delivered" || r.status === "ready"
    ).length;
    const failedChildren = batchJob.childRequests.filter(
      (r: { status: string }) => r.status === "failed"
    ).length;

    const progress = {
      totalAccounts: totalChildren,
      completedAccounts: completedChildren,
      failedAccounts: failedChildren,
      percentComplete: totalChildren > 0
        ? Math.round((completedChildren / totalChildren) * 100)
        : 0,
    };

    return NextResponse.json({ batchJob, progress });
  } catch (err: unknown) {
    console.error("Batch get error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
