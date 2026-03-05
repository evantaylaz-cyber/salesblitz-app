import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { generateKBFromProfile } from "@/lib/generate-kb-from-profile";

// POST — generate KB document previews from profile data (does NOT save)
export async function POST(req: NextRequest) {
  try {
    const clerkUser = await currentUser();
    if (!clerkUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { profileData } = body;

    if (!profileData || typeof profileData !== "object") {
      return NextResponse.json(
        { error: "profileData is required" },
        { status: 400 }
      );
    }

    const documents = generateKBFromProfile(profileData);

    // Add preview (first 300 chars) for UI display
    const docsWithPreview = documents.map((doc) => ({
      ...doc,
      preview: doc.content.slice(0, 300) + (doc.content.length > 300 ? "..." : ""),
    }));

    return NextResponse.json({ documents: docsWithPreview });
  } catch (error) {
    console.error("Auto-generate KB error:", error);
    return NextResponse.json(
      { error: "Failed to generate knowledge base" },
      { status: 500 }
    );
  }
}
