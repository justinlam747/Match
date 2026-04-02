"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InterviewFlashcards, type FlashcardQuestion } from "@/components/interview-flashcards";
import { CompanyLogo } from "@/components/company-logo";
import { toast } from "sonner";

type Mode = "interview" | "company-quiz";

interface MatchCompany {
  companyId: string;
  companyName: string;
  batch: string | null;
  description: string | null;
  industries: string[];
  techStack: string[];
  logoUrl: string | null;
  website: string | null;
  stage: string | null;
  overallScore: number;
  techScore: number;
  industryScore: number;
}

interface ActiveSession {
  companyName: string;
  questions: FlashcardQuestion[];
  style: string;
  mode: Mode;
  pagesScraped?: number;
}

const INTERVIEW_PHASES: Record<string, { label: string; icon: string; color: string }> = {
  introduction: { label: "Introduction", icon: "👋", color: "bg-blue-500/10 text-blue-600" },
  background: { label: "Background", icon: "📋", color: "bg-purple-500/10 text-purple-600" },
  technical: { label: "Technical", icon: "⚙️", color: "bg-orange-500/10 text-orange-600" },
  projects: { label: "Projects", icon: "🚀", color: "bg-green-500/10 text-green-600" },
  behavioral: { label: "Behavioral", icon: "🤝", color: "bg-pink-500/10 text-pink-600" },
  closing: { label: "Closing", icon: "🎯", color: "bg-teal-500/10 text-teal-600" },
};

const COMPANY_QUIZ_PHASES: Record<string, { label: string; icon: string; color: string }> = {
  mission: { label: "Mission & Vision", icon: "🏗️", color: "bg-blue-500/10 text-blue-600" },
  product: { label: "Product", icon: "💡", color: "bg-orange-500/10 text-orange-600" },
  market: { label: "Market", icon: "📊", color: "bg-green-500/10 text-green-600" },
  culture: { label: "Culture", icon: "🌱", color: "bg-purple-500/10 text-purple-600" },
  whyyou: { label: "Why You?", icon: "🎯", color: "bg-pink-500/10 text-pink-600" },
};

const INTERVIEW_PHASE_ORDER = ["introduction", "background", "technical", "projects", "behavioral", "closing"];
const COMPANY_QUIZ_PHASE_ORDER = ["mission", "product", "market", "culture", "whyyou"];

