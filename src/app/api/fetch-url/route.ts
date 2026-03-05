import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";

// Fetch a URL and use Claude to extract structured data from it
export async function POST(req: NextRequest) {
  try {
    const clerkUser = await currentUser();
    if (!clerkUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { url, type } = await req.json();

    if (!url || !type) {
      return NextResponse.json(
        { error: "url and type are required" },
        { status: 400 }
      );
    }

    // Validate URL
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
      if (!["http:", "https:"].includes(parsedUrl.protocol)) {
        throw new Error("Invalid protocol");
      }
    } catch {
      return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
    }

    // Block LinkedIn (can't scrape it)
    if (parsedUrl.hostname.includes("linkedin.com")) {
      return NextResponse.json(
        { error: "LinkedIn profiles cannot be fetched automatically. Please paste the profile content manually." },
        { status: 400 }
      );
    }

    // Fetch the page
    let pageText: string;
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; AltVest/1.0)",
          Accept: "text/html,application/xhtml+xml,text/plain",
        },
        signal: AbortSignal.timeout(15000),
      });

      if (!res.ok) {
        return NextResponse.json(
          { error: `Failed to fetch URL (${res.status})` },
          { status: 400 }
        );
      }

      const html = await res.text();
      // Strip HTML tags to get plain text
      pageText = html
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
        .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, "")
        .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, "")
        .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, "")
        .replace(/<[^>]+>/g, " ")
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&#\d+;/g, "")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 30000); // Cap at 30k chars for Claude context
    } catch (e) {
      return NextResponse.json(
        { error: "Failed to fetch URL. Make sure it's a public page." },
        { status: 400 }
      );
    }

    if (pageText.length < 50) {
      return NextResponse.json(
        { error: "Page appears to be empty or requires login. This site may use JavaScript rendering — try pasting the job description manually instead." },
        { status: 400 }
      );
    }

    console.log(`[fetch-url] Extracted ${pageText.length} chars from ${parsedUrl.hostname} (type: ${type})`);

    // Build extraction prompt based on type
    let extractionPrompt: string;

    if (type === "company_website") {
      extractionPrompt = `You are extracting structured company information from a website. Analyze this page content and return a JSON object with these fields:

{
  "companyName": "The company name",
  "companyProduct": "What product/service does this company sell? Be specific about category and target buyer.",
  "companyDescription": "2-3 sentence elevator pitch for the company",
  "companyDifferentiators": "What makes them different? Key advantages, unique approach, technology, etc.",
  "companyCompetitors": "Any competitors mentioned or implied. If none obvious, leave empty.",
  "companyTargetMarket": "Who are their customers? Company size, industry, buyer persona if discernible."
}

Only include fields where you found clear evidence. Leave fields as empty string "" if you can't determine them from the page.

PAGE CONTENT:
${pageText}

Return ONLY valid JSON, no markdown fencing, no explanation.`;
    } else if (type === "case_study") {
      extractionPrompt = `You are extracting a customer case study / success story from a web page. Analyze this content and return a JSON object:

{
  "company": "Customer company name",
  "industry": "Customer's industry",
  "challenge": "What problem did the customer face?",
  "solution": "How was it solved?",
  "results": "Quantified outcomes and metrics",
  "quote": "A customer quote if one exists, otherwise empty string"
}

Only include fields where you found clear evidence. Leave as "" if not found.

PAGE CONTENT:
${pageText}

Return ONLY valid JSON, no markdown fencing, no explanation.`;
    } else if (type === "job_posting") {
      extractionPrompt = `You are extracting a job posting from a web page. Return the full job description text — title, responsibilities, requirements, qualifications, benefits, etc. Preserve the structure but strip navigation/ads/footer content.

PAGE CONTENT:
${pageText}

Return ONLY the job description text, nothing else.`;
    } else if (type === "deal_story") {
      extractionPrompt = `You are extracting a customer win / deal story from a web page (could be a case study, press release, or blog post). Return a JSON object:

{
  "title": "Short title for this story",
  "customer": "Customer company name",
  "challenge": "What was the customer's challenge?",
  "solution": "What was sold / how was it solved?",
  "result": "What was the outcome?",
  "metrics": "Key numbers — deal size, ROI, time saved, etc."
}

Leave fields as "" if not found.

PAGE CONTENT:
${pageText}

Return ONLY valid JSON, no markdown fencing, no explanation.`;
    } else if (type === "competitor") {
      extractionPrompt = `You are extracting competitor information from a company website. Return a JSON object:

{
  "name": "Company name",
  "product": "What they sell",
  "positioning": "How they position themselves — key messaging, tagline, value prop",
  "strengths": "Apparent strengths from their messaging",
  "pricing": "Any pricing info visible"
}

Leave fields as "" if not found.

PAGE CONTENT:
${pageText}

Return ONLY valid JSON, no markdown fencing, no explanation.`;
    } else {
      return NextResponse.json(
        { error: "Invalid type. Must be: company_website, case_study, job_posting, deal_story, competitor" },
        { status: 400 }
      );
    }

    // Call Claude to extract
    const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
    if (!ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: "AI extraction not configured" },
        { status: 500 }
      );
    }

    const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL || "claude-3-5-sonnet-20241022",
        max_tokens: 2000,
        messages: [
          {
            role: "user",
            content: extractionPrompt,
          },
        ],
      }),
    });

    if (!claudeRes.ok) {
      const errBody = await claudeRes.text();
      console.error("Claude API error:", claudeRes.status, errBody);
      // Surface a more useful error message
      let detail = "AI extraction failed";
      if (claudeRes.status === 401) {
        detail = "AI extraction failed — invalid API key";
      } else if (claudeRes.status === 429) {
        detail = "AI extraction failed — rate limited. Try again in a minute.";
      } else if (claudeRes.status === 529 || claudeRes.status === 503) {
        detail = "AI extraction failed — service temporarily overloaded. Try again shortly.";
      } else {
        try {
          const parsed = JSON.parse(errBody);
          if (parsed?.error?.message) {
            detail = `AI extraction failed — ${parsed.error.message}`;
          }
        } catch {
          // keep generic message
        }
      }
      return NextResponse.json(
        { error: detail },
        { status: 500 }
      );
    }

    const claudeData = await claudeRes.json();
    const rawOutput = claudeData.content?.[0]?.text || "";

    // For job_posting type, return raw text
    if (type === "job_posting") {
      return NextResponse.json({ extracted: { jobDescription: rawOutput }, type });
    }

    // For structured types, parse JSON
    try {
      // Strip any markdown fencing Claude might add despite instructions
      const cleaned = rawOutput.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      const parsed = JSON.parse(cleaned);
      return NextResponse.json({ extracted: parsed, type });
    } catch {
      // If JSON parsing fails, return the raw text
      return NextResponse.json({ extracted: { raw: rawOutput }, type });
    }
  } catch (error) {
    console.error("Fetch URL error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
