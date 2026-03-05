// Tier 2: Auto-generate Knowledge Base documents from profile data
// Creates prose-formatted KB docs the worker can use effectively in prompts

import type { ParsedProfileData } from "./parse-ai-profile";

interface KBDocument {
  title: string;
  content: string;
  category: string;
}

/**
 * Generate "Company Overview & Product" KB doc
 */
function generateCompanyDoc(profile: ParsedProfileData): KBDocument | null {
  const parts: string[] = [];

  if (profile.companyName) {
    parts.push(`# ${profile.companyName}`);
  }

  if (profile.companyProduct) {
    parts.push(`## What We Sell\n${profile.companyProduct}`);
  }

  if (profile.companyDescription) {
    parts.push(`## Company Description\n${profile.companyDescription}`);
  }

  if (profile.companyDifferentiators) {
    parts.push(`## Key Differentiators\n${profile.companyDifferentiators}`);
  }

  if (profile.companyTargetMarket) {
    parts.push(`## Target Market\n${profile.companyTargetMarket}`);
  }

  if (profile.companyCompetitors) {
    parts.push(`## Competitive Landscape\n${profile.companyCompetitors}`);
  }

  if (parts.length < 2) return null; // Need at least name + one section

  return {
    title: `Company Overview — ${profile.companyName || "My Company"}`,
    content: parts.join("\n\n"),
    category: "product_docs",
  };
}

/**
 * Generate "Deal Story Bank" KB doc
 */
function generateDealStoriesDoc(profile: ParsedProfileData): KBDocument | null {
  if (!profile.dealStories || profile.dealStories.length === 0) return null;

  const stories = profile.dealStories.map((story, i) => {
    const parts = [`### ${i + 1}. ${story.title || story.customer || `Deal ${i + 1}`}`];
    if (story.customer) parts.push(`**Customer:** ${story.customer}`);
    if (story.challenge) parts.push(`**Challenge:** ${story.challenge}`);
    if (story.solution) parts.push(`**Solution:** ${story.solution}`);
    if (story.result) parts.push(`**Result:** ${story.result}`);
    if (story.metrics) parts.push(`**Key Metrics:** ${story.metrics}`);
    return parts.join("\n");
  });

  return {
    title: "Deal Story Bank",
    content: `# Deal Story Bank\n\nProven customer stories for use in outreach, presentations, and discovery.\n\n${stories.join("\n\n---\n\n")}`,
    category: "deal_stories",
  };
}

/**
 * Generate "Value Propositions & Proof Points" KB doc
 */
function generateValuePropsDoc(profile: ParsedProfileData): KBDocument | null {
  if (!profile.valueProps || profile.valueProps.length === 0) return null;

  const props = profile.valueProps.map((vp, i) => {
    const parts = [`### ${i + 1}. ${vp.headline}`];
    if (vp.description) parts.push(vp.description);
    if (vp.proofPoint) parts.push(`**Proof Point:** ${vp.proofPoint}`);
    return parts.join("\n\n");
  });

  return {
    title: "Value Propositions & Proof Points",
    content: `# Value Propositions\n\nCore value props with proof points for customer-facing communications.\n\n${props.join("\n\n---\n\n")}`,
    category: "product_docs",
  };
}

/**
 * Generate "ICP & Target Buyer" KB doc
 */
function generateICPDoc(profile: ParsedProfileData): KBDocument | null {
  const parts: string[] = [];

  if (profile.companyTargetMarket) {
    parts.push(`## Target Market\n${profile.companyTargetMarket}`);
  }

  if (profile.sellingStyle) {
    parts.push(`## Sales Methodology\n${profile.sellingStyle}`);
  }

  if (profile.preferredTone) {
    parts.push(`## Communication Style\nPreferred tone: ${profile.preferredTone}`);
  }

  if (parts.length === 0) return null;

  return {
    title: "ICP & Target Buyer Profile",
    content: `# Ideal Customer Profile\n\n${parts.join("\n\n")}`,
    category: "icp_definitions",
  };
}

/**
 * Generate "Competitive Positioning" KB doc
 */
function generateCompetitiveDoc(profile: ParsedProfileData): KBDocument | null {
  if (!profile.companyCompetitors && !profile.companyDifferentiators) return null;

  const parts: string[] = [];

  if (profile.companyCompetitors) {
    parts.push(`## Known Competitors\n${profile.companyCompetitors}`);
  }

  if (profile.companyDifferentiators) {
    parts.push(`## Our Differentiators\n${profile.companyDifferentiators}`);
  }

  return {
    title: "Competitive Positioning",
    content: `# Competitive Positioning\n\nHow we differentiate and where we win.\n\n${parts.join("\n\n")}`,
    category: "competitive_intel",
  };
}

/**
 * Main function: generate all applicable KB docs from profile data.
 * Returns only non-null docs where there's enough data to be useful.
 */
export function generateKBFromProfile(profile: ParsedProfileData): KBDocument[] {
  const generators = [
    generateCompanyDoc,
    generateDealStoriesDoc,
    generateValuePropsDoc,
    generateICPDoc,
    generateCompetitiveDoc,
  ];

  return generators
    .map((gen) => gen(profile))
    .filter((doc): doc is KBDocument => doc !== null);
}
