#!/usr/bin/env node
/**
 * Generate a realistic AI avatar image for the marketing site practice section.
 * Run: GOOGLE_API_KEY=your_key node scripts/generate-avatar.js
 * Output: public/avatar-practice.png
 */

const { GoogleGenAI } = require("@google/genai");
const fs = require("fs");
const path = require("path");

async function main() {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    console.error("Set GOOGLE_API_KEY environment variable");
    process.exit(1);
  }

  const genAI = new GoogleGenAI({ apiKey });

  console.log("Generating avatar image...");

  const response = await genAI.models.generateContent({
    model: "gemini-2.5-flash-image",
    contents: [
      {
        role: "user",
        parts: [
          {
            text: `Generate a professional headshot photo of a woman in her mid-30s who is a VP of Sales Enablement at a tech company. She should be:
- Looking directly at camera with a confident, friendly expression
- Professional business attire (dark blazer)
- Well-lit studio lighting, slightly blurred background
- Warm skin tones, natural look
- Square crop, head and shoulders framing
- The image should look like a real LinkedIn headshot, not AI-generated
- Dark background to match a dark UI (gray-900)
- High quality, photorealistic

This will be used as a small avatar in a dark-themed web interface mockup.`,
          },
        ],
      },
    ],
    config: {
      responseModalities: ["image", "text"],
    },
  });

  const candidate = response.candidates?.[0];
  if (!candidate?.content?.parts) {
    console.error("No image in response");
    process.exit(1);
  }

  for (const part of candidate.content.parts) {
    if (part.inlineData) {
      const buffer = Buffer.from(part.inlineData.data, "base64");
      const outPath = path.join(__dirname, "..", "public", "avatar-practice.png");
      fs.writeFileSync(outPath, buffer);
      console.log(`Avatar saved to ${outPath} (${buffer.length} bytes)`);
      return;
    }
  }

  console.error("No image data found in response");
  process.exit(1);
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
