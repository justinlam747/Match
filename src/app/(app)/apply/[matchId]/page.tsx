"use client";

import { use, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";

type Kind =
  | "why-company"
  | "why-role"
  | "salary-expectations"
  | "tell-us-about-a-time";

const KIND_LABELS: Record<Kind, string> = {
  "why-company": "Why this company?",
  "why-role": "Why this role?",
  "salary-expectations": "Salary expectations",
  "tell-us-about-a-time": "Tell us about a time...",
};

interface Answer {
  draft: string;
  editingNotes: string[];
}

export default function ApplyPage({
  params,
}: {
  params: Promise<{ matchId: string }>;
}) {
  const { matchId } = use(params);
  const [activeKind, setActiveKind] = useState<Kind>("why-company");
  const [questionText, setQuestionText] = useState("");
  const [answers, setAnswers] = useState<Record<Kind, Answer | null>>({
    "why-company": null,
    "why-role": null,
    "salary-expectations": null,
    "tell-us-about-a-time": null,
  });
  const [loading, setLoading] = useState(false);

  async function generate() {
    setLoading(true);
    try {
      const res = await fetch("/api/form-assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matchId,
          kind: activeKind,
          questionText: questionText.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error || "Failed to generate");
      }
      const data = (await res.json()) as Answer;
      setAnswers((prev) => ({ ...prev, [activeKind]: data }));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to generate");
    } finally {
      setLoading(false);
    }
  }

  function updateDraft(value: string) {
    setAnswers((prev) => {
      const existing = prev[activeKind];
      if (!existing) return prev;
      return { ...prev, [activeKind]: { ...existing, draft: value } };
    });
  }

  async function copyDraft() {
    const current = answers[activeKind];
    if (!current) return;
    try {
      await navigator.clipboard.writeText(current.draft);
      toast.success("Copied to clipboard");
    } catch {
      toast.error("Copy failed");
    }
  }

  const current = answers[activeKind];

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div>
        <Link
          href={`/matches/${matchId}`}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          ← Back to match
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Application Form Assist
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Drafts grounded in your resume and career profile. Always edit before
          you submit — these are starting points, not finished answers.
        </p>
      </div>

      {/* Kind picker */}
      <div className="flex items-center gap-1 p-1 bg-muted rounded-lg w-fit flex-wrap">
        {(Object.keys(KIND_LABELS) as Kind[]).map((k) => (
          <button
            key={k}
            onClick={() => setActiveKind(k)}
            className={`px-3 py-1.5 text-xs rounded-md transition-all ${
              activeKind === k
                ? "bg-background text-foreground shadow-sm font-medium"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {KIND_LABELS[k]}
          </button>
        ))}
      </div>

      <Card>
        <CardContent className="py-5 space-y-3">
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">
              Exact question text (optional — improves tailoring)
            </label>
            <Input
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              placeholder={KIND_LABELS[activeKind]}
            />
          </div>
          <Button onClick={generate} disabled={loading} className="w-full">
            {loading ? "Drafting..." : `Draft "${KIND_LABELS[activeKind]}"`}
          </Button>
        </CardContent>
      </Card>

      {current && (
        <Card>
          <CardContent className="py-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Draft answer</h2>
              <Button variant="outline" size="sm" onClick={copyDraft}>
                Copy
              </Button>
            </div>
            <Textarea
              rows={8}
              value={current.draft}
              onChange={(e) => updateDraft(e.target.value)}
              className="text-sm leading-relaxed"
            />
            {current.editingNotes.length > 0 && (
              <div className="space-y-1">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  Before you submit
                </p>
                <ul className="text-xs space-y-1 list-disc list-inside text-muted-foreground">
                  {current.editingNotes.map((note, i) => (
                    <li key={i}>{note}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
