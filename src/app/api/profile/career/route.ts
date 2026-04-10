import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { userProfiles } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getApiUser, unauthorized } from "@/lib/supabase/api-auth";
import { ROLE_ARCHETYPES } from "@/lib/ai/archetype-detector";
import { REMOTE_PREFERENCES, isRemotePreference, type RemotePreference } from "@/lib/profile/constants";

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string" && v.trim().length > 0);
}

function toOptionalString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function toOptionalPositiveInt(value: unknown): number | null | "invalid" {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "number" || !Number.isFinite(value)) return "invalid";
  if (!Number.isInteger(value) || value < 0) return "invalid";
  return value;
}

export async function GET() {
  try {
    const user = await getApiUser();
    if (!user) return unauthorized();

    const [profile] = await db
      .select()
      .from(userProfiles)
      .where(eq(userProfiles.userId, user.id))
      .limit(1);

    return NextResponse.json(profile ?? null);
  } catch (error) {
    console.error("GET /api/profile/career error:", error);
    return NextResponse.json({ error: "Failed to load profile" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const user = await getApiUser();
    if (!user) return unauthorized();

    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const targetRoles = toStringArray(body.targetRoles);
    const archetypeCandidates = toStringArray(body.targetArchetypes);
    const targetArchetypes = archetypeCandidates.filter((a) =>
      (ROLE_ARCHETYPES as readonly string[]).includes(a)
    );
    const signatureStrengths = toStringArray(body.signatureStrengths);
    const portfolioUrls = toStringArray(body.portfolioUrls);

    const professionalNarrative = toOptionalString(body.professionalNarrative);
    const exitNarrative = toOptionalString(body.exitNarrative);
    const locationPreference = toOptionalString(body.locationPreference);
    const visaStatus = toOptionalString(body.visaStatus);
    const timezone = toOptionalString(body.timezone);

    const compensationTarget = toOptionalPositiveInt(body.compensationTarget);
    if (compensationTarget === "invalid") {
      return NextResponse.json(
        { error: "compensationTarget must be a non-negative integer" },
        { status: 400 }
      );
    }
    const compensationMinimum = toOptionalPositiveInt(body.compensationMinimum);
    if (compensationMinimum === "invalid") {
      return NextResponse.json(
        { error: "compensationMinimum must be a non-negative integer" },
        { status: 400 }
      );
    }

    const compensationCurrencyRaw = toOptionalString(body.compensationCurrency);
    const compensationCurrency = compensationCurrencyRaw ?? "USD";

    let remotePreference: RemotePreference | null = null;
    if (body.remotePreference !== undefined && body.remotePreference !== null && body.remotePreference !== "") {
      if (!isRemotePreference(body.remotePreference)) {
        return NextResponse.json(
          { error: `remotePreference must be one of ${REMOTE_PREFERENCES.join(", ")}` },
          { status: 400 }
        );
      }
      remotePreference = body.remotePreference;
    }

    const now = new Date();
    const values = {
      userId: user.id,
      targetRoles,
      targetArchetypes,
      professionalNarrative,
      exitNarrative,
      compensationTarget,
      compensationMinimum,
      compensationCurrency,
      locationPreference,
      remotePreference,
      visaStatus,
      timezone,
      signatureStrengths,
      portfolioUrls,
      updatedAt: now,
    };

    const [saved] = await db
      .insert(userProfiles)
      .values(values)
      .onConflictDoUpdate({
        target: userProfiles.userId,
        set: {
          targetRoles,
          targetArchetypes,
          professionalNarrative,
          exitNarrative,
          compensationTarget,
          compensationMinimum,
          compensationCurrency,
          locationPreference,
          remotePreference,
          visaStatus,
          timezone,
          signatureStrengths,
          portfolioUrls,
          updatedAt: now,
        },
      })
      .returning();

    return NextResponse.json(saved);
  } catch (error) {
    console.error("PUT /api/profile/career error:", error);
    return NextResponse.json({ error: "Failed to save profile" }, { status: 500 });
  }
}
