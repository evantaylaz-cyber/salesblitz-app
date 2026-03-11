export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import prisma from "@/lib/db";
import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { triggerEmbed } from "@/lib/trigger-worker";

// POST /api/profile/parse-resume
// Parses resume text, extracts structured career data, auto-fills profile fields
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
    const { resumeText } = body;

    if (!resumeText || resumeText.trim().length < 50) {
      return NextResponse.json({ error: "Resume text too short" }, { status: 400 });
    }

    // Store raw resume text
    await prisma.userProfile.upsert({
      where: { userId: user.id },
      create: { userId: user.id, resumeText },
      update: { resumeText },
    });

    // Use AI to extract structured data
    const extractionPrompt = `You are analyzing a sales professional's resume to extract structured data for a sales enablement platform. Extract the following from this resume. Be specific and use actual numbers, company names, and achievements from the resume.

RESUME:
${resumeText.slice(0, 15000)}

Return a JSON object with these fields:

{
  "career_narrative": "2-3 sentence career arc summary. Focus on progression, scale, and pattern.",
  "seller_archetype": "One of: hunter, farmer, hunter_farmer, consultative, challenger, relationship_builder. Based on their career pattern.",
  "key_strengths": ["strength1", "strength2", "strength3"],
  "years_experience": 0,
  "current_or_last_company": "Company name",
  "current_or_last_role": "Title",
  "target_role_types": ["enterprise_ae", "strategic_ae"],
  "linkedin_experience_equivalent": "Formatted experience section reconstructed from resume data. Each role on its own line: Company, Title (dates): key accomplishments.",
  "deal_stories_raw": [
    {
      "company_or_account": "Account name or description",
      "what_happened": "The accomplishment described",
      "metrics": "Any numbers: revenue, deal size, growth %, quota attainment",
      "could_be_deal_story": true
    }
  ],
  "education": "Degree, school, year if listed",
  "skills_and_tools": ["CRM tools", "methodologies", "certifications"],
  "writing_patterns": "Observations about how they write"
}

Extract ONLY what's actually in the resume. Don't invent or embellish.`;

    const result = await generateText({
      model: anthropic("claude-sonnet-4-5-20250929"),
      prompt: extractionPrompt,
      maxTokens: 3000,
    });

    let parsed: Record<string, unknown> = {};
    try {
      const jsonMatch = result.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      }
    } catch {
      console.error("[PROFILE] Failed to parse resume extraction");
      return NextResponse.json({ success: false, error: "Resume stored but extraction failed. Try again." });
    }

    // Auto-fill profile fields from resume data
    const updateData: Record<string, unknown> = {};
    if (parsed.career_narrative) updateData.careerNarrative = parsed.career_narrative;
    if (parsed.seller_archetype) updateData.sellerArchetype = parsed.seller_archetype;
    if (parsed.key_strengths && Array.isArray(parsed.key_strengths)) {
      updateData.keyStrengths = parsed.key_strengths;
    }
    if (parsed.target_role_types && Array.isArray(parsed.target_role_types)) {
      updateData.targetRoleTypes = parsed.target_role_types;
    }
    if (parsed.linkedin_experience_equivalent) {
      updateData.linkedinExperience = parsed.linkedin_experience_equivalent;
    }
    if (parsed.education) {
      updateData.linkedinEducation = parsed.education;
    }

    if (Object.keys(updateData).length > 0) {
      await prisma.userProfile.update({
        where: { userId: user.id },
        data: updateData,
      });
    }

    // Store resume as KnowledgeDocument for downstream semantic matching
    // Use "custom" category for backward compat but also check for legacy docs
    const existingDoc = await prisma.knowledgeDocument.findFirst({
      where: { userId: user.id, title: "Resume", category: { in: ["custom", "resume"] } },
    });

    let resumeDocId: string;
    if (existingDoc) {
      await prisma.knowledgeDocument.update({
        where: { id: existingDoc.id },
        data: {
          content: resumeText.slice(0, 50000),
          // Clear embeddingUpdatedAt to trigger re-embedding on next worker load
          embeddingUpdatedAt: null,
        },
      });
      resumeDocId = existingDoc.id;
    } else {
      const newDoc = await prisma.knowledgeDocument.create({
        data: {
          userId: user.id,
          title: "Resume",
          content: resumeText.slice(0, 50000),
          category: "custom",
        },
      });
      resumeDocId = newDoc.id;
    }

    // Store extracted deal stories as individual KB docs for semantic matching
    const dealStoriesRaw = parsed.deal_stories_raw as Array<{
      company_or_account?: string;
      what_happened?: string;
      metrics?: string;
      could_be_deal_story?: boolean;
    }> | undefined;

    if (dealStoriesRaw && Array.isArray(dealStoriesRaw)) {
      for (const story of dealStoriesRaw.filter(s => s.could_be_deal_story)) {
        const storyTitle = `Deal Story: ${story.company_or_account || "Unknown"}`;
        const storyContent = [
          story.company_or_account && `Account: ${story.company_or_account}`,
          story.what_happened && `What Happened: ${story.what_happened}`,
          story.metrics && `Metrics: ${story.metrics}`,
        ].filter(Boolean).join("\n");

        if (storyContent.length > 20) {
          // Upsert: don't duplicate if they re-upload the same resume
          const existingStory = await prisma.knowledgeDocument.findFirst({
            where: { userId: user.id, title: storyTitle, category: "deal_stories" },
          });

          if (existingStory) {
            await prisma.knowledgeDocument.update({
              where: { id: existingStory.id },
              data: { content: storyContent, embeddingUpdatedAt: null },
            });
          } else {
            await prisma.knowledgeDocument.create({
              data: {
                userId: user.id,
                title: storyTitle,
                content: storyContent,
                category: "deal_stories",
              },
            });
          }
        }
      }
    }

    // Trigger async embedding for the resume doc (fire-and-forget)
    // The worker will embed this on next KB load, but we can also nudge it
    triggerEmbed({
      type: "debrief", // Reuse debrief embed pathway
      id: resumeDocId,
      content: `Resume for ${parsed.current_or_last_company || "user"}: ${(parsed.career_narrative as string || "").slice(0, 500)}`,
      outcome: null,
      targetCompany: parsed.current_or_last_company as string || null,
      toolName: "resume_upload",
    });

    return NextResponse.json({
      success: true,
      careerNarrative: parsed.career_narrative,
      sellerArchetype: parsed.seller_archetype,
      keyStrengths: parsed.key_strengths,
      targetRoleTypes: parsed.target_role_types,
      linkedinExperience: parsed.linkedin_experience_equivalent,
      education: parsed.education,
      dealStoriesFound: (parsed.deal_stories_raw as unknown[])?.length || 0,
      dealStoriesRaw: parsed.deal_stories_raw,
      skills: parsed.skills_and_tools,
      writingPatterns: parsed.writing_patterns,
    });
  } catch (err) {
    console.error("Resume parse error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
