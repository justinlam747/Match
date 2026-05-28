"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import type { ParsedResume } from "@/lib/db/schema";

interface ResumeFull {
  id: string;
  name: string;
  rawText: string | null;
  parsedData: ParsedResume | null;
  createdAt: string;
}

export function ResumeViewer({
  resumeId,
  open,
  onClose,
}: {
  resumeId: string | null;
  open: boolean;
  onClose: () => void;
}) {
  const [resume, setResume] = useState<ResumeFull | null>(null);
  const [showRaw, setShowRaw] = useState(false);

  useEffect(() => {
    if (!open || !resumeId) return;
    let cancelled = false;
    fetch(`/api/resumes?id=${resumeId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { if (!cancelled) setResume(data?.resume ?? null); })
      .catch(() => { if (!cancelled) setResume(null); });
    return () => { cancelled = true; };
  }, [open, resumeId]);

  // Only treat the loaded resume as current if it matches the requested id —
  // avoids flashing stale data when switching between resumes.
  const ready = !!resume && resume.id === resumeId;
  const loading = open && !!resumeId && !ready;

  const p = ready ? resume.parsedData : null;
  const skills = p
    ? [...new Set([
        ...p.skills.languages,
        ...p.skills.frameworks,
        ...p.skills.tools,
        ...p.skills.databases,
        ...p.skills.cloud,
      ])]
    : [];

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) { setShowRaw(false); onClose(); } }}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto overflow-x-hidden p-6 sm:p-8">
        <DialogHeader>
          <DialogTitle>{ready ? resume.name : "Resume"}</DialogTitle>
          {p && (
            <DialogDescription className="flex items-center gap-2 text-xs">
              <Badge variant="outline" className="text-[10px]">{p.seniority_level}</Badge>
              <span>{p.years_of_experience}y experience</span>
            </DialogDescription>
          )}
        </DialogHeader>

        {loading && (
          <div className="flex items-center justify-center py-16">
            <div className="h-6 w-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          </div>
        )}

        {ready && (
          <div className="space-y-5 text-sm">
            {p ? (
              <>
                {skills.length > 0 && (
                  <div>
                    <h4 className="text-xs font-medium text-muted-foreground mb-2">Skills</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {skills.map((s) => (
                        <Badge key={s} variant="secondary" className="text-xs font-normal">{s}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {p.experience.length > 0 && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <h4 className="text-xs font-medium text-muted-foreground">Experience</h4>
                      {p.experience.map((exp, i) => (
                        <div key={i}>
                          <div className="font-medium">{exp.title} <span className="text-muted-foreground font-normal">at {exp.company}</span></div>
                          <div className="text-xs text-muted-foreground">
                            {exp.industry}
                            {exp.duration_months ? ` · ${Math.round(exp.duration_months / 12 * 10) / 10}y` : ""}
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {p.industries_worked_in.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <h4 className="text-xs font-medium text-muted-foreground mb-2">Industries</h4>
                      <div className="flex flex-wrap gap-1.5">
                        {p.industries_worked_in.map((ind) => (
                          <Badge key={ind} variant="outline" className="text-xs font-normal">{ind}</Badge>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {p.standout_signals.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <h4 className="text-xs font-medium text-muted-foreground mb-2">Standout signals</h4>
                      <div className="flex flex-wrap gap-1.5">
                        {p.standout_signals.map((sig) => (
                          <Badge key={sig} className="text-xs font-normal bg-primary/10 text-primary border-0">{sig}</Badge>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </>
            ) : (
              <p className="text-muted-foreground">This resume hasn&apos;t been parsed.</p>
            )}

            {resume.rawText && (
              <>
                <Separator />
                <button
                  onClick={() => setShowRaw((v) => !v)}
                  className="text-xs text-primary hover:underline"
                >
                  {showRaw ? "Hide" : "Show"} extracted text
                </button>
                {showRaw && (
                  <pre className="text-xs text-muted-foreground whitespace-pre-wrap break-words leading-relaxed max-h-72 overflow-y-auto font-sans bg-muted/40 rounded-lg p-3">
                    {resume.rawText}
                  </pre>
                )}
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
