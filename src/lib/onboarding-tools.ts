/**
 * Tool definitions for the onboarding chatbot.
 *
 * These tools let the LLM persist captured context incrementally
 * during the conversation. Each tool writes to the user_profile
 * or KnowledgeDocument table via Prisma.
 */

import { z } from "zod";
import { tool } from "ai";
import prisma from "@/lib/db";

export function createOnboardingTools(userId: string) {
  return {
    save_profile_section: tool({
      description:
        "Save a section of the user's profile. Call this after extracting identity, methodology, or situation data from the conversation.",
      parameters: z.object({
        section: z.enum(["identity", "methodology", "situation"]),
        data: z.object({
          company_name: z.string().optional(),
          company_product: z.string().optional(),
          company_description: z.string().optional(),
          company_differentiators: z.string().optional(),
          company_competitors: z.string().optional(),
          company_target_market: z.string().optional(),
          company_url: z.string().optional(),
          selling_style: z.string().optional(),
          preferred_tone: z.string().optional(),
          linkedin_about: z.string().optional(),
          linkedin_experience: z.string().optional(),
          // Situation fields stored as part of profile notes
          current_situation: z.string().optional(),
          upcoming_events: z.string().optional(),
          pressing_need: z.string().optional(),
        }),
      }),
      execute: async ({ section, data }) => {
        try {
          const updateData: any = {};

          // Map flat fields to Prisma column names
          if (data.company_name) updateData.companyName = data.company_name;
          if (data.company_product) updateData.companyProduct = data.company_product;
          if (data.company_description) updateData.companyDescription = data.company_description;
          if (data.company_differentiators) updateData.companyDifferentiators = data.company_differentiators;
          if (data.company_competitors) updateData.companyCompetitors = data.company_competitors;
          if (data.company_target_market) updateData.companyTargetMarket = data.company_target_market;
          if (data.company_url) updateData.companyUrl = data.company_url;
          if (data.selling_style) updateData.sellingStyle = data.selling_style;
          if (data.preferred_tone) updateData.preferredTone = data.preferred_tone;
          if (data.linkedin_about) updateData.linkedinAbout = data.linkedin_about;
          if (data.linkedin_experience) updateData.linkedinExperience = data.linkedin_experience;

          // Store situation data in company description for now
          // (can be moved to a dedicated field later)
          if (section === "situation") {
            const situationParts: string[] = [];
            if (data.current_situation) situationParts.push(`Status: ${data.current_situation}`);
            if (data.upcoming_events) situationParts.push(`Upcoming: ${data.upcoming_events}`);
            if (data.pressing_need) situationParts.push(`Priority: ${data.pressing_need}`);

            if (situationParts.length > 0) {
              // Store as a knowledge document for the worker to pick up
              await prisma.knowledgeDocument.create({
                data: {
                  userId,
                  title: "Current Situation (Onboarding)",
                  content: situationParts.join("\n"),
                  category: "custom",
                },
              });
            }
          }

          if (Object.keys(updateData).length > 0) {
            await prisma.userProfile.upsert({
              where: { userId },
              create: {
                userId,
                ...updateData,
              },
              update: updateData,
            });
          }

          return { success: true, section, fieldsUpdated: Object.keys(updateData).length };
        } catch (err: any) {
          console.error(`[ONBOARDING] Failed to save profile section:`, err.message);
          return { success: false, error: err.message };
        }
      },
    }),

    save_deal_story: tool({
      description:
        "Save a deal story extracted from the conversation. Map the user's narrative to CotM structure (before_state, negative_consequences, required_capabilities, pbos) and note any MEDDPICC elements found.",
      parameters: z.object({
        company: z.string().describe("Account/company name"),
        deal_size: z.string().optional().describe("Approximate ACV or total deal value"),
        timeline: z.string().optional().describe("Time from first touch to close"),
        origin: z.string().optional().describe("How the deal started: cold outreach, inbound, referral, etc."),
        before_state: z.string().describe("Customer's specific situation/pain before the deal (CotM)"),
        negative_consequences: z.string().optional().describe("What would have happened if they didn't act (CotM)"),
        required_capabilities: z.string().optional().describe("What the solution needed to do (CotM)"),
        pbos: z.string().optional().describe("Quantified positive business outcomes achieved (CotM)"),
        how_won: z.string().optional().describe("The key move or moment that won the deal"),
        champion: z.string().optional().describe("Who sold internally (MEDDPICC)"),
        economic_buyer: z.string().optional().describe("Who signed the check (MEDDPICC)"),
        competition: z.string().optional().describe("Who else was in the deal or status quo (MEDDPICC)"),
        summary: z.string().describe("2-3 sentence story summary for quick reference"),
        use_when: z
          .array(z.string())
          .optional()
          .describe("Interview/deal situations where this story applies"),
      }),
      execute: async (story) => {
        try {
          // Fetch existing profile to append to deal_stories array
          const profile = await prisma.userProfile.findUnique({
            where: { userId },
          });

          const existingStories = (profile?.dealStories as any[]) || [];

          // Check for duplicate (same company name)
          const existingIndex = existingStories.findIndex(
            (s: any) => s.company?.toLowerCase() === story.company.toLowerCase()
          );

          if (existingIndex >= 0) {
            // Update existing story
            existingStories[existingIndex] = { ...existingStories[existingIndex], ...story };
          } else {
            // Add new story
            existingStories.push(story);
          }

          await prisma.userProfile.upsert({
            where: { userId },
            create: {
              userId,
              dealStories: existingStories,
            },
            update: {
              dealStories: existingStories,
            },
          });

          // Also save as a KnowledgeDocument for the worker's knowledge base
          const docContent = [
            `# Deal Story: ${story.company}`,
            "",
            story.summary,
            "",
            story.deal_size ? `Deal Size: ${story.deal_size}` : "",
            story.timeline ? `Timeline: ${story.timeline}` : "",
            story.origin ? `Origin: ${story.origin}` : "",
            "",
            "## CotM Mapping",
            `Before State: ${story.before_state}`,
            story.negative_consequences ? `Negative Consequences: ${story.negative_consequences}` : "",
            story.required_capabilities ? `Required Capabilities: ${story.required_capabilities}` : "",
            story.pbos ? `PBOs: ${story.pbos}` : "",
            story.how_won ? `How Won: ${story.how_won}` : "",
            "",
            "## MEDDPICC",
            story.champion ? `Champion: ${story.champion}` : "",
            story.economic_buyer ? `Economic Buyer: ${story.economic_buyer}` : "",
            story.competition ? `Competition: ${story.competition}` : "",
            "",
            story.use_when ? `Use When: ${story.use_when.join("; ")}` : "",
          ]
            .filter(Boolean)
            .join("\n");

          // Save as KnowledgeDocument for the worker's knowledge base
          // First, check if one already exists for this company
          const existingDoc = await prisma.knowledgeDocument.findFirst({
            where: {
              userId,
              title: `Deal Story: ${story.company}`,
              category: "deal_stories",
            },
          });

          if (existingDoc) {
            await prisma.knowledgeDocument.update({
              where: { id: existingDoc.id },
              data: { content: docContent },
            });
          } else {
            await prisma.knowledgeDocument.create({
              data: {
                userId,
                title: `Deal Story: ${story.company}`,
                content: docContent,
                category: "deal_stories",
              },
            });
          }

          return {
            success: true,
            storyCount: existingStories.length,
            company: story.company,
          };
        } catch (err: any) {
          console.error(`[ONBOARDING] Failed to save deal story:`, err.message);
          return {
            success: false,
            company: story.company,
            error: err.message,
          };
        }
      },
    }),

    mark_onboarding_complete: tool({
      description: "Mark the user's onboarding as complete. Call this after all phases are done.",
      parameters: z.object({}),
      execute: async () => {
        try {
          await prisma.userProfile.update({
            where: { userId },
            data: { onboardingCompleted: true },
          });
          return { success: true, message: "Onboarding marked complete." };
        } catch (err: any) {
          console.error(`[ONBOARDING] Failed to mark complete:`, err.message);
          return { success: false, error: err.message };
        }
      },
    }),
  };
}
