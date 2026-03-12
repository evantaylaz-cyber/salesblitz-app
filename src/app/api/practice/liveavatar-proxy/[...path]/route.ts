import { NextRequest, NextResponse } from "next/server";

/**
 * LiveAvatar API Proxy
 *
 * The LiveAvatar SDK makes browser-side fetch calls to api.liveavatar.com,
 * but that API does NOT set CORS headers for external domains. Calls from
 * app.salesblitz.ai get blocked with "TypeError: Failed to fetch".
 *
 * Fix: route SDK traffic through this proxy by passing
 *   apiUrl: "/api/practice/liveavatar-proxy"
 * in the LiveAvatarSession config. The SDK then calls our server instead
 * of api.liveavatar.com, and we forward the request server-side.
 *
 * Supported: POST (start, stop, keep-alive) and GET (session info).
 */

const LIVEAVATAR_API = "https://api.liveavatar.com";

async function proxyRequest(req: NextRequest, params: Promise<{ path: string[] }>) {
  const { path } = await params;
  const targetPath = "/" + path.join("/");
  const targetUrl = `${LIVEAVATAR_API}${targetPath}`;

  // Forward the Authorization header from the SDK (Bearer session_token)
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };

  const authHeader = req.headers.get("Authorization");
  if (authHeader) {
    headers["Authorization"] = authHeader;
  }

  const fetchOptions: RequestInit = {
    method: req.method,
    headers,
  };

  // Forward request body for POST/PUT/PATCH
  if (req.method !== "GET" && req.method !== "HEAD") {
    try {
      const body = await req.text();
      if (body) fetchOptions.body = body;
    } catch {
      // No body, that's fine (e.g. POST with no body for session/start)
    }
  }

  try {
    const res = await fetch(targetUrl, fetchOptions);
    const data = await res.json();

    // Log session/start response so we can debug LiveKit connection issues
    if (targetPath.includes("/sessions/start")) {
      console.log(`[LIVEAVATAR-PROXY] session/start response:`, JSON.stringify(data, null, 2));
    }

    return NextResponse.json(data, { status: res.status });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Proxy error";
    console.error(`[LIVEAVATAR-PROXY] ${req.method} ${targetPath} failed:`, message);
    return NextResponse.json(
      { code: 500, message: `LiveAvatar proxy error: ${message}` },
      { status: 502 }
    );
  }
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(req, ctx.params);
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(req, ctx.params);
}
