"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ScoreBreakdown } from "@/components/score-breakdown";

export interface MatchData {
  companyId: string;
  companyName: string;
  batch: string | null;
  description: string | null;
  industries: string[];
  techStack: string[];
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
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={match.selected}
                onChange={() => onToggleSelect(match.companyId)}
                onClick={(e) => e.stopPropagation()}
                className="h-3.5 w-3.5 rounded accent-primary"
              />
              <h3 className="font-medium text-sm truncate">
                {match.companyName}
              </h3>
            </div>
            {match.batch && (
              <span className="text-xs text-muted-foreground ml-5.5">
                YC {match.batch}
              </span>
            )}
          </div>
          {match.overallScore >= 75 && (
            <Badge variant="default" className="text-[10px] shrink-0">
              Top match
            </Badge>
          )}
        </div>

        {/* Description */}
        {match.description && (
          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
            {match.description}
          </p>
        )}

        {/* Industries */}
        {match.industries.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {match.industries.slice(0, 3).map((ind) => (
              <Badge
                key={ind}
                variant="secondary"
                className="text-[11px] font-normal px-1.5 py-0"
              >
                {ind}
              </Badge>
            ))}
          </div>
        )}

        {/* Tech stack preview */}
        {match.techStack.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {match.techStack.slice(0, 4).map((tech) => (
              <Badge
                key={tech}
                variant="outline"
                className="text-[10px] font-normal px-1.5 py-0"
              >
                {tech}
              </Badge>
            ))}
            {match.techStack.length > 4 && (
              <span className="text-[10px] text-muted-foreground">
                +{match.techStack.length - 4}
              </span>
            )}
          </div>
        )}

        {/* Score */}
        <ScoreBreakdown
          techScore={match.techScore}
          industryScore={match.industryScore}
          hiringScore={match.hiringScore}
          stageScore={match.stageScore}
          overall={match.overallScore}
        />

        {/* Explanation */}
        <p className="text-xs text-muted-foreground leading-relaxed">
          {match.explanation}
        </p>

        {/* View detail */}
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
