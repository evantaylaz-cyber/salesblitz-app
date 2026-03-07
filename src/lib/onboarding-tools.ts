/**
 * Tool definitions for the onboarding chatbot.
 *
 * These tools let the LLM persist captured context incrementally
 * during the conversation. Each tool writes to the user_profile
 * or KnowledgeDocument table via Prisma.
 *
 * Supports progressive onboarding depth (0-4):
 *   0 = no onboarding
 *   1 = essentials (identity + 1 deal story) ~3 min
 *   2 = post-first-blitz (more stories + methodology) ~5 min
 *   3 = post-third-blitz (ICP, territory, career) ~5 min
 *   4 = rich (writing style, patterns, full context)
 */

import { z } from "zod";
import { tool } from "ai";
import prisma from "@/lib/db";

export function createOnboardingTools(userId: string) {
  return {
    save_profile_section: tool({
      description:
        "Save a section of the user's profile. Call this after extracting data from the conversation. Sections: identity (company, product, market), methodology (selling style, philosophy, archetype), career (narrative, strengths, target roles), territory (ICP, focus, quota context), writing (style, banned phrases, patterns), situation (lifecycle, upcoming events).",
      parameters: z.object({
        section: z.enum(["identity", "methodology", "career", "territory", "writing", "situation"]),
        data: z.object({
          // Identity fields
          company_name: z.string().optional(),
          company_product: z.string().optional(),
          company_description: z.string().optional(),
          company_differentiators: z.string().optional(),
          company_competitors: z.string().optional(),
          company_target_market: z.string().optional(),
          company_url: z.string().optional(),
          // Methodology fields
          selling_style: z.string().optional(),
          selling_philosophy: z.string().optional(),
          seller_archetype: z.string().optional(),
          preferred_tone: z.string().optional(),
          // Career fields (interview context)
          career_narrative: z.string().optional(),
          target_role_types: z.array(z.string()).optional(),
          key_strengths: z.array(z.string()).optional(),
          // Territory fields (prospect context)
          territory_focus: z.string().optional(),
          current_quota_context: z.string().optional(),
          // Writing style fields
          writing_style: z.string().optional(),
          banned_phrases: z.array(z.string()).optional(),
          signature_patterns: z.array(z.string()).optional(),
          // LinkedIn
          linkedin_about: z.string().optional(),
          linkedin_experience: z.string().optional(),
          linkedin_education: z.string().optional(),
          // Lifecycle
          lifecycle_stage: z.string().optional(),
          // Situation fields (stored as knowledge doc)
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
          if (data.selling_philosophy) updateData.sellingPhilosophy = data.selling_philosophy;
          if (data.seller_archetype) updateData.sellerArchetype = data.seller_archetype;
          if (data.preferred_tone) updateData.preferredTone = data.preferred_tone;
          if (data.career_narrative) updateData.careerNarrative = data.career_narrative;
          if (data.target_role_types) updateData.targetRoleTypes = data.target_role_types;
          if (data.key_strengths) updateData.keyStrengths = data.key_strengths;
          if (data.territory_focus) updateData.territoryFocus = data.territory_focus;
          if (data.current_quota_context) updateData.currentQuotaContext = data.current_quota_context;
          if (data.writing_style) updateData.writingStyle = data.writing_style;
          if (data.banned_phrases) updateData.bannedPhrases = data.banned_phrases;
          if (data.signature_patterns) updateData.signaturePatterns = data.signature_patterns;
          if (data.linkedin_about) updateData.linkedinAbout = data.linkedin_about;
          if (data.linkedin_experience) updateData.linkedinExperience = data.linkedin_experience;
          if (data.linkedin_education) updateData.linkedinEducation = data.linkedin_education;
          if (data.lifecycle_stage) updateData.lifecycleStage = data.lifecycle_stage;

          // Store situation data as a knowledge document
          if (section === "situation") {
            const situationParts: string[] = [];
            if (data.current_situation) situationParts.push(`Status: ${data.current_situation}`);
            if (data.upcoming_events) situationParts.push(`Upcoming: ${data.upcoming_events}`);
            if (data.pressing_need) situationParts.push(`Priority: ${data.pressing_need}`);

            if (situationParts.length > 0) {
              // Upsert: update existing situation doc or create new one
              const existingDoc = await prisma.knowledgeDocument.findFirst({
                where: { userId, title: "Current Situation", category: "custom" },
              });

              if (existingDoc) {
                await prisma.knowledgeDocument.update({
                  where: { id: existingDoc.id },
                  data: { content: situationParts.join("\n") },
                });
              } else {
                await prisma.knowledgeDocument.create({
                  data: {
                    userId,
                    title: "Current Situation",
                    content: situationParts.join("\n"),
                    category: "custom",
                  },
                });
              }
            }
          }

          if (Object.keys(updateData).length > 0) {
            await prisma.userProfile.upsert({
              where: { userId },
              create: { userId, ...updateData },
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

    save_icp_definition: tool({
      description:
        "Save an Ideal Customer Profile definition. Used by prospect tools to assess fit and tailor messaging.",
      parameters: z.object({
        industry: z.string().describe("Target industry or vertical"),
        company_size: z.string().optional().describe("Company size range (employees or revenue)"),
        buyer_persona: z.string().optional().describe("Primary buyer title/role"),
        common_pains: z.string().optional().describe("Common pain points in this ICP"),
        summary: z.string().optional().describe("One-line ICP summary"),
      }),
      execute: async (icp) => {
        try {
          const profile = await prisma.userProfile.findUnique({
            where: { userId },
          });

          const existing = (profile?.icpDefinitions as any[]) || [];

          // Check for duplicate by industry
          const idx = existing.findIndex(
            (d: any) => d.industry?.toLowerCase() === icp.industry.toLowerCase()
          );

          const icpEntry = {
            industry: icp.industry,
            companySize: icp.company_size,
            buyerPersona: icp.buyer_persona,
            commonPains: icp.common_pains,
          };

          if (idx >= 0) {
            existing[idx] = { ...existing[idx], ...icpEntry };
          } else {
            existing.push(icpEntry);
          }

          await prisma.userProfile.upsert({
            where: { userId },
            create: { userId, icpDefinitions: existing },
            update: { icpDefinitions: existing },
          });

          return { success: true, icpCount: existing.length, industry: icp.industry };
        } catch (err: any) {
          console.error(`[ONBOARDING] Failed to save ICP:`, err.message);
          return { success: false, error: err.message };
        }
      },
    }),

    save_deal_story: tool({
      description:
        "Save a deal story with triple mapping: CotM (before_state, negative_consequences, required_capabilities, pbos), MEDDPICC (champion, economic_buyer, decision_criteria, competition), and STAR (situation, task, action, result). YOU do the mapping from the user's natural language. They should never hear these framework terms unless they bring them up.",
      parameters: z.object({
        company: z.string().describe("Account/company name"),
        deal_size: z.string().optional().describe("Approximate ACV or total deal value"),
        timeline: z.string().optional().describe("Time from first touch to close"),
        origin: z.string().optional().describe("How it started: cold outreach, inbound, referral, etc."),
        // CotM mapping
        before_state: z.string().describe("Customer's specific situation/pain before (CotM)"),
        negative_consequences: z.string().optional().describe("What would have happened if they didn't act (CotM)"),
        required_capabilities: z.string().optional().describe("What the solution needed to do (CotM)"),
        pbos: z.string().optional().describe("Quantified positive business outcomes achieved (CotM)"),
        how_won: z.string().optional().describe("Key move or moment that won the deal"),
        // MEDDPICC elements
        champion: z.string().optional().describe("Who sold internally (MEDDPICC C)"),
        economic_buyer: z.string().optional().describe("Who signed the check (MEDDPICC E)"),
        competition: z.string().optional().describe("Alternatives in the deal (MEDDPICC C)"),
        decision_criteria: z.string().optional().describe("What they evaluated on (MEDDPICC D)"),
        decision_process: z.string().optional().describe("How they made the decision (MEDDPICC D)"),
        metrics: z.string().optional().describe("Key metrics that drove urgency (MEDDPICC M)"),
        // STAR mapping (for interview tools)
        star_situation: z.string().optional().describe("STAR: Context/background"),
        star_task: z.string().optional().describe("STAR: What you needed to accomplish"),
        star_action: z.string().optional().describe("STAR: Specific actions you took"),
        star_result: z.string().optional().describe("STAR: Quantified results"),
        // Metadata
        verticals: z.array(z.string()).optional().describe("Industries this story applies to"),
        sell_cycle: z.string().optional().describe("Short/medium/long"),
        summary: z.string().describe("2-3 sentence story summary"),
        use_when: z.array(z.string()).optional().describe("Situations where this story applies"),
      }),
      execute: async (story) => {
        try {
          const profile = await prisma.userProfile.findUnique({
            where: { userId },
          });

          const existingStories = (profile?.dealStories as any[]) || [];

          // Build structured story with all three mappings
          const structuredStory = {
            company: story.company,
            dealSize: story.deal_size,
            timeline: story.timeline,
            origin: story.origin,
            summary: story.summary,
            useWhen: story.use_when,
            verticals: story.verticals,
            sellCycle: story.sell_cycle,
            // CotM mapping
            beforeState: story.before_state,
            negativeConsequences: story.negative_consequences,
            requiredCapabilities: story.required_capabilities,
            pbos: story.pbos,
            howWon: story.how_won,
            // MEDDPICC mapping
            champion: story.champion,
            economicBuyer: story.economic_buyer,
            competition: story.competition,
            decisionCriteria: story.decision_criteria,
            decisionProcess: story.decision_process,
            metrics: story.metrics,
            // STAR mapping
            starMapping: {
              situation: story.star_situation || story.before_state,
              task: story.star_task || story.negative_consequences,
              action: story.star_action || story.how_won,
              result: story.star_result || story.pbos,
            },
            // CotM convenience mapping
            cotmMapping: {
              beforeState: story.before_state,
              negConsequences: story.negative_consequences,
              reqCapabilities: story.required_capabilities,
              pbos: story.pbos,
            },
            // MEDDPICC convenience mapping
            meddpiccMapping: {
              metrics: story.metrics,
              econ_buyer: story.economic_buyer,
              decision_criteria: story.decision_criteria,
              decision_process: story.decision_process,
              identified_pain: story.before_state,
              champion: story.champion,
              competition: story.competition,
            },
          };

          // Check for duplicate (same company name)
          const existingIndex = existingStories.findIndex(
            (s: any) => s.company?.toLowerCase() === story.company.toLowerCase()
          );

          if (existingIndex >= 0) {
            existingStories[existingIndex] = { ...existingStories[existingIndex], ...structuredStory };
          } else {
            existingStories.push(structuredStory);
          }

          await prisma.userProfile.upsert({
            where: { userId },
            create: { userId, dealStories: existingStories },
            update: { dealStories: existingStories },
          });

          // Also save as KnowledgeDocument for worker's knowledge base
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
            story.decision_criteria ? `Decision Criteria: ${story.decision_criteria}` : "",
            story.metrics ? `Metrics: ${story.metrics}` : "",
            "",
            "## STAR",
            story.star_situation ? `Situation: ${story.star_situation}` : "",
            story.star_task ? `Task: ${story.star_task}` : "",
            story.star_action ? `Action: ${story.star_action}` : "",
            story.star_result ? `Result: ${story.star_result}` : "",
            "",
            story.use_when ? `Use When: ${story.use_when.join("; ")}` : "",
            story.verticals ? `Verticals: ${story.verticals.join(", ")}` : "",
          ]
            .filter(Boolean)
            .join("\n");

          const existingDoc = await prisma.knowledgeDocument.findFirst({
            where: { userId, title: `Deal Story: ${story.company}`, category: "deal_stories" },
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

          return { success: true, storyCount: existingStories.length, company: story.company };
        } catch (err: any) {
          console.error(`[ONBOARDING] Failed to save deal story:`, err.message);
          return { success: false, company: story.company, error: err.message };
        }
      },
    }),

    save_case_study: tool({
      description:
        "Save a customer case study or proof point. Used as social proof in outreach, POV decks, and research briefs.",
      parameters: z.object({
        customer_name: z.string().describe("Customer/account name"),
        challenge: z.string().describe("What the customer was dealing with"),
        solution: z.string().describe("What was implemented or delivered"),
        result: z.string().describe("Quantified outcome: %, $, time saved, etc."),
        quote: z.string().optional().describe("Direct customer quote if available"),
        industry: z.string().optional().describe("Customer's industry"),
        summary: z.string().describe("1-2 sentence summary for quick reference"),
      }),
      execute: async (caseStudy) => {
        try {
          // Save to profile's caseStudies JSON array
          const profile = await prisma.userProfile.findUnique({
            where: { userId },
          });

          const existingCaseStudies = (profile?.caseStudies as any[]) || [];

          const csEntry = {
            customerName: caseStudy.customer_name,
            challenge: caseStudy.challenge,
            solution: caseStudy.solution,
            result: caseStudy.result,
            quote: caseStudy.quote,
            industry: caseStudy.industry,
            summary: caseStudy.summary,
          };

          const idx = existingCaseStudies.findIndex(
            (c: any) =>
              (c.customerName || c.customer_name || "").toLowerCase() ===
              caseStudy.customer_name.toLowerCase()
          );

          if (idx >= 0) {
            existingCaseStudies[idx] = { ...existingCaseStudies[idx], ...csEntry };
          } else {
            existingCaseStudies.push(csEntry);
          }

          await prisma.userProfile.upsert({
            where: { userId },
            create: { userId, caseStudies: existingCaseStudies },
            update: { caseStudies: existingCaseStudies },
          });

          // Also save as KnowledgeDocument
          const docContent = [
            `# Case Study: ${caseStudy.customer_name}`,
            "",
            caseStudy.summary,
            "",
            caseStudy.industry ? `Industry: ${caseStudy.industry}` : "",
            "",
            `## Challenge`,
            caseStudy.challenge,
            "",
            `## Solution`,
            caseStudy.solution,
            "",
            `## Result`,
            caseStudy.result,
            "",
            caseStudy.quote ? `## Customer Quote\n"${caseStudy.quote}"` : "",
          ]
            .filter(Boolean)
            .join("\n");

          const existingDoc = await prisma.knowledgeDocument.findFirst({
            where: { userId, title: `Case Study: ${caseStudy.customer_name}`, category: "case_studies" },
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
                title: `Case Study: ${caseStudy.customer_name}`,
                content: docContent,
                category: "case_studies",
              },
            });
          }

          return { success: true, customer: caseStudy.customer_name };
        } catch (err: any) {
          console.error(`[ONBOARDING] Failed to save case study:`, err.message);
          return { success: false, customer: caseStudy.customer_name, error: err.message };
        }
      },
    }),

    save_interview_history: tool({
      description:
        "Save an interview history entry. Tracks past interviews for pattern recognition and prep improvement.",
      parameters: z.object({
        company: z.string().describe("Company interviewed at"),
        role: z.string().describe("Role title"),
        round: z.string().describe("Interview round (phone screen, panel, final, etc.)"),
        outcome: z.string().optional().describe("pass, fail, pending, withdrew"),
        date: z.string().optional().describe("Date of interview"),
        notes: z.string().optional().describe("Key takeaways, what landed, what didn't"),
      }),
      execute: async (entry) => {
        try {
          const profile = await prisma.userProfile.findUnique({
            where: { userId },
          });

          const history = (profile?.interviewHistory as any[]) || [];
          history.push(entry);

          await prisma.userProfile.upsert({
            where: { userId },
            create: { userId, interviewHistory: history },
            update: { interviewHistory: history },
          });

          return { success: true, historyCount: history.length };
        } catch (err: any) {
          console.error(`[ONBOARDING] Failed to save interview history:`, err.message);
          return { success: false, error: err.message };
        }
      },
    }),

    advance_onboarding_depth: tool({
      description:
        "Advance the user's onboarding depth. Levels: 1=essentials (identity + 1 story), 2=methodology + more stories, 3=territory/career + ICP, 4=writing style + full context. Also sets onboardingCompleted=true for backward compatibility.",
      parameters: z.object({
        depth: z.number().min(1).max(4).describe("New onboarding depth level"),
      }),
      execute: async ({ depth }) => {
        try {
          await prisma.userProfile.update({
            where: { userId },
            data: {
              onboardingDepth: depth,
              onboardingCompleted: true,
            },
          });
          return { success: true, depth, message: `Onboarding depth advanced to level ${depth}.` };
        } catch (err: any) {
          console.error(`[ONBOARDING] Failed to advance depth:`, err.message);
          return { success: false, error: err.message };
        }
      },
    }),
  };
}
