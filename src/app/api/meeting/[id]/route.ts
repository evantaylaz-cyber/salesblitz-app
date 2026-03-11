import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import prisma from "@/lib/db";

// GET — fetch a single meeting recording with full details
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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const recording = await (prisma as any).meetingRecording.findFirst({
      where: { id: params.id, userId: user.id },
    });

    if (!recording) {
      return NextResponse.json(
        { error: "Recording not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ recording });
  } catch (error) {
    console.error("[MEETING] Get recording error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH — update recording metadata (title, type, link to target)
export async function PATCH(
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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const existing = await (prisma as any).meetingRecording.findFirst({
      where: { id: params.id, userId: user.id },
    });
    if (!existing) {
      return NextResponse.json(
        { error: "Recording not found" },
        { status: 404 }
      );
    }

    const body = await req.json();
    const allowedFields = [
      "meetingTitle",
      "meetingType",
      "targetId",
      "runRequestId",
      "platform",
      "meetingDate",
    ];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: Record<string, any> = {};
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        if (field === "meetingDate" && body[field]) {
          updateData[field] = new Date(body[field]);
        } else {
          updateData[field] = body[field];
        }
      }
    }

    // Validate targetId ownership if provided
    if (updateData.targetId) {
      const target = await prisma.target.findFirst({
        where: { id: updateData.targetId, userId: user.id },
      });
      if (!target) {
        return NextResponse.json(
          { error: "Target not found" },
          { status: 404 }
        );
      }
    }

    // Validate runRequestId ownership if provided
    if (updateData.runRequestId) {
      const run = await prisma.runRequest.findFirst({
        where: { id: updateData.runRequestId, userId: user.id },
      });
      if (!run) {
        return NextResponse.json(
          { error: "Run request not found" },
          { status: 404 }
        );
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updated = await (prisma as any).meetingRecording.update({
      where: { id: params.id },
      data: updateData,
    });

    return NextResponse.json({ recording: updated });
  } catch (error) {
    console.error("[MEETING] Update recording error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE — remove a recording
export async function DELETE(
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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const existing = await (prisma as any).meetingRecording.findFirst({
      where: { id: params.id, userId: user.id },
    });
    if (!existing) {
      return NextResponse.json(
        { error: "Recording not found" },
        { status: 404 }
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (prisma as any).meetingRecording.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[MEETING] Delete recording error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
