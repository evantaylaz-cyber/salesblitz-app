/**
 * Shared tool display mappings.
 *
 * Single source of truth for tool name labels, badge colors, and helper
 * functions used across the app. Adding a new tool here propagates to
 * every page automatically.
 */

// ─── Labels ────────────────────────────────────────────────────────────────────

export const TOOL_LABELS: Record<string, string> = {
  interview_outreach: "Interview Outreach",
  interview_prep: "Interview Prep",
  prospect_outreach: "Prospect Outreach",
  prospect_prep: "Prospect Prep",
  deal_playbook: "Deal Playbook",
  proposal_blitz: "Proposal Blitz",
  territory_blitz: "Territory Blitz",
  practice_mode: "AI Practice Mode",
  competitor_research: "Competitor Research",
  // Backward compat for pre-Mar 13 runs
  deal_audit: "Deal Audit",
  champion_builder: "Champion Builder",
  win_loss_analyst: "Win/Loss Analyst",
};

/** Resolve a snake_case tool ID to its display name. Falls back to the raw ID. */
export function getToolLabel(toolName: string): string {
  return TOOL_LABELS[toolName] || toolName;
}

// ─── Badge Colors ──────────────────────────────────────────────────────────────

export const TOOL_COLORS: Record<string, string> = {
  interview_outreach: "bg-emerald-500/15 text-emerald-400",
  interview_prep: "bg-emerald-500/15 text-emerald-400",
  prospect_outreach: "bg-blue-500/15 text-blue-400",
  prospect_prep: "bg-blue-500/15 text-blue-400",
  deal_playbook: "bg-amber-500/15 text-amber-400",
  proposal_blitz: "bg-blue-500/15 text-blue-400",
  territory_blitz: "bg-emerald-500/15 text-emerald-400",
  competitor_research: "bg-emerald-500/15 text-emerald-400",
  practice_mode: "bg-purple-500/15 text-purple-400",
  // Backward compat
  champion_builder: "bg-amber-500/15 text-amber-400",
  deal_audit: "bg-rose-100 text-rose-700",
  win_loss_analyst: "bg-neutral-500/15 text-neutral-400",
};

/** Resolve a tool ID to its Tailwind badge classes. Falls back to neutral. */
export function getToolColor(toolName: string): string {
  return TOOL_COLORS[toolName] || "bg-[#1a1a1a] text-neutral-300";
}