export default function InterviewPage() {
  const [matches, setMatches] = useState<MatchCompany[]>([]);
  const [resumeId, setResumeId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [generatingLabel, setGeneratingLabel] = useState("");
  const [search, setSearch] = useState("");
  const [mode, setMode] = useState<Mode>("interview");
  const [session, setSession] = useState<ActiveSession | null>(null);

  useEffect(() => {
    async function loadMatches() {
      try {
        const res = await fetch("/api/matches");
        if (!res.ok) throw new Error("Failed to load");
        const data = await res.json();
        setResumeId(data.resumeId);
        setMatches(data.matches);
      } catch {
        toast.error("Failed to load matches");
      } finally {
        setLoading(false);
      }
    }
    loadMatches();
  }, []);

  async function handleSelectCompany(companyId: string) {
    if (!resumeId) {
      toast.error("No resume found. Upload one from the Dashboard.");
      return;
    }

    const company = matches.find((m) => m.companyId === companyId);
    setGenerating(true);
    setGeneratingLabel(company?.companyName || "...");

    try {
      if (mode === "interview") {
        const res = await fetch("/api/interview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ resumeId, companyId }),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to generate");
        }
        const data = await res.json();
        setSession({
          companyName: data.companyName,
          questions: data.questions,
          style: `${data.interviewStyle} focus`,
          mode: "interview",
        });
      } else {
        const res = await fetch("/api/interview/company-quiz", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ resumeId, companyId }),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to generate");
        }
        const data = await res.json();
        setSession({
          companyName: data.companyName,
          questions: data.questions,
          style: `${data.pagesScraped} pages scraped`,
          mode: "company-quiz",
          pagesScraped: data.pagesScraped,
        });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to generate");
    } finally {
      setGenerating(false);
      setGeneratingLabel("");
    }
  }

  // Loading
  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="text-center space-y-3">
          <div className="h-6 w-6 rounded-full border-2 border-primary border-t-transparent animate-spin mx-auto" />
          <p className="text-sm text-muted-foreground">Loading matches...</p>
        </div>
      </div>
    );
  }

  // No matches
  if (matches.length === 0) {
    return (
      <div className="text-center py-32 max-w-sm mx-auto">
        <h2 className="text-lg font-semibold">No matches yet</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Score your matches first, then come back to prep for interviews.
        </p>
        <a href="/dashboard">
          <Button className="mt-4">Go to Dashboard</Button>
        </a>
      </div>
    );
  }

  // Generating
  if (generating) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="text-center space-y-3">
          <div className="h-6 w-6 rounded-full border-2 border-primary border-t-transparent animate-spin mx-auto" />
          <p className="text-sm font-medium">
            {mode === "company-quiz"
              ? `Scraping & analyzing ${generatingLabel}...`
              : `Generating interview for ${generatingLabel}...`}
          </p>
          <p className="text-xs text-muted-foreground">
            {mode === "company-quiz"
              ? "Crawling website, extracting features, building quiz..."
              : "Analyzing your background, tailoring questions..."}
          </p>
        </div>
      </div>
    );
  }

  // Active session
  if (session) {
    return (
      <InterviewFlashcards
        companyName={session.companyName}
        questions={session.questions}
        interviewStyle={session.style}
        phaseMeta={session.mode === "interview" ? INTERVIEW_PHASES : COMPANY_QUIZ_PHASES}
        phaseOrder={session.mode === "interview" ? INTERVIEW_PHASE_ORDER : COMPANY_QUIZ_PHASE_ORDER}
        onReset={() => setSession(null)}
      />
    );
  }

  // Company selector
  const filtered = search
    ? matches.filter((m) => {
        const q = search.toLowerCase();
        return (
          m.companyName.toLowerCase().includes(q) ||
          m.description?.toLowerCase().includes(q) ||
          m.industries.some((i) => i.toLowerCase().includes(q)) ||
          m.techStack.some((t) => t.toLowerCase().includes(q))
        );
      })
    : matches;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Interview Prep</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {mode === "interview"
            ? "Practice interview questions tailored to your resume and match score."
            : "Learn everything about a company before your interview."}
        </p>
      </div>

      {/* Mode toggle */}
      <div className="flex items-center gap-1 p-1 bg-muted rounded-lg w-fit">
        <button
          onClick={() => setMode("interview")}
          className={`px-4 py-1.5 text-sm rounded-md transition-all ${
            mode === "interview"
              ? "bg-background text-foreground shadow-sm font-medium"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Interview Prep
        </button>
        <button
          onClick={() => setMode("company-quiz")}
          className={`px-4 py-1.5 text-sm rounded-md transition-all ${
            mode === "company-quiz"
              ? "bg-background text-foreground shadow-sm font-medium"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Company Quiz
        </button>
      </div>

      <Input
        placeholder="Search companies..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-xs h-8 text-sm"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map((match) => {
          const scoreColor =
            match.overallScore >= 75
              ? "text-green-600"
              : match.overallScore >= 50
              ? "text-blue-600"
              : match.overallScore >= 30
              ? "text-yellow-600"
              : "text-muted-foreground";

          const alignment =
            (match.techScore + match.industryScore) / 2 >= 17
              ? "Technical deep-dive"
              : (match.techScore + match.industryScore) / 2 >= 10
              ? "Mixed format"
              : "Behavioral focus";

          return (
            <button
              key={match.companyId}
              onClick={() => handleSelectCompany(match.companyId)}
              className="border rounded-xl p-4 text-left hover:border-primary/40 hover:bg-primary/[0.02] transition-all group"
            >
              <div className="flex items-start gap-3">
                <CompanyLogo
                  companyName={match.companyName}
                  logoUrl={match.logoUrl}
                  size="sm"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-medium text-sm truncate">
                      {match.companyName}
                    </h3>
                    <span className={`text-xs font-mono font-semibold ${scoreColor}`}>
                      {Math.round(match.overallScore)}
                    </span>
                  </div>
                  {match.batch && (
                    <p className="text-[11px] text-muted-foreground">
                      YC {match.batch} &middot; {match.stage || "Seed"}
                    </p>
                  )}
                </div>
              </div>

              {match.description && (
                <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                  {match.description}
                </p>
              )}

              <div className="flex items-center gap-2 mt-3 flex-wrap">
                {mode === "interview" ? (
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                    {alignment}
                  </span>
                ) : (
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600">
                    {match.website ? "Website available" : "DB data only"}
                  </span>
                )}
                {match.industries.slice(0, 2).map((ind) => (
                  <span
                    key={ind}
                    className="text-[11px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground"
                  >
                    {ind}
                  </span>
                ))}
              </div>

              <div className="mt-3 text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                {mode === "interview" ? "Start interview prep" : "Start company quiz"} &rarr;
              </div>
            </button>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16 text-sm text-muted-foreground">
          No companies match your search.
          <button
            onClick={() => setSearch("")}
            className="ml-1 text-primary hover:underline"
          >
            Clear
          </button>
        </div>
      )}
    </div>
  );
}
