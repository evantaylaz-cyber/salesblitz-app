# Guided Flows Spec: NotebookLM & Google Slides Integration

**Last Updated:** 2026-03-12
**Status:** Spec complete. Ready for implementation.
**Phase:** 3 (per phased approach: Phase 1 blitz restructure, Phase 2 speed, Phase 3 guided flows)

---

## Core Philosophy

Sales Blitz is not in the content generation or research business. Google wins that. We are in the **guided intelligence** business: showing customers HOW to best leverage these tools so their Sales Blitz experience compounds into something they'd never figure out on their own.

The value chain: Sales Blitz generates context-rich assets (context file, on-screen notes, outreach sequences, POV deck) -> user uploads to NotebookLM/Google Slides -> our pre-composed prompts + settings guidance turn generic AI tools into precision sales prep machines.

We guide. Google generates. The user gets outputs 10x better than they'd get on their own because we told them exactly what to type, what settings to pick, and what sources to add.

---

## Current State (What Exists)

### NotebookLMGuide.tsx
- **Covers 4 of 9 Studio tools:** Podcast (Audio Overview), Slide Deck, Flashcards, Quiz
- **Missing 5 tools:** Video Overview, Mind Map, Reports, Infographic, Data Table
- **Settings hints partially accurate** but missing customization details discovered during exploration
- **Deep Research section exists** but doesn't mention selective source import
- **Source recommendations are solid** per tool type

### AssetGuide.tsx
- **Google Slides section references old "Beautify this slide" name** (now "Enhance this slide")
- **Doesn't distinguish banana button (quick auto-beautify) from Gemini popout (custom prompt)**
- **Missing "Help me visualize" guidance** (separate Gemini panel with Slide/Image/Infographic tabs)

---

## NotebookLM Studio Tools: Complete Catalog

All 9 tools explored firsthand. Below is the customization interface for each, with recommended Sales Blitz presets per tool type.

### 1. Audio Overview (Podcast)
**Customization modal (pencil icon):**
- Format: Deep Dive | Brief | Critique | Debate
- Language: dropdown
- Length: Short | Default | Long
- Free-form prompt: "What should the AI hosts focus on in this episode?"
- AI-suggested context-aware topic chips (e.g. "+Sales Tactics", "+Target Audience")

**Sales Blitz presets by tool:**
| Blitz Tool | Format | Length | Prompt Strategy |
|------------|--------|--------|-----------------|
| interview_prep | Deep Dive | Default | Brief me on company, competitive position, role strategy |
| prospect_prep | Deep Dive | Default | Brief me on pain points, buying triggers, competitive alternatives |
| deal_audit | Debate | Default | Two hosts argue the deal risks vs. the bull case |
| champion_builder | Deep Dive | Short | Champion's political landscape, internal narrative |
| outreach tools | Brief | Short | Pain signals, trigger events, what makes contact respond |

**UPDATE NEEDED:** Current NotebookLMGuide already covers this. Change deal_audit from Deep Dive to **Debate** format (two hosts arguing the deal = better coaching than a monologue). Add format/length to settings hints.

### 2. Slide Deck
**Customization modal (pencil icon):**
- Format: Detailed Deck | Presenter Slides
- Language: dropdown
- Length: Short | Default
- Free-form prompt: description of desired deck

**Sales Blitz presets by tool:**
| Blitz Tool | Format | Prompt Strategy |
|------------|--------|-----------------|
| interview_prep | Presenter Slides | Visual study guide, final review format |
| prospect_prep | Presenter Slides | Pre-call briefing, glanceable during call |
| deal_audit | Detailed Deck | Deal review deck for internal meetings |
| champion_builder | Detailed Deck | Champion enablement, internal narrative |

**STATUS:** Already covered in NotebookLMGuide. Settings hints correct.

### 3. Flashcards
**Customization modal (pencil icon):**
- Number: Fewer | Standard | More
- Difficulty: Easy | Medium | Hard
- Free-form prompt: topic focus

**Sales Blitz presets:** More cards, Hard difficulty. Already implemented correctly.

### 4. Quiz
**Customization modal (pencil icon):**
- Number: Fewer | Standard | More
- Difficulty: Easy | Medium | Hard
- Free-form prompt: topic focus

