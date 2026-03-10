import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { PDFParse } from "pdf-parse";
import mammoth from "mammoth";

// POST /api/profile/upload-resume
// Accepts a file upload (PDF or DOCX), extracts text, returns it.
// The caller then sends the extracted text to /api/profile/parse-resume
// for AI extraction. This keeps the upload route fast and the AI route reusable.
export async function POST(req: NextRequest) {
  try {
    const clerkUser = await currentUser();
    if (!clerkUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/plain",
    ];
    const ext = file.name.toLowerCase().split(".").pop();
    const isAllowed =
      allowedTypes.includes(file.type) ||
      ext === "pdf" ||
      ext === "docx" ||
      ext === "txt";

    if (!isAllowed) {
      return NextResponse.json(
        { error: "Unsupported file type. Upload a PDF, DOCX, or TXT file." },
        { status: 400 }
      );
    }

    // 5MB limit
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File too large. Maximum 5MB." },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    let extractedText = "";

    if (ext === "pdf" || file.type === "application/pdf") {
      const parser = new PDFParse(buffer);
      const textResult = await parser.getText();
      extractedText = textResult.text;
    } else if (
      ext === "docx" ||
      file.type ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) {
      const result = await mammoth.extractRawText({ buffer });
      extractedText = result.value;
    } else {
      // Plain text
      extractedText = buffer.toString("utf-8");
    }

    // Clean up extracted text
    extractedText = extractedText
      .replace(/\r\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    if (extractedText.length < 50) {
      return NextResponse.json(
        {
          error:
            "Could not extract enough text from this file. Try pasting your resume instead.",
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      text: extractedText,
      fileName: file.name,
      charCount: extractedText.length,
    });
  } catch (err) {
    console.error("Resume upload error:", err);
    return NextResponse.json(
      { error: "Failed to process file. Try pasting your resume instead." },
      { status: 500 }
    );
  }
}
