"use client";

import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { CompanyLogo } from "@/components/company-logo";
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

// YC long_descriptions are free-form text with raw URLs and "*" bullet markers
// dumped inline. Render them as a lead paragraph + a spaced bulleted list of
// compact links + a trailing paragraph for any prose after the list.
function linkLabel(url: string): string {
  try {
    const u = new URL(url);
    const seg = u.pathname.split("/").filter(Boolean).pop();
    return seg ? decodeURIComponent(seg).replace(/[-_]+/g, " ") : u.hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

// Turn inline URLs into compact clickable links; leave other text as-is.
function linkify(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let key = 0;
  for (const part of text.split(/(https?:\/\/[^\s]+)/g)) {
    if (!part) continue;
    if (/^https?:\/\//.test(part)) {
      const url = part.replace(/[.,);]+$/, "");
      nodes.push(
        <a
          key={key++}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary underline underline-offset-2 hover:text-primary/80 break-words"
        >
          {linkLabel(url)}
        </a>
      );
    } else {
      nodes.push(part);
    }
  }
  return nodes;
}

function CompanyDescription({ text, className }: { text: string; className?: string }) {
  // Split on the "*" bullet markers. First chunk is lead prose; the rest are
  // bullet items (each a URL), with any prose after a link pulled into a trailing paragraph.
  const segments = text.split(/\s*\*\s+/).map((s) => s.trim()).filter(Boolean);
  const lead = segments[0] ?? "";
  const bullets: string[] = [];
  let trailing = "";

  for (const seg of segments.slice(1)) {
    const m = seg.match(/^(https?:\/\/\S+)(\s+[\s\S]+)?$/);
    if (m) {
      bullets.push(m[1]);
      if (m[2]?.trim()) trailing += (trailing ? " " : "") + m[2].trim();
    } else {
      trailing += (trailing ? " " : "") + seg;
    }
  }

  return (
    <div className={className}>
      {lead && <p className="break-words">{linkify(lead)}</p>}
      {bullets.length > 0 && (
        <ul className="list-disc pl-5 space-y-2 mt-3">
          {bullets.map((b, i) => (
            <li key={i} className="break-words">{linkify(b)}</li>
          ))}
        </ul>
      )}
      {trailing && <p className="break-words mt-3">{linkify(trailing)}</p>}
    </div>
  );
}

export function CompanyDetail({ match, open, onClose }: CompanyDetailProps) {
  if (!match) return null;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto overflow-x-hidden">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <CompanyLogo logoUrl={match.logoUrl} companyName={match.companyName} size="md" />
            <div>
              <DialogTitle className="flex items-center gap-2">
                {match.companyName}
                {match.isHiring && (
                  <Badge variant="default" className="text-[10px]">Hiring</Badge>
                )}
              </DialogTitle>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                {match.batch && <span>{match.batch}</span>}
                {match.stage && <><span>·</span><span>{match.stage}</span></>}
                {match.teamSize && <><span>·</span><span>{match.teamSize} people</span></>}
                {match.location && <><span>·</span><span>{match.location}</span></>}
              </div>
            </div>
          </div>
          {(match.longDescription || match.description) && (
            <>
              <DialogDescription className="sr-only">
                {match.longDescription || match.description}
              </DialogDescription>
              <CompanyDescription
                text={match.longDescription || match.description || ""}
                className="text-sm leading-relaxed mt-2 text-muted-foreground"
              />
            </>
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
            <p className="text-sm leading-relaxed break-words">{match.explanation}</p>
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
            {match.website && (
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => window.open(match.website!, "_blank")}
              >
                Visit website
              </Button>
            )}
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
