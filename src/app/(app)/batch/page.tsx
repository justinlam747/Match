"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface BatchJob {
  id: string;
  status: "pending" | "running" | "completed" | "failed";
  totalItems: number;
  completedItems: number;
  failedItems: number;
  createdAt: string;
  completedAt: string | null;
}

const STATUS_VARIANT: Record<BatchJob["status"], { label: string; cls: string }> = {
  pending: { label: "Pending", cls: "bg-muted text-muted-foreground" },
  running: { label: "Running", cls: "bg-blue-500/10 text-blue-600" },
  completed: { label: "Completed", cls: "bg-green-500/10 text-green-600" },
  failed: { label: "Failed", cls: "bg-red-500/10 text-red-600" },
};

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return new Date(iso).toLocaleDateString();
}

export default function BatchPage() {
  const [jobs, setJobs] = useState<BatchJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [urls, setUrls] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadJobs = useCallback(async () => {
    try {
      const res = await fetch("/api/batch");
      if (!res.ok) throw new Error("Failed");
      const data = (await res.json()) as { jobs: BatchJob[] };
      setJobs(data.jobs);
    } catch {
      toast.error("Could not load batches");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  // Poll while any job is in flight — keeps progress counters fresh without a
  // websocket subscription. 4s is frequent enough to feel live on typical
  // batches (tens of URLs) but doesn't hammer the DB.
  useEffect(() => {
    const hasActive = jobs.some(
      (j) => j.status === "pending" || j.status === "running"
    );
    if (!hasActive) return;
    const id = setInterval(loadJobs, 4000);
    return () => clearInterval(id);
  }, [jobs, loadJobs]);

  async function handleSubmit() {
    const trimmed = urls.trim();
    if (!trimmed) {
      toast.error("Paste at least one URL");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urls: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit");
      toast.success(`Batch created with ${data.batch.totalItems} items`);
      setUrls("");
      await loadJobs();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to submit");
    } finally {
      setSubmitting(false);
    }
  }

  const urlCount = urls
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean).length;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Batch Evaluation</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Paste job URLs (one per line) to evaluate them as a batch — each URL
          is fetched, extracted, and persisted for scoring.
        </p>
      </div>

      <Card>
        <CardContent className="py-5 space-y-3">
          <Textarea
            rows={8}
            value={urls}
            onChange={(e) => setUrls(e.target.value)}
            placeholder="https://boards.greenhouse.io/example/jobs/12345&#10;https://jobs.ashbyhq.com/example/role&#10;..."
            className="font-mono text-xs"
          />
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">
              {urlCount} URL{urlCount === 1 ? "" : "s"} · max 100 per batch
            </p>
            <Button
              onClick={handleSubmit}
              disabled={submitting || urlCount === 0 || urlCount > 100}
            >
              {submitting ? "Submitting..." : "Submit batch"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <h2 className="text-sm font-semibold">Recent batches</h2>
        {loading ? (
          <div className="text-sm text-muted-foreground text-center py-8">
            Loading...
          </div>
        ) : jobs.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              No batches yet. Submit one above to get started.
            </CardContent>
          </Card>
        ) : (
          jobs.map((job) => {
            const pct =
              job.totalItems === 0
                ? 0
                : Math.round(
                    ((job.completedItems + job.failedItems) / job.totalItems) * 100
                  );
            const variant = STATUS_VARIANT[job.status];
            return (
              <Card key={job.id}>
                <CardContent className="py-4 space-y-2.5">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-2 min-w-0">
                      <Link
                        href={`/batch/${job.id}`}
                        className="font-mono text-xs text-primary hover:underline truncate"
                      >
                        {job.id.slice(0, 8)}
                      </Link>
                      <Badge className={`${variant.cls} border-0`}>
                        {variant.label}
                      </Badge>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {formatRelative(job.createdAt)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      {job.completedItems} done · {job.failedItems} failed ·{" "}
                      {job.totalItems} total
                    </span>
                    <span className="font-mono tabular-nums">{pct}%</span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        job.failedItems > 0 ? "bg-orange-500" : "bg-primary"
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
