import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import prisma from "@/lib/db";

const VALID_CATEGORIES = [
  "product_docs",
  "competitive_intel",
  "deal_stories",
  "icp_definitions",
  "methodology",
  "objection_handling",
  "custom",
];

const MAX_CONTENT_LENGTH = 50000;

// GET — fetch a single knowledge base document
export async function GET(
  _req: NextRequest,
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

    const doc = await prisma.knowledgeDocument.findFirst({
      where: { id: params.id, userId: user.id },
    });

    if (!doc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    return NextResponse.json({ document: doc });
  } catch (error) {
    console.error("Get knowledge doc error:", error);
    return NextResponse.json(
      { error: "Failed to fetch document" },
      { status: 500 }
    );
  }
}

// PATCH — update a knowledge base document
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

    // Verify ownership
    const existing = await prisma.knowledgeDocument.findFirst({
      where: { id: params.id, userId: user.id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    const body = await req.json();
    const updateData: Record<string, unknown> = {};

    if (body.title !== undefined) {
      if (!body.title.trim()) {
        return NextResponse.json({ error: "Title cannot be empty" }, { status: 400 });
      }
      updateData.title = body.title.trim();
    }

    if (body.content !== undefined) {
      if (!body.content.trim()) {
        return NextResponse.json({ error: "Content cannot be empty" }, { status: 400 });
      }
      if (body.content.length > MAX_CONTENT_LENGTH) {
        return NextResponse.json(
          { error: `Content too long. Maximum ${MAX_CONTENT_LENGTH} characters.` },
          { status: 400 }
        );
      }
      updateData.content = body.content.trim();
    }

    if (body.category !== undefined) {
      if (VALID_CATEGORIES.includes(body.category)) {
        updateData.category = body.category;
      }
    }

    const doc = await prisma.knowledgeDocument.update({
      where: { id: params.id },
      data: updateData,
    });

    return NextResponse.json({ document: doc, success: true });
  } catch (error) {
    console.error("Update knowledge doc error:", error);
    return NextResponse.json(
      { error: "Failed to update document" },
      { status: 500 }
    );
  }
}

// DELETE — remove a knowledge base document
export async function DELETE(
  _req: NextRequest,
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

    // Verify ownership
    const existing = await prisma.knowledgeDocument.findFirst({
      where: { id: params.id, userId: user.id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    await prisma.knowledgeDocument.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete knowledge doc error:", error);
    return NextResponse.json(
      { error: "Failed to delete document" },
      { status: 500 }
    );
  }
}
