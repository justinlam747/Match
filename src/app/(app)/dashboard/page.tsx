"use client";

import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ResumeUpload } from "@/components/resume-upload";
import { toast } from "sonner";
import type { ParsedResume } from "@/lib/db/schema";

interface DashboardStatus {
  hasResume: boolean;
  resumeId: string | null;
  resumeName: string | null;
  companyCount: number;
  matchCount: number;
}

export default function DashboardPage() {
  const [resumeId, setResumeId] = useState<string | null>(null);
  const [isScraping, setIsScraping] = useState(false);
  const [isScoring, setIsScoring] = useState(false);
  const [scrapeDone, setScrapeDone] = useState(false);
  const [scrapeCount, setScrapeCount] = useState(0);
  const [statusLoading, setStatusLoading] = useState(true);
  const [existingMatches, setExistingMatches] = useState(0);

  // Load existing status on mount
  useEffect(() => {
    async function loadStatus() {
      try {
        const res = await fetch("/api/dashboard-status");
        if (!res.ok) return;
        const data: DashboardStatus = await res.json();

        if (data.hasResume && data.resumeId) {
          setResumeId(data.resumeId);
        }
        if (data.companyCount > 0) {
          setScrapeDone(true);
          setScrapeCount(data.companyCount);
        }
        if (data.matchCount > 0) {
          setExistingMatches(data.matchCount);
        }
      } catch {
        // silently fail — user can still use the dashboard
      } finally {
        setStatusLoading(false);
      }
    }
    loadStatus();
  }, []);

  const step = resumeId ? (scrapeDone ? 3 : 2) : 1;
  const progress = resumeId ? (scrapeDone ? 66 : 33) : 0;

  const handleResumeParsed = useCallback(
    (id: string, _data: ParsedResume) => {
      setResumeId(id);
      setExistingMatches(0); // new resume means new matches needed
      toast.success("Resume parsed successfully");
    },
    []
  );

  async function handleScrape() {
    setIsScraping(true);
    try {
      const res = await fetch("/api/scrape-yc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ batches: ["W25", "S24", "W24"] }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      const total = Object.values(data.results as Record<string, number>).reduce((a, b) => a + b, 0);
      setScrapeCount(total);
      setScrapeDone(true);
      toast.success(`Imported ${total} companies`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Scraping failed");
    } finally {
      setIsScraping(false);
    }
  }

  async function handleScore() {
    if (!resumeId) return;
    setIsScoring(true);
    try {
      const res = await fetch("/api/score-matches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("Scoring complete — redirecting to matches");
      window.location.href = "/matches";
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Scoring failed");
    } finally {
      setIsScoring(false);
    }
  }

  if (statusLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="h-6 w-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Three steps to personalized outreach at every YC company that fits you.
        </p>
      </div>

      {/* Existing matches banner */}
      {existingMatches > 0 && (
        <div className="rounded-lg bg-primary/5 border border-primary/10 px-4 py-3 flex items-center justify-between">
          <div className="text-sm">
            <span className="font-medium text-primary">{existingMatches} matches</span>
            <span className="text-muted-foreground"> from your last scoring run</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => (window.location.href = "/matches")}
          >
            View matches
          </Button>
        </div>
      )}

      {/* Progress bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Step {step} of 3</span>
          <span>{Math.round(progress)}% complete</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Step 1 */}
      <Card className={resumeId ? "border-primary/30 bg-primary/[0.02]" : ""}>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Badge
              variant={resumeId ? "default" : "outline"}
              className="h-6 w-6 p-0 flex items-center justify-center text-xs rounded-full"
            >
              {resumeId ? "\u2713" : "1"}
            </Badge>
            <CardTitle className="text-base">Upload resume</CardTitle>
          </div>
          <CardDescription>
            PDF only. AI extracts your skills, experience, and industries.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResumeUpload onParsed={handleResumeParsed} />
        </CardContent>
      </Card>

      {/* Step 2 */}
      <Card className={scrapeDone ? "border-primary/30 bg-primary/[0.02]" : ""}>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Badge
              variant={scrapeDone ? "default" : "outline"}
              className="h-6 w-6 p-0 flex items-center justify-center text-xs rounded-full"
            >
              {scrapeDone ? "\u2713" : "2"}
            </Badge>
            <CardTitle className="text-base">Import YC companies</CardTitle>
          </div>
          <CardDescription>
            Pulls W25, S24, and W24 batches from the YC directory and enriches
            tech stacks with AI.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {scrapeDone ? (
            <div className="flex items-center gap-2 text-sm">
              <Badge variant="secondary">{scrapeCount} companies</Badge>
              <span className="text-muted-foreground">imported and enriched</span>
            </div>
          ) : (
            <Button
              variant="outline"
              onClick={handleScrape}
              disabled={isScraping}
            >
              {isScraping ? (
                <span className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full border-2 border-current border-t-transparent animate-spin" />
                  Importing...
                </span>
              ) : (
                "Import companies"
              )}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Step 3 */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className="h-6 w-6 p-0 flex items-center justify-center text-xs rounded-full"
            >
              3
            </Badge>
            <CardTitle className="text-base">Score matches</CardTitle>
          </div>
          <CardDescription>
            Ranks companies by tech overlap, industry fit, hiring signals, and
            stage match.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={handleScore}
            disabled={isScoring || !resumeId || !scrapeDone}
          >
            {isScoring ? (
              <span className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full border-2 border-current border-t-transparent animate-spin" />
                Scoring...
              </span>
            ) : existingMatches > 0 ? (
              "Re-score matches"
            ) : (
              "Score & rank matches"
            )}
          </Button>
          {(!resumeId || !scrapeDone) && (
            <p className="text-xs text-muted-foreground mt-2">
              {!resumeId && !scrapeDone
                ? "Complete steps 1 and 2 first."
                : !resumeId
                ? "Upload your resume first."
                : "Import companies first."}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
