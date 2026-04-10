import { notFound } from "next/navigation";
import Link from "next/link";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { evaluationReports } from "@/lib/db/schema";
import { requireAuth } from "@/lib/supabase/auth-guard";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const GAP_CLASS: Record<"none" | "nice-to-have" | "hard-blocker", string> = {
  none: "bg-green-500/10 text-green-600",
  "nice-to-have": "bg-yellow-500/10 text-yellow-600",
  "hard-blocker": "bg-red-500/10 text-red-600",
};

function Section({
  letter,
  title,
  children,
}: {
  letter: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="py-5 space-y-3">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-md bg-primary/10 text-primary font-bold text-sm flex items-center justify-center">
            {letter}
          </div>
          <h2 className="text-sm font-semibold">{title}</h2>
        </div>
        {children}
      </CardContent>
    </Card>
  );
}

export default async function ReportDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireAuth();

  const [report] = await db
    .select()
    .from(evaluationReports)
    .where(and(eq(evaluationReports.id, id), eq(evaluationReports.userId, user.id)))
    .limit(1);

  if (!report) notFound();

  const blocks = report.blocks;

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div>
        <Link
          href="/matches"
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          ← Back
        </Link>
      </div>

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            Evaluation Report
          </h1>
          <div className="flex items-center gap-2">
            {report.archetype && (
              <Badge className="bg-blue-500/10 text-blue-700 border-blue-500/20">
                {report.archetype}
              </Badge>
            )}
            {report.grade && (
              <Badge variant="outline">Grade {report.grade}</Badge>
            )}
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          {new Date(report.createdAt).toLocaleString()}
        </p>
      </div>

      {blocks.a && (
        <Section letter="A" title="Role Summary">
          <dl className="grid grid-cols-2 md:grid-cols-3 gap-y-2 gap-x-4 text-xs">
            {(
              [
                ["Archetype", blocks.a.archetype],
                ["Domain", blocks.a.domain],
                ["Function", blocks.a.function],
                ["Seniority", blocks.a.seniority],
                ["Remote", blocks.a.remotePolicy || "—"],
                ["Team size", blocks.a.teamSize || "—"],
              ] as const
            ).map(([label, value]) => (
              <div key={label}>
                <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  {label}
                </dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        </Section>
      )}

      {blocks.b && blocks.b.mappings.length > 0 && (
        <Section letter="B" title="CV Match Mapping">
          <div className="space-y-2.5">
            {blocks.b.mappings.map((m, i) => (
              <div key={i} className="border rounded-lg p-3 space-y-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium">{m.requirement}</p>
                  <Badge className={`${GAP_CLASS[m.gap]} border-0 shrink-0`}>
                    {m.gap}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">{m.evidence}</p>
                {m.mitigation && (
                  <p className="text-xs text-foreground">
                    <span className="text-muted-foreground">Mitigation: </span>
                    {m.mitigation}
                  </p>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}

      {blocks.c && (
        <Section letter="C" title="Level & Strategy">
          <dl className="space-y-2 text-xs">
            {(
              [
                ["Detected level", blocks.c.detectedLevel],
                ["Natural level", blocks.c.naturalLevel],
                ["Sell-up plan", blocks.c.sellUpPlan],
                ["Downlevel fallback", blocks.c.downlevelFallback],
              ] as const
            ).map(([label, value]) => (
              <div key={label}>
                <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  {label}
                </dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        </Section>
      )}

      {blocks.d && (
        <Section letter="D" title="Compensation Analysis">
          <p className="text-sm">
            Market range:{" "}
            <span className="font-mono">{blocks.d.marketRange}</span>
          </p>
          <Badge variant="outline" className="capitalize">
            {blocks.d.verdict}
          </Badge>
          {blocks.d.sources.length > 0 && (
            <ul className="text-xs text-muted-foreground list-disc list-inside">
              {blocks.d.sources.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          )}
        </Section>
      )}

      {blocks.e && (
        <Section letter="E" title="Personalization Plan">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">
                Resume changes
              </p>
              <ul className="text-xs space-y-1 list-disc list-inside">
                {blocks.e.resumeChanges.map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">
                LinkedIn changes
              </p>
              <ul className="text-xs space-y-1 list-disc list-inside">
                {blocks.e.linkedinChanges.map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
              </ul>
            </div>
          </div>
        </Section>
      )}

      {blocks.f && (
        <Section letter="F" title="Interview Prep">
          <p className="text-xs">
            <span className="text-muted-foreground">STAR stories: </span>
            {blocks.f.starStoryCount}
          </p>
          <p className="text-xs">
            <span className="text-muted-foreground">Case study: </span>
            {blocks.f.caseStudy}
          </p>
          {blocks.f.redFlags.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">
                Red flags to address
              </p>
              <ul className="text-xs space-y-1 list-disc list-inside text-destructive">
                {blocks.f.redFlags.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </div>
          )}
        </Section>
      )}
    </div>
  );
}
