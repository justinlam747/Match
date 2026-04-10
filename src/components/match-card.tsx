"use client";

import { AlertTriangle, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { CompanyLogo } from "@/components/company-logo";
import {
  ARCHETYPE_DESCRIPTIONS,
  ARCHETYPE_LABELS,
  type RoleArchetype,
} from "@/lib/ai/archetype-detector";
import { gradeFromDimension } from "@/lib/ai/grade-calculator";
import type { Grade, GradeBreakdown } from "@/lib/db/schema";

export interface MatchData {
  companyId: string;
  companyName: string;
  batch: string | null;
  description: string | null;
  longDescription: string | null;
  industries: string[];
  techStack: string[];
  logoUrl: string | null;
  website: string | null;
  location: string | null;
  stage: string | null;
  isHiring: boolean;
  teamSize: number | null;
  overallScore: number;
  techScore: number;
  industryScore: number;
  hiringScore: number;
  stageScore: number;
  explanation: string;
  selected: boolean;
  compensationScore?: number | null;
  cultureScore?: number | null;
  redFlagScore?: number | null;
  northStarScore?: number | null;
  archetype?: RoleArchetype | null;
  grade?: Grade | null;
  gradeBreakdown?: GradeBreakdown | null;
  matchId?: string;
}

interface MatchCardProps {
  match: MatchData;
  onToggleSelect: (companyId: string) => void;
  onViewDetail?: (match: MatchData) => void;
}

const GRADE_CLASSES: Record<Grade, string> = {
  A: "bg-green-500 text-white",
  B: "bg-blue-500 text-white",
  C: "bg-yellow-500 text-white",
  D: "bg-orange-500 text-white",
  E: "bg-red-500 text-white",
  F: "bg-red-500 text-white",
};

function scoreColor(score: number): string {
  if (score >= 75) return "text-green-600";
  if (score >= 50) return "text-primary";
  if (score >= 30) return "text-yellow-600";
  return "text-muted-foreground";
}

interface DimensionSpec {
  key: string;
  label: string;
  value: number | null | undefined;
  inverted?: boolean;
}

function clampPct(score: number): number {
  const pct = (score / 25) * 100;
  if (pct < 0) return 0;
  if (pct > 100) return 100;
  return pct;
}

function DimensionBar({ spec }: { spec: DimensionSpec }) {
  const hasValue = typeof spec.value === "number";
  const pct = hasValue ? clampPct(spec.value as number) : 0;
  const fillClass = spec.inverted
    ? "bg-red-500"
    : pct >= 75
      ? "bg-green-500"
      : pct >= 50
        ? "bg-primary"
        : pct >= 25
          ? "bg-yellow-500"
          : "bg-muted-foreground/40";
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[9px] text-muted-foreground w-7 shrink-0 tabular-nums">
        {spec.label}
      </span>
      <div className="flex-1 h-1 rounded-full bg-muted overflow-hidden">
        {hasValue && (
          <div
            className={`h-full ${fillClass} transition-all`}
            style={{ width: `${pct}%` }}
          />
        )}
      </div>
    </div>
  );
}

function compensationGrade(
  match: MatchData
): Grade | null {
  if (match.gradeBreakdown?.compensation) return match.gradeBreakdown.compensation;
  if (typeof match.compensationScore === "number") {
    return gradeFromDimension(match.compensationScore);
  }
  return null;
}

