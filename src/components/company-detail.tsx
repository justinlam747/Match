"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScoreBreakdown } from "@/components/score-breakdown";
import type { MatchData } from "@/components/match-card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface CompanyDetailProps {
  match: MatchData | null;
  open: boolean;
  onClose: () => void;
}

export function CompanyDetail({ match, open, onClose }: CompanyDetailProps) {
  if (!match) return null;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {match.companyName}
            {match.batch && (
              <Badge variant="secondary" className="text-xs font-normal">
                YC {match.batch}
              </Badge>
            )}
          </DialogTitle>
          {match.description && (
            <DialogDescription className="text-sm leading-relaxed">
              {match.description}
            </DialogDescription>
          )}
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Score breakdown */}
          <ScoreBreakdown
            techScore={match.techScore}
            industryScore={match.industryScore}
            hiringScore={match.hiringScore}
            stageScore={match.stageScore}
            overall={match.overallScore}
          />

          <Separator />

          {/* Explanation */}
          <div>
            <h4 className="text-xs font-medium text-muted-foreground mb-1">
              Why this matches
            </h4>
            <p className="text-sm leading-relaxed">{match.explanation}</p>
          </div>

          {/* Industries */}
          {match.industries.length > 0 && (
            <div>
              <h4 className="text-xs font-medium text-muted-foreground mb-2">
                Industries
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {match.industries.map((ind) => (
                  <Badge key={ind} variant="secondary" className="text-xs font-normal">
                    {ind}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Tech stack */}
          {match.techStack.length > 0 && (
            <div>
              <h4 className="text-xs font-medium text-muted-foreground mb-2">
                Tech stack
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {match.techStack.map((tech) => (
                  <Badge key={tech} variant="outline" className="text-xs font-normal">
                    {tech}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <Separator />

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() =>
                window.open(
                  `https://www.ycombinator.com/companies?q=${encodeURIComponent(match.companyName)}`,
                  "_blank"
                )
              }
            >
              View on YC
            </Button>
            <Button
              size="sm"
              className="flex-1"
              onClick={onClose}
            >
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
