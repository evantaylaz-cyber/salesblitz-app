import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import prisma from "@/lib/db";
import { generateApiKey } from "@/lib/api-keys";

/**
 * GET /api/keys — List the current user's API keys (no plaintext, just metadata).
 */
export async function GET() {
  try {
    const clerkUser = await currentUser();
    if (!clerkUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { clerkId: clerkUser.id },
    });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const keys = await prisma.apiKey.findMany({
      where: { userId: user.id },
      select: {
        id: true,
        label: true,
        keyPrefix: true,
        teamId: true,
        scopes: true,
        rateLimit: true,
        lastUsedAt: true,
        expiresAt: true,
        revoked: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ keys });
  } catch (error) {
    console.error("List API keys error:", error);
    return NextResponse.json({ error: "Failed to list keys" }, { status: 500 });
  }
}

/**
 * POST /api/keys — Generate a new API key.
 * Body: { label?: string, teamId?: string }
 * Returns the plaintext key ONCE. It cannot be retrieved again.
 */
export async function POST(req: NextRequest) {
  try {
    const clerkUser = await currentUser();
    if (!clerkUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { clerkId: clerkUser.id },
    });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Cap at 5 active keys per user
    const activeCount = await prisma.apiKey.count({
      where: { userId: user.id, revoked: false },
    });
    if (activeCount >= 5) {
      return NextResponse.json(
        { error: "Maximum 5 active API keys per account. Revoke an existing key first." },
        { status: 400 }
      );
    }

    const body = await req.json();
    const label = body.label || "default";
    const teamId = body.teamId || null;

    // If team-scoped, verify membership
    if (teamId) {
      const membership = await prisma.teamMember.findFirst({
        where: { teamId, userId: user.id, inviteStatus: "accepted" },
      });
      if (!membership) {
        return NextResponse.json(
          { error: "Not a member of this team" },
          { status: 403 }
        );
      }
    }

    const { plaintext, record } = await generateApiKey(user.id, label, teamId);

    return NextResponse.json({
      key: plaintext, // Show ONCE
      id: record.id,
      label: record.label,
      keyPrefix: record.keyPrefix,
      message: "Save this key now. It cannot be retrieved again.",
    });
  } catch (error) {
    console.error("Generate API key error:", error);
    return NextResponse.json({ error: "Failed to generate key" }, { status: 500 });
  }
}

/**
 * DELETE /api/keys — Revoke an API key.
 * Body: { keyId: string }
 */
export async function DELETE(req: NextRequest) {
  try {
    const clerkUser = await currentUser();
    if (!clerkUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { clerkId: clerkUser.id },
    });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const body = await req.json();
    const { keyId } = body;

    if (!keyId) {
      return NextResponse.json({ error: "keyId is required" }, { status: 400 });
    }

    // Verify ownership
    const apiKey = await prisma.apiKey.findUnique({ where: { id: keyId } });
    if (!apiKey || apiKey.userId !== user.id) {
      return NextResponse.json({ error: "Key not found" }, { status: 404 });
    }

    await prisma.apiKey.update({
      where: { id: keyId },
      data: { revoked: true },
    });

    return NextResponse.json({ success: true, message: "API key revoked" });
  } catch (error) {
    console.error("Revoke API key error:", error);
    return NextResponse.json({ error: "Failed to revoke key" }, { status: 500 });
  }
}
