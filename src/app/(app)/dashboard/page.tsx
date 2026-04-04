"use client";

import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ResumeUpload } from "@/components/resume-upload";
import { DocumentManager } from "@/components/document-manager";
import { ResumeList } from "@/components/resume-list";
import { toast } from "sonner";
import Link from "next/link";
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
  const [parsedResume, setParsedResume] = useState<ParsedResume | null>(null);
  const [isScoring, setIsScoring] = useState(false);
  const [rerank, setRerank] = useState(false);
  const [statusLoading, setStatusLoading] = useState(true);
  const [existingMatches, setExistingMatches] = useState(0);
  const [companyCount, setCompanyCount] = useState(0);
  const [hasApiKey, setHasApiKey] = useState(false);
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

      {/* Feature promo cards */}
      <div>
        <h2 className="font-semibold mb-4">What you can do</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <FeatureCard
            href="/matches"
            icon={
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
              </svg>
            }
            label="Explore Matches"
            description="Browse your top company matches, filter by batch, tech stack, and industry fit. Export to CSV."
            color="bg-primary/10 text-primary"
            cta={`View ${existingMatches} matches`}
          />
          <FeatureCard
            href="/emails"
            icon={
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
              </svg>
            }
            label="Email Outreach"
            description="AI-drafted cold emails to founders and hiring managers. Connect Gmail to send directly."
            color="bg-blue-500/10 text-blue-600"
            cta="Draft emails"
          />
          <FeatureCard
            href="/interview"
            icon={
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 00-.491 6.347A48.62 48.62 0 0112 20.904a48.62 48.62 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.636 50.636 0 00-2.658-.813A59.906 59.906 0 0112 3.493a59.903 59.903 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5" />
              </svg>
            }
            label="Interview Prep"
            description="Practice with AI-generated questions tailored to each company. Company quizzes from real data."
            color="bg-emerald-500/10 text-emerald-600"
            cta="Start practicing"
          />
          <FeatureCard
            href="/agents"
            icon={
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
              </svg>
            }
            label="AI Agents"
            description="Run automated pipelines — scoring, email drafting, contact discovery. Set it and forget it."
            color="bg-violet-500/10 text-violet-600"
            cta="Launch agents"
          />
          <FeatureCard
            href="/profile"
            icon={
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
              </svg>
            }
            label="Your Profile"
            description="See your parsed skills, experience, and how you match. Link GitHub, LinkedIn, and portfolio."
            color="bg-amber-500/10 text-amber-600"
            cta="View profile"
          />
          <div className="border border-dashed rounded-lg p-5 flex flex-col justify-between">
            <div>
              <div className={`w-9 h-9 rounded-lg bg-muted flex items-center justify-center mb-3`}>
                <svg className="w-5 h-5 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
              </div>
              <div className="text-sm font-medium mb-1">Job Search Agent</div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                An AI agent that scans LinkedIn, Indeed, and job boards to surface matching positions automatically.
              </p>
            </div>
            <Badge variant="secondary" className="mt-3 w-fit text-[10px]">Coming soon</Badge>
          </div>
        </div>
      </div>

      {/* Resume & Profile management */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
    </div>
  );
}

function FeatureCard({
  href,
  icon,
  label,
  description,
  color,
  cta,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  description: string;
  color: string;
  cta: string;
}) {
  return (
    <Link
      href={href}
      className="group border rounded-lg p-5 hover:border-foreground/20 hover:shadow-sm transition-all flex flex-col justify-between"
    >
      <div>
        <div className={`w-9 h-9 rounded-lg ${color} flex items-center justify-center mb-3`}>
          {icon}
        </div>
        <div className="text-sm font-medium mb-1">{label}</div>
        <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
      </div>
      <div className="text-xs text-primary font-medium mt-3 group-hover:underline">{cta}</div>
    </Link>
  );
}
