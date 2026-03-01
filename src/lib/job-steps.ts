// ── Job Step Definitions per Tool ────────────────────────────────────
// Each tool has a defined execution pipeline with steps the customer sees in real-time.
// Steps run sequentially. The execution engine (Phase 2) will process each step
// and update the RunRequest record as it progresses.

import { ToolName } from "./tools";

export interface JobStep {
  id: string;
  label: string;         // Customer-facing label
  description: string;   // Longer description shown on detail page
  status: "pending" | "in_progress" | "completed" | "failed";
  startedAt?: string;    // ISO timestamp
  completedAt?: string;  // ISO timestamp
  error?: string;        // Error message if step failed
}

export interface Asset {
  id: string;
  label: string;
  format: "pdf" | "pptx" | "url" | "html" | "png";
  url?: string;          // Download URL or deployed app URL
  size?: number;         // File size in bytes
  category: "research" | "deliverable" | "interactive";
}

// Step templates per tool — these get cloned when a new RunRequest is created
const STEP_TEMPLATES: Record<ToolName, Omit<JobStep, "status" | "startedAt" | "completedAt">[]> = {
  interview_prep: [
    { id: "competitive_research", label: "Researching competitive landscape", description: "Identifying competitors, positioning, pricing models, and market gaps for the target company." },
    { id: "market_intel", label: "Analyzing market intelligence", description: "Industry trends, emerging threats, capital flows, and what the smartest players are doing differently." },
    { id: "company_deep_dive", label: "Deep diving target company", description: "Financials, strategic priorities, org structure, recent news, and pain points." },
    { id: "generating_brief", label: "Building Research Brief", description: "Compiling MEDDPICC mapping, story bank, call sheet, 30/60/90 plan, and competitive positioning into one comprehensive document." },
    { id: "generating_pov_deck", label: "Generating POV Deck", description: "Building your 5-slide business case deck." },
    { id: "generating_handwritten", label: "Creating handwritten cards", description: "Generating 3 Gemini handwritten reference cards: POV card, 1-image call sheet, 2-image call sheet." },
    { id: "building_landscape_app", label: "Building interactive landscape", description: "Creating your interactive competitive landscape visualization." },
    { id: "delivery", label: "Delivering to your inbox", description: "Sending your complete prep package via email. Expect a polished presentation deck within 24 hours." },
  ],
  prospect_prep: [
    { id: "competitive_research", label: "Researching prospect's competitive landscape", description: "Identifying your prospect's competitors, their positioning, and where they're under pressure." },
    { id: "market_intel", label: "Analyzing prospect's industry", description: "Market trends, threats, and opportunities affecting your prospect's business." },
    { id: "company_deep_dive", label: "Deep diving target account", description: "Account financials, org chart, decision-makers, tech stack, and recent moves." },
    { id: "generating_brief", label: "Building Research Brief", description: "Compiling account deep dive, discovery call plan, talk tracks, competitive positioning, and story selection into one comprehensive document." },
    { id: "generating_pov_deck", label: "Generating POV Deck", description: "Building your 5-slide business case deck." },
    { id: "generating_handwritten", label: "Creating handwritten cards", description: "Generating 3 Gemini handwritten reference cards: POV card, 1-image call sheet, 2-image call sheet." },
    { id: "building_landscape_app", label: "Building interactive landscape", description: "Creating your prospect's interactive competitive landscape visualization." },
    { id: "delivery", label: "Delivering to your inbox", description: "Sending your complete prep package via email. Expect a polished presentation deck within 24 hours." },
  ],
  deal_audit: [
    { id: "competitive_research", label: "Mapping competitive alternatives", description: "Analyzing every alternative being evaluated in this deal, including do-nothing." },
    { id: "market_intel", label: "Assessing market urgency signals", description: "Market forces affecting the prospect's urgency and compelling event strength." },
    { id: "company_deep_dive", label: "Deep diving deal context", description: "Prospect's financial health, budget cycles, stakeholder dynamics, and decision process." },
    { id: "generating_brief", label: "Building Deal Audit Report", description: "Compiling MEDDPICC scorecard, risk assessment, strategy brief, discovery questions, and deal health summary into one comprehensive document." },
    { id: "generating_handwritten", label: "Creating handwritten cards", description: "Generating 3 Gemini handwritten reference cards: deal health card, 1-image call sheet, 2-image call sheet." },
    { id: "delivery", label: "Delivering to your inbox", description: "Sending your complete audit package via email." },
  ],
  interview_outreach: [
    { id: "competitive_research", label: "Researching target company landscape", description: "Quick competitive context for the target company to inform outreach personalization." },
    { id: "company_deep_dive", label: "Deep diving target company", description: "Company news, growth signals, hiring patterns, and personalization hooks." },
    { id: "generating_brief", label: "Building Research Brief", description: "Compiling company intel, role analysis, positioning brief, story mapping, and outreach sequence into one comprehensive document." },
    { id: "generating_resume", label: "Building ATS Resume", description: "Generating an ATS-optimized resume tailored to the target role and company." },
    { id: "generating_pov_deck", label: "Generating POV Deck", description: "Building your 5-slide business case deck." },
    { id: "generating_handwritten", label: "Creating handwritten cards", description: "Generating 3 Gemini handwritten reference cards: POV card, 1-image call sheet, 2-image call sheet." },
    { id: "building_landscape_app", label: "Building interactive landscape", description: "Creating your interactive competitive landscape visualization." },
    { id: "delivery", label: "Delivering to your inbox", description: "Sending your complete outreach package via email. Expect a polished presentation deck within 24 hours." },
  ],
  prospect_outreach: [
    { id: "competitive_research", label: "Researching prospect's competitive pressures", description: "Quick competitive analysis to identify pain-point hooks for outreach personalization." },
    { id: "company_deep_dive", label: "Deep diving target account", description: "Recent news, hiring signals, tech stack, trigger events for personalization." },
    { id: "generating_brief", label: "Building Research Brief", description: "Compiling account intel, prospect profile, pain mapping, story selection, and outreach sequence into one comprehensive document." },
    { id: "generating_pov_deck", label: "Generating POV Deck", description: "Building your 5-slide business case deck." },
    { id: "generating_handwritten", label: "Creating handwritten cards", description: "Generating 3 Gemini handwritten reference cards: POV card, 1-image call sheet, 2-image call sheet." },
    { id: "building_landscape_app", label: "Building interactive landscape", description: "Creating your prospect's competitive landscape visualization." },
    { id: "delivery", label: "Delivering to your inbox", description: "Sending your complete outreach package via email. Expect a polished presentation deck within 24 hours." },
  ],
  champion_builder: [
    { id: "competitive_research", label: "Analyzing competitive positioning", description: "How the champion needs to position you vs. alternatives internally." },
    { id: "company_deep_dive", label: "Mapping internal dynamics", description: "Org politics, decision process, stakeholder influence, and internal objections." },
    { id: "generating_brief", label: "Building Champion Strategy Brief", description: "Compiling champion profile, stakeholder map, development plan, internal selling kit, and coaching notes into one comprehensive document." },
    { id: "generating_handwritten", label: "Creating handwritten cards", description: "Generating 3 Gemini handwritten reference cards: champion POV card, 1-image call sheet, 2-image call sheet." },
    { id: "building_landscape_app", label: "Building competitive landscape", description: "Creating the account's competitive landscape visualization." },
    { id: "delivery", label: "Delivering to your inbox", description: "Sending your complete champion toolkit via email." },
  ],
};

