# Phase 5: AI Practice Mode (HeyGen Streaming Avatar)

> Spec created: 2026-03-07
> Status: READY TO BUILD
> Depends on: Phases 1-4.4 (all complete)

## What It Is

Real-time roleplay practice against an AI-rendered video avatar that plays a buyer persona. The persona is built from AltVest's existing research engine output, not from a call recording library. User sees a photorealistic avatar on screen, talks to it via microphone, and the avatar responds in character as the buyer. After the session, a CotM scoring evaluation grades the rep's performance.

## Why It Matters

Gong AI Trainer (GA March 2026) does the same thing but requires the company's recorded call library to build personas, costs $100-150/seat/month on enterprise contracts, and all data stays with the company when you leave. AltVest builds personas from real-time research (you just need a company name), works for individuals and small teams, and your practice history is portable.

## Architecture

### Two Modes

**Mode 1: Custom LLM (recommended, build this first)**
- User's microphone audio → browser STT (Deepgram via HeyGen SDK, or custom) → text
- Text sent to AltVest backend → Claude API with buyer persona system prompt + conversation history
- Claude response → sent to HeyGen avatar via `speak()` with `task_type: REPEAT`
- Avatar renders the response with lip sync, facial expressions, video via WebRTC
- This gives us FULL CONTROL over the AI's behavior, persona, CotM-awareness, etc.

**Mode 2: Voice Chat (simpler but less control)**
- HeyGen SDK's built-in voice chat mode handles STT + LLM + TTS
- We provide the persona via HeyGen's "knowledge base" / context field
- Less control over AI behavior but faster to ship
- Limitation: can't inject AltVest research data mid-conversation as easily

**Recommendation:** Mode 1. We need full control over the persona's behavior, objection patterns, and the ability to inject AltVest's deep research into the conversation. Mode 2 would use HeyGen's built-in LLM which we can't customize enough.

### Flow

```
1. User picks a target company (existing flow)
   OR selects a previous run to practice against

2. AltVest research engine runs (existing pipeline, steps 1-4)
   → Competitive Research, Market Intel, Company Deep Dive, Strategic Synthesis
   → This data already exists if user ran a previous prep/outreach

3. Persona Generator (NEW prompt, runs on Claude Sonnet)
   Input: research synthesis + company data + user profile
   Output: JSON persona object
   {
     name: "Sarah Chen",
     title: "VP of Procurement",
     company: "CBRE Managed Services",
     personality: "analytical, skeptical of new vendors, values data over stories",
     priorities: ["cost reduction", "vendor consolidation", "compliance"],
     objections: ["we already have a solution", "budget is locked", "need to see ROI first"],
     communication_style: "direct, asks pointed questions, doesn't suffer vague answers",
     knowledge: { ... compressed research context ... },
     cotm_triggers: {
       before_state: "manual procurement across 400+ facilities, 30-60 day cycles",
       pain_points: ["maverick spend", "no visibility", "audit risk"],
       decision_criteria: ["adoption rate", "integration with SAP", "cycle time"],
       competitors_they_know: ["Coupa", "SAP Ariba"]
     }
   }

4. HeyGen Session Start
   - Call createStartAvatar() with selected avatar + quality settings
   - Avatar appears on screen, greets the user in character
   - Opening: "Hi [rep name], thanks for taking the time. I've got about 20 minutes. What did you want to cover?"

5. Conversation Loop
   - User speaks → STT → text
   - Text + conversation history + persona → Claude API (streaming)
   - Claude response (in character) → avatar.speak({ text, task_type: TaskType.REPEAT })
   - Avatar renders response with video/audio
   - Repeat until user ends session or timer expires

6. Session End + Scoring
   - Full transcript saved
   - Scoring prompt evaluates against CotM:
     - Did rep establish the Before State? (1-5)
     - Did rep surface Negative Consequences? (1-5)
     - Did rep map Required Capabilities (not just features)? (1-5)
     - Did rep tie to PBOs with metrics? (1-5)
     - Did rep earn the right before pitching "How We Do It"? (1-5)
     - Discovery quality: open vs. closed questions, depth of follow-up
     - Objection handling: acknowledged, reframed, or steamrolled?
     - Overall score + specific feedback + improvement suggestions
   - Score + feedback stored in PracticeSession table
   - User can replay transcript, see scoring breakdown, track improvement over time
```

## Tech Implementation

### HeyGen SDK Integration (Frontend)

