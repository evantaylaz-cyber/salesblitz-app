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

const MAX_DOCS_PER_USER = 50;
const MAX_CONTENT_LENGTH = 50000; // ~50K chars per doc

// GET — list knowledge base documents for current user (personal + team)
export async function GET(req: NextRequest) {
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

    // Optional teamId filter from query params
    const { searchParams } = new URL(req.url);
    const teamId = searchParams.get("teamId");

    let whereClause;
    if (teamId) {
      // Verify membership
      const membership = await prisma.teamMember.findFirst({
        where: { teamId, userId: user.id, inviteStatus: "accepted" },
      });
      if (!membership) {
        return NextResponse.json({ error: "Not a team member" }, { status: 403 });
      }
      whereClause = { teamId };
    } else {
      // Personal docs + docs from all teams user belongs to
      const teamMemberships = await prisma.teamMember.findMany({
        where: { userId: user.id, inviteStatus: "accepted" },
        select: { teamId: true },
      });
      const teamIds = teamMemberships.map((m) => m.teamId);

      whereClause = {
        OR: [
          { userId: user.id, teamId: null },
          ...(teamIds.length > 0 ? [{ teamId: { in: teamIds } }] : []),
        ],
      };
    }

    const documents = await prisma.knowledgeDocument.findMany({
      where: whereClause,
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        title: true,
        category: true,
        createdAt: true,
        updatedAt: true,
        content: true,
        userId: true,
        teamId: true,
      },
    });

    // Add content preview (first 200 chars) and length
    const docs = documents.map((doc) => ({
      ...doc,
      contentPreview: doc.content.slice(0, 200) + (doc.content.length > 200 ? "..." : ""),
      contentLength: doc.content.length,
    }));

    return NextResponse.json({ documents: docs });
  } catch (error) {
    console.error("List knowledge base error:", error);
    return NextResponse.json(
      { error: "Failed to list documents" },
      { status: 500 }
    );
  }
}

// POST — create a new knowledge base document
export async function POST(req: NextRequest) {
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

    const body = await req.json();
    const { title, content, category, teamId } = body;

    // Validate required fields
    if (!title || !title.trim()) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }
    if (!content || !content.trim()) {
      return NextResponse.json({ error: "Content is required" }, { status: 400 });
    }

    // If teamId, verify membership
    if (teamId) {
      const membership = await prisma.teamMember.findFirst({
        where: { teamId, userId: user.id, inviteStatus: "accepted" },
      });
      if (!membership) {
        return NextResponse.json({ error: "Not a team member" }, { status: 403 });
      }
    }

    // Validate category
    const cat = category && VALID_CATEGORIES.includes(category) ? category : "custom";

    // Validate content length
    if (content.length > MAX_CONTENT_LENGTH) {
      return NextResponse.json(
        { error: `Content too long. Maximum ${MAX_CONTENT_LENGTH} characters.` },
        { status: 400 }
      );
    }

    // Check doc count limit (per user for personal, per team for team docs)
    const countWhere = teamId
      ? { teamId }
      : { userId: user.id, teamId: null };
    const existingCount = await prisma.knowledgeDocument.count({
      where: countWhere,
    });
    if (existingCount >= MAX_DOCS_PER_USER) {
      return NextResponse.json(
        { error: `Maximum ${MAX_DOCS_PER_USER} documents allowed. Delete some to add more.` },
        { status: 400 }
      );
    }

    const doc = await prisma.knowledgeDocument.create({
      data: {
        userId: teamId ? null : user.id,
        teamId: teamId || null,
        title: title.trim(),
        content: content.trim(),
        category: cat,
      },
    });

    return NextResponse.json({ document: doc, success: true }, { status: 201 });
  } catch (error) {
    console.error("Create knowledge doc error:", error);
    return NextResponse.json(
      { error: "Failed to create document" },
      { status: 500 }
    );
  }
}