export function MatchCard({ match, onToggleSelect, onViewDetail }: MatchCardProps) {
  const dimensions: DimensionSpec[] = [
    { key: "tech", label: "Tech", value: match.techScore },
    { key: "industry", label: "Ind", value: match.industryScore },
    { key: "stage", label: "Stg", value: match.stageScore },
    { key: "hiring", label: "Hir", value: match.hiringScore },
    { key: "compensation", label: "Comp", value: match.compensationScore },
    { key: "culture", label: "Cult", value: match.cultureScore },
    { key: "redFlag", label: "Rf", value: match.redFlagScore, inverted: true },
    { key: "northStar", label: "NS", value: match.northStarScore },
  ];

  const showRedFlag =
    typeof match.redFlagScore === "number" && match.redFlagScore >= 15;
  const showNorthStar =
    typeof match.northStarScore === "number" && match.northStarScore >= 20;
  const compGrade = compensationGrade(match);

  return (
    <TooltipProvider>
      <Card
        className={`cursor-pointer transition-all hover:shadow-md ${
          match.selected
            ? "ring-2 ring-primary shadow-sm"
            : "hover:ring-1 hover:ring-border"
        }`}
        onClick={() => onToggleSelect(match.companyId)}
      >
        <CardContent className="p-4 space-y-3">
          {/* Header with logo */}
          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={match.selected}
              onChange={() => onToggleSelect(match.companyId)}
              onClick={(e) => e.stopPropagation()}
              className="mt-1 h-3.5 w-3.5 accent-primary shrink-0"
            />

            <CompanyLogo logoUrl={match.logoUrl} companyName={match.companyName} size="sm" />

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-medium text-sm truncate">{match.companyName}</h3>
                {match.isHiring && (
                  <span
                    className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0"
                    title="Hiring"
                  />
                )}
                {showRedFlag && (
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <AlertTriangle
                          className="h-3.5 w-3.5 shrink-0 text-red-500"
                          onClick={(e) => e.stopPropagation()}
                        />
                      }
                    />
                    <TooltipContent>High red flag signals detected</TooltipContent>
                  </Tooltip>
                )}
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                {match.batch && (
                  <span className="text-[11px] text-muted-foreground">{match.batch}</span>
                )}
                {match.batch && match.stage && (
                  <span className="text-muted-foreground/40">·</span>
                )}
                {match.stage && (
                  <span className="text-[11px] text-muted-foreground">{match.stage}</span>
                )}
                {match.teamSize && (
                  <>
                    <span className="text-muted-foreground/40">·</span>
                    <span className="text-[11px] text-muted-foreground">
                      {match.teamSize} people
                    </span>
                  </>
                )}
              </div>
              {/* Archetype row */}
              {match.archetype && (
                <div className="flex items-center gap-1.5 mt-1">
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <Badge
                          variant="secondary"
                          className="text-[10px] font-normal px-1.5 py-0"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {ARCHETYPE_LABELS[match.archetype]}
                        </Badge>
                      }
                    />
                    <TooltipContent>
                      {ARCHETYPE_DESCRIPTIONS[match.archetype]}
                    </TooltipContent>
                  </Tooltip>
                  {showNorthStar && (
                    <Tooltip>
                      <TooltipTrigger
                        render={
                          <Star
                            className="h-3 w-3 shrink-0 text-amber-500 fill-current"
                            onClick={(e) => e.stopPropagation()}
                          />
                        }
                      />
                      <TooltipContent>
                        Strong alignment with career trajectory
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>
              )}
            </div>

            {/* Grade badge or score */}
            {match.grade ? (
              <div
                className={`shrink-0 rounded-md px-2 py-1 text-sm font-bold tabular-nums ${GRADE_CLASSES[match.grade]}`}
                title={`Grade ${match.grade} (${match.overallScore})`}
              >
                {match.grade}
              </div>
            ) : (
              <div
                className={`text-lg font-bold tabular-nums shrink-0 ${scoreColor(
                  match.overallScore
                )}`}
              >
                {match.overallScore}
              </div>
            )}
          </div>

          {/* Description */}
          {match.description && (
            <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
              {match.description}
            </p>
          )}

          {/* Dimension bars */}
          <div className="grid grid-cols-2 gap-x-3 gap-y-1">
            {dimensions.map((d) => (
              <DimensionBar key={d.key} spec={d} />
            ))}
          </div>

          {/* Compensation indicator */}
          {compGrade && (
            <p className="text-[10px] text-muted-foreground">
              Comp: <span className="font-medium">{compGrade}</span>
            </p>
          )}

          {/* Tags row */}
          <div className="flex flex-wrap gap-1">
            {match.industries.slice(0, 2).map((ind) => (
              <Badge
                key={ind}
                variant="secondary"
                className="text-[10px] font-normal px-1.5 py-0"
              >
                {ind}
              </Badge>
            ))}
            {match.techStack.slice(0, 3).map((tech) => (
              <Badge
                key={tech}
                variant="outline"
                className="text-[10px] font-normal px-1.5 py-0"
              >
                {tech}
              </Badge>
            ))}
            {match.techStack.length > 3 && (
              <span className="text-[10px] text-muted-foreground">
                +{match.techStack.length - 3}
              </span>
            )}
          </div>

          {/* Explanation */}
          <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2">
            {match.explanation}
          </p>

          {/* Footer */}
          <div className="flex items-center gap-3">
            {onViewDetail && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onViewDetail(match);
                }}
                className="text-xs text-primary hover:underline"
              >
                Quick view
              </button>
            )}
            {match.matchId && (
              <a
                href={`/matches/${match.matchId}`}
                onClick={(e) => e.stopPropagation()}
                className="text-xs text-primary hover:underline"
              >
                Full report →
              </a>
            )}
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}
