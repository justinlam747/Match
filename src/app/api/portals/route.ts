import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { portals, portalScanHistory } from "@/lib/db/schema";
import type { PortalRow, PortalScanHistoryRow } from "@/lib/db/schema";
import { and, desc, eq, isNull, or } from "drizzle-orm";
import { getApiUser, unauthorized } from "@/lib/supabase/api-auth";

const ATS_TYPES = ["greenhouse", "ashby", "lever", "custom"] as const;
type AtsType = (typeof ATS_TYPES)[number];

function isAtsType(value: unknown): value is AtsType {
  return typeof value === "string" && (ATS_TYPES as readonly string[]).includes(value);
}

function toOptionalString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

type PortalWithLastScan = PortalRow & {
  lastScan: Pick<PortalScanHistoryRow, "scannedAt" | "jobsFound" | "newJobs" | "error"> | null;
};

export async function GET() {
  try {
    const user = await getApiUser();
    if (!user) return unauthorized();

    const rows = await db
      .select()
      .from(portals)
      .where(or(eq(portals.userId, user.id), isNull(portals.userId)))
      .orderBy(desc(portals.createdAt));

    // Zip in the most recent scan history row per portal (simple N+1, small N).
    const result: PortalWithLastScan[] = await Promise.all(
      rows.map(async (row) => {
        const [last] = await db
          .select({
            scannedAt: portalScanHistory.scannedAt,
            jobsFound: portalScanHistory.jobsFound,
            newJobs: portalScanHistory.newJobs,
            error: portalScanHistory.error,
          })
          .from(portalScanHistory)
          .where(eq(portalScanHistory.portalId, row.id))
          .orderBy(desc(portalScanHistory.scannedAt))
          .limit(1);

        return { ...row, lastScan: last ?? null };
      })
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error("GET /api/portals error:", error);
    return NextResponse.json({ error: "Failed to load portals" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getApiUser();
    if (!user) return unauthorized();

    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const name = toOptionalString(body.name);
    if (!name) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    const careersUrlRaw = toOptionalString(body.careersUrl);
    if (!careersUrlRaw) {
      return NextResponse.json({ error: "careersUrl is required" }, { status: 400 });
    }
    try {
      new URL(careersUrlRaw);
    } catch {
      return NextResponse.json({ error: "careersUrl must be a valid URL" }, { status: 400 });
    }

    if (!isAtsType(body.atsType)) {
      return NextResponse.json(
        { error: `atsType must be one of ${ATS_TYPES.join(", ")}` },
        { status: 400 }
      );
    }
    const atsType: AtsType = body.atsType;

    const apiEndpointRaw = toOptionalString(body.apiEndpoint);
    if (apiEndpointRaw) {
      try {
        new URL(apiEndpointRaw);
      } catch {
        return NextResponse.json(
          { error: "apiEndpoint must be a valid URL when provided" },
          { status: 400 }
        );
      }
    }

    const notes = toOptionalString(body.notes);

    // Prevent duplicate (user, careersUrl) rows at the app level.
    const existing = await db
      .select({ id: portals.id })
      .from(portals)
      .where(and(eq(portals.userId, user.id), eq(portals.careersUrl, careersUrlRaw)))
      .limit(1);
    if (existing.length > 0) {
      return NextResponse.json(
        { error: "A portal with this careers URL already exists" },
        { status: 409 }
      );
    }

    const now = new Date();
    const [created] = await db
      .insert(portals)
      .values({
        userId: user.id,
        name,
        careersUrl: careersUrlRaw,
        apiEndpoint: apiEndpointRaw,
        atsType,
        notes,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    const response: PortalWithLastScan = { ...created, lastScan: null };
    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error("POST /api/portals error:", error);
    return NextResponse.json({ error: "Failed to create portal" }, { status: 500 });
  }
}