/**
 * Initialize steps for a new RunRequest.
 * Returns a fresh array of steps with all statuses set to "pending".
 */
export function initializeSteps(toolName: ToolName): JobStep[] {
  const template = STEP_TEMPLATES[toolName];
  if (!template) return [];

  return template.map((step) => ({
    ...step,
    status: "pending" as const,
  }));
}

/**
 * Get the total number of steps for a tool.
 */
export function getStepCount(toolName: ToolName): number {
  return STEP_TEMPLATES[toolName]?.length || 0;
}

/**
 * Get the asset manifest template for a tool.
 * Used by the execution engine to know what to generate.
 */
export function getExpectedAssets(toolName: ToolName): Omit<Asset, "url" | "size">[] {
  const ASSET_TEMPLATES: Record<ToolName, Omit<Asset, "url" | "size">[]> = {
    interview_prep: [
      { id: "research_brief", label: "Research Brief", format: "pdf", category: "research" },
      { id: "pov_deck", label: "POV Deck (5 slides)", format: "pdf", category: "deliverable" },
      { id: "handwritten_pov", label: "Handwritten POV Card", format: "png", category: "deliverable" },
      { id: "handwritten_callsheet_1", label: "Handwritten Call Sheet (1-image)", format: "png", category: "deliverable" },
      { id: "handwritten_callsheet_2", label: "Handwritten Call Sheet (2-image A)", format: "png", category: "deliverable" },
      { id: "handwritten_callsheet_2b", label: "Handwritten Call Sheet (2-image B)", format: "png", category: "deliverable" },
      { id: "call_prep_sheet", label: "Call Prep Cheat Sheet", format: "pdf", category: "deliverable" },
      { id: "competitive_landscape_app", label: "Interactive Competitive Landscape", format: "html", category: "interactive" },
    ],
    prospect_prep: [
      { id: "research_brief", label: "Research Brief", format: "pdf", category: "research" },
      { id: "pov_deck", label: "POV Deck (5 slides)", format: "pdf", category: "deliverable" },
      { id: "handwritten_pov", label: "Handwritten POV Card", format: "png", category: "deliverable" },
      { id: "handwritten_callsheet_1", label: "Handwritten Call Sheet (1-image)", format: "png", category: "deliverable" },
      { id: "handwritten_callsheet_2", label: "Handwritten Call Sheet (2-image A)", format: "png", category: "deliverable" },
      { id: "handwritten_callsheet_2b", label: "Handwritten Call Sheet (2-image B)", format: "png", category: "deliverable" },
      { id: "call_prep_sheet", label: "Call Prep Cheat Sheet", format: "pdf", category: "deliverable" },
      { id: "competitive_landscape_app", label: "Interactive Competitive Landscape", format: "html", category: "interactive" },
    ],
    deal_audit: [
      { id: "audit_report", label: "Deal Audit Report", format: "pdf", category: "research" },
      { id: "handwritten_health", label: "Handwritten Deal Health Card", format: "png", category: "deliverable" },
      { id: "handwritten_callsheet_1", label: "Handwritten Call Sheet (1-image)", format: "png", category: "deliverable" },
      { id: "handwritten_callsheet_2", label: "Handwritten Call Sheet (2-image A)", format: "png", category: "deliverable" },
      { id: "handwritten_callsheet_2b", label: "Handwritten Call Sheet (2-image B)", format: "png", category: "deliverable" },
    ],
    interview_outreach: [
      { id: "research_brief", label: "Research Brief", format: "pdf", category: "research" },
      { id: "ats_resume", label: "ATS-Optimized Resume", format: "pdf", category: "deliverable" },
      { id: "pov_deck", label: "POV Deck (5 slides)", format: "pdf", category: "deliverable" },
      { id: "handwritten_pov", label: "Handwritten POV Card", format: "png", category: "deliverable" },
      { id: "handwritten_callsheet_1", label: "Handwritten Call Sheet (1-image)", format: "png", category: "deliverable" },
      { id: "handwritten_callsheet_2", label: "Handwritten Call Sheet (2-image A)", format: "png", category: "deliverable" },
      { id: "handwritten_callsheet_2b", label: "Handwritten Call Sheet (2-image B)", format: "png", category: "deliverable" },
      { id: "call_prep_sheet", label: "Call Prep Cheat Sheet", format: "pdf", category: "deliverable" },
      { id: "competitive_landscape_app", label: "Interactive Competitive Landscape", format: "html", category: "interactive" },
    ],
    prospect_outreach: [
      { id: "research_brief", label: "Research Brief", format: "pdf", category: "research" },
      { id: "pov_deck", label: "POV Deck (5 slides)", format: "pdf", category: "deliverable" },
      { id: "handwritten_pov", label: "Handwritten POV Card", format: "png", category: "deliverable" },
      { id: "handwritten_callsheet_1", label: "Handwritten Call Sheet (1-image)", format: "png", category: "deliverable" },
      { id: "handwritten_callsheet_2", label: "Handwritten Call Sheet (2-image A)", format: "png", category: "deliverable" },
      { id: "handwritten_callsheet_2b", label: "Handwritten Call Sheet (2-image B)", format: "png", category: "deliverable" },
      { id: "call_prep_sheet", label: "Call Prep Cheat Sheet", format: "pdf", category: "deliverable" },
      { id: "competitive_landscape_app", label: "Interactive Competitive Landscape", format: "html", category: "interactive" },
    ],
    champion_builder: [
      { id: "strategy_brief", label: "Champion Strategy Brief", format: "pdf", category: "research" },
      { id: "handwritten_pov", label: "Handwritten Champion POV Card", format: "png", category: "deliverable" },
      { id: "handwritten_callsheet_1", label: "Handwritten Call Sheet (1-image)", format: "png", category: "deliverable" },
      { id: "handwritten_callsheet_2", label: "Handwritten Call Sheet (2-image A)", format: "png", category: "deliverable" },
      { id: "handwritten_callsheet_2b", label: "Handwritten Call Sheet (2-image B)", format: "png", category: "deliverable" },
      { id: "competitive_landscape_app", label: "Interactive Competitive Landscape", format: "html", category: "interactive" },
    ],
  };

  return ASSET_TEMPLATES[toolName] || [];
}
