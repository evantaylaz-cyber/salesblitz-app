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
  format: "pdf" | "pptx" | "url" | "html" | "png" | "md";
  url?: string;          // Download URL or deployed app URL
  size?: number;         // File size in bytes
  category: "research" | "deliverable" | "interactive" | "context" | "notes" | "outreach";
}

// Step templates per tool — these get cloned when a new RunRequest is created
// Research steps stay the same (that's where the value lives).
// Asset generation steps updated per Deliverable Philosophy Spec v1.0.
const STEP_TEMPLATES: Record<ToolName, Omit<JobStep, "status" | "startedAt" | "completedAt">[]> = {
  interview_prep: [
    { id: "competitive_research", label: "Researching competitive landscape", description: "Identifying competitors, positioning, pricing models, and market gaps for the target company." },
    { id: "market_intel", label: "Analyzing market intelligence", description: "Industry trends, emerging threats, capital flows, and what the smartest players are doing differently." },
    { id: "company_deep_dive", label: "Deep diving target company", description: "Financials, strategic priorities, org structure, recent news, and pain points." },
    { id: "generating_context_file", label: "Building Context File", description: "Compiling company deep dive, role analysis, interviewer profiles, competitive positioning, and story bank into your context file." },
    { id: "generating_notes", label: "Building Speaker Notes", description: "Creating dynamic prep notes tailored to your interview format, camera setting, and interviewer lineup." },
    { id: "generating_pov_deck", label: "Generating POV Deck", description: "Building your 5-slide narrative deck, ready for Google Slides Beautify." },
    { id: "delivery", label: "Delivering your prep", description: "Assembling your complete prep package." },
  ],
  prospect_prep: [
    { id: "competitive_research", label: "Researching prospect's competitive landscape", description: "Identifying your prospect's competitors, their positioning, and where they're under pressure." },
    { id: "market_intel", label: "Analyzing prospect's industry", description: "Market trends, threats, and opportunities affecting your prospect's business." },
    { id: "company_deep_dive", label: "Deep diving target account", description: "Account financials, org chart, decision-makers, tech stack, and recent moves." },
    { id: "generating_context_file", label: "Building Context File", description: "Compiling account deep dive, discovery plan, competitive positioning, stakeholder map, and pain hypotheses." },
    { id: "generating_notes", label: "Building Speaker Notes", description: "Creating dynamic prep notes tailored to your meeting type. Stay present, ask deeper questions." },
    { id: "generating_pov_deck", label: "Generating POV Deck", description: "Building your 5-slide business case deck, ready for Google Slides Beautify." },
    { id: "delivery", label: "Delivering your prep", description: "Assembling your complete prep package." },
  ],
  deal_playbook: [
    { id: "competitive_research", label: "Mapping competitive alternatives", description: "Analyzing every alternative being evaluated in this deal, including do-nothing and status quo." },
    { id: "market_intel", label: "Assessing urgency signals", description: "Market forces, trigger events, and forcing functions affecting deal velocity." },
    { id: "company_deep_dive", label: "Deep diving deal context", description: "Prospect financials, org structure, stakeholder dynamics, decision process, and budget cycles." },
    { id: "deal_qualification", label: "Running deal qualification", description: "Scoring all 8 qualification elements, identifying gaps, and assessing risk." },
    { id: "champion_analysis", label: "Analyzing champion & stakeholders", description: "Champion profile, attribute assessment, stakeholder map, and multi-threading plays." },
    { id: "generating_context_file", label: "Building Deal Playbook", description: "Combining qualification audit, champion strategy, and velocity plays into one playbook." },
    { id: "generating_notes", label: "Building Speaker Notes", description: "Creating dynamic notes for champion coaching and manager deal review." },
    { id: "delivery", label: "Delivering your playbook", description: "Assembling your complete deal playbook." },
  ],
  deal_audit: [
    { id: "competitive_research", label: "Mapping competitive alternatives", description: "Analyzing every alternative being evaluated in this deal, including do-nothing." },
    { id: "market_intel", label: "Assessing market urgency signals", description: "Market forces affecting the prospect's urgency and compelling event strength." },
    { id: "company_deep_dive", label: "Deep diving deal context", description: "Prospect's financial health, budget cycles, stakeholder dynamics, and decision process." },
    { id: "generating_context_file", label: "Building Deal Audit", description: "Compiling qualification scorecard, gap analysis, risk assessment, and recommended actions." },
    { id: "generating_notes", label: "Building Speaker Notes", description: "Creating talking points for deal reviews and champion coaching sessions." },
    { id: "delivery", label: "Delivering your audit", description: "Assembling your complete audit package." },
  ],
  interview_outreach: [
    { id: "competitive_research", label: "Researching target company landscape", description: "Quick competitive context for the target company to inform outreach personalization." },
    { id: "company_deep_dive", label: "Deep diving target company", description: "Company news, growth signals, hiring patterns, mutual connections, and personalization hooks." },
    { id: "generating_context_file", label: "Building Context File", description: "Compiling company intel, role analysis, interviewer profiles, and market context." },
    { id: "generating_outreach", label: "Building Outreach Sequences", description: "Crafting mutual connection emails, LinkedIn messages, and follow-up cadence. Short, casual, easy yes." },
    { id: "generating_pov_deck", label: "Generating POV Deck", description: "Building your 5-slide why-you deck, ready for Google Slides Beautify." },
    { id: "delivery", label: "Delivering your outreach package", description: "Assembling your complete outreach package." },
  ],
  prospect_outreach: [
    { id: "competitive_research", label: "Researching prospect's competitive pressures", description: "Quick competitive analysis to identify pain-point hooks for outreach personalization." },
    { id: "company_deep_dive", label: "Deep diving target account", description: "Recent news, hiring signals, tech stack, trigger events, and mutual connections." },
    { id: "generating_context_file", label: "Building Context File", description: "Compiling account intel, pain mapping, competitive landscape, and stakeholder map." },
    { id: "generating_outreach", label: "Building Outreach Sequences", description: "Crafting value-driven email sequence, LinkedIn touches, and call talking points. Copy-paste ready." },
    { id: "generating_pov_deck", label: "Generating POV Deck", description: "Building your 5-slide business case deck, ready for Google Slides Beautify." },
    { id: "delivery", label: "Delivering your outreach package", description: "Assembling your complete outreach package." },
  ],
  proposal_blitz: [
    { id: "competitive_research", label: "Analyzing competitive positioning", description: "Who you're up against in this deal, how you differentiate, and pricing positioning." },
    { id: "company_deep_dive", label: "Deep diving buyer context", description: "Account financials, org structure, decision process, budget context, and evaluation criteria." },
    { id: "roi_modeling", label: "Building ROI model", description: "Quantifying Before State pain, projecting savings and gains, calculating payback period." },
    { id: "proposal_strategy", label: "Developing proposal strategy", description: "Pricing rationale, packaging recommendation, negotiation boundaries, competitive positioning." },
    { id: "generating_context_file", label: "Building Proposal Brief", description: "Combining deal summary, buyer profile, ROI model, competitive positioning, and pricing rationale." },
    { id: "generating_notes", label: "Building Speaker Notes", description: "Creating talk track for proposal presentation, objection handling, and negotiation prep." },
    { id: "generating_pov_deck", label: "Generating Proposal Deck", description: "Building CFO-ready proposal deck with ROI breakdown, pricing, and implementation timeline." },
    { id: "delivery", label: "Delivering your proposal package", description: "Assembling your complete proposal package." },
  ],
  champion_builder: [
    { id: "competitive_research", label: "Analyzing competitive positioning", description: "How the champion needs to position you vs. alternatives internally." },
    { id: "company_deep_dive", label: "Mapping internal dynamics", description: "Org politics, decision process, stakeholder influence, and internal objections." },
    { id: "generating_context_file", label: "Building Champion Strategy", description: "Compiling champion profile, stakeholder map, development plan, internal selling kit, and coaching notes." },
    { id: "generating_notes", label: "Building Coaching Notes", description: "Creating champion coaching notes with key messages tailored to each stakeholder they need to influence." },
    { id: "delivery", label: "Delivering your champion toolkit", description: "Assembling your complete champion toolkit." },
  ],
  practice_mode: [
    { id: "generating_persona", label: "Building AI persona", description: "Generating a realistic persona from your research and meeting context." },
    { id: "initializing_avatar", label: "Initializing video avatar", description: "Starting the LiveAvatar session with your persona." },
    { id: "live_session", label: "Live practice session", description: "Real-time roleplay conversation with your AI persona." },
    { id: "generating_scorecard", label: "Scoring your session", description: "Analyzing your conversation against our value selling framework and generating actionable feedback." },
  ],
  territory_blitz: [
    { id: "parsing_targets", label: "Parsing target list", description: "Reading and validating your uploaded target accounts." },
    { id: "batch_research", label: "Researching accounts", description: "Running deep research across all target accounts in parallel." },
    { id: "generating_outputs", label: "Generating deliverables", description: "Building context files, outreach sequences, and POV decks per account." },
    { id: "compiling_territory", label: "Compiling territory scorecard", description: "Ranking accounts by priority, opportunity size, and engagement readiness." },
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
  // Asset templates updated per Deliverable Philosophy Spec v1.0
  // Categories: context (NotebookLM-ready), notes (on-screen), outreach (standalone), deliverable (POV deck)
  const ASSET_TEMPLATES: Record<ToolName, Omit<Asset, "url" | "size">[]> = {
    interview_prep: [
      { id: "context_file", label: "Context File", format: "md", category: "context" },
      { id: "onscreen_notes", label: "Speaker Notes", format: "md", category: "notes" },
      { id: "pov_deck", label: "POV Deck (5 slides)", format: "pptx", category: "deliverable" },
    ],
    prospect_prep: [
      { id: "context_file", label: "Context File", format: "md", category: "context" },
      { id: "onscreen_notes", label: "Speaker Notes", format: "md", category: "notes" },
      { id: "pov_deck", label: "POV Deck (5 slides)", format: "pptx", category: "deliverable" },
    ],
    deal_playbook: [
      { id: "context_file", label: "Deal Playbook", format: "md", category: "context" },
      { id: "onscreen_notes", label: "Speaker Notes", format: "md", category: "notes" },
    ],
    deal_audit: [
      { id: "context_file", label: "Deal Audit", format: "md", category: "context" },
      { id: "onscreen_notes", label: "Speaker Notes", format: "md", category: "notes" },
    ],
    interview_outreach: [
      { id: "context_file", label: "Context File", format: "md", category: "context" },
      { id: "outreach_sequences", label: "Outreach Sequences", format: "md", category: "outreach" },
      { id: "pov_deck", label: "POV Deck (5 slides)", format: "pptx", category: "deliverable" },
    ],
    prospect_outreach: [
      { id: "context_file", label: "Context File", format: "md", category: "context" },
      { id: "outreach_sequences", label: "Outreach Sequences", format: "md", category: "outreach" },
      { id: "pov_deck", label: "POV Deck (5 slides)", format: "pptx", category: "deliverable" },
    ],
    proposal_blitz: [
      { id: "context_file", label: "Proposal Brief", format: "md", category: "context" },
      { id: "onscreen_notes", label: "Speaker Notes", format: "md", category: "notes" },
      { id: "pov_deck", label: "Proposal Deck", format: "pptx", category: "deliverable" },
    ],
    champion_builder: [
      { id: "context_file", label: "Champion Strategy", format: "md", category: "context" },
      { id: "onscreen_notes", label: "Coaching Notes", format: "md", category: "notes" },
    ],
    practice_mode: [
      { id: "session_transcript", label: "Session Transcript", format: "pdf", category: "research" },
      { id: "messaging_scorecard", label: "Sales Scorecard", format: "pdf", category: "deliverable" },
    ],
    territory_blitz: [
      { id: "territory_scorecard", label: "Territory Scorecard", format: "md", category: "context" },
      { id: "account_context_files", label: "Account Context Files", format: "md", category: "context" },
      { id: "account_outreach", label: "Account Outreach Sequences", format: "md", category: "outreach" },
      { id: "account_pov_decks", label: "Account POV Decks", format: "pptx", category: "deliverable" },
    ],
  };

  return ASSET_TEMPLATES[toolName] || [];
}
