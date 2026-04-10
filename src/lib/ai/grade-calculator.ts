// Grade band thresholds adapted from career-ops (MIT). See THIRD_PARTY_LICENSES.md.
import type { Grade } from "@/lib/db/schema";

export type { Grade };

// Half-open intervals: a score in [min, maxExclusive) maps to that grade.
// F is the catch-all for anything below 2.0 (including negatives and NaN).
export const GRADE_BANDS: ReadonlyArray<{ grade: Grade; min: number; maxExclusive: number }> = [
  { grade: "A", min: 4.5, maxExclusive: Number.POSITIVE_INFINITY },
  { grade: "B", min: 4.0, maxExclusive: 4.5 },
  { grade: "C", min: 3.5, maxExclusive: 4.0 },
  { grade: "D", min: 3.0, maxExclusive: 3.5 },
  { grade: "E", min: 2.0, maxExclusive: 3.0 },
  { grade: "F", min: Number.NEGATIVE_INFINITY, maxExclusive: 2.0 },
] as const;

export function normalizeScore(overall: number, maxOverall: number): number {
  if (!Number.isFinite(overall) || !Number.isFinite(maxOverall) || maxOverall <= 0) {
    return 0;
  }
  const ratio = overall / maxOverall;
  const scaled = ratio * 5;
  if (scaled < 0) return 0;
  if (scaled > 5) return 5;
  return scaled;
}

export function calculateGrade(normalized0to5: number): Grade {
  if (!Number.isFinite(normalized0to5)) return "F";
  if (normalized0to5 >= 4.5) return "A";
  if (normalized0to5 >= 4.0) return "B";
  if (normalized0to5 >= 3.5) return "C";
  if (normalized0to5 >= 3.0) return "D";
  if (normalized0to5 >= 2.0) return "E";
  return "F";
}

export function gradeFromOverall(overall: number, maxOverall: number): Grade {
  return calculateGrade(normalizeScore(overall, maxOverall));
}

// Per-dimension helper: dimension scores use a 0–25 scale, grades use 0–5.
export function gradeFromDimension(score: number, max = 25): Grade {
  return calculateGrade(normalizeScore(score, max));
}

export function gradeRecommendation(grade: Grade): string {
  if (grade === "A" || grade === "B") return "Apply now";
  if (grade === "C") return "Selective — apply if other signals are strong";
  return "Skip";
}
