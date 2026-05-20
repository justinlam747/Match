"use client";

import { useState } from "react";
import { Sparkles, ExternalLink, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { ResearchSignals, ResearchSource } from "@/lib/db/schema";

interface ResearchPayload {
  summary: string;
  signals: ResearchSignals;
  sources: ResearchSource[];
  cached?: "redis" | "postgres" | "fresh";
}

interface DeepResearchPanelProps {
  matchId: string;
  companyName: string;
  /** Optional initial payload — e.g. server-rendered if already cached. */
  initial?: ResearchPayload | null;
}

export function DeepResearchPanel({
  matchId,
  companyName,
  initial = null,
}: DeepResearchPanelProps) {
  const [research, setResearch] = useState<ResearchPayload | null>(initial);
  const [loading, setLoading] = useState(false);

  async function runResearch() {
    setLoading(true);
    try {
      const res = await fetch(`/api/matches/${matchId}/deep-scrape`, {
        method: "POST",
      });

      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: null }));
        throw new Error(error ?? `Request failed (${res.status})`);
      }

      const data = (await res.json()) as ResearchPayload;
      setResearch(data);
      if (data.cached === "fresh") {
        toast.success(`Researched ${companyName}`);
      }
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Deep research failed. Try again."
      );
    } finally {
      setLoading(false);
    }
  }

  if (!research) {
    return (
      <Card>
        <CardContent className="flex flex-col items-start gap-3 py-5">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Sparkles className="size-4 text-primary" />
            Deep research
          </div>
          <p className="text-sm text-muted-foreground">
            The default match score uses embedding similarity and keyword overlap
            on the seed data we already have. Run a deep research pass to scrape
            the company's website and pull fresh web-search signals, then re-read
            the fit against your resume with that richer context.
          </p>
          <Button onClick={runResearch} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Researching {companyName}…
              </>
            ) : (
              <>
                <Sparkles className="size-4" />
                Deep research this company
              </>
            )}
          </Button>
          {loading && (
            <p className="text-xs text-muted-foreground">
              Scraping site, searching the web, summarizing — usually 15-25s.
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  const { summary, signals, sources, cached } = research;

  return (
    <Card>
      <CardContent className="space-y-4 py-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Sparkles className="size-4 text-primary" />
            Deep research
          </div>
          <div className="flex items-center gap-2">
            {cached && cached !== "fresh" && (
              <Badge variant="secondary" className="text-[10px]">
                cached
              </Badge>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={runResearch}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                "Re-research"
              )}
            </Button>
          </div>
        </div>

        {summary && (
          <p className="text-sm leading-relaxed text-foreground/90">{summary}</p>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <SignalGroup label="Tech" items={signals.techSignals} />
          <SignalGroup label="Recent news" items={signals.recentNews} />
          <SignalGroup label="Team & hiring" items={signals.teamSignals} />
          <SignalGroup label="Culture" items={signals.cultureSignals} />
        </div>

        {(signals.productFocus || signals.fundingStage) && (
          <div className="flex flex-wrap gap-2 pt-1">
            {signals.productFocus && (
              <Badge variant="outline" className="font-normal">
                {signals.productFocus}
              </Badge>
            )}
            {signals.fundingStage && (
              <Badge variant="outline" className="font-normal">
                {signals.fundingStage}
              </Badge>
            )}
          </div>
        )}

        {sources.length > 0 && (
          <details className="text-xs">
            <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
              Sources ({sources.length})
            </summary>
            <ul className="mt-2 space-y-1">
              {sources.map((s) => (
                <li key={s.url}>
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground hover:underline"
                  >
                    <span className="truncate max-w-[400px]">
                      {s.title ?? s.url}
                    </span>
                    <ExternalLink className="size-3 shrink-0" />
                    <span className="text-[10px] uppercase opacity-60">
                      {s.kind}
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </details>
        )}
      </CardContent>
    </Card>
  );
}

function SignalGroup({ label, items }: { label: string; items: string[] }) {
  if (items.length === 0) {
    return (
      <div>
        <div className="text-xs font-medium text-muted-foreground">{label}</div>
        <div className="mt-1 text-xs text-muted-foreground/60">—</div>
      </div>
    );
  }
  return (
    <div>
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <ul className="mt-1 space-y-0.5 text-xs">
        {items.map((item, i) => (
          <li key={i} className="flex gap-1.5">
            <span className="text-muted-foreground/50">·</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
