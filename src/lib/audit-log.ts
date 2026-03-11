/**
 * Audit logging for security-critical actions.
 *
 * Writes to the audit_log table in Supabase via direct SQL.
 * Non-blocking: failures are logged to console but never throw.
 *
 * Usage:
 *   await auditLog({
 *     userId: user.id,
 *     clerkId: clerkUser.id,
 *     action: "blitz.submitted",
 *     resourceType: "RunRequest",
 *     resourceId: request.id,
 *     request: req,
 *     metadata: { toolName, targetCompany },
 *   });
 */

import { headers } from "next/headers";

type AuditSeverity = "info" | "warning" | "critical";

interface AuditLogEntry {
  userId?: string;
  clerkId?: string;
  action: string;
  resourceType?: string;
  resourceId?: string;
  request?: Request;
  metadata?: Record<string, unknown>;
  severity?: AuditSeverity;
}

// Direct Supabase connection for audit writes (bypasses Prisma)
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

/**
 * Write an audit log entry. Non-blocking, never throws.
 */
export async function auditLog(entry: AuditLogEntry): Promise<void> {
  try {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      console.warn("[audit-log] Missing Supabase credentials, skipping audit log");
      return;
    }

    // Extract IP and user agent from request headers
    let ipAddress: string | null = null;
    let userAgent: string | null = null;

    try {
      const hdrs = await headers();
      ipAddress = hdrs.get("x-forwarded-for")?.split(",")[0]?.trim()
        || hdrs.get("x-real-ip")
        || null;
      userAgent = hdrs.get("user-agent") || null;
    } catch {
      // headers() may fail outside request context
    }

    // If a Request object was passed, try to get headers from it
    if (entry.request && !ipAddress) {
      ipAddress = entry.request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
        || entry.request.headers.get("x-real-ip")
        || null;
      userAgent = userAgent || entry.request.headers.get("user-agent") || null;
    }

    const payload = {
      user_id: entry.userId || null,
      clerk_id: entry.clerkId || null,
      action: entry.action,
      resource_type: entry.resourceType || null,
      resource_id: entry.resourceId || null,
      ip_address: ipAddress,
      user_agent: userAgent ? userAgent.substring(0, 500) : null,
      metadata: entry.metadata || {},
      severity: entry.severity || "info",
    };

    // Fire-and-forget POST to Supabase REST API
    const res = await fetch(`${SUPABASE_URL}/rest/v1/audit_log`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": SUPABASE_SERVICE_KEY,
        "Authorization": `Bearer ${SUPABASE_SERVICE_KEY}`,
        "Prefer": "return=minimal",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      console.error(`[audit-log] Failed to write: ${res.status} ${res.statusText}`);
    }
  } catch (err) {
    console.error("[audit-log] Error writing audit log:", err);
  }
}

// ─── Pre-defined audit actions ─────────────────────────────────────────────

/** Log a blitz request submission */
export function auditBlitzSubmitted(
  userId: string,
  clerkId: string,
  requestId: string,
  metadata: Record<string, unknown>,
  request?: Request
) {
  return auditLog({
    userId,
    clerkId,
    action: "blitz.submitted",
    resourceType: "RunRequest",
    resourceId: requestId,
    metadata,
    request,
  });
}

/** Log a practice session start */
export function auditPracticeStarted(
  userId: string,
  clerkId: string,
  sessionId: string,
  metadata: Record<string, unknown>,
  request?: Request
) {
  return auditLog({
    userId,
    clerkId,
    action: "practice.started",
    resourceType: "PracticeSession",
    resourceId: sessionId,
    metadata,
    request,
  });
}

/** Log a meeting recording upload */
export function auditMeetingUploaded(
  userId: string,
  clerkId: string,
  recordingId: string,
  metadata: Record<string, unknown>,
  request?: Request
) {
  return auditLog({
    userId,
    clerkId,
    action: "meeting.uploaded",
    resourceType: "MeetingRecording",
    resourceId: recordingId,
    metadata,
    request,
  });
}

/** Log an auth token generation (extension, etc.) */
export function auditTokenGenerated(
  clerkId: string,
  metadata: Record<string, unknown>,
  request?: Request
) {
  return auditLog({
    clerkId,
    action: "auth.token_generated",
    resourceType: "AuthToken",
    metadata,
    severity: "info",
    request,
  });
}

/** Log admin actions */
export function auditAdminAction(
  userId: string,
  clerkId: string,
  action: string,
  resourceType: string,
  resourceId: string,
  metadata: Record<string, unknown>,
  request?: Request
) {
  return auditLog({
    userId,
    clerkId,
    action: `admin.${action}`,
    resourceType,
    resourceId,
    metadata,
    severity: "warning",
    request,
  });
}

/** Log failed auth attempts */
export function auditAuthFailure(
  action: string,
  metadata: Record<string, unknown>,
  request?: Request
) {
  return auditLog({
    action: `auth.failure.${action}`,
    metadata,
    severity: "critical",
    request,
  });
}

/** Log profile changes */
export function auditProfileUpdated(
  userId: string,
  clerkId: string,
  metadata: Record<string, unknown>,
  request?: Request
) {
  return auditLog({
    userId,
    clerkId,
    action: "profile.updated",
    resourceType: "UserProfile",
    resourceId: userId,
    metadata,
    request,
  });
}

/** Log subscription/billing events */
export function auditBillingEvent(
  userId: string,
  action: string,
  metadata: Record<string, unknown>,
  request?: Request
) {
  return auditLog({
    userId,
    action: `billing.${action}`,
    resourceType: "Subscription",
    metadata,
    severity: "warning",
    request,
  });
}