**Sales Blitz presets:** More questions, Hard difficulty. Already implemented correctly.

### 5. Video Overview (NEW - not in current guide)
**Customization modal:**
- Format: Explainer | Brief
- Language: dropdown
- Visual style carousel: Auto-select | Custom | Classic | Whiteboard | Kawaii | Anime | Watercolor | Retro print | Heritage | Paper-craft | more
- Free-form prompt: "What should the AI hosts focus on?"

**Sales Blitz presets by tool:**
| Blitz Tool | Format | Style | Prompt Strategy |
|------------|--------|-------|-----------------|
| interview_prep | Explainer | Classic | Visual walkthrough of company, role, and your preparation strategy |
| prospect_prep | Explainer | Classic | Visual overview of their business, pain points, and your positioning |
| deal_audit | Brief | Classic | Quick visual summary of deal status, risks, and next steps |
| champion_builder | Brief | Classic | Visual map of the political landscape and champion's narrative |

**VALUE PROP:** Video is passive consumption like the podcast but visual. Good for commute prep or when reading feels like too much.

### 6. Mind Map (NEW - not in current guide)
**No customization modal.** One-click auto-generate. Produces interactive expandable tree with zoom controls.

**Sales Blitz guidance:** "Click Mind Map to auto-generate an interactive map of all your research. Expand branches to drill into specific areas. Great for seeing how company strategy, competitive landscape, and stakeholder dynamics connect."

**Best for:** interview_prep, prospect_prep (complex research benefits from spatial visualization). Lower value for outreach tools.

### 7. Reports (NEW - not in current guide)
**Customization modal:**
- 4 presets: Create Your Own | Briefing Doc | Study Guide | Blog Post
- AI-suggested context-aware format chips
- Free-form prompt

**Sales Blitz presets by tool:**
| Blitz Tool | Preset | Prompt Strategy |
|------------|--------|-----------------|
| interview_prep | Study Guide | Structured review of company, role, and interview strategy |
| prospect_prep | Briefing Doc | Pre-call briefing with pain points, stakeholders, and discovery approach |
| deal_audit | Briefing Doc | Deal status report with risk flags and recommended actions |
| champion_builder | Create Your Own | Champion playbook: internal narrative, stakeholder mapping, arming strategy |

### 8. Infographic (NEW - not in current guide)
**Customization modal:**
- Language: dropdown
- Orientation: Landscape | Portrait | Square
- Visual style carousel: Auto-select | Sketch Note | Kawaii | Professional | Scientific | Anime | more
- Level of detail: Concise | Standard | Detailed (BETA)
- Free-form prompt: "Describe the infographic you want to create"

**Sales Blitz presets by tool:**
| Blitz Tool | Orientation | Style | Detail | Prompt Strategy |
|------------|-------------|-------|--------|-----------------|
| interview_prep | Landscape | Professional | Detailed | Company overview infographic: revenue, headcount, products, market position |
| prospect_prep | Landscape | Professional | Standard | Prospect snapshot: pain points, tech stack, buying signals, competitive landscape |
| deal_audit | Landscape | Professional | Detailed | Deal health dashboard: qualification status, risk areas, stakeholder alignment |
| champion_builder | Portrait | Professional | Standard | Stakeholder map: decision makers, influencers, blockers, and champion's path |

**VALUE PROP:** Infographics are shareable. A prospect_prep infographic could be printed and taped to a monitor. An interview_prep one could be a one-page study sheet.

### 9. Data Table (NEW - not in current guide)
**Customization modal:**
- Language: dropdown
- Free-form prompt: "Describe the data table you want to create" (shows example column structures)

**Sales Blitz presets by tool:**
| Blitz Tool | Prompt Strategy |
|------------|-----------------|
| interview_prep | Table of company metrics: revenue, headcount, key products, recent milestones. Columns: Metric, Value, Source, Relevance to Role |
| prospect_prep | Competitive comparison table: our solution vs. their current state vs. alternatives. Columns: Capability, Current State, Our Solution, Gap |
| deal_audit | Deal qualification scorecard: MEDDPICC dimensions with current status, evidence, and gaps. Columns: Dimension, Status, Evidence, Risk Level |
| champion_builder | Stakeholder disposition matrix: name, title, attitude, influence level, engagement strategy |

