// Tier 2: Parse AI output into structured profile data
// Handles messy output from ChatGPT/Claude/Gemini — markdown code blocks, extra text, partial JSON

interface DealStory {
  title: string;
  customer: string;
  challenge: string;
  solution: string;
  result: string;
  metrics: string;
  sourceUrl: string;
}

interface ValueProp {
  headline: string;
  description: string;
  proofPoint: string;
}

export interface ParsedProfileData {
  companyName?: string;
  companyProduct?: string;
  companyDescription?: string;
  companyDifferentiators?: string;
  companyCompetitors?: string;
  companyTargetMarket?: string;
  companyUrl?: string;
  linkedinAbout?: string;
  linkedinExperience?: string;
  linkedinEducation?: string;
  sellingStyle?: string;
  preferredTone?: string;
  dealStories?: DealStory[];
  valueProps?: ValueProp[];
}

export interface ParseResult {
  parsed: ParsedProfileData;
  errors: string[];
  confidence: number; // 0-1
}

/**
 * Extract JSON from raw AI output text.
 * Handles: ```json ... ```, ```...```, raw JSON, and JSON embedded in text.
 */
function extractJSON(raw: string): string | null {
  // Try markdown code block first (```json ... ``` or ``` ... ```)
  const codeBlockMatch = raw.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
  if (codeBlockMatch) {
    return codeBlockMatch[1].trim();
  }

  // Try to find JSON object directly ({ ... })
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    return jsonMatch[0].trim();
  }

  return null;
}

/**
 * Try to parse potentially malformed JSON with recovery attempts.
 */
function tryParse(jsonStr: string): Record<string, unknown> | null {
  // Direct parse
  try {
    return JSON.parse(jsonStr);
  } catch {
    // Continue to recovery
  }

  // Try fixing common issues:
  // 1. Trailing commas
  let fixed = jsonStr.replace(/,\s*([}\]])/g, "$1");
  try {
    return JSON.parse(fixed);
  } catch {
    // Continue
  }

  // 2. Single quotes instead of double quotes
  fixed = jsonStr.replace(/'/g, '"');
  try {
    return JSON.parse(fixed);
  } catch {
    // Continue
  }

  // 3. Unquoted keys
  fixed = jsonStr.replace(/(\{|,)\s*(\w+)\s*:/g, '$1"$2":');
  try {
    return JSON.parse(fixed);
  } catch {
    return null;
  }
}

/**
 * Validate and clean a deal story object.
 */
function cleanDealStory(raw: Record<string, unknown>): DealStory | null {
  const story: DealStory = {
    title: String(raw.title || ""),
    customer: String(raw.customer || ""),
    challenge: String(raw.challenge || raw.pain || raw.painPoint || ""),
    solution: String(raw.solution || raw.approach || raw.whatYouDid || ""),
    result: String(raw.result || raw.outcome || raw.results || ""),
    metrics: String(raw.metrics || raw.keyMetrics || raw.metric || ""),
    sourceUrl: String(raw.sourceUrl || raw.source_url || raw.url || ""),
  };

  // Need at least title and customer
  if (!story.title && !story.customer) return null;
  return story;
}

/**
 * Validate and clean a value prop object.
 */
function cleanValueProp(raw: Record<string, unknown>): ValueProp | null {
  const prop: ValueProp = {
    headline: String(raw.headline || raw.title || ""),
    description: String(raw.description || raw.desc || ""),
    proofPoint: String(raw.proofPoint || raw.proof_point || raw.proof || raw.proofPoints || ""),
  };

  if (!prop.headline) return null;
  return prop;
}

/**
 * Main parse function. Takes raw AI output text and returns structured profile data.
 */
export function parseAIOutput(
  rawText: string,
  promptType: "quick_interview" | "one_shot" = "one_shot"
): ParseResult {
  const errors: string[] = [];
  const parsed: ParsedProfileData = {};

  if (!rawText || !rawText.trim()) {
    return { parsed, errors: ["Empty input"], confidence: 0 };
  }

  const jsonStr = extractJSON(rawText);
  if (!jsonStr) {
    return {
      parsed,
      errors: ["Could not find JSON in the response. Make sure the AI output includes a JSON code block."],
      confidence: 0,
    };
  }

  const data = tryParse(jsonStr);
  if (!data) {
    return {
      parsed,
      errors: ["Found JSON but it's malformed. Try asking the AI to regenerate just the JSON block."],
      confidence: 0,
    };
  }

  let fieldsFound = 0;
  let totalFields = 0;

  // String fields
  const stringFields: (keyof ParsedProfileData)[] = [
    "companyName",
    "companyProduct",
    "companyDescription",
    "companyDifferentiators",
    "companyCompetitors",
    "companyTargetMarket",
    "companyUrl",
    "linkedinAbout",
    "linkedinExperience",
    "linkedinEducation",
    "sellingStyle",
    "preferredTone",
  ];

  for (const field of stringFields) {
    totalFields++;
    // Try camelCase and snake_case variants
    const snakeCase = field.replace(/([A-Z])/g, "_$1").toLowerCase();
    const value = data[field] ?? data[snakeCase];
    if (value && String(value).trim()) {
      (parsed as Record<string, unknown>)[field] = String(value).trim();
      fieldsFound++;
    }
  }

  // Deal stories
  totalFields++;
  const rawStories = (data.dealStories ?? data.deal_stories ?? []) as Record<string, unknown>[];
  if (Array.isArray(rawStories) && rawStories.length > 0) {
    const stories = rawStories.map(cleanDealStory).filter(Boolean) as DealStory[];
    if (stories.length > 0) {
      parsed.dealStories = stories;
      fieldsFound++;
    } else {
      errors.push("Deal stories were found but couldn't be parsed. Check the format.");
    }
  }

  // Value props
  totalFields++;
  const rawProps = (data.valueProps ?? data.value_props ?? []) as Record<string, unknown>[];
  if (Array.isArray(rawProps) && rawProps.length > 0) {
    const props = rawProps.map(cleanValueProp).filter(Boolean) as ValueProp[];
    if (props.length > 0) {
      parsed.valueProps = props;
      fieldsFound++;
    } else {
      errors.push("Value props were found but couldn't be parsed. Check the format.");
    }
  }

  const confidence = totalFields > 0 ? fieldsFound / totalFields : 0;

  if (fieldsFound === 0) {
    errors.push("JSON was parsed but no recognizable fields were found.");
  }

  return { parsed, errors, confidence };
}

/**
 * Merge parsed data into existing profile, only overwriting non-empty fields.
 */
export function mergeIntoProfile(
  existing: ParsedProfileData,
  incoming: ParsedProfileData
): ParsedProfileData {
  const merged = { ...existing };

  for (const [key, value] of Object.entries(incoming)) {
    if (value === undefined || value === null || value === "") continue;
    if (Array.isArray(value) && value.length === 0) continue;
    (merged as Record<string, unknown>)[key] = value;
  }

  return merged;
}
