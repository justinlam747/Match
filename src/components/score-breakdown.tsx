"use client";

interface ScoreBreakdownProps {
  techScore: number;
  industryScore: number;
  hiringScore: number; // now "building signal" — reusing the DB column
  stageScore: number;
  overall: number;
}

function scoreColor(overall: number): string {
  if (overall >= 75) return "text-primary";
  if (overall >= 50) return "text-foreground";
  return "text-muted-foreground";
}

function Bar({ value, max }: { value: number; max: number }) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  return (
    <div className="h-1.5 flex-1 bg-muted overflow-hidden">
      <div
        className="h-full bg-primary/70 transition-all duration-500"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function ScoreBreakdown({
  techScore,
  industryScore,
  hiringScore,
  stageScore,
  overall,
}: ScoreBreakdownProps) {
  const dimensions = [
    { label: "Industry", value: industryScore, max: 40 },
    { label: "Stage", value: stageScore, max: 10 },
    { label: "Tech", value: techScore, max: 10 },
  ];

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between">
        <span className="text-xs text-muted-foreground">Match score</span>
        <span className={`text-lg font-semibold tabular-nums ${scoreColor(overall)}`}>
          {overall}
        </span>
      </div>
      <div className="space-y-1">
        {dimensions.map((d) => (
          <div key={d.label} className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground w-14 shrink-0">
              {d.label}
            </span>
            <Bar value={d.value} max={d.max} />
            <span className="text-xs tabular-nums w-5 text-right">
              {d.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
