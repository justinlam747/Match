"use client";

import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ResumeUpload } from "@/components/resume-upload";
import { DocumentManager } from "@/components/document-manager";
import { ResumeList } from "@/components/resume-list";
import { MatchesBrowser } from "@/components/matches-browser";
import { toast } from "sonner";
import Link from "next/link";
import { UserCog, ChevronDown } from "lucide-react";
import type { ParsedResume } from "@/lib/db/schema";
import { Progress } from "@/components/ui/progress";
import { getProfileCompleteness } from "@/lib/profile/completeness";

interface DashboardStatus {
  hasResume: boolean;
  resumeId: string | null;
  resumeName: string | null;
  companyCount: number;
  matchCount: number;
}

export default function DashboardPage() {
  const [resumeId, setResumeId] = useState<string | null>(null);
  const [, setParsedResume] = useState<ParsedResume | null>(null);
  const [isScoring, setIsScoring] = useState(false);
  const [rerank, setRerank] = useState(true);
  const [statusLoading, setStatusLoading] = useState(true);
  const [existingMatches, setExistingMatches] = useState(0);
  const [companyCount, setCompanyCount] = useState(0);
  const [docs, setDocs] = useState<{ type: string; title: string }[]>([]);
  const [manageOpen, setManageOpen] = useState(false);
  const [careerCompleteness, setCareerCompleteness] = useState<{
    percent: number;
    missingFields: string[];
  } | null>(null);

  const isSetup = !resumeId;

  useEffect(() => {
    async function loadStatus() {
      try {
        const res = await fetch("/api/dashboard-status");
        if (!res.ok) return;
        const data: DashboardStatus = await res.json();
        if (data.hasResume && data.resumeId) setResumeId(data.resumeId);
        setCompanyCount(data.companyCount);
        if (data.matchCount > 0) setExistingMatches(data.matchCount);
      } catch {
      } finally {
        setStatusLoading(false);
      }
    }
    async function loadDocs() {
      try {
        const res = await fetch("/api/documents");
        if (res.ok) {
          const data = await res.json();
          setDocs(data.documents || []);
        }
      } catch {}
    }
    async function loadCareerProfile() {
      try {
        const res = await fetch("/api/profile/career");
        if (!res.ok) return;
        const data = await res.json();
        setCareerCompleteness(getProfileCompleteness(data));
      } catch {}
    }
    loadStatus();
    loadDocs();
    loadCareerProfile();
  }, []);

  const handleResumeParsed = useCallback(
    (id: string, data: ParsedResume) => {
      setResumeId(id);
      setParsedResume(data);
      setExistingMatches(0);
      toast.success("Resume parsed successfully");
    },
    []
  );

  const handleMatchesLoaded = useCallback((count: number) => {
    setExistingMatches(count);
  }, []);

  async function handleScore() {
    if (!resumeId) return;
    setIsScoring(true);
    try {
      const res = await fetch("/api/score-matches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeId, rerank }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(data.message);
      // Matches now live on this page — reload to surface the fresh scores.
      window.location.reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Scoring failed");
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

  // ── Setup mode: first-time user, no resume yet ──
  if (isSetup) {
    return (
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Get started</h1>
          <p className="text-muted-foreground mt-1">
            Upload your resume to start matching with {companyCount.toLocaleString()} startups.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base">Upload resume</CardTitle>
              <CardDescription className="text-xs">PDF — AI extracts skills, experience, industries</CardDescription>
            </CardHeader>
            <CardContent>
              <ResumeUpload onParsed={handleResumeParsed} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base">Your profile</CardTitle>
              <CardDescription className="text-xs">Add links for better matching</CardDescription>
            </CardHeader>
            <CardContent>
              <DocumentManager />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // ── Home mode: setup controls + stats + inline matches grid ──
  return (
    <div className="space-y-8">
      {/* Header row */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            {companyCount.toLocaleString()} companies indexed
            {existingMatches > 0 && ` · ${existingMatches} matches`}
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <label className="flex items-center gap-2 cursor-pointer text-sm">
            <input
              type="checkbox"
              checked={rerank}
              onChange={(e) => setRerank(e.target.checked)}
              className="h-3.5 w-3.5 accent-primary"
            />
            Fine-tuned scoring
          </label>
          <Button
            onClick={handleScore}
            disabled={isScoring}
            className="h-9 px-5"
          >
            {isScoring ? "Matching..." : existingMatches > 0 ? "Re-match" : "Find matches"}
          </Button>
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{existingMatches}</div>
            <div className="text-xs text-muted-foreground">Matches</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{companyCount.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground">Companies</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{docs.length}</div>
            <div className="text-xs text-muted-foreground">Documents</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-muted-foreground/50">0</div>
            <div className="text-xs text-muted-foreground">Jobs found</div>
          </CardContent>
        </Card>
      </div>

      {/* Career profile completeness */}
      {careerCompleteness && careerCompleteness.percent < 100 && (
        <Card>
          <CardContent className="p-4">
            <Link href="/profile/career" className="group flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <UserCog className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-medium group-hover:underline">
                    Complete your career profile
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {careerCompleteness.percent}%
                  </span>
                </div>
                <Progress value={careerCompleteness.percent} className="mt-2" />
                <p className="text-xs text-muted-foreground mt-2">
                  {careerCompleteness.missingFields.length > 0
                    ? `Still needed: ${careerCompleteness.missingFields.join(", ")}`
                    : "Finish the last details for better matches."}
                </p>
              </div>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Manage resume & profile (collapsed by default) */}
      <div>
        <button
          onClick={() => setManageOpen((v) => !v)}
          className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          aria-expanded={manageOpen}
        >
          <ChevronDown
            className={`w-4 h-4 transition-transform ${manageOpen ? "" : "-rotate-90"}`}
          />
          Manage resume &amp; profile
        </button>

        {manageOpen && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">Resume</CardTitle>
                  <Badge variant="outline" className="text-[10px]">Active</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <ResumeList onActiveChange={(id) => setResumeId(id)} />
                <Separator />
                <ResumeUpload onParsed={handleResumeParsed} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">Profile</CardTitle>
                  {docs.length > 0 && (
                    <span className="text-[11px] text-muted-foreground">{docs.length} linked</span>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <DocumentManager />
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      <Separator />

      {/* Inline matches grid */}
      <MatchesBrowser onLoaded={handleMatchesLoaded} />
    </div>
  );
}
