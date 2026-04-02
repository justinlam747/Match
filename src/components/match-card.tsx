"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { CompanyLogo } from "@/components/company-logo";

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
}

interface MatchCardProps {
  match: MatchData;
  onToggleSelect: (companyId: string) => void;
  onViewDetail?: (match: MatchData) => void;
}

function scoreColor(score: number): string {
  if (score >= 75) return "text-green-600";
  if (score >= 50) return "text-primary";
  if (score >= 30) return "text-yellow-600";
  return "text-muted-foreground";
}

export function MatchCard({ match, onToggleSelect, onViewDetail }: MatchCardProps) {
  return (
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
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" title="Hiring" />
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
                  <span className="text-[11px] text-muted-foreground">{match.teamSize} people</span>
                </>
              )}
            </div>
          </div>

          {/* Score */}
          <div className={`text-lg font-bold tabular-nums shrink-0 ${scoreColor(match.overallScore)}`}>
            {match.overallScore}
          </div>
        </div>

        {/* Description */}
        {match.description && (
          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
            {match.description}
          </p>
        )}

        {/* Tags row */}
        <div className="flex flex-wrap gap-1">
          {match.industries.slice(0, 2).map((ind) => (
            <Badge key={ind} variant="secondary" className="text-[10px] font-normal px-1.5 py-0">
              {ind}
            </Badge>
          ))}
          {match.techStack.slice(0, 3).map((tech) => (
            <Badge key={tech} variant="outline" className="text-[10px] font-normal px-1.5 py-0">
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
        {onViewDetail && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onViewDetail(match);
            }}
            className="text-xs text-primary hover:underline"
          >
            View details
          </button>
        )}
      </CardContent>
    </Card>
  );
}
