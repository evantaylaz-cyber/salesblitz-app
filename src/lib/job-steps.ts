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
    { id: "generating_brief", label: "Building Research Brief", description: "Compiling qualification mapping, story bank, call sheet, 30/60/90 plan, and competitive positioning into a single research brief." },
    { id: "generating_pov_deck", label: "Generating POV Deck", description: "Building your 5-slide business case deck." },
    { id: "generating_handwritten", label: "Creating handwritten cards", description: "Generating handwritten notebook card with Side A and Side B reference." },
    { id: "generating_call_docs", label: "Generating call prep docs", description: "Building call playbook and arsenal tailored to your interview type." },
    { id: "building_competitive_playbook", label: "Building competitive playbook", description: "Creating interactive competitive playbook with value-based positioning cards and talk tracks." },
    { id: "generating_gamma_deck", label: "Generating presentation deck", description: "Creating a polished Gamma presentation with a value-driven narrative arc." },
    { id: "delivery", label: "Delivering to your inbox", description: "Sending your complete prep package via email." },
  ],
  prospect_prep: [
    { id: "competitive_research", label: "Researching prospect's competitive landscape", description: "Identifying your prospect's competitors, their positioning, and where they're under pressure." },
    { id: "market_intel", label: "Analyzing prospect's industry", description: "Market trends, threats, and opportunities affecting your prospect's business." },
    { id: "company_deep_dive", label: "Deep diving target account", description: "Account financials, org chart, decision-makers, tech stack, and recent moves." },
    { id: "generating_brief", label: "Building Research Brief", description: "Compiling account deep dive, discovery call plan, talk tracks, competitive positioning, and story selection into a single research brief." },
    { id: "generating_pov_deck", label: "Generating POV Deck", description: "Building your 5-slide business case deck." },
    { id: "generating_handwritten", label: "Creating handwritten cards", description: "Generating handwritten notebook card with Side A and Side B reference." },
    { id: "generating_call_docs", label: "Generating call prep docs", description: "Building call playbook and arsenal tailored to your meeting stage." },
    { id: "building_competitive_playbook", label: "Building competitive playbook", description: "Creating interactive competitive playbook with value-based positioning cards and talk tracks." },
    { id: "building_stakeholder_map", label: "Building stakeholder map", description: "Creating interactive stakeholder map with deal qualification roles and action items." },
    { id: "generating_gamma_deck", label: "Generating presentation deck", description: "Creating a polished Gamma presentation with a value-driven narrative arc." },
    { id: "delivery", label: "Delivering to your inbox", description: "Sending your complete prep package via email." },
  ],
  deal_audit: [
    { id: "competitive_research", label: "Mapping competitive alternatives", description: "Analyzing every alternative being evaluated in this deal, including do-nothing." },
    { id: "market_intel", label: "Assessing market urgency signals", description: "Market forces affecting the prospect's urgency and compelling event strength." },
    { id: "company_deep_dive", label: "Deep diving deal context", description: "Prospect's financial health, budget cycles, stakeholder dynamics, and decision process." },
    { id: "generating_brief", label: "Building Deal Audit Report", description: "Compiling qualification scorecard, risk assessment, strategy brief, discovery questions, and deal health summary into a single audit report." },
    { id: "generating_handwritten", label: "Creating handwritten cards", description: "Generating handwritten notebook card with deal health scorecard." },
    { id: "building_stakeholder_map", label: "Building stakeholder map", description: "Creating interactive stakeholder map with deal qualification roles and action items." },
    { id: "delivery", label: "Delivering to your inbox", description: "Sending your complete audit package via email." },
  ],
  interview_outreach: [
    { id: "competitive_research", label: "Researching target company landscape", description: "Quick competitive context for the target company to inform outreach personalization." },
    { id: "company_deep_dive", label: "Deep diving target company", description: "Company news, growth signals, hiring patterns, and personalization hooks." },
    { id: "generating_brief", label: "Building Research Brief", description: "Compiling company intel, role analysis, positioning brief, story mapping, and outreach sequence into a single research brief." },
    { id: "generating_resume", label: "Building ATS Resume", description: "Generating an ATS-optimized resume tailored to the target role and company." },
    { id: "generating_pov_deck", label: "Generating POV Deck", description: "Building your 5-slide business case deck." },
    { id: "generating_handwritten", label: "Creating handwritten cards", description: "Generating handwritten notebook card with Side A and Side B reference." },
    { id: "building_competitive_playbook", label: "Building competitive playbook", description: "Creating interactive competitive playbook with value-based positioning cards and talk tracks." },
    { id: "generating_gamma_deck", label: "Generating presentation deck", description: "Creating a polished Gamma presentation with a value-driven narrative arc." },
    { id: "delivery", label: "Delivering to your inbox", description: "Sending your complete outreach package via email." },
  ],
  prospect_outreach: [
    { id: "competitive_research", label: "Researching prospect's competitive pressures", description: "Quick competitive analysis to identify pain-point hooks for outreach personalization." },
    { id: "company_deep_dive", label: "Deep diving target account", description: "Recent news, hiring signals, tech stack, trigger events for personalization." },
    { id: "generating_brief", label: "Building Research Brief", description: "Compiling account intel, prospect profile, pain mapping, story selection, and outreach sequence into a single research brief." },
    { id: "generating_pov_deck", label: "Generating POV Deck", description: "Building your 5-slide business case deck." },
    { id: "generating_handwritten", label: "Creating handwritten cards", description: "Generating handwritten notebook card with Side A and Side B reference." },
    { id: "building_competitive_playbook", label: "Building competitive playbook", description: "Creating interactive competitive playbook with value-based positioning cards and talk tracks." },
    { id: "generating_gamma_deck", label: "Generating presentation deck", description: "Creating a polished Gamma presentation with a value-driven narrative arc." },
    { id: "delivery", label: "Delivering to your inbox", description: "Sending your complete outreach package via email." },
  ],
  champion_builder: [
    { id: "competitive_research", label: "Analyzing competitive positioning", description: "How the champion needs to position you vs. alternatives internally." },
    { id: "company_deep_dive", label: "Mapping internal dynamics", description: "Org politics, decision process, stakeholder influence, and internal objections." },
    { id: "generating_brief", label: "Building Champion Strategy Brief", description: "Compiling champion profile, stakeholder map, development plan, internal selling kit, and coaching notes into a single strategy brief." },
    { id: "generating_handwritten", label: "Creating handwritten cards", description: "Generating handwritten notebook card with champion coaching reference." },
    { id: "building_competitive_playbook", label: "Building competitive playbook", description: "Creating interactive competitive playbook with value-based positioning cards and talk tracks." },
    { id: "building_stakeholder_map", label: "Building stakeholder map", description: "Creating interactive stakeholder map with deal qualification roles and action items." },
    { id: "delivery", label: "Delivering to your inbox", description: "Sending your complete champion toolkit via email." },
  ],
  practice_mode: [
    { id: "generating_persona", label: "Building AI persona", description: "Generating a realistic persona from your research and meeting context." },
    { id: "initializing_avatar", label: "Initializing video avatar", description: "Starting the HeyGen Streaming Avatar session with your persona." },
    { id: "live_session", label: "Live practice session", description: "Real-time roleplay conversation with your AI persona." },
    { id: "generating_scorecard", label: "Scoring your session", description: "Analyzing your conversation against our value selling framework and generating actionable feedback." },
  ],
  territory_blitz: [
    { id: "parsing_targets", label: "Parsing target list", description: "Reading and validating your uploaded target accounts." },
    { id: "batch_research", label: "Researching accounts", description: "Running deep research across all target accounts in parallel." },
    { id: "generating_outputs", label: "Generating deliverables", description: "Building research briefs, outreach sequences, and prep materials per account." },
    { id: "compiling_territory", label: "Compiling territory package", description: "Assembling the full territory map with prioritization and account summaries." },
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
      { id: "notebook_card", label: "Handwritten Notebook Card", format: "png", category: "deliverable" },
      { id: "call_prep_sheet", label: "Call Prep Sheet", format: "pdf", category: "deliverable" },
      { id: "callDoc_callPlaybook", label: "Call Playbook", format: "pdf", category: "deliverable" },
      { id: "callDoc_arsenal", label: "Arsenal", format: "pdf", category: "deliverable" },
      { id: "callDoc_liveScenario", label: "Live Scenario (mock pitch)", format: "pdf", category: "deliverable" },
      { id: "callDoc_qaDoc", label: "Q&A Doc (mock pitch)", format: "pdf", category: "deliverable" },
      { id: "competitive_playbook", label: "Competitive Playbook", format: "html", category: "interactive" },
      { id: "gamma_deck", label: "Presentation Deck (Gamma)", format: "url", category: "deliverable" },
      { id: "assignment_framework", label: "Assignment Framework", format: "pdf", category: "deliverable" },
    ],
    prospect_prep: [
      { id: "research_brief", label: "Research Brief", format: "pdf", category: "research" },
      { id: "pov_deck", label: "POV Deck (5 slides)", format: "pdf", category: "deliverable" },
      { id: "notebook_card", label: "Handwritten Notebook Card", format: "png", category: "deliverable" },
      { id: "call_prep_sheet", label: "Call Prep Sheet", format: "pdf", category: "deliverable" },
      { id: "callDoc_callPlaybook", label: "Call Playbook", format: "pdf", category: "deliverable" },
      { id: "callDoc_arsenal", label: "Arsenal", format: "pdf", category: "deliverable" },
      { id: "competitive_playbook", label: "Competitive Playbook", format: "html", category: "interactive" },
      { id: "stakeholder_map", label: "Stakeholder Map", format: "html", category: "interactive" },
      { id: "gamma_deck", label: "Presentation Deck (Gamma)", format: "url", category: "deliverable" },
    ],
    deal_audit: [
      { id: "research_brief", label: "Deal Audit Report", format: "pdf", category: "research" },
      { id: "notebook_card", label: "Handwritten Notebook Card", format: "png", category: "deliverable" },
      { id: "call_prep_sheet", label: "Call Prep Sheet", format: "pdf", category: "deliverable" },
      { id: "stakeholder_map", label: "Stakeholder Map", format: "html", category: "interactive" },
    ],
    interview_outreach: [
      { id: "research_brief", label: "Research Brief", format: "pdf", category: "research" },
      { id: "ats_resume", label: "ATS-Optimized Resume", format: "pdf", category: "deliverable" },
      { id: "pov_deck", label: "POV Deck (5 slides)", format: "pdf", category: "deliverable" },
      { id: "notebook_card", label: "Handwritten Notebook Card", format: "png", category: "deliverable" },
      { id: "call_prep_sheet", label: "Call Prep Sheet", format: "pdf", category: "deliverable" },
      { id: "outreach_sequence", label: "Outreach Sequence", format: "html", category: "interactive" },
      { id: "competitive_playbook", label: "Competitive Playbook", format: "html", category: "interactive" },
      { id: "gamma_deck", label: "Presentation Deck (Gamma)", format: "url", category: "deliverable" },
      { id: "assignment_framework", label: "Assignment Framework", format: "pdf", category: "deliverable" },
    ],
    prospect_outreach: [
      { id: "research_brief", label: "Research Brief", format: "pdf", category: "research" },
      { id: "pov_deck", label: "POV Deck (5 slides)", format: "pdf", category: "deliverable" },
      { id: "notebook_card", label: "Handwritten Notebook Card", format: "png", category: "deliverable" },
      { id: "call_prep_sheet", label: "Call Prep Sheet", format: "pdf", category: "deliverable" },
      { id: "outreach_sequence", label: "Outreach Sequence", format: "html", category: "interactive" },
      { id: "competitive_playbook", label: "Competitive Playbook", format: "html", category: "interactive" },
      { id: "gamma_deck", label: "Presentation Deck (Gamma)", format: "url", category: "deliverable" },
    ],
    champion_builder: [
      { id: "research_brief", label: "Champion Strategy Brief", format: "pdf", category: "research" },
      { id: "notebook_card", label: "Handwritten Notebook Card", format: "png", category: "deliverable" },
      { id: "call_prep_sheet", label: "Call Prep Sheet", format: "pdf", category: "deliverable" },
      { id: "competitive_playbook", label: "Competitive Playbook", format: "html", category: "interactive" },
      { id: "stakeholder_map", label: "Stakeholder Map", format: "html", category: "interactive" },
    ],
    practice_mode: [
      { id: "session_transcript", label: "Session Transcript", format: "pdf", category: "research" },
      { id: "messaging_scorecard", label: "Sales Scorecard", format: "pdf", category: "deliverable" },
    ],
    territory_blitz: [
      { id: "territory_report", label: "Territory Report", format: "pdf", category: "research" },
      { id: "account_briefs", label: "Account Briefs", format: "pdf", category: "deliverable" },
    ],
  };

  return ASSET_TEMPLATES[toolName] || [];
}
