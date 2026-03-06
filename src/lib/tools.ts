// ── Tool Definitions & Access Gating ────────────────────────────────

export type ToolName =
  | "interview_outreach"
  | "prospect_outreach"
  | "interview_prep"
  | "prospect_prep"
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
    description: "Research brief, ATS resume, POV deck, handwritten cards, competitive playbook, outreach sequence",
    deliverables: [
      "Research Brief (PDF) — company intel, role analysis, outreach sequence",
      "ATS-Optimized Resume (PDF)",
      "POV Deck (PDF, 5 slides)",
      "3 Handwritten Reference Cards (Gemini)",
      "Interactive Competitive Playbook",
      "Multi-Touch Outreach Sequence (7 touches, 14-21 days)",
      "Polished Presentation Deck (24hr)",
    ],
    minimumTier: "launch",
    overageRate: 15,
  },
  {
    id: "prospect_outreach",
    name: "Prospect Outreach",
    description: "Research brief, POV deck, handwritten cards, competitive playbook, outreach sequence",
    deliverables: [
      "Research Brief (PDF) — account intel, pain mapping, outreach sequence",
      "POV Deck (PDF, 5 slides)",
      "3 Handwritten Reference Cards (Gemini)",
      "Interactive Competitive Playbook",
      "Multi-Touch Outreach Sequence (7 touches, 14-21 days)",
      "Polished Presentation Deck (24hr)",
    ],
    minimumTier: "launch",
    overageRate: 15,
  },
  {
    id: "interview_prep",
    name: "Interview Prep",
    description: "Complete prep package: research brief, POV deck, call prep docs, handwritten cards, competitive playbook",
    deliverables: [
      "Research Brief (PDF) — qualification mapping, story bank, call sheet, 30/60/90, competitive positioning",
      "POV Deck (PDF, 5 slides)",
      "Call Prep Docs (PDF) — Speaker Notes, Arsenal, Call Flow (+ Live Scenario & Q&A for mock pitch)",
      "3 Handwritten Reference Cards (Gemini)",
      "Interactive Competitive Playbook",
      "Polished Presentation Deck (Gamma)",
    ],
    minimumTier: "pro",
    overageRate: 12,
  },
  {
    id: "prospect_prep",
    name: "Prospect Prep",
    description: "Deep account research, meeting-specific call prep docs, POV deck, handwritten cards, competitive playbook",
    deliverables: [
      "Research Brief (PDF) — account deep dive, discovery plan, competitive positioning",
      "POV Deck (PDF, 5 slides)",
      "Call Prep Docs (PDF) — Speaker Notes, Arsenal, Call Flow tailored to your meeting type",
      "3 Handwritten Reference Cards (Gemini)",
      "Interactive Competitive Playbook",
      "Polished Presentation Deck (Gamma)",
    ],
    minimumTier: "pro",
    overageRate: 12,
  },
  {
    id: "deal_audit",
    name: "Deal Audit",
    description: "Qualification scorecard, risk assessment, strategy brief, handwritten cards",
    deliverables: [
      "Deal Audit Report (PDF) — qualification scorecard, risk assessment, strategy brief",
      "3 Handwritten Reference Cards (Gemini)",
    ],
    minimumTier: "pro",
    overageRate: 12,
  },
  {
    id: "champion_builder",
    name: "Champion Builder",
    description: "Champion strategy brief, handwritten cards, competitive playbook",
    deliverables: [
      "Champion Strategy Brief (PDF) — profile, stakeholder map, development plan, internal selling kit",
      "3 Handwritten Reference Cards (Gemini)",
      "Interactive Competitive Playbook",
    ],
    minimumTier: "closer",
    overageRate: 10,
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