**VALUE PROP:** Tables are structured reference material. Good for quick-glance during calls or for building internal documents.

---

## NotebookLM Deep Research: Updated Guidance

### Current state (in NotebookLMGuide)
Mentions "Add sources > Web or Deep Research" and provides query suggestions. Correct but incomplete.

### What to add
The Deep Research flow has a **selective source import** step that's high value:

1. User enters query (e.g., "Affirm competitive landscape fintech BNPL")
2. Chooses Fast Research (quick) or **Deep Research** (recommended, 5-step analysis)
3. Deep Research produces: auto-generated report + discovered sources
4. Sources split into "Cited in Report" (N) and "Not cited" (M) tabs
5. **User can selectively import individual sources** via checkboxes
6. Each source shows description of relevance + external link preview
7. "Select all" for bulk import, or cherry-pick the best ones
8. Import button adds report + selected sources to notebook

**Guidance to add:** "Use Deep Research (not Fast Research). When results come back, review the 'Cited in Report' sources first. These are the most relevant. Cherry-pick sources that add new information your blitz assets don't already cover. Skip generic corporate pages. Prioritize analyst reports, earnings transcripts, competitive analyses, and customer case studies."

---

## Google Slides: Three-Tool Integration

### Discovery: Three Distinct Tools

Evan identified three distinct capabilities during exploration:

**1. "Help Me Visualize" / Banana Button (PRIMARY - guide 90% of users here)**
- Location: Banana/wand button on the slide toolbar
- Behavior: Opens "Help me visualize" panel with three tabs: Slide | Image | Infographic
- User types a prompt, Gemini generates visual elements
- **Additive, not destructive:** adds to the slide without replacing existing content
- Best for: Adding stock imagery, charts, diagrams, infographics to our POV deck slides
- This is what we lean on hardest. Our POV deck has the right content and structure. What it lacks is visual polish. This fills that gap.

**2. "Enhance This Slide" / Gemini Popout (ADVANCED - mention as power-user option)**
- Location: "Enhance this slide" button at bottom of slide
- Behavior: Opens Gemini panel with pre-composed prompt: "Edit this slide to most effectively communicate the core message. Improve the design, prefer well structured visual layouts, retain the key content but make it more concise as needed."
- User can edit the prompt before submitting
- **Destructive: replaces entire slide.** Two options: "Insert" (adds as new slide) or "Replace" (overwrites current)
- Follow-up: "Ask Gemini" for iterative refinement, "@" references to Google Workspace files
- Risk: could destroy the structure our POV deck generator carefully built
- Best for: users who want full creative control and understand what they're replacing

**3. Text Refinement (CONTEXTUAL - mention in passing)**
- Location: Pencil-sparkle icon when clicking a text box
- Options: Shorten, Rephrase, More Formal, or custom prompt
- Low-friction, non-destructive
- Best for: tightening bullet points or adjusting formality

### Guided Flow Strategy (Prioritized)

**Step 1: Upload & Open**
"Download your POV Deck (.pptx), upload to Google Drive, open with Google Slides."

**Step 2: Add Visuals (Help Me Visualize - PRIMARY)**
"Click the banana/wand button on any slide. This opens 'Help me visualize' with three tabs: Slide, Image, and Infographic. Type a prompt describing what visual would reinforce your slide's message."

Per-slide-type prompts for "Help me visualize":
| Slide Type | Tab | Prompt |
|------------|-----|--------|
| Title / Opening | Image | "Professional hero image that conveys [company's industry] and momentum. Clean, modern, executive feel." |
| Data / Metrics | Infographic | "Visual callout boxes highlighting the 3 key metrics on this slide. Use accent colors for emphasis." |
| Competitive / Comparison | Slide | "Two-column comparison layout showing current state vs. recommended approach. Make the difference visually obvious." |
| Strategy / Recommendations | Infographic | "Numbered roadmap or step-by-step visual for the recommendations on this slide. Clean, scannable." |
| Closing / Next Steps | Image | "Professional, confident closing image. Clean background with subtle brand energy." |

