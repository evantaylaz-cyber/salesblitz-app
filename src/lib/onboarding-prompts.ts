// Tier 2: AI-Assisted Onboarding Prompts
// Users copy these prompts into their own ChatGPT/Claude/Gemini, then paste the output back.

export const QUICK_INTERVIEW_PROMPTS = [
  {
    id: "company",
    title: "Company & Product",
    description: "Tell us about your company and what you sell",
    prompt: `I'm setting up a sales enablement tool and need to describe my company. Please interview me with these questions, then format my answers as JSON at the end.

Ask me one question at a time:
1. What's your company name?
2. What do you sell? (product or service — be specific about what it does)
3. Give me a 2-3 sentence description of your company
4. What makes you different from competitors? (your key differentiators)
5. Who are your main competitors?
6. What's your target market? (industry, company size, buyer persona)
7. What's your company website URL?

After I answer all questions, output ONLY this JSON (no other text):
\`\`\`json
{
  "companyName": "",
  "companyProduct": "",
  "companyDescription": "",
  "companyDifferentiators": "",
  "companyCompetitors": "",
  "companyTargetMarket": "",
  "companyUrl": ""
}
\`\`\`

Start with question 1.`,
  },
  {
    id: "deals",
    title: "Deal Stories",
    description: "Walk through your 3-5 best deals",
    prompt: `I need to document my best sales deals for a sales enablement tool. For each deal, I need to capture the full story.

Walk me through 3-5 deals one at a time. For each deal, ask me:
1. Give this deal a title (e.g., "CBRE — Enterprise Cold Hunt")
2. Who was the customer?
3. What was their challenge or pain point?
4. What did you do to solve it? (your approach/solution)
5. What was the result? (the outcome)
6. What were the key metrics? (numbers that prove the impact)

After we finish all deals, output ONLY this JSON (no other text):
\`\`\`json
{
  "dealStories": [
    {
      "title": "",
      "customer": "",
      "challenge": "",
      "solution": "",
      "result": "",
      "metrics": "",
      "sourceUrl": ""
    }
  ]
}
\`\`\`

Start with deal 1, question 1.`,
  },
  {
    id: "valueprops",
    title: "Value Propositions",
    description: "Define your top value props with proof points",
    prompt: `I need to define my top 3 value propositions for a sales enablement tool. Each one needs a headline, description, and proof point.

Ask me about each value prop one at a time:
1. What's the headline? (one sentence — what's the promise?)
2. Describe it in 2-3 sentences. What does this mean for the buyer?
3. What's your proof point? (specific customer result, data, or case study that proves it)

After we finish all 3, output ONLY this JSON (no other text):
\`\`\`json
{
  "valueProps": [
    {
      "headline": "",
      "description": "",
      "proofPoint": ""
    }
  ]
}
\`\`\`

Start with value prop 1.`,
  },
  {
    id: "methodology",
    title: "ICP & Methodology",
    description: "Your ideal customer profile and sales approach",
    prompt: `I need to document my selling style for a sales enablement tool. Ask me these questions one at a time:

1. What sales methodology do you follow? (e.g., MEDDPICC, Challenger, SPIN, Sandler, Command of the Message, or a combination)
2. How would you describe your preferred communication tone? (e.g., direct and data-driven, consultative, relationship-first)
3. What's your ideal customer profile? (company size, industry, role titles you sell to, deal size range)

After I answer all questions, output ONLY this JSON (no other text):
\`\`\`json
{
  "sellingStyle": "",
  "preferredTone": "",
  "icpNotes": ""
}
\`\`\`

Start with question 1.`,
  },
  {
    id: "linkedin",
    title: "LinkedIn Profile",
    description: "Paste your LinkedIn sections",
    prompt: `I need to capture my LinkedIn profile for a sales enablement tool.

Please paste the following sections from your LinkedIn profile:
1. Your "About" section (the summary at the top of your profile)
2. Your work experience (company names, titles, dates, and descriptions — even a rough paste is fine)
3. Your education (school, degree, dates)

After you paste everything, I'll format it as JSON:
\`\`\`json
{
  "linkedinAbout": "",
  "linkedinExperience": "",
  "linkedinEducation": ""
}
\`\`\`

Go ahead and paste your LinkedIn sections — I'll organize them.`,
  },
];

export const ONE_SHOT_PROMPT = `I'm setting up a sales enablement tool and need to provide my professional context. Please help me fill this out.

I'll give you information about myself and my company. Your job is to organize it into the exact JSON format below. Ask me clarifying questions ONLY if critical information is missing.

Here's what I need to fill out:

**COMPANY INFO:**
- Company name
- What you sell (product/service)
- 2-3 sentence company description
- Key differentiators (what makes you different)
- Main competitors
- Target market (industry, company size, buyer persona)
- Company website URL

**YOUR LINKEDIN:**
- About/summary section
- Work experience (company, title, dates, key responsibilities)
- Education

**DEAL STORIES (3-5 of your best deals):**
For each deal:
- Title (e.g., "CBRE — Enterprise Cold Hunt")
- Customer name
- Their challenge/pain point
- Your solution/approach
- The result/outcome
- Key metrics (numbers)

**VALUE PROPOSITIONS (top 3):**
For each:
- Headline (one-sentence promise)
- Description (2-3 sentences)
- Proof point (customer result, data, case study)

**SALES METHODOLOGY:**
- Which methodology do you follow? (MEDDPICC, Challenger, SPIN, Command of the Message, etc.)
- Preferred communication tone (direct, consultative, etc.)

---

After collecting all info, output ONLY this JSON block (no other text before or after):

\`\`\`json
{
  "companyName": "",
  "companyProduct": "",
  "companyDescription": "",
  "companyDifferentiators": "",
  "companyCompetitors": "",
  "companyTargetMarket": "",
  "companyUrl": "",
  "linkedinAbout": "",
  "linkedinExperience": "",
  "linkedinEducation": "",
  "sellingStyle": "",
  "preferredTone": "",
  "dealStories": [
    {
      "title": "",
      "customer": "",
      "challenge": "",
      "solution": "",
      "result": "",
      "metrics": "",
      "sourceUrl": ""
    }
  ],
  "valueProps": [
    {
      "headline": "",
      "description": "",
      "proofPoint": ""
    }
  ]
}
\`\`\`

Let's start. Tell me about your company and what you sell.`;

export type PromptStep = (typeof QUICK_INTERVIEW_PROMPTS)[number];
