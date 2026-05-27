export interface ProfileCompleteness {
  percent: number;
  missingFields: string[];
}

const CORE_FIELDS = [
  "targetRoles",
  "targetArchetypes",
  "professionalNarrative",
  "compensationMinimum",
  "locationPreference",
  "signatureStrengths",
] as const;

// Human-readable labels for the UI ("Still needed: …") instead of raw field keys.
const FIELD_LABELS: Record<(typeof CORE_FIELDS)[number], string> = {
  targetRoles: "Target roles",
  targetArchetypes: "Target archetypes",
  professionalNarrative: "Professional narrative",
  compensationMinimum: "Minimum compensation",
  locationPreference: "Location preference",
  signatureStrengths: "Signature strengths",
};

export interface ProfileCompletenessInput {
  targetRoles?: string[] | null;
  targetArchetypes?: string[] | null;
  professionalNarrative?: string | null;
  compensationMinimum?: number | null;
  locationPreference?: string | null;
  signatureStrengths?: string[] | null;
}

export function getProfileCompleteness(
  profile: ProfileCompletenessInput | null | undefined
): ProfileCompleteness {
  if (!profile) {
    return { percent: 0, missingFields: CORE_FIELDS.map((f) => FIELD_LABELS[f]) };
  }

  const missingFields: string[] = [];

  if (!Array.isArray(profile.targetRoles) || profile.targetRoles.length === 0) {
    missingFields.push("targetRoles");
  }
  if (!Array.isArray(profile.targetArchetypes) || profile.targetArchetypes.length === 0) {
    missingFields.push("targetArchetypes");
  }
  if (
    typeof profile.professionalNarrative !== "string" ||
    profile.professionalNarrative.trim().length === 0
  ) {
    missingFields.push("professionalNarrative");
  }
  if (
    typeof profile.compensationMinimum !== "number" ||
    !Number.isFinite(profile.compensationMinimum) ||
    profile.compensationMinimum < 0
  ) {
    missingFields.push("compensationMinimum");
  }
  if (
    typeof profile.locationPreference !== "string" ||
    profile.locationPreference.trim().length === 0
  ) {
    missingFields.push("locationPreference");
  }
  if (
    !Array.isArray(profile.signatureStrengths) ||
    profile.signatureStrengths.length === 0
  ) {
    missingFields.push("signatureStrengths");
  }

  const filled = CORE_FIELDS.length - missingFields.length;
  const percent = Math.round((filled / CORE_FIELDS.length) * 100);

  return {
    percent,
    missingFields: missingFields.map((k) => FIELD_LABELS[k as (typeof CORE_FIELDS)[number]] ?? k),
  };
}
