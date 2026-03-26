import { db } from "@/lib/db";
import { auditLogs } from "@/lib/db/schema";

type AuditAction =
  | "resume.uploaded"
  | "resume.parsed"
  | "companies.scraped"
  | "companies.enriched"
  | "matches.scored"
  | "contacts.found"
  | "email.drafted"
  | "email.edited"
  | "email.sent"
  | "email.opened"
  | "email.bounced"
  | "email.complained"
  | "user.signed_in"
  | "user.signed_out";

interface AuditEntry {
  userId?: string | null;
  action: AuditAction;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
}

/**
 * Log an audit event. Fire-and-forget — errors are caught
 * so audit logging never breaks the main request flow.
 */
export async function logAuditEvent(entry: AuditEntry): Promise<void> {
  try {
    await db.insert(auditLogs).values({
      userId: entry.userId ?? null,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId ?? null,
      metadata: entry.metadata ?? null,
    });
  } catch (err) {
    console.error("Audit log failed:", err);
  }
}
