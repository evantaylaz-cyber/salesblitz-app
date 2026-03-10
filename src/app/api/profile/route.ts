import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import prisma from "@/lib/db";

// Compute profile depth from actual field completeness (0-4)
// Depth 1: Company essentials filled (name + product + differentiators)
// Depth 2: Sales assets filled (deal stories or value props, plus selling style)
// Depth 3: Career & territory context (career narrative or ICP definitions, plus territory focus)
// Depth 4: Writing style customization (writing style, banned phrases, or signature patterns)
function computeProfileDepth(profile: Record<string, unknown>): number {
  let depth = 0;

  // Layer 1: Company essentials
  const hasCompany = !!(profile.companyName && profile.companyProduct);
  if (hasCompany) depth = 1;

  // Layer 2: Sales assets + methodology
  const dealStories = profile.dealStories as unknown[];
  const valueProps = profile.valueProps as unknown[];
  const hasSalesAssets = (Array.isArray(dealStories) && dealStories.length > 0) ||
    (Array.isArray(valueProps) && valueProps.length > 0);
  const hasMethodology = !!(profile.sellingStyle && profile.sellingStyle !== "Value Messaging") ||
    !!profile.sellingPhilosophy;
  if (depth >= 1 && (hasSalesAssets || hasMethodology)) depth = 2;

  // Layer 3: Career & territory context
  const icpDefs = profile.icpDefinitions as unknown[];
  const hasCareerOrTerritory = !!profile.careerNarrative ||
    (Array.isArray(icpDefs) && icpDefs.length > 0) ||
    !!profile.territoryFocus;
  if (depth >= 2 && hasCareerOrTerritory) depth = 3;

  // Layer 4: Writing style customization
  const bannedPhrases = profile.bannedPhrases as unknown[];
  const sigPatterns = profile.signaturePatterns as unknown[];
  const hasWritingStyle = !!profile.writingStyle ||
    (Array.isArray(bannedPhrases) && bannedPhrases.length > 0) ||
    (Array.isArray(sigPatterns) && sigPatterns.length > 0);
  if (depth >= 3 && hasWritingStyle) depth = 4;

  return depth;
}

// GET — fetch current user's profile
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

    // Try to find existing profile
    let profile = await prisma.userProfile.findUnique({
      where: { userId: user.id },
    });

    // If no profile exists, create a blank one
    if (!profile) {
      profile = await prisma.userProfile.create({
        data: {
          userId: user.id,
        },
      });
    }

    return NextResponse.json({ profile });
  } catch (error) {
    console.error("Fetch profile error:", error);
    return NextResponse.json(
      { error: "Failed to fetch profile" },
      { status: 500 }
    );
  }
}

// PUT — update user's profile
export async function PUT(req: NextRequest) {
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

    // Whitelist allowed fields — must include all UserProfile schema fields
    // that the manual profile editor or onboarding chat can update
    const allowedFields = [
      // Company context
      "companyName",
      "companyProduct",
      "companyDescription",
      "companyDifferentiators",
      "companyCompetitors",
      "companyTargetMarket",
      "companyUrl",
      // LinkedIn
      "linkedinAbout",
      "linkedinExperience",
      "linkedinEducation",
      // Selling methodology
      "sellingStyle",
      "sellingPhilosophy",
      "sellerArchetype",
      // Career & interview context
      "careerNarrative",
      "targetRoleTypes",
      "keyStrengths",
      "interviewHistory",
      // Territory & ICP context
      "icpDefinitions",
      "territoryFocus",
      "currentQuotaContext",
      // Sales assets
      "dealStories",
      "caseStudies",
      "valueProps",
      // Resume
      "resumeText",
      // Writing & communication style
      "writingStyle",
      "bannedPhrases",
      "signaturePatterns",
      // Lifecycle & onboarding
      "lifecycleStage",
      "onboardingDepth",
      "preferredTone",
      "onboardingCompleted",
    ];

    const updateData: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    // First save the update
    const profile = await prisma.userProfile.upsert({
      where: { userId: user.id },
      update: updateData,
      create: {
        userId: user.id,
        ...updateData,
      },
    });

    // Auto-compute depth from actual field completeness
    // Use the higher of chat-based depth and computed depth
    const computedDepth = computeProfileDepth(profile as unknown as Record<string, unknown>);
    const currentDepth = (profile as unknown as Record<string, unknown>).onboardingDepth as number || 0;

    if (computedDepth > currentDepth) {
      await prisma.userProfile.update({
        where: { userId: user.id },
        data: { onboardingDepth: computedDepth },
      });
      // Update the response object
      (profile as unknown as Record<string, unknown>).onboardingDepth = computedDepth;
    }

    return NextResponse.json({ profile, success: true });
  } catch (error) {
    console.error("Update profile error:", error);
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 }
    );
  }
}
