import { createHash, randomBytes } from "crypto";
import prisma from "@/lib/db";

/**
 * Generate a new API key for a user.
 * Returns the plaintext key (show once) and the DB record.
 * Key format: sb_live_<32 random hex chars>
 */
export async function generateApiKey(
  userId: string,
  label: string = "default",
  teamId?: string | null,
  scopes: string[] = ["blitz:create", "blitz:read"]
) {
  const raw = randomBytes(32).toString("hex");
  const plaintext = `sb_live_${raw}`;
  const keyHash = hashKey(plaintext);
  const keyPrefix = plaintext.slice(0, 16) + "...";

  const record = await prisma.apiKey.create({
    data: {
      userId,
      label,
      keyHash,
      keyPrefix,
      teamId: teamId || null,
      scopes: JSON.parse(JSON.stringify(scopes)),
      rateLimit: 10,
    },
  });

  return { plaintext, record };
}

/**
 * Validate an API key from the Authorization header.
 * Returns the ApiKey record + User if valid, null if invalid/revoked/expired.
 */
export async function validateApiKey(authHeader: string | null) {
  if (!authHeader) return null;

  // Support "Bearer <key>" or just "<key>"
  const key = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7).trim()
    : authHeader.trim();

  if (!key || !key.startsWith("sb_live_")) return null;

  const keyHash = hashKey(key);

  const apiKey = await prisma.apiKey.findUnique({
    where: { keyHash },
    include: { user: true },
  });

  if (!apiKey) return null;
  if (apiKey.revoked) return null;
  if (apiKey.expiresAt && new Date(apiKey.expiresAt) < new Date()) return null;

  // Update lastUsedAt (fire-and-forget)
  prisma.apiKey
    .update({ where: { id: apiKey.id }, data: { lastUsedAt: new Date() } })
    .catch(() => {});

  return apiKey;
}

/**
 * Simple per-key rate limiter (in-memory, resets on deploy).
 * For production scale, swap to Redis.
 */
const rateBuckets = new Map<string, { count: number; resetAt: number }>();

export function checkApiKeyRateLimit(apiKeyId: string, limit: number): boolean {
  const now = Date.now();
  const bucket = rateBuckets.get(apiKeyId);

  if (!bucket || now > bucket.resetAt) {
    rateBuckets.set(apiKeyId, { count: 1, resetAt: now + 3600_000 }); // 1 hour window
    return true;
  }

  if (bucket.count >= limit) return false;

  bucket.count++;
  return true;
}

function hashKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}
