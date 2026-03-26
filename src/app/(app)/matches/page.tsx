"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MatchCard, type MatchData } from "@/components/match-card";
import { CompanyDetail } from "@/components/company-detail";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface MatchRow {
  matchId: string;
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
}

export default function MatchesPage() {
  const [matches, setMatches] = useState<MatchData[]>([]);
  const [loading, setLoading] = useState(true);
  const [findingContacts, setFindingContacts] = useState(false);
  const [draftingEmails, setDraftingEmails] = useState(false);
  const [resumeId, setResumeId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("overall");
  const [minScore, setMinScore] = useState("0");
  const [batchFilter, setBatchFilter] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [detailMatch, setDetailMatch] = useState<MatchData | null>(null);

  // Press "/" to focus search
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "/" && document.activeElement?.tagName !== "INPUT") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    async function loadMatches() {
      try {
        const res = await fetch("/api/matches");
        if (!res.ok) throw new Error("Failed to load");
        const data = await res.json();
        setResumeId(data.resumeId);
        setMatches(
          data.matches.map((m: MatchRow) => ({
            ...m,
            selected: m.overallScore >= 60,
          }))
        );
      } catch {
        toast.error("Failed to load matches");
      } finally {
        setLoading(false);
      }
    }
    loadMatches();
  }, []);

  const toggleSelect = useCallback((companyId: string) => {
    setMatches((prev) =>
      prev.map((m) =>
        m.companyId === companyId ? { ...m, selected: !m.selected } : m
      )
    );
  }, []);

  const batches = useMemo(() => {
    const set = new Set(matches.map((m) => m.batch).filter(Boolean) as string[]);
    return Array.from(set).sort().reverse();
  }, [matches]);

  const filtered = matches
    .filter((m) => {
      if (batchFilter && m.batch !== batchFilter) return false;
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        m.companyName.toLowerCase().includes(q) ||
        m.description?.toLowerCase().includes(q) ||
        m.industries.some((i) => i.toLowerCase().includes(q)) ||
        m.techStack.some((t) => t.toLowerCase().includes(q))
      );
    })
    .filter((m) => m.overallScore >= parseInt(minScore))
    .sort((a, b) => {
      switch (sortBy) {
        case "tech": return b.techScore - a.techScore;
        case "industry": return b.industryScore - a.industryScore;
        case "hiring": return b.hiringScore - a.hiringScore;
        case "name": return a.companyName.localeCompare(b.companyName);
        default: return b.overallScore - a.overallScore;
      }
    });

  const selectedIds = matches.filter((m) => m.selected).map((m) => m.companyId);

  async function handleFindContacts() {
    if (selectedIds.length === 0) return;
    setFindingContacts(true);
    try {
      const res = await fetch("/api/find-contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyIds: selectedIds }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      const total = data.results.reduce(
        (sum: number, r: { contacts: number }) => sum + r.contacts, 0
      );
      toast.success(`Found ${total} contacts`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setFindingContacts(false);
    }
  }

  async function handleDraftEmails() {
    if (selectedIds.length === 0 || !resumeId) return;
    setDraftingEmails(true);
    try {
      const res = await fetch("/api/draft-emails", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeId, companyIds: selectedIds }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(data.message);
      window.location.href = "/emails";
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setDraftingEmails(false);
    }
  }

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

  if (matches.length === 0) {
    return (
      <div className="text-center py-32 max-w-sm mx-auto">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 text-primary text-xl mb-4">
          🎯
        </div>
        <h2 className="text-lg font-semibold">No matches yet</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Upload your resume and score matches from the Dashboard.
        </p>
        <a href="/dashboard">
          <Button className="mt-4">Go to Dashboard</Button>
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Matches</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {filtered.length} companies · {selectedIds.length} selected
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.open("/api/matches/export", "_blank")}
            title="Export as CSV"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleFindContacts}
            disabled={findingContacts || selectedIds.length === 0}
          >
            {findingContacts ? "Finding..." : "Find contacts"}
          </Button>
          <Button
            size="sm"
            onClick={handleDraftEmails}
            disabled={draftingEmails || selectedIds.length === 0}
          >
            {draftingEmails ? "Drafting..." : `Draft emails (${selectedIds.length})`}
          </Button>
        </div>
      </div>

      {/* Batch filter pills */}
      {batches.length > 1 && (
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground mr-1">Batch:</span>
          <button
            onClick={() => setBatchFilter(null)}
            className={`px-2.5 py-1 rounded-full text-xs transition-colors ${
              !batchFilter
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            All
          </button>
          {batches.map((batch) => (
            <button
              key={batch}
              onClick={() => setBatchFilter(batchFilter === batch ? null : batch)}
              className={`px-2.5 py-1 rounded-full text-xs transition-colors ${
                batchFilter === batch
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              {batch}
            </button>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3">
        <Input
          ref={searchRef}
          placeholder="Search companies, tech, industries... (/)"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs h-8 text-sm"
        />
        <Select value={sortBy} onValueChange={(v) => v && setSortBy(v)}>
          <SelectTrigger className="w-36 h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="overall">Overall score</SelectItem>
            <SelectItem value="tech">Tech score</SelectItem>
            <SelectItem value="industry">Industry score</SelectItem>
            <SelectItem value="hiring">Hiring score</SelectItem>
            <SelectItem value="name">Name</SelectItem>
          </SelectContent>
        </Select>
        <Select value={minScore} onValueChange={(v) => v && setMinScore(v)}>
          <SelectTrigger className="w-28 h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="0">All scores</SelectItem>
            <SelectItem value="40">40+</SelectItem>
            <SelectItem value="60">60+</SelectItem>
            <SelectItem value="75">75+</SelectItem>
          </SelectContent>
        </Select>
        <div className="ml-auto flex gap-1 text-xs">
          <button
            onClick={() => setMatches((p) => p.map((m) => ({ ...m, selected: true })))}
            className="px-2 py-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            All
          </button>
          <button
            onClick={() => setMatches((p) => p.map((m) => ({ ...m, selected: false })))}
            className="px-2 py-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            None
          </button>
          <button
            onClick={() => setMatches((p) => p.map((m) => ({ ...m, selected: m.overallScore >= 60 })))}
            className="px-2 py-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            60+
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map((match) => (
          <MatchCard
            key={match.companyId}
            match={match}
            onToggleSelect={toggleSelect}
            onViewDetail={setDetailMatch}
          />
        ))}
      </div>

      {filtered.length === 0 && matches.length > 0 && (
        <div className="text-center py-16 text-sm text-muted-foreground">
          No matches found with current filters.
          <button
            onClick={() => { setSearch(""); setMinScore("0"); setBatchFilter(null); }}
            className="ml-1 text-primary hover:underline"
          >
            Clear filters
          </button>
        </div>
      )}

      {/* Company detail dialog */}
      <CompanyDetail
        match={detailMatch}
        open={!!detailMatch}
        onClose={() => setDetailMatch(null)}
      />
    </div>
  );
}
