"use client";

import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ResumeUpload } from "@/components/resume-upload";
import { DocumentManager } from "@/components/document-manager";
import { ResumeList } from "@/components/resume-list";
import { CompanyLogo } from "@/components/company-logo";
import { toast } from "sonner";
import type { ParsedResume } from "@/lib/db/schema";

interface DashboardStatus {
  hasResume: boolean;
  resumeId: string | null;
  resumeName: string | null;
  companyCount: number;
  matchCount: number;
}

interface TopMatch {
  companyId: string;
  companyName: string;
  batch: string | null;
  description: string | null;
  industries: string[];
  logoUrl: string | null;
  overallScore: number;
  explanation: string;
}

export default function DashboardPage() {
  const [resumeId, setResumeId] = useState<string | null>(null);
  const [parsedResume, setParsedResume] = useState<ParsedResume | null>(null);
  const [isScoring, setIsScoring] = useState(false);
  const [rerank, setRerank] = useState(false);
  const [statusLoading, setStatusLoading] = useState(true);
  const [existingMatches, setExistingMatches] = useState(0);
  const [companyCount, setCompanyCount] = useState(0);
  const [hasApiKey, setHasApiKey] = useState(false);
  const [topMatches, setTopMatches] = useState<TopMatch[]>([]);
  const [docs, setDocs] = useState<{ type: string; title: string }[]>([]);

  const isSetup = !resumeId;
  const hasData = existingMatches > 0;

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
    async function loadMatches() {
      try {
        const res = await fetch("/api/matches");
        if (!res.ok) return;
        const data = await res.json();
        if (data.matches?.length > 0) {
          setTopMatches(data.matches.slice(0, 6));
        }
      } catch {}
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
    async function checkKeys() {
      try {
        const res = await fetch("/api/keys");
        if (res.ok) {
          const data = await res.json();
          setHasApiKey(data.keys?.length > 0);
        }
      } catch {}
    }
    loadStatus();
    loadMatches();
    loadDocs();
    checkKeys();
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

  // ── Setup mode: first-time user ──
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

  // ── Home mode: populated dashboard ──
  return (
    <div className="space-y-8">
      {/* Header row */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            {companyCount.toLocaleString()} companies indexed
            {existingMatches > 0 && ` · ${existingMatches} matches`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer text-sm">
            <input
              type="checkbox"
              checked={rerank}
              onChange={(e) => setRerank(e.target.checked)}
              className="h-3.5 w-3.5 accent-primary"
            />
            AI rerank
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

      {/* Top matches */}
      {topMatches.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Top matches</h2>
            <a href="/matches" className="text-xs text-primary hover:underline">
              View all {existingMatches}
            </a>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {topMatches.map((m) => (
              <a
                key={m.companyId}
                href="/matches"
                className="flex items-start gap-3 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <CompanyLogo logoUrl={m.logoUrl} companyName={m.companyName} size="sm" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium truncate">{m.companyName}</span>
                    <span className="text-sm font-bold text-primary tabular-nums shrink-0">{m.overallScore}</span>
                  </div>
                  {m.batch && (
                    <span className="text-[11px] text-muted-foreground">{m.batch}</span>
                  )}
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{m.description}</p>
                  {m.industries.length > 0 && (
                    <div className="flex gap-1 mt-1.5">
                      {m.industries.slice(0, 2).map((ind) => (
                        <Badge key={ind} variant="secondary" className="text-[9px] px-1.5 py-0">{ind}</Badge>
                      ))}
                    </div>
                  )}
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Three-column: Resume summary | Profile | Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Resume summary */}
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

        {/* Profile */}
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

        {/* Quick stats + actions */}
        <div className="space-y-6">
          {/* Stats */}
          <Card>
            <CardContent className="p-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-2xl font-bold">{existingMatches}</div>
                  <div className="text-xs text-muted-foreground">Matches</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">{companyCount.toLocaleString()}</div>
                  <div className="text-xs text-muted-foreground">Companies</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">{docs.length}</div>
                  <div className="text-xs text-muted-foreground">Documents</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-muted-foreground/50">0</div>
                  <div className="text-xs text-muted-foreground">Jobs found</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Job agent placeholder */}
          <Card className="border-dashed">
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <svg className="w-4 h-4 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                  </svg>
                </div>
                <div>
                  <div className="text-sm font-medium">Job search agent</div>
                  <div className="text-xs text-muted-foreground">Coming soon</div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                An AI agent that automatically searches LinkedIn, Indeed, Glassdoor, and job boards to find matching positions for you.
              </p>
            </CardContent>
          </Card>

          {/* Quick links */}
          <div className="space-y-2">
            <a
              href="/matches"
              className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors text-sm"
            >
              <span>View all matches</span>
              <svg className="w-4 h-4 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </a>
            <a
              href="/emails"
              className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors text-sm"
            >
              <span>Email outreach</span>
              <svg className="w-4 h-4 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </a>
            <a
              href="/settings"
              className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors text-sm"
            >
              <span>Settings & API keys</span>
              <svg className="w-4 h-4 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
