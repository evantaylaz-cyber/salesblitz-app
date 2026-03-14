// ── Tool Definitions & Access Gating ────────────────────────────────

export type ToolName =
  | "interview_outreach"
  | "prospect_outreach"
  | "interview_prep"
  | "prospect_prep"
  | "deal_playbook"
  | "proposal_blitz"
  | "practice_mode"
  | "territory_blitz"
  // Backward compat — old runs may reference these
  | "deal_audit"
  | "champion_builder";

export interface ToolDefinition {
  id: ToolName;
  name: string;
  description: string;
  deliverables: string[];
  minimumTier: "launch" | "pro" | "closer";
  overageRate: number; // per-run overage cost for display
  comingSoon?: boolean; // if true, show greyed out with "Coming Soon" overlay
}

export const TOOLS: ToolDefinition[] = [
  {
    id: "interview_outreach",
    name: "Interview Outreach",
    description: "Company research, interviewer intel, mutual connection outreach, POV deck. Get noticed by hiring managers.",
    deliverables: [
      "Context File (.md) — company intel, role analysis, interviewer profiles, market context",
      "Outreach Sequences — mutual connection emails, LinkedIn messages, follow-up cadence. Copy-paste ready.",
      "POV Deck (.pptx, 5 slides) — why you + why this company + why now. Google Slides Beautify-ready.",
    ],
    minimumTier: "launch",
    overageRate: 15,
  },
  {
    id: "prospect_outreach",
    name: "Prospect Outreach",
    description: "Account research, pain mapping, value-driven outreach, POV deck. Break into target accounts.",
    deliverables: [
      "Context File (.md) — account intel, pain mapping, competitive landscape, stakeholder map",
      "Outreach Sequences — value-driven email sequence, LinkedIn touches, call talking points. Copy-paste ready.",
      "POV Deck (.pptx, 5 slides) — before state + gap + your POV. Google Slides Beautify-ready.",
    ],
    minimumTier: "launch",
    overageRate: 15,
  },
  {
    id: "interview_prep",
    name: "Interview Prep",
    description: "Deep company research, interviewer intel, speaker notes, POV deck. Walk in prepared.",
    deliverables: [
      "Context File (.md) — company deep dive, role analysis, interviewer profiles, competitive positioning, story bank",
      "Speaker Notes — dynamic per scenario. Camera on: 1 page. Camera off: 1 per screen. Back-to-back: 1 per interviewer.",
      "POV Deck (.pptx, 5 slides) — your narrative for presentation rounds or leave-behind. Beautify-ready.",
    ],
    minimumTier: "pro",
    overageRate: 12,
  },
  {
    id: "prospect_prep",
    name: "Prospect Prep",
    description: "Deep account research, discovery plans, speaker notes tailored to your meeting type.",
    deliverables: [
      "Context File (.md) — account deep dive, discovery plan, competitive positioning, stakeholder map, pain hypotheses",
      "Speaker Notes — tailored to meeting type (discovery, demo, negotiation, QBR). Stay present, ask deeper questions.",
      "POV Deck (.pptx, 5 slides) — before state + gap + required capabilities + PBOs + proof. Beautify-ready.",
    ],
    minimumTier: "pro",
    overageRate: 12,
  },
  {
    id: "deal_playbook",
    name: "Deal Playbook",
    description: "Qualification audit, champion strategy & velocity plays in one shot. Diagnose the deal, arm your champion, know your next 3 moves.",
    deliverables: [
      "Context File (.md) — deal qualification scorecard, champion profile, stakeholder map, velocity plays, next actions",
      "Speaker Notes — coaching prep for your next champion call & manager deal review. Dynamic per meeting type.",
    ],
    minimumTier: "closer",
    overageRate: 10,
  },
  {
    id: "proposal_blitz",
    name: "Proposal Blitz",
    description: "CFO-ready proposals with ROI math, competitive positioning & pricing rationale. Package the deal so the decision maker says yes.",
    deliverables: [
      "Context File (.md) — deal summary, buyer profile, ROI model, competitive positioning, pricing rationale",
      "Speaker Notes — proposal presentation talk track, objection handling per stakeholder, negotiation boundaries",
      "POV Deck (.pptx) — CFO-ready proposal: ROI breakdown, pricing, implementation timeline, risk mitigation. Google Slides-ready.",
    ],
    minimumTier: "closer",
    overageRate: 10,
  },
  {
    id: "practice_mode",
    name: "AI Practice Mode",
    description: "Real-time roleplay against an AI persona rendered as a video avatar, built from your research. Works for prospect calls, interviews & panels. Performance scoring after each session.",
    deliverables: [
      "Live video avatar roleplay session (LiveAvatar)",
      "AI persona generated from your blitz research (prospect, interview, or deal context)",
      "Post-session scorecard with actionable feedback across 8 dimensions",
      "Full conversation transcript",
    ],
    minimumTier: "pro",
    overageRate: 12,
  },
  {
    id: "territory_blitz",
    name: "Territory Blitz",
    description: "Parallel research & outreach for your entire target list. Territory prep in hours, not weeks.",
    deliverables: [
      "Per-account Context Files (.md) — individual research files, each NotebookLM-ready",
      "Per-account Outreach Sequences — personalized multi-touch outreach. Copy-paste ready.",
      "Territory Scorecard — comparative ranking: priority accounts, opportunity size, engagement readiness",
      "Per-account POV Decks (.pptx, 5 slides) — Beautify-ready for Google Slides",
    ],
    minimumTier: "closer",
    overageRate: 15,
  },
];

const TIER_RANK: Record<string, number> = {
  launch: 1,
  pro: 2,
  closer: 3,
};

export function canAccessTool(
  userTier: string | null,
  toolMinTier: string
): boolean {
  if (!userTier) return false;
  return (TIER_RANK[userTier] || 0) >= (TIER_RANK[toolMinTier] || 0);
}

export function getUpgradeTierForTool(toolMinTier: string): string {
  const names: Record<string, string> = {
    launch: "Launch",
    pro: "Pro",
    closer: "Closer",
  };
  return names[toolMinTier] || "Pro";
}
