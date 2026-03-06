import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/db";

/**
 * Asset proxy route — serves files from Supabase storage bucket "assets".
 *
 * URL pattern: /api/assets/{requestId}/{filename}
 *
 * The worker uploads generated assets (PDFs, PNGs, HTML) to Supabase storage.
 * This route proxies those files to authenticated users, so we can:
 * 1. Enforce auth (only the user who owns the request can download)
 * 2. Set correct Content-Type and Content-Disposition headers
 * 3. Keep Supabase service key server-side
 *
 * Requires env vars:
 * - SUPABASE_URL (e.g., https://nbbazxqcpzxrzdvngscq.supabase.co)
 * - SUPABASE_SERVICE_KEY (service role key for storage access)
 */

const CONTENT_TYPES: Record<string, string> = {
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".html": "text/html",
  ".json": "application/json",
};

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  // Auth check
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const pathSegments = params.path;
  if (!pathSegments || pathSegments.length < 2) {
    return NextResponse.json(
      { error: "Invalid path - expected /api/assets/{requestId}/{filename}" },
      { status: 400 }
    );
  }

  // Ownership check: first segment is the requestId
  const requestId = pathSegments[0];
  const runRequest = await prisma.runRequest.findUnique({
    where: { id: requestId },
    select: { user: { select: { clerkId: true } } },
  });

  if (!runRequest) {
    return NextResponse.json({ error: "Request not found" }, { status: 404 });
  }

  if (runRequest.user.clerkId !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error("[ASSETS] Missing SUPABASE_URL or SUPABASE_SERVICE_KEY");
    return NextResponse.json(
      { error: "Asset storage not configured" },
      { status: 500 }
    );
  }

  const storagePath = pathSegments.join("/");
  const filename = pathSegments[pathSegments.length - 1];

  // Determine content type from extension
  const ext = filename.substring(filename.lastIndexOf(".")).toLowerCase();
  const contentType = CONTENT_TYPES[ext] || "application/octet-stream";

  try {
    // Fetch from Supabase storage using service key
    const storageUrl = `${supabaseUrl}/storage/v1/object/assets/${storagePath}`;
    const response = await fetch(storageUrl, {
      headers: {
        Authorization: `Bearer ${supabaseKey}`,
        apikey: supabaseKey,
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json({ error: "Asset not found" }, { status: 404 });
      }
      console.error(`[ASSETS] Supabase storage error: ${response.status} ${response.statusText}`);
      return NextResponse.json(
        { error: "Failed to retrieve asset" },
        { status: response.status }
      );
    }

    const body = await response.arrayBuffer();

    // Set headers for inline display (PDFs, images) or download
    const isInline = [".pdf", ".png", ".jpg", ".jpeg", ".html"].includes(ext);
    const disposition = isInline
      ? `inline; filename="${filename}"`
      : `attachment; filename="${filename}"`;

    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": disposition,
        "Cache-Control": "private, max-age=3600",
        "Content-Length": body.byteLength.toString(),
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`[ASSETS] Proxy error:`, message);
    return NextResponse.json(
      { error: "Failed to retrieve asset" },
      { status: 500 }
    );
  }
}
