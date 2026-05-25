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
import { Target, GraduationCap, User, UserCog } from "lucide-react";
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
  const [parsedResume, setParsedResume] = useState<ParsedResume | null>(null);
  const [isScoring, setIsScoring] = useState(false);
  const [rerank, setRerank] = useState(true);
  const [statusLoading, setStatusLoading] = useState(true);
  const [existingMatches, setExistingMatches] = useState(0);
  const [companyCount, setCompanyCount] = useState(0);
  const [hasApiKey, setHasApiKey] = useState(false);
  const [docs, setDocs] = useState<{ type: string; title: string }[]>([]);
  const [careerCompleteness, setCareerCompleteness] = useState<{
    percent: number;
    missingFields: string[];
  } | null>(null);

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
    checkKeys();
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

      {/* Feature promo cards */}
      <div>
        <h2 className="font-semibold mb-4">What you can do</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <FeatureCard
            href="/matches"
            icon={Target}
            label="Explore Matches"
            description="Browse your top company matches, filter by batch, tech stack, and industry fit. Export to CSV."
            cta={`View ${existingMatches} matches`}          />
          <FeatureCard
            href="/interview"
            icon={GraduationCap}
            label="Interview Prep"
            description="Practice with AI-generated questions tailored to each company. Company quizzes from real data."
            cta="Start practicing"          />
          <FeatureCard
            href="/profile"
            icon={User}
            label="Your Profile"
            description="See your parsed skills, experience, and how you match. Link GitHub, LinkedIn, and portfolio."
            cta="View profile"          />
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
  icon: Icon,
  label,
  description,
  cta,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  description: string;
  cta: string;
}) {
  return (
    <Link
      href={href}
      className="group border rounded-lg p-5 hover:border-foreground/20 hover:shadow-sm transition-all flex flex-col justify-between"
    >
      <div>
        <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center mb-3">
          <Icon className="w-5 h-5 text-primary-foreground" />
        </div>
        <div className="text-sm font-medium mb-1">{label}</div>
        <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
      </div>
      <div className="text-xs text-primary font-medium mt-3 group-hover:underline">{cta}</div>
    </Link>
  );
}