**Step 3: Enhance Full Slides (Advanced, optional)**
"If a slide needs a complete redesign, click 'Enhance this slide' at the bottom. The pre-filled prompt works well as-is. Click 'Insert' to keep your original and compare, or 'Replace' to swap it out. Tip: always Insert first so you can compare before committing."

**Step 4: Refine Text (Quick polish)**
"Click any text box, then the pencil-sparkle icon. Use 'Shorten' to tighten bullet points, or type a custom prompt like 'Make this more direct and confident.'"

---

## Implementation Plan

### Update 1: NotebookLMGuide.tsx (add 5 missing tools)

Add tabs for: Video Overview, Mind Map, Reports, Infographic, Data Table.

For each, follow the existing pattern:
- `PromptConfig` with label, icon, settingsHint, prompt
- Tool-type-specific prompt text
- Copy button for prompt

**Tool-to-feature availability matrix:**
| Feature | interview_prep | prospect_prep | deal_audit | champion_builder | outreach tools |
|---------|---------------|---------------|------------|-----------------|----------------|
| Podcast | yes | yes | yes (Debate) | yes | yes (Brief) |
| Slide Deck | yes | yes | yes | yes | no |
| Flashcards | yes | yes | no | no | no |
| Quiz | yes | yes | no | no | no |
| Video | yes | yes | yes (Brief) | yes (Brief) | no |
| Mind Map | yes | yes | no | no | no |
| Reports | yes | yes | yes | yes | no |
| Infographic | yes | yes | yes | yes | no |
| Data Table | yes | yes | yes | yes | no |

**Reasoning:** Outreach tools have minimal research depth. Podcast (Brief) covers what they need. Prep tools and strategic tools (deal_audit, champion_builder) benefit from all formats.

### Update 2: NotebookLMGuide.tsx (Deep Research enhancement)

Add a Step 2.5 between current Step 2 (Add more sources) and Step 3 (Generate):
- Explain Deep Research vs Fast Research
- Note the selective import UX
- Guidance on which source types to prioritize
- Copy-paste Deep Research queries (already exist, just add context about selective import)

### Update 3: AssetGuide.tsx (Google Slides section overhaul)

Replace current "Polish your deck in Google Slides" section with:
1. Two-step approach: banana button first (quick), Gemini popout second (custom)
2. Per-slide-type custom prompts (table above)
3. "Help me visualize" for adding visual elements
4. Remove old "Beautify this slide" terminology

### Update 4: Settings hints accuracy

Update `settingsHint` strings to match actual UI:
- Audio Overview: "Audio Overview > pencil icon > Deep Dive > Default length"
- Slide Deck: "Slide Deck > pencil icon > Presenter Slides > Default length"
- Flashcards: "Flashcards > pencil icon > More cards > Hard"
- Quiz: "Quiz > pencil icon > More questions > Hard"

The pencil icon opens the customization modal. Current hints skip this step.

---

## New Icons Needed

| Tool | Suggested Icon (lucide-react) |
|------|------------------------------|
| Video Overview | `Video` |
| Mind Map | `GitBranch` or `Network` |
| Reports | `FileText` |
| Infographic | `BarChart2` or `PieChart` |
| Data Table | `Table` |

---

## Files to Modify

1. `salesblitz-app/src/components/NotebookLMGuide.tsx` - Add 5 tools, update settings hints, enhance Deep Research section
2. `salesblitz-app/src/components/AssetGuide.tsx` - Overhaul Google Slides section with two-tool approach
3. `salesblitz-app/MASTER_CONTEXT.md` - Update action plan with Phase 3 status
4. `salesblitz-app/.claude/CLAUDE.md` - Update Rule 4

---

## Not In Scope (Future)

- **Auto-upload to NotebookLM:** No API exists. Manual upload is the only path.
- **Auto-beautify in Google Slides:** Would require browser automation per user. Not viable at scale.
- **NotebookLM notebook templates:** No API for creating pre-configured notebooks.
- **Google Slides template injection:** Could pre-format PPTX to be more Gemini-friendly. Possible future optimization.

The guided flow is the product. The user does the clicking. We tell them exactly what to click and what to type.
