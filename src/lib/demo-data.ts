/**
 * Sample/demo run data for new users.
 * Shows what a completed prospect_prep run looks like without consuming a credit.
 */

export interface DemoStep {
  id: string;
  label: string;
  description: string;
  status: "completed";
  startedAt: string;
  completedAt: string;
}

export interface DemoAsset {
  id: string;
  label: string;
  format: string;
  url: string | null;
  size: number | null;
  category: "research" | "deliverable" | "interactive";
}

export interface DemoRun {
  id: string;
  toolName: string;
  status: string;
  priority: boolean;
  targetName: string;
  targetCompany: string;
  targetRole: string;
  currentStep: null;
  steps: DemoStep[];
  assets: DemoAsset[];
  progress: 100;
  completedSteps: number;
  totalSteps: number;
  deliveryUrl: null;
  deliveryNotes: string;
  errorMessage: null;
  createdAt: string;
  startedAt: string;
  completedAt: string;
  deliveredAt: string;
  isDemo: true;
}

const DEMO_TOOLS: Record<string, DemoRun> = {
  prospect_prep: {
    id: "demo-prospect-prep",
    toolName: "prospect_prep",
    status: "delivered",
    priority: false,
    targetName: "Sarah Mitchell",
    targetCompany: "Databricks",
    targetRole: "VP of Enterprise Sales",
    currentStep: null,
    steps: [
      {
        id: "company_deep_dive",
        label: "Company Deep Dive",
        description: "Researching Databricks: financials, strategy, competitive positioning, recent news",
        status: "completed",
        startedAt: "2026-03-04T10:00:00Z",
        completedAt: "2026-03-04T10:02:30Z",
      },
      {
        id: "competitive_research",
        label: "Competitive Landscape",
        description: "Mapping competitors: market positioning, pricing strategy, feature gaps",
        status: "completed",
        startedAt: "2026-03-04T10:02:30Z",
        completedAt: "2026-03-04T10:04:45Z",
      },
      {
        id: "market_intel",
        label: "Market Intelligence",
        description: "Analyzing data lakehouse market trends, TAM, buyer personas, buying patterns",
        status: "completed",
        startedAt: "2026-03-04T10:04:45Z",
        completedAt: "2026-03-04T10:06:30Z",
      },
      {
        id: "generating_assets",
        label: "Generating Assets",
        description: "Building context file, POV deck, on-screen notes, outreach sequence",
        status: "completed",
        startedAt: "2026-03-04T10:06:30Z",
        completedAt: "2026-03-04T10:10:00Z",
      },
      {
        id: "delivery",
        label: "Delivery",
        description: "Packaging deliverables and sending notification",
        status: "completed",
        startedAt: "2026-03-04T10:12:00Z",
        completedAt: "2026-03-04T10:12:30Z",
      },
    ],
    assets: [
      {
        id: "context_file",
        label: "Context File",
        format: "md",
        url: null, // Demo assets don't have real URLs
        size: 245000,
        category: "research",
      },
      {
        id: "pov_deck",
        label: "POV Deck",
        format: "pptx",
        url: null,
        size: 180000,
        category: "deliverable",
      },
      {
        id: "onscreen_notes",
        label: "On-Screen Notes",
        format: "md",
        url: null,
        size: 45000,
        category: "deliverable",
      },
      {
        id: "outreach_sequences",
        label: "Outreach Sequence",
        format: "md",
        url: null,
        size: 32000,
        category: "deliverable",
      },
    ],
    progress: 100,
    completedSteps: 7,
    totalSteps: 7,
    deliveryUrl: null,
    deliveryNotes: "This is a sample blitz showing what a Prospect Prep deliverable package looks like. Sign up to launch your own.",
    errorMessage: null,
    createdAt: "2026-03-04T10:00:00Z",
    startedAt: "2026-03-04T10:00:00Z",
    completedAt: "2026-03-04T10:14:00Z",
    deliveredAt: "2026-03-04T10:14:00Z",
    isDemo: true,
  },
  interview_prep: {
    id: "demo-interview-prep",
    toolName: "interview_prep",
    status: "delivered",
    priority: false,
    targetName: "Jason Rivera",
    targetCompany: "Stripe",
    targetRole: "Hiring Manager, Enterprise Sales",
    currentStep: null,
    steps: [
      {
        id: "company_deep_dive",
        label: "Company Deep Dive",
        description: "Researching Stripe: business model, competitive positioning, recent launches",
        status: "completed",
        startedAt: "2026-03-04T11:00:00Z",
        completedAt: "2026-03-04T11:02:00Z",
      },
      {
        id: "competitive_research",
        label: "Competitive Landscape",
        description: "Mapping Stripe competitors: Adyen, Checkout.com, PayPal, Square",
        status: "completed",
        startedAt: "2026-03-04T11:02:00Z",
        completedAt: "2026-03-04T11:04:00Z",
      },
      {
        id: "market_intel",
        label: "Market Intelligence",
        description: "Analyzing payments infrastructure market, embedded finance trends",
        status: "completed",
        startedAt: "2026-03-04T11:04:00Z",
        completedAt: "2026-03-04T11:06:00Z",
      },
      {
        id: "generating_assets",
        label: "Generating Assets",
        description: "Building context file, POV deck, on-screen notes",
        status: "completed",
        startedAt: "2026-03-04T11:06:00Z",
        completedAt: "2026-03-04T11:10:00Z",
      },
      {
        id: "delivery",
        label: "Delivery",
        description: "Packaging deliverables and sending notification",
        status: "completed",
        startedAt: "2026-03-04T11:12:00Z",
        completedAt: "2026-03-04T11:12:30Z",
      },
    ],
    assets: [
      {
        id: "context_file",
        label: "Context File",
        format: "md",
        url: null,
        size: 280000,
        category: "research",
      },
      {
        id: "pov_deck",
        label: "POV Deck",
        format: "pptx",
        url: null,
        size: 195000,
        category: "deliverable",
      },
      {
        id: "onscreen_notes",
        label: "On-Screen Notes",
        format: "md",
        url: null,
        size: 45000,
        category: "deliverable",
      },
    ],
    progress: 100,
    completedSteps: 7,
    totalSteps: 7,
    deliveryUrl: null,
    deliveryNotes: "This is a sample blitz showing what an Interview Prep deliverable package looks like. Sign up to launch your own.",
    errorMessage: null,
    createdAt: "2026-03-04T11:00:00Z",
    startedAt: "2026-03-04T11:00:00Z",
    completedAt: "2026-03-04T11:14:00Z",
    deliveredAt: "2026-03-04T11:14:00Z",
    isDemo: true,
  },
};

export function getDemoRun(toolName: string): DemoRun | null {
  return DEMO_TOOLS[toolName] || null;
}

export function getAllDemoTools(): { toolName: string; targetCompany: string; targetName: string }[] {
  return Object.entries(DEMO_TOOLS).map(([key, run]) => ({
    toolName: key,
    targetCompany: run.targetCompany,
    targetName: run.targetName,
  }));
}
