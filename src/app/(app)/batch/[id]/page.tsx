"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
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

interface BatchItem {
  id: string;
  url: string;
  status: "pending" | "fetching" | "extracted" | "scored" | "failed";
  error: string | null;
  jdCacheKey: string | null;
  matchId: string | null;
  startedAt: string | null;
  completedAt: string | null;
}

const ITEM_STATUS: Record<BatchItem["status"], { label: string; cls: string }> = {
  pending: { label: "Pending", cls: "bg-muted text-muted-foreground" },
  fetching: { label: "Fetching", cls: "bg-blue-500/10 text-blue-600" },
  extracted: { label: "Extracted", cls: "bg-green-500/10 text-green-600" },
  scored: { label: "Scored", cls: "bg-green-500/10 text-green-600" },
  failed: { label: "Failed", cls: "bg-red-500/10 text-red-600" },
};

export default function BatchDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [batch, setBatch] = useState<BatchJob | null>(null);
  const [items, setItems] = useState<BatchItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/batch/${id}`);
      if (!res.ok) throw new Error("Failed");
      const data = (await res.json()) as { batch: BatchJob; items: BatchItem[] };
      setBatch(data.batch);
      setItems(data.items);
    } catch {
      toast.error("Could not load batch");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!batch) return;
    if (batch.status !== "pending" && batch.status !== "running") return;
    const t = setInterval(load, 4000);
    return () => clearInterval(t);
  }, [batch, load]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-16 text-center text-sm text-muted-foreground">
        Loading batch...
      </div>
    );
  }

  if (!batch) {
    return (
      <div className="max-w-4xl mx-auto py-16 text-center">
        <p className="text-sm text-muted-foreground">Batch not found.</p>
        <Link href="/batch" className="text-sm text-primary hover:underline">
          ← Back to batches
        </Link>
      </div>
    );
  }

  const pct =
    batch.totalItems === 0
      ? 0
      : Math.round(
          ((batch.completedItems + batch.failedItems) / batch.totalItems) * 100
        );

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <Link
          href="/batch"
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          ← All batches
        </Link>
      </div>

      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight font-mono">
          Batch {batch.id.slice(0, 8)}
        </h1>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="capitalize">{batch.status}</span>
          <span>·</span>
          <span>
            {batch.completedItems} done · {batch.failedItems} failed ·{" "}
            {batch.totalItems} total
          </span>
          <span className="font-mono tabular-nums ml-auto">{pct}%</span>
        </div>
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className={`h-full transition-all ${
              batch.failedItems > 0 ? "bg-orange-500" : "bg-primary"
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <div className="space-y-2">
        <h2 className="text-sm font-semibold">Items</h2>
        {items.map((item) => {
          const variant = ITEM_STATUS[item.status];
          return (
            <Card key={item.id}>
              <CardContent className="py-3 space-y-1.5">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-primary hover:underline truncate max-w-xl"
                  >
                    {item.url}
                  </a>
                  <Badge className={`${variant.cls} border-0`}>
                    {variant.label}
                  </Badge>
                </div>
                {item.error && (
                  <p className="text-xs text-destructive">{item.error}</p>
                )}
                {item.matchId && (
                  <Link
                    href={`/matches/${item.matchId}`}
                    className="text-xs text-primary hover:underline"
                  >
                    View match →
                  </Link>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
