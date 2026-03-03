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

// GET — list all knowledge base documents for current user
export async function GET() {
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

    const documents = await prisma.knowledgeDocument.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        title: true,
        category: true,
        createdAt: true,
        updatedAt: true,
        // Return content length instead of full content for list view
        content: true,
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
    const { title, content, category } = body;

    // Validate required fields
    if (!title || !title.trim()) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }
    if (!content || !content.trim()) {
      return NextResponse.json({ error: "Content is required" }, { status: 400 });
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

    // Check doc count limit
    const existingCount = await prisma.knowledgeDocument.count({
      where: { userId: user.id },
    });
    if (existingCount >= MAX_DOCS_PER_USER) {
      return NextResponse.json(
        { error: `Maximum ${MAX_DOCS_PER_USER} documents allowed. Delete some to add more.` },
        { status: 400 }
      );
    }

    const doc = await prisma.knowledgeDocument.create({
      data: {
        userId: user.id,
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
