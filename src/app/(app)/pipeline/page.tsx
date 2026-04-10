"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  KANBAN_COLUMNS,
  STATUS_LABEL,
} from "@/lib/applications/status";
import type { ApplicationStatus } from "@/lib/db/schema";

interface ApplicationRow {
  application: {
    id: string;
    matchId: string | null;
    status: ApplicationStatus;
    notes: string | null;
    nextStep: string | null;
    nextStepDate: string | null;
    lastActivityAt: string;
    createdAt: string;
    appliedAt: string | null;
  };
  companyName: string | null;
  companyLogo: string | null;
  overallScore: number | null;
  grade: string | null;
}

function daysSince(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
}

export default function PipelinePage() {
  const [rows, setRows] = useState<ApplicationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"kanban" | "list">("kanban");

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/applications");
      if (!res.ok) throw new Error("Failed");
      const data = (await res.json()) as { applications: ApplicationRow[] };
      setRows(data.applications);
    } catch {
      toast.error("Could not load pipeline");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function updateStatus(id: string, status: ApplicationStatus) {
    // Optimistic update.
    const prev = rows;
    setRows((current) =>
      current.map((r) =>
        r.application.id === id
          ? {
              ...r,
              application: { ...r.application, status, lastActivityAt: new Date().toISOString() },
            }
          : r
      )
    );
    try {
      const res = await fetch(`/api/applications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error || "Update failed");
      }
    } catch (e) {
      setRows(prev);
      toast.error(e instanceof Error ? e.message : "Update failed");
    }
  }

  const grouped = useMemo(() => {
    const map: Record<ApplicationStatus, ApplicationRow[]> = {
      discovered: [],
      evaluating: [],
      ready: [],
      applied: [],
      "phone-screen": [],
      technical: [],
      onsite: [],
      offer: [],
      accepted: [],
      rejected: [],
      withdrawn: [],
    };
    for (const r of rows) {
      map[r.application.status].push(r);
    }
    return map;
  }, [rows]);

  const totalActive = rows.filter(
    (r) =>
      r.application.status !== "rejected" &&
      r.application.status !== "withdrawn" &&
      r.application.status !== "accepted"
  ).length;

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Pipeline</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {totalActive} active application{totalActive === 1 ? "" : "s"} · {rows.length} total
          </p>
        </div>
        <div className="flex items-center gap-1 p-1 bg-muted rounded-lg">
          <button
            onClick={() => setView("kanban")}
            className={`px-3 py-1 text-xs rounded-md ${
              view === "kanban"
                ? "bg-background text-foreground shadow-sm font-medium"
                : "text-muted-foreground"
            }`}
          >
            Kanban
          </button>
          <button
            onClick={() => setView("list")}
            className={`px-3 py-1 text-xs rounded-md ${
              view === "list"
                ? "bg-background text-foreground shadow-sm font-medium"
                : "text-muted-foreground"
            }`}
          >
            List
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground text-center py-16">
          Loading pipeline...
        </div>
      ) : rows.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-sm text-muted-foreground">
              No applications yet. Track a match from its detail page to get started.
            </p>
          </CardContent>
        </Card>
      ) : view === "kanban" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {KANBAN_COLUMNS.map((col) => (
            <div key={col} className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {STATUS_LABEL[col]}
                </h2>
                <span className="text-xs text-muted-foreground">
                  {grouped[col].length}
                </span>
              </div>
              <div className="space-y-2">
                {grouped[col].map((row) => (
                  <KanbanCard
                    key={row.application.id}
                    row={row}
                    onAdvance={() => {
                      const idx = KANBAN_COLUMNS.indexOf(col);
                      const next = KANBAN_COLUMNS[idx + 1];
                      if (next) updateStatus(row.application.id, next);
                    }}
                    canAdvance={KANBAN_COLUMNS.indexOf(col) < KANBAN_COLUMNS.length - 1}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {rows.map((row) => (
            <Card key={row.application.id}>
              <CardContent className="py-3 flex items-center gap-3 flex-wrap">
                <span className="text-[11px] uppercase tracking-wide text-muted-foreground w-28">
                  {STATUS_LABEL[row.application.status]}
                </span>
                <span className="text-sm font-medium flex-1 min-w-0 truncate">
                  {row.companyName || "Unknown company"}
                </span>
                {row.grade && (
                  <span className="text-xs font-semibold">{row.grade}</span>
                )}
                <span className="text-xs text-muted-foreground">
                  {daysSince(row.application.lastActivityAt)}d since last activity
                </span>
                {row.application.matchId && (
                  <Link
                    href={`/matches/${row.application.matchId}`}
                    className="text-xs text-primary hover:underline"
                  >
                    Match →
                  </Link>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function KanbanCard({
  row,
  onAdvance,
  canAdvance,
}: {
  row: ApplicationRow;
  onAdvance: () => void;
  canAdvance: boolean;
}) {
  const days = daysSince(row.application.lastActivityAt);
  const stale = days >= 7;
  return (
    <Card className={stale ? "border-orange-500/40" : undefined}>
      <CardContent className="py-3 space-y-1.5">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-medium truncate">
            {row.companyName || "Unknown"}
          </p>
          {row.grade && (
            <span className="text-xs font-bold shrink-0">{row.grade}</span>
          )}
        </div>
        <p className="text-[11px] text-muted-foreground">
          {days}d since activity
        </p>
        {row.application.nextStep && (
          <p className="text-[11px] text-foreground truncate">
            Next: {row.application.nextStep}
          </p>
        )}
        <div className="flex items-center gap-2 pt-0.5">
          {row.application.matchId && (
            <Link
              href={`/matches/${row.application.matchId}`}
              className="text-[11px] text-primary hover:underline"
            >
              View
            </Link>
          )}
          {canAdvance && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-[11px] px-2 ml-auto"
              onClick={onAdvance}
            >
              Advance →
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
