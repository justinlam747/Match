// Application pipeline state machine. Adapted from career-ops (MIT).
// See THIRD_PARTY_LICENSES.md.

import type { ApplicationStatus } from "@/lib/db/schema";

export const APPLICATION_STATUSES: readonly ApplicationStatus[] = [
  "discovered",
  "evaluating",
  "ready",
  "applied",
  "phone-screen",
  "technical",
  "onsite",
  "offer",
  "accepted",
  "rejected",
  "withdrawn",
] as const;

export const STATUS_LABEL: Record<ApplicationStatus, string> = {
  discovered: "Discovered",
  evaluating: "Evaluating",
  ready: "Ready to apply",
  applied: "Applied",
  "phone-screen": "Phone screen",
  technical: "Technical",
  onsite: "Onsite",
  offer: "Offer",
  accepted: "Accepted",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
};

/** Ordered "happy path" — used to detect skipping more than one stage. */
const ORDERED_PIPELINE: ApplicationStatus[] = [
  "discovered",
  "evaluating",
  "ready",
  "applied",
  "phone-screen",
  "technical",
  "onsite",
  "offer",
  "accepted",
];

const TERMINAL: Set<ApplicationStatus> = new Set([
  "accepted",
  "rejected",
  "withdrawn",
]);

/**
 * Validate a proposed status transition. Rules:
 *  - Any non-terminal state may transition to "rejected" or "withdrawn" at any time.
 *  - Pipeline stages must progress forward or stay in place; they may skip at
 *    most one stage (e.g. discovered → applied is allowed, discovered → onsite
 *    is not) so we catch obvious mistakes without being pedantic about edge
 *    cases like recruiter-inserted steps.
 *  - Terminal states cannot transition further.
 */
export function canTransition(
  from: ApplicationStatus,
  to: ApplicationStatus
): { ok: true } | { ok: false; reason: string } {
  if (from === to) return { ok: true };
  if (TERMINAL.has(from)) {
    return { ok: false, reason: `Cannot leave terminal status "${from}"` };
  }
  if (to === "rejected" || to === "withdrawn") return { ok: true };

  const fromIdx = ORDERED_PIPELINE.indexOf(from);
  const toIdx = ORDERED_PIPELINE.indexOf(to);
  if (fromIdx === -1 || toIdx === -1) {
    return { ok: false, reason: `Unknown status in transition` };
  }
  if (toIdx < fromIdx) {
    return {
      ok: false,
      reason: `Cannot move backwards (${from} → ${to})`,
    };
  }
  if (toIdx - fromIdx > 2) {
    return {
      ok: false,
      reason: `Cannot skip more than one stage (${from} → ${to})`,
    };
  }
  return { ok: true };
}

export const KANBAN_COLUMNS: ApplicationStatus[] = [
  "discovered",
  "evaluating",
  "ready",
  "applied",
  "phone-screen",
  "technical",
  "onsite",
  "offer",
];
