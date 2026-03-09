// ── Asset Format Normalization ────────────────────────────────────────
// The worker stores assets as a flat object with camelCase keys:
//   { briefPdf: "https://...", povDeck: "https://..." }
// The UI expects an array of AssetData objects:
//   [{ id, label, format, url, size, category }]
// This module bridges the two formats.

import { getExpectedAssets, Asset } from "./job-steps";
import { ToolName } from "./tools";

// Worker camelCase key → template snake_case asset ID
const WORKER_KEY_TO_ASSET_ID: Record<string, string> = {
  briefPdf: "research_brief",
  povDeck: "pov_deck",
  povDeckPptx: "pov_deck_pptx",
  notebookCard: "notebook_card",
  competitivePlaybook: "competitive_playbook",
  gammaDeck: "gamma_deck",
  callPrepSheet: "call_prep_sheet",
  atsResume: "ats_resume",
  outreachSequence: "outreach_sequence",
  outreachSequenceJson: "outreach_sequence_json",
  stakeholderMap: "stakeholder_map",
  assignmentFramework: "assignment_framework",
  landscape: "competitive_playbook",
  callSheet1Img: "call_sheet_1",
  callSheet2ImgA: "call_sheet_2a",
  callSheet2ImgB: "call_sheet_2b",
  // Legacy keys — backward compat
  clientPovCard: "notebook_card",
  dealHealthCard: "notebook_card",
  championPovCard: "notebook_card",
  auditReport: "research_brief",   // deal_audit used to have separate key
  strategyBrief: "research_brief", // champion_builder used to have separate key
};

// Human-readable labels for assets that aren't in the standard template
const EXTRA_ASSET_LABELS: Record<string, string> = {
  pov_deck_pptx: "POV Deck (PowerPoint)",
  outreach_sequence_json: "Outreach Sequence Data",
  call_sheet_1: "Handwritten Call Sheet",
  call_sheet_2a: "Handwritten Call Sheet (Alt A)",
  call_sheet_2b: "Handwritten Call Sheet (Alt B)",
};

export interface NormalizedAsset {
  id: string;
  label: string;
  format: string;
  url: string | null;
  size: number | null;
  category: string;
}

/**
 * Normalize assets into the array format the UI expects.
 * Handles three cases:
 *   1. Already an array (initial creation format) → return as-is
 *   2. Flat object from worker → merge URLs into the asset template
 *   3. Anything else → empty array
 */
export function normalizeAssets(
  rawAssets: unknown,
  toolName: string
): NormalizedAsset[] {
  // Case 1: Already the correct array format
  if (Array.isArray(rawAssets)) {
    return rawAssets;
  }

  // Case 2: Flat object from worker — reconstruct the array
  if (rawAssets && typeof rawAssets === "object" && !Array.isArray(rawAssets)) {
    const workerAssets = rawAssets as Record<string, string>;
    const template = getExpectedAssets(toolName as ToolName);

    // Start with template assets, fill in URLs from worker data
    const result: NormalizedAsset[] = template.map((t) => ({
      id: t.id,
      label: t.label,
      format: t.format,
      url: null,
      size: null,
      category: t.category,
    }));

    // Map worker keys to template IDs and set URLs
    for (const [workerKey, url] of Object.entries(workerAssets)) {
      if (!url || typeof url !== "string") continue;

      const templateId = WORKER_KEY_TO_ASSET_ID[workerKey];
      if (templateId) {
        const existing = result.find((r) => r.id === templateId);
        if (existing) {
          existing.url = url;
        } else {
          // Worker produced an asset not in the template — add it with proper label
          const format = url.split(".").pop() || "pdf";
          result.push({
            id: templateId,
            label: EXTRA_ASSET_LABELS[templateId] || workerKey.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase()).trim(),
            format,
            url,
            size: null,
            category: "deliverable",
          });
        }
      } else {
        // Unknown worker key — still include it so users can access the asset
        const format = url.split(".").pop() || "pdf";
        const fallbackId = workerKey.replace(/([A-Z])/g, "_$1").toLowerCase();
        result.push({
          id: fallbackId,
          label: EXTRA_ASSET_LABELS[fallbackId] || workerKey.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase()).trim(),
          format,
          url,
          size: null,
          category: "deliverable",
        });
      }
    }

    return result;
  }

  // Case 3: null / undefined / unexpected
  return [];
}