```typescript
// Key SDK methods we'll use:
import StreamingAvatar, {
  AvatarQuality,
  StreamingEvents,
  TaskType,
  VoiceEmotion
} from '@heygen/streaming-avatar';

// 1. Get access token (server-side, HeyGen API key → session token)
// POST to https://api.heygen.com/v1/streaming.create_token

// 2. Initialize avatar
const avatar = new StreamingAvatar({ token });
const session = await avatar.createStartAvatar({
  avatarName: 'selected-avatar-id',
  quality: AvatarQuality.High,
  voice: { voiceId: 'selected-voice' },
  language: 'en',
});

// 3. Attach video stream to DOM
avatar.on(StreamingEvents.STREAM_READY, (event) => {
  videoRef.current.srcObject = event.detail;
});

// 4. Send AI responses as REPEAT (our LLM, not HeyGen's)
await avatar.speak({
  text: claudeResponse,
  taskType: TaskType.REPEAT,
});

// 5. Handle user speech (custom STT integration)
// Option A: Use Web Speech API (free, browser-native)
// Option B: Use Deepgram via HeyGen SDK
// Option C: Use OpenAI Whisper API

// 6. Interrupt if user starts talking while avatar is speaking
avatar.on(StreamingEvents.USER_START, () => {
  avatar.interrupt();
});

// 7. Cleanup
await avatar.stopAvatar();
```

### New API Routes (Next.js App)

```
POST /api/practice/start
  - Input: { runRequestId, meetingType }
  - Generates persona from existing run research data
  - Creates HeyGen session token
  - Creates PracticeSession in DB
  - Returns: { sessionId, persona, heygenToken, avatarConfig }

POST /api/practice/message
  - Input: { sessionId, userMessage }
  - Loads persona + conversation history
  - Calls Claude API with persona system prompt + history
  - Returns: { response } (streamed)

POST /api/practice/end
  - Input: { sessionId, transcript }
  - Runs CotM scoring evaluation (Claude)
  - Saves score + feedback to PracticeSession
  - Returns: { score, feedback, breakdown }

GET /api/practice/history
  - Returns user's practice sessions with scores
  - Filterable by company, date range
```

### New DB Table (Prisma)

```prisma
model PracticeSession {
  id              String   @id @default(uuid())
  userId          String
  runRequestId    String?  // links to the research run used for persona
  targetCompany   String
  persona         Json     // the generated buyer persona object
  transcript      Json     // array of { role, content, timestamp }
  score           Json?    // CotM breakdown scores
  feedback        String?  // detailed AI feedback
  overallScore    Float?   // 1-5 composite
  duration        Int?     // seconds
  meetingType     String   // discovery, pitch, negotiation, etc.
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@index([userId])
  @@index([userId, targetCompany])
}
```

### New Frontend Pages

```
/practice                    - Practice mode landing (list past sessions, start new)
/practice/[sessionId]        - Active practice session (video + chat + controls)
/practice/[sessionId]/review - Post-session review (transcript, scores, feedback)
/practice/history            - Historical performance (charts, trends, improvement arc)
```

### Worker Changes

None needed for Phase 5 MVP. The research data already exists from previous runs. Persona generation runs on the app side (Claude API call from Next.js API route), not the worker.

## New Environment Variables

```
HEYGEN_API_KEY=xxx          # From HeyGen API (Pay-As-You-Go), NOT the Pro subscription
# Already have:
# ANTHROPIC_API_KEY (for Claude persona + scoring calls)
```

## Build Order

1. **DB migration** — PracticeSession table
2. **Persona generator** — Claude prompt that turns research output into buyer persona JSON
3. **HeyGen integration** — Token generation, avatar session, video rendering
4. **Conversation loop** — STT → Claude → avatar.speak() cycle
5. **Scoring engine** — Post-session CotM evaluation prompt
6. **Frontend** — Practice session page with video, controls, timer
7. **Review page** — Transcript + scores + feedback display
8. **History page** — Performance tracking over time

## Cost Per Session

- HeyGen Streaming Avatar API: Pay-As-You-Go pricing (separate from Pro subscription). ~$0.10/min estimated, 15-20 min session = ~$1.50-2.00
- Claude API (conversation): ~$0.01-0.03 per message (Sonnet), ~15-20 messages per session = ~$0.30-0.60
- Claude API (persona generation): ~$0.05 (one Sonnet call)
- Claude API (scoring): ~$0.05 (one Sonnet call)
- **Total per session: ~$1.90-2.70** (HeyGen API + Claude API)

> **Note:** HeyGen Pro plan ($99/mo) and API are separate products under the same account. API has its own balance ($10 free credit = ~100 min dev/test time). Pro plan used pre-cancellation to clone voices & generate custom avatars (assets persist). Phase 5 runs entirely on the API.

## What Makes This Different From Gong AI Trainer

| | Gong AI Trainer | AltVest Practice Mode |
|---|---|---|
| Persona source | Company's recorded call library | Real-time account research |
| Input required | Thousands of calls | A company name |
| Data ownership | Company's | Yours |
| Portability | Gone when you leave | Follows you |
| Pricing | $100-150/seat/mo enterprise | Included in AltVest subscription |
| CRM dependency | Needs clean CRM data | None |
| Scoring framework | Gong's proprietary | CotM (transparent, customizable) |
| Available to | Enterprise teams on Gong | Anyone |
