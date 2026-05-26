import { notFound } from "next/navigation";
import Link from "next/link";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { matchScores, ycCompanies, resumes } from "@/lib/db/schema";
import { requireAuth } from "@/lib/supabase/auth-guard";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  ARCHETYPE_LABELS,
  ARCHETYPE_DESCRIPTIONS,
  type RoleArchetype,
} from "@/lib/ai/archetypes";
import { gradeRecommendation } from "@/lib/ai/grade-calculator";
import type { Grade } from "@/lib/db/schema";

const GRADE_CLASS: Record<Grade, string> = {
  A: "bg-green-500 text-white",
  B: "bg-blue-500 text-white",
  C: "bg-yellow-500 text-white",
  D: "bg-orange-500 text-white",
  E: "bg-red-500 text-white",
  F: "bg-red-500 text-white",
};

function Dimension({
  label,
  value,
  max = 25,
  inverted,
}: {
  label: string;
  value: number | null | undefined;
  max?: number;
  inverted?: boolean;
}) {
  const hasValue = typeof value === "number";
  const pct = hasValue ? Math.max(0, Math.min(100, ((value ?? 0) / max) * 100)) : 0;
  const fill = inverted
    ? "bg-red-500"
    : pct >= 75
      ? "bg-green-500"
      : pct >= 50
        ? "bg-primary"
        : pct >= 25
          ? "bg-yellow-500"
          : "bg-muted-foreground/40";
  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono tabular-nums">
          {hasValue ? `${Math.round(value as number)} / ${max}` : "—"}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div className={`h-full ${fill}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default async function MatchDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireAuth();

  const [row] = await db
    .select({
      score: matchScores,
      company: ycCompanies,
      resume: resumes,
    })
    .from(matchScores)
    .innerJoin(ycCompanies, eq(matchScores.companyId, ycCompanies.id))
    .innerJoin(resumes, eq(matchScores.resumeId, resumes.id))
    .where(and(eq(matchScores.id, id), eq(resumes.userId, user.id)))
    .limit(1);

  if (!row) notFound();

  const { score, company } = row;
  const grade = (score.grade as Grade | null) ?? null;
  const archetype = (score.archetype as RoleArchetype | null) ?? null;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <Link
          href="/dashboard"
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          ← Back to matches
        </Link>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-semibold tracking-tight">{company.name}</h1>
            {company.batch && <Badge variant="secondary">YC {company.batch}</Badge>}
            {company.stage && <Badge variant="outline">{company.stage}</Badge>}
          </div>
          {company.description && (
            <p className="text-sm text-muted-foreground">{company.description}</p>
          )}
          <div className="flex items-center gap-2 flex-wrap pt-1">
            {archetype && (
              <Badge className="bg-blue-500/10 text-blue-700 hover:bg-blue-500/10 border-blue-500/20">
                {ARCHETYPE_LABELS[archetype]}
              </Badge>
            )}
            {(company.industries ?? []).slice(0, 4).map((i) => (
              <Badge key={i} variant="outline" className="text-[11px]">
                {i}
              </Badge>
            ))}
          </div>
        </div>
        {grade && (
          <div className="text-right space-y-1">
            <div
              className={`inline-flex items-center justify-center rounded-md px-3 py-2 text-2xl font-bold ${GRADE_CLASS[grade]}`}
            >
              {grade}
            </div>
            <p className="text-xs text-muted-foreground">
              {gradeRecommendation(grade)}
            </p>
            <p className="text-xs font-mono tabular-nums">
              {Math.round(score.overallScore)} / 100
            </p>
          </div>
        )}
      </div>

      {/* Archetype context */}
      {archetype && (
        <Card>
          <CardContent className="py-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">
              Role archetype
            </p>
            <p className="text-sm">{ARCHETYPE_DESCRIPTIONS[archetype]}</p>
          </CardContent>
        </Card>
      )}

      {/* 8-dimension breakdown */}
      <Card>
        <CardContent className="py-5 space-y-4">
          <h2 className="text-sm font-semibold">Score breakdown</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
            <Dimension label="Industry fit" value={score.industryScore} />
            <Dimension label="Tech alignment" value={score.techScore} />
            <Dimension label="Stage fit" value={score.stageScore} />
            <Dimension label="Hiring signal" value={score.hiringScore} />
            <Dimension label="Compensation" value={score.compensationScore} />
            <Dimension label="Culture" value={score.cultureScore} />
            <Dimension label="North star" value={score.northStarScore} />
            <Dimension label="Red flags (lower is better)" value={score.redFlagScore} inverted />
          </div>
        </CardContent>
      </Card>

      {/* Explanation */}
      {score.explanation && (
        <Card>
          <CardContent className="py-5 space-y-2">
            <h2 className="text-sm font-semibold">Evaluation summary</h2>
            <p className="text-sm whitespace-pre-wrap leading-relaxed text-muted-foreground">
              {score.explanation}
            </p>
          </CardContent>
        </Card>
      )}

    </div>
  );
}
