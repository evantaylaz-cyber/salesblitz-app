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
import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import prisma from "@/lib/db";
import { triggerEmbed } from "@/lib/trigger-worker";

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
        console.log(`[ONBOARDING_TOOL] save_profile_section CALLED | userId=${userId} | section=${section} | keys=${Object.keys(data).filter(k => (data as any)[k] != null).join(",")}`);
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

              let sitDocId: string;
              if (existingDoc) {
                await prisma.knowledgeDocument.update({
                  where: { id: existingDoc.id },
                  data: { content: situationParts.join("\n"), embeddingUpdatedAt: null },
                });
                sitDocId = existingDoc.id;
              } else {
                const newDoc = await prisma.knowledgeDocument.create({
                  data: {
                    userId,
                    title: "Current Situation",
                    content: situationParts.join("\n"),
                    category: "custom",
                  },
                });
                sitDocId = newDoc.id;
              }
              triggerEmbed({ type: "kb_doc", id: sitDocId }).catch(() => {});
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
        console.log(`[ONBOARDING_TOOL] save_icp_profile CALLED | userId=${userId}`);
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
        "Save a deal story with triple mapping: value messaging (before_state, negative_consequences, required_capabilities, pbos), deal qualification (champion, economic_buyer, decision_criteria, competition), and STAR (situation, task, action, result). YOU do the mapping from the user's natural language. They should never hear these framework terms unless they bring them up.",
      parameters: z.object({
        company: z.string().describe("Account/company name"),
        deal_size: z.string().optional().describe("Approximate ACV or total deal value"),
        timeline: z.string().optional().describe("Time from first touch to close"),
        origin: z.string().optional().describe("How it started: cold outreach, inbound, referral, etc."),
        // Value messaging mapping
        before_state: z.string().describe("Customer's specific situation or pain before the solution"),
        negative_consequences: z.string().optional().describe("What would have happened if they didn't act"),
        required_capabilities: z.string().optional().describe("What the solution needed to do"),
        pbos: z.string().optional().describe("Quantified positive business outcomes achieved"),
        how_won: z.string().optional().describe("Key move or moment that won the deal"),
        // Deal qualification elements
        champion: z.string().optional().describe("Who sold internally for you"),
        economic_buyer: z.string().optional().describe("Who signed the check"),
        competition: z.string().optional().describe("Alternatives evaluated in the deal"),
        decision_criteria: z.string().optional().describe("What they evaluated on"),
        decision_process: z.string().optional().describe("How they made the decision"),
        metrics: z.string().optional().describe("Key metrics that drove urgency"),
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
        console.log(`[ONBOARDING_TOOL] save_deal_story CALLED | userId=${userId} | company=${story.company} | summary=${(story.summary || "").slice(0, 50)}`);
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
            // Value messaging mapping
            beforeState: story.before_state,
            negativeConsequences: story.negative_consequences,
            requiredCapabilities: story.required_capabilities,
            pbos: story.pbos,
            howWon: story.how_won,
            // Deal qualification mapping
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
            // Value messaging convenience mapping
            cotmMapping: {
              beforeState: story.before_state,
              negConsequences: story.negative_consequences,
              reqCapabilities: story.required_capabilities,
              pbos: story.pbos,
            },
            // Deal qualification convenience mapping
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
            "## Value Messaging",
            `Before State: ${story.before_state}`,
            story.negative_consequences ? `Negative Consequences: ${story.negative_consequences}` : "",
            story.required_capabilities ? `Required Capabilities: ${story.required_capabilities}` : "",
            story.pbos ? `Business Outcomes: ${story.pbos}` : "",
            story.how_won ? `How Won: ${story.how_won}` : "",
            "",
            "## Deal Qualification",
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

          let kbDocId: string;
          if (existingDoc) {
            await prisma.knowledgeDocument.update({
              where: { id: existingDoc.id },
              data: { content: docContent, embeddingUpdatedAt: null },
            });
            kbDocId = existingDoc.id;
          } else {
            const newDoc = await prisma.knowledgeDocument.create({
              data: {
                userId,
                title: `Deal Story: ${story.company}`,
                content: docContent,
                category: "deal_stories",
              },
            });
            kbDocId = newDoc.id;
          }

          // Fire-and-forget: embed this KB doc for semantic search
          triggerEmbed({ type: "kb_doc", id: kbDocId }).catch(() => {});

          return { success: true, storyCount: existingStories.length, company: story.company };
        } catch (err: any) {
          console.error(`[ONBOARDING] Failed to save deal story:`, err.message);
          return { success: false, company: story.company, error: err.message };
        }
      },
    }),

    save_case_study: tool({
      description:
        "Save a customer case study or proof point. Used as social proof in outreach, POV decks, and context files.",
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
        console.log(`[ONBOARDING_TOOL] save_case_study CALLED | userId=${userId} | customer=${caseStudy.customer_name} | summary=${(caseStudy.summary || "").slice(0, 50)}`);
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

          let csDocId: string;
          if (existingDoc) {
            await prisma.knowledgeDocument.update({
              where: { id: existingDoc.id },
              data: { content: docContent, embeddingUpdatedAt: null },
            });
            csDocId = existingDoc.id;
          } else {
            const newDoc = await prisma.knowledgeDocument.create({
              data: {
                userId,
                title: `Case Study: ${caseStudy.customer_name}`,
                content: docContent,
                category: "case_studies",
              },
            });
            csDocId = newDoc.id;
          }

          // Fire-and-forget: embed for semantic search
          triggerEmbed({ type: "kb_doc", id: csDocId }).catch(() => {});

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
        console.log(`[ONBOARDING_TOOL] save_interview_entry CALLED | userId=${userId} | company=${entry.company}`);

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
        console.log(`[ONBOARDING_TOOL] advance_onboarding_depth CALLED | userId=${userId} | depth=${depth}`);
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

    research_company: tool({
      description:
        "DEEP RESEARCH: Fetches the company's actual website, scrapes real content from multiple pages (homepage, about, customers, case studies), then uses AI to extract accurate intel. This is NOT surface-level. Call this IMMEDIATELY when a user provides their company name or URL. Present findings for verification. The user can always override or edit anything on their profile page.",
      parameters: z.object({
        company_name: z.string().describe("Company name to research"),
        company_url: z.string().optional().describe("Company website URL (e.g., https://gong.io)"),
        linkedin_url: z.string().optional().describe("User's LinkedIn profile URL"),
      }),
      execute: async ({ company_name, company_url, linkedin_url }) => {
        console.log(`[ONBOARDING_TOOL] research_company CALLED | userId=${userId} | company=${company_name} | url=${company_url || "none"}`);

        try {
          // ── Step 1: Fetch real website content from multiple pages ──
          let websiteContent = "";
          let pagesScraped = 0;

          const fetchPage = async (url: string, label: string): Promise<string> => {
            try {
              const res = await fetch(url, {
                headers: {
                  "User-Agent": "Mozilla/5.0 (compatible; SalesBlitz/1.0)",
                  Accept: "text/html,application/xhtml+xml,text/plain",
                },
                signal: AbortSignal.timeout(10000),
              });
              if (!res.ok) return "";
              const html = await res.text();
              const text = html
                .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
                .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
                .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, "")
                .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, "")
                .replace(/<[^>]+>/g, " ")
                .replace(/&nbsp;/g, " ")
                .replace(/&amp;/g, "&")
                .replace(/&lt;/g, "<")
                .replace(/&gt;/g, ">")
                .replace(/&#\d+;/g, "")
                .replace(/\s+/g, " ")
                .trim()
                .slice(0, 12000);
              if (text.length > 100) {
                pagesScraped++;
                return `\n--- ${label} ---\n${text}\n`;
              }
              return "";
            } catch {
              return "";
            }
          }

          if (company_url) {
            // Normalize URL
            let baseUrl = company_url.trim();
            if (!baseUrl.startsWith("http")) baseUrl = "https://" + baseUrl;
            baseUrl = baseUrl.replace(/\/+$/, "");

            // Fetch multiple pages in parallel for depth
            const pageResults = await Promise.allSettled([
              fetchPage(baseUrl, "HOMEPAGE"),
              fetchPage(`${baseUrl}/about`, "ABOUT PAGE"),
              fetchPage(`${baseUrl}/about-us`, "ABOUT PAGE"),
              fetchPage(`${baseUrl}/customers`, "CUSTOMERS PAGE"),
              fetchPage(`${baseUrl}/case-studies`, "CASE STUDIES"),
              fetchPage(`${baseUrl}/pricing`, "PRICING PAGE"),
              fetchPage(`${baseUrl}/product`, "PRODUCT PAGE"),
              fetchPage(`${baseUrl}/solutions`, "SOLUTIONS PAGE"),
              fetchPage(`${baseUrl}/why-us`, "WHY US PAGE"),
            ]);

            for (const r of pageResults) {
              if (r.status === "fulfilled" && r.value) {
                websiteContent += r.value;
              }
            }

            // Cap total content to avoid token explosion
            websiteContent = websiteContent.slice(0, 40000);
          }

          console.log(`[ONBOARDING] Research for ${company_name}: scraped ${pagesScraped} pages, ${websiteContent.length} chars`);

          // ── Step 2: Build research prompt with real content ──
          const hasRealContent = websiteContent.length > 200;

          const researchPrompt = `You are a B2B sales intelligence researcher doing a DEEP analysis of "${company_name}."${company_url ? ` Website: ${company_url}` : ""}

${hasRealContent ? `## ACTUAL WEBSITE CONTENT (scraped from their site)\n${websiteContent}\n\n## YOUR TASK\nUsing the REAL website content above plus your training knowledge, extract accurate, specific intelligence. Prioritize what's actually on their website over guesses. If the website content contradicts your training data, trust the website.` : `## NO WEBSITE CONTENT AVAILABLE\nResearch this company from your training knowledge. Be honest about confidence levels. Mark anything you're uncertain about.`}

Return a JSON object. Be SPECIFIC, not generic. Use real names, real numbers, real details from the content above. If you can't find something with confidence, use "NOT_FOUND".

{
  "company_product": "Exactly what they sell. Product name, category, core capability. One specific sentence.",
  "company_description": "2-3 sentences. What they do, who they serve, how they're positioned in the market. Use their own language where possible.",
  "company_target_market": "Who buys this? Be specific: industry verticals, company sizes (employee count or revenue ranges), buyer titles/roles, geographic focus if evident.",
  "company_competitors": "Top 3-5 DIRECT competitors. Companies selling to the same buyer with a similar product. Comma-separated.",
  "company_differentiators": "2-4 specific things that make them different. Not generic ('great customer service') but specific ('only platform that captures all customer interactions across phone, email, and web conferencing').",
  "value_proposition": "Their primary value prop in one sentence. What outcome do they promise?",
  "gtm_strategy": "Go-to-market motion: direct enterprise sales, PLG, channel/partner, hybrid? What's the primary sales motion? Evidence from pricing page, team structure, or website structure.",
  "messaging_themes": "Top 3 messaging themes from their website. What value props do they lead with? What words/phrases repeat?",
  "case_studies": [
    {
      "customer_name": "Real customer company name (from website)",
      "industry": "Customer's industry",
      "challenge": "Specific problem they faced",
      "solution": "What was implemented",
      "result": "Quantified outcome: specific numbers, percentages, dollar amounts",
      "summary": "One sentence summary"
    }
  ],
  "icp_definitions": [
    {
      "industry": "Primary target vertical",
      "company_size": "Typical customer size (employees or revenue)",
      "buyer_persona": "Primary buyer title/role",
      "common_pains": "Pain points this ICP typically has that this product solves"
    }
  ],
  "key_customers": "Notable customer logos or names mentioned on the website, comma-separated",
  "funding_stage": "If known: seed, Series A/B/C, public, bootstrapped, PE-backed",
  "employee_count_range": "Approximate headcount range if discernible",
  "confidence_score": 0.85,
  "confidence_notes": "What you're most/least confident about and why"
}

CRITICAL: Extract REAL customer names and REAL metrics from the website content. Do not fabricate case studies or customers. If you found customer logos but no case study details, list them under key_customers instead.`;

          const result = await generateText({
            model: anthropic("claude-sonnet-4-5-20250929"),
            prompt: researchPrompt,
            maxTokens: 4000,
          });

          // ── Step 3: Parse the AI response ──
          let research: any = {};
          try {
            const jsonMatch = result.text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              research = JSON.parse(jsonMatch[0]);
            }
          } catch {
            console.error("[ONBOARDING] Failed to parse research response");
            return { success: false, error: "Research completed but failed to parse results. Try again." };
          }

          // ── Step 4: Save to profile (user verifies via chatbot) ──
          const updateData: any = { companyName: company_name };
          if (company_url) updateData.companyUrl = company_url;

          const fieldMap: Record<string, string> = {
            company_product: "companyProduct",
            company_description: "companyDescription",
            company_target_market: "companyTargetMarket",
            company_competitors: "companyCompetitors",
            company_differentiators: "companyDifferentiators",
          };

          for (const [src, dest] of Object.entries(fieldMap)) {
            if (research[src] && research[src] !== "NOT_FOUND") {
              updateData[dest] = research[src];
            }
          }

          console.log(`[ONBOARDING_TOOL] research_company DB WRITE: updateData keys=${Object.keys(updateData).join(",")}, companyName=${updateData.companyName}`);
          try {
            await prisma.userProfile.upsert({
              where: { userId },
              create: { userId, ...updateData },
              update: updateData,
            });
            console.log(`[ONBOARDING_TOOL] research_company DB WRITE SUCCESS`);
          } catch (dbErr: any) {
            console.error(`[ONBOARDING_TOOL] research_company DB WRITE FAILED: ${dbErr.message}`);
            // Don't rethrow — continue to return research data even if DB write fails
          }

          // Save case studies if found (only real ones from the website)
          if (research.case_studies && Array.isArray(research.case_studies) && research.case_studies.length > 0) {
            const validCaseStudies = research.case_studies
              .filter((cs: any) => cs.customer_name && cs.customer_name !== "NOT_FOUND")
              .map((cs: any) => ({
                customerName: cs.customer_name,
                industry: cs.industry || "",
                challenge: cs.challenge || "",
                solution: cs.solution || "",
                result: cs.result || "",
                quote: cs.quote || "",
                summary: cs.summary || "",
              }));

            if (validCaseStudies.length > 0) {
              await prisma.userProfile.update({
                where: { userId },
                data: { caseStudies: validCaseStudies },
              });

              // Also create KnowledgeDocuments for each case study (enables embedding + semantic search)
              for (const cs of validCaseStudies) {
                const docContent = `Case Study: ${cs.customerName} (${cs.industry})\nChallenge: ${cs.challenge}\nSolution: ${cs.solution}\nResult: ${cs.result}\n${cs.summary}`;
                try {
                  await prisma.knowledgeDocument.create({
                    data: {
                      userId,
                      title: `Case Study: ${cs.customerName}`,
                      content: docContent,
                      category: "case_studies",
                      },
                  });
                } catch {
                  // Duplicate or other non-fatal error, skip
                }
              }
            }
          }

          // Save company research summary as a KnowledgeDocument for semantic search
          const researchDoc = [
            `Company Research: ${company_name}`,
            research.company_product ? `Product: ${research.company_product}` : "",
            research.company_description ? `Description: ${research.company_description}` : "",
            research.company_target_market ? `Target Market: ${research.company_target_market}` : "",
            research.company_competitors ? `Competitors: ${research.company_competitors}` : "",
            research.company_differentiators ? `Differentiators: ${research.company_differentiators}` : "",
            research.value_proposition ? `Value Proposition: ${research.value_proposition}` : "",
            research.gtm_strategy ? `GTM Strategy: ${research.gtm_strategy}` : "",
            research.messaging_themes ? `Messaging Themes: ${research.messaging_themes}` : "",
            research.key_customers ? `Key Customers: ${research.key_customers}` : "",
          ].filter(Boolean).join("\n");

          try {
            // Delete any prior research doc for this company, then create fresh
            await prisma.knowledgeDocument.deleteMany({
              where: { userId, title: `Company Research: ${company_name}` },
            });
            await prisma.knowledgeDocument.create({
              data: {
                userId,
                title: `Company Research: ${company_name}`,
                content: researchDoc,
                category: "custom",
              },
            });
          } catch {
            // Non-fatal
          }

          // Save ICP definitions if found
          if (research.icp_definitions && Array.isArray(research.icp_definitions) && research.icp_definitions.length > 0) {
            const validICPs = research.icp_definitions
              .filter((icp: any) => icp.industry && icp.industry !== "NOT_FOUND")
              .map((icp: any) => ({
                industry: icp.industry,
                companySize: icp.company_size || "",
                buyerPersona: icp.buyer_persona || "",
                commonPains: icp.common_pains || "",
              }));

            if (validICPs.length > 0) {
              await prisma.userProfile.update({
                where: { userId },
                data: { icpDefinitions: validICPs },
              });
            }
          }

          return {
            success: true,
            company_name,
            pages_scraped: pagesScraped,
            used_real_content: hasRealContent,
            fields_filled: Object.keys(updateData).length,
            case_studies_found: research.case_studies?.filter((cs: any) => cs.customer_name !== "NOT_FOUND").length || 0,
            icp_definitions_found: research.icp_definitions?.filter((icp: any) => icp.industry !== "NOT_FOUND").length || 0,
            confidence: research.confidence_score || 0,
            confidence_notes: research.confidence_notes || "",
            research_summary: {
              product: research.company_product,
              description: research.company_description,
              target_market: research.company_target_market,
              competitors: research.company_competitors,
              differentiators: research.company_differentiators,
              value_proposition: research.value_proposition,
              gtm_strategy: research.gtm_strategy,
              messaging_themes: research.messaging_themes,
              key_customers: research.key_customers,
              funding_stage: research.funding_stage,
              employee_count_range: research.employee_count_range,
            },
          };
        } catch (err: any) {
          console.error(`[ONBOARDING] Company research failed:`, err.message);
          return { success: false, error: err.message };
        }
      },
    }),

    parse_resume: tool({
      description:
        "GOLDMINE: Parse a pasted resume and extract structured career data. Resumes contain career arc, deal sizes, accomplishments, skills, companies, and writing patterns — all in one document. Call this when a user pastes their resume. Extracts and auto-fills: career narrative, key strengths, deal stories (from accomplishments), seller archetype, LinkedIn-equivalent experience, and target role types. Stores the raw resume text for downstream use by blitz tools.",
      parameters: z.object({
        resume_text: z.string().describe("The full text of the user's resume"),
      }),
      execute: async ({ resume_text }) => {
        console.log(`[ONBOARDING_TOOL] parse_resume CALLED | userId=${userId} | textLength=${resume_text.length}`);

        try {
          // Store raw resume text
          await prisma.userProfile.upsert({
            where: { userId },
            create: { userId, resumeText: resume_text },
            update: { resumeText: resume_text },
          });

          // Use AI to extract structured data from the resume
          const extractionPrompt = `You are analyzing a sales professional's resume to extract structured data for a sales enablement platform. Extract the following from this resume. Be specific and use actual numbers, company names, and achievements from the resume.

RESUME:
${resume_text.slice(0, 15000)}

Return a JSON object with these fields:

{
  "career_narrative": "2-3 sentence career arc summary. Focus on progression, scale, and pattern (e.g., 'Enterprise seller with 10+ years scaling from SMB to F500. Consistent quota over-attainment across 3 companies.').",
  "seller_archetype": "One of: hunter, farmer, hunter_farmer, consultative, challenger, relationship_builder. Based on their career pattern.",
  "key_strengths": ["strength1", "strength2", "strength3"],
  "years_experience": 0,
  "current_or_last_company": "Company name",
  "current_or_last_role": "Title",
  "target_role_types": ["enterprise_ae", "strategic_ae", etc.],
  "linkedin_experience_equivalent": "Formatted experience section reconstructed from resume data. Each role on its own line: Company, Title (dates): key accomplishments.",
  "deal_stories_raw": [
    {
      "company_or_account": "Account name or description from an accomplishment",
      "what_happened": "The accomplishment described in the resume",
      "metrics": "Any numbers: revenue, deal size, growth %, quota attainment",
      "could_be_deal_story": true
    }
  ],
  "education": "Degree, school, year if listed",
  "skills_and_tools": ["CRM tools", "methodologies", "certifications mentioned"],
  "writing_patterns": "Any observations about how they write: formal vs casual, action-verb heavy, metrics-focused, etc."
}

Extract ONLY what's actually in the resume. Don't invent or embellish.`;

          const result = await generateText({
            model: anthropic("claude-sonnet-4-5-20250929"),
            prompt: extractionPrompt,
            maxTokens: 3000,
          });

          let parsed: any = {};
          try {
            const jsonMatch = result.text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              parsed = JSON.parse(jsonMatch[0]);
            }
          } catch {
            console.error("[ONBOARDING] Failed to parse resume extraction");
            return { success: false, error: "Resume stored but extraction failed. Try again." };
          }

          // Auto-fill profile fields from resume data
          const updateData: any = {};
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
              where: { userId },
              data: updateData,
            });
          }

          // Also store as a KnowledgeDocument for the worker pipeline
          const existingDoc = await prisma.knowledgeDocument.findFirst({
            where: { userId, title: "Resume", category: "custom" },
          });

          let resumeDocId: string;
          if (existingDoc) {
            await prisma.knowledgeDocument.update({
              where: { id: existingDoc.id },
              data: { content: resume_text.slice(0, 50000), embeddingUpdatedAt: null },
            });
            resumeDocId = existingDoc.id;
          } else {
            const newDoc = await prisma.knowledgeDocument.create({
              data: {
                userId,
                title: "Resume",
                content: resume_text.slice(0, 50000),
                category: "custom",
              },
            });
            resumeDocId = newDoc.id;
          }
          triggerEmbed({ type: "kb_doc", id: resumeDocId }).catch(() => {});

          return {
            success: true,
            fields_filled: Object.keys(updateData).length,
            career_narrative: parsed.career_narrative,
            seller_archetype: parsed.seller_archetype,
            key_strengths: parsed.key_strengths,
            years_experience: parsed.years_experience,
            current_company: parsed.current_or_last_company,
            current_role: parsed.current_or_last_role,
            deal_stories_found: parsed.deal_stories_raw?.length || 0,
            deal_stories_raw: parsed.deal_stories_raw,
            skills: parsed.skills_and_tools,
            writing_patterns: parsed.writing_patterns,
          };
        } catch (err: any) {
          console.error(`[ONBOARDING] Resume parse failed:`, err.message);
          return { success: false, error: err.message };
        }
      },
    }),

    mark_onboarding_complete: tool({
      description:
        "Mark onboarding as complete. Call this when Layer 1 essentials are captured and the user is ready to run their first blitz.",
      parameters: z.object({}),
      execute: async () => {
        console.log(`[ONBOARDING_TOOL] mark_onboarding_complete CALLED | userId=${userId}`);
        try {
          await prisma.userProfile.update({
            where: { userId },
            data: { onboardingCompleted: true },
          });
          return { success: true, message: "Onboarding marked as complete." };
        } catch (err: any) {
          console.error(`[ONBOARDING] Failed to mark complete:`, err.message);
          return { success: false, error: err.message };
        }
      },
    }),
  };
}
