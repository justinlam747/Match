"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface LlmLog {
  id: string;
  userId: string | null;
  provider: string;
  model: string;
  endpoint: string;
  inputTokens: number;
  outputTokens: number;
  costCents: number;
  latencyMs: number;
  status: string;
  error: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

interface Kpi {
  totalRequests: number;
  totalCostCents: number;
  avgLatencyMs: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  errorCount: number;
  errorRate: number;
}

function formatCost(cents: number): string {
  if (cents < 1) return `${(cents * 10).toFixed(1)}mil`;
  if (cents < 100) return `${cents.toFixed(2)}¢`;
  return `$${(cents / 100).toFixed(2)}`;
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  if (diff < 5000) return "just now";
  if (diff < 60_000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  return `${Math.floor(diff / 3_600_000)}h ago`;
}

const PROVIDER_COLORS: Record<string, string> = {
  anthropic: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  openai: "bg-green-500/15 text-green-700 dark:text-green-400",
  groq: "bg-purple-500/15 text-purple-700 dark:text-purple-400",
  local: "bg-zinc-500/15 text-zinc-700 dark:text-zinc-400",
};

const ENDPOINT_LABELS: Record<string, string> = {
  chat: "Chat",
  embedding: "Embed",
  score: "Score",
};

export default function AdminPage() {
  const [logs, setLogs] = useState<LlmLog[]>([]);
  const [kpi, setKpi] = useState<Kpi | null>(null);
  const [hours, setHours] = useState(24);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [live, setLive] = useState(true);
  const eventSourceRef = useRef<EventSource | null>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Initial fetch
  const fetchLogs = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/llm-logs?hours=${hours}&limit=200`);
      if (res.status === 401) {
        setError("Unauthorized — admin access required");
        return;
      }
      if (!res.ok) throw new Error("Failed to fetch logs");
      const data = await res.json();
      setLogs(data.logs);
      setKpi(data.kpi);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [hours]);

  useEffect(() => {
    setLoading(true);
    fetchLogs();
  }, [fetchLogs]);

  // SSE stream for real-time updates
  useEffect(() => {
    if (!live || error) return;

    const es = new EventSource("/api/admin/llm-logs/stream");
    eventSourceRef.current = es;

    es.onmessage = (event) => {
      try {
        const newLogs: LlmLog[] = JSON.parse(event.data);
        if (newLogs.length === 0) return;

        setLogs((prev) => {
          const ids = new Set(prev.map((l) => l.id));
          const fresh = newLogs.filter((l) => !ids.has(l.id));
          if (fresh.length === 0) return prev;
          return [...fresh, ...prev].slice(0, 500);
        });

        // Update KPI incrementally
        setKpi((prev) => {
          if (!prev) return prev;
          const added = newLogs.length;
          const addedErrors = newLogs.filter((l) => l.status === "error").length;
          const addedCost = newLogs.reduce((s, l) => s + l.costCents, 0);
          const addedInput = newLogs.reduce((s, l) => s + l.inputTokens, 0);
          const addedOutput = newLogs.reduce((s, l) => s + l.outputTokens, 0);
          const addedLatency = newLogs.reduce((s, l) => s + l.latencyMs, 0);
          const newTotal = prev.totalRequests + added;
          return {
            totalRequests: newTotal,
            totalCostCents: Math.round((prev.totalCostCents + addedCost) * 100) / 100,
            avgLatencyMs: Math.round(
              (prev.avgLatencyMs * prev.totalRequests + addedLatency) / newTotal
            ),
            totalInputTokens: prev.totalInputTokens + addedInput,
            totalOutputTokens: prev.totalOutputTokens + addedOutput,
            errorCount: prev.errorCount + addedErrors,
            errorRate:
              newTotal > 0
                ? Math.round(((prev.errorCount + addedErrors) / newTotal) * 10000) / 100
                : 0,
          };
        });
      } catch {}
    };

    es.onerror = () => {
      // Reconnect handled by browser EventSource
    };

    return () => {
      es.close();
      eventSourceRef.current = null;
    };
  }, [live, error]);

  // Refresh KPI periodically (every 30s) for accuracy
  useEffect(() => {
    if (!live) return;
    const interval = setInterval(fetchLogs, 30_000);
    return () => clearInterval(interval);
  }, [live, fetchLogs]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="h-6 w-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="text-center space-y-2">
          <div className="text-sm font-medium text-destructive">{error}</div>
          <p className="text-xs text-muted-foreground">
            This page requires admin privileges.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">LLM Monitor</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Real-time API call monitoring
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Live toggle */}
          <button
            onClick={() => setLive(!live)}
            className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-md transition-colors ${
              live
                ? "bg-green-500/15 text-green-700 dark:text-green-400"
                : "bg-muted text-muted-foreground"
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                live ? "bg-green-500 animate-pulse" : "bg-muted-foreground"
              }`}
            />
            {live ? "Live" : "Paused"}
          </button>

          {/* Time window */}
          <select
            value={hours}
            onChange={(e) => setHours(Number(e.target.value))}
            className="text-xs border rounded-md px-2 py-1 bg-background"
          >
            <option value={1}>1h</option>
            <option value={6}>6h</option>
            <option value={24}>24h</option>
            <option value={72}>3d</option>
            <option value={168}>7d</option>
          </select>
        </div>
      </div>

      {/* KPI Tiles */}
      {kpi && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold tabular-nums">
                {kpi.totalRequests.toLocaleString()}
              </div>
              <div className="text-[11px] text-muted-foreground mt-0.5">
                Total Requests
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold tabular-nums">
                {formatCost(kpi.totalCostCents)}
              </div>
              <div className="text-[11px] text-muted-foreground mt-0.5">
                Total Cost
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold tabular-nums">
                {kpi.avgLatencyMs.toLocaleString()}
                <span className="text-sm font-normal text-muted-foreground">ms</span>
              </div>
              <div className="text-[11px] text-muted-foreground mt-0.5">
                Avg Latency
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold tabular-nums">
                {formatTokens(kpi.totalInputTokens + kpi.totalOutputTokens)}
              </div>
              <div className="text-[11px] text-muted-foreground mt-0.5">
                Total Tokens
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold tabular-nums">
                {kpi.errorCount}
              </div>
              <div className="text-[11px] text-muted-foreground mt-0.5">
                Errors
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div
                className={`text-2xl font-bold tabular-nums ${
                  kpi.errorRate > 5
                    ? "text-destructive"
                    : kpi.errorRate > 0
                    ? "text-amber-600 dark:text-amber-400"
                    : ""
                }`}
              >
                {kpi.errorRate}%
              </div>
              <div className="text-[11px] text-muted-foreground mt-0.5">
                Error Rate
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Request Feed — main focal point */}
      <Card>
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <h2 className="text-sm font-semibold">Requests</h2>
          <span className="text-[11px] text-muted-foreground tabular-nums">
            {logs.length} shown
          </span>
        </div>
        <div className="divide-y max-h-[calc(100vh-380px)] overflow-y-auto">
          {logs.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No LLM calls recorded in this window.
            </div>
          ) : (
            logs.map((log) => (
              <div
                key={log.id}
                className={`px-4 py-2.5 flex items-center gap-3 text-sm hover:bg-muted/30 transition-colors ${
                  log.status === "error" ? "bg-destructive/5" : ""
                }`}
              >
                {/* Status dot */}
                <span
                  className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                    log.status === "error" ? "bg-destructive" : "bg-green-500"
                  }`}
                />

                {/* Provider badge */}
                <Badge
                  variant="secondary"
                  className={`text-[10px] px-1.5 py-0 font-mono shrink-0 ${
                    PROVIDER_COLORS[log.provider] || ""
                  }`}
                >
                  {log.provider}
                </Badge>

                {/* Model */}
                <span className="text-xs font-mono text-muted-foreground truncate w-44 shrink-0">
                  {log.model}
                </span>

                {/* Endpoint */}
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0">
                  {ENDPOINT_LABELS[log.endpoint] || log.endpoint}
                </Badge>

                {/* Tokens */}
                <span className="text-xs tabular-nums text-muted-foreground w-24 shrink-0 text-right">
                  {log.inputTokens + log.outputTokens > 0
                    ? `${formatTokens(log.inputTokens)}→${formatTokens(log.outputTokens)}`
                    : "—"}
                </span>

                {/* Cost */}
                <span className="text-xs tabular-nums w-16 shrink-0 text-right font-medium">
                  {log.costCents > 0 ? formatCost(log.costCents) : "free"}
                </span>

                {/* Latency */}
                <span
                  className={`text-xs tabular-nums w-16 shrink-0 text-right ${
                    log.latencyMs > 5000
                      ? "text-destructive"
                      : log.latencyMs > 2000
                      ? "text-amber-600 dark:text-amber-400"
                      : "text-muted-foreground"
                  }`}
                >
                  {log.latencyMs.toLocaleString()}ms
                </span>

                {/* Error message */}
                {log.error && (
                  <span className="text-[10px] text-destructive truncate max-w-40">
                    {log.error}
                  </span>
                )}

                {/* Spacer */}
                <span className="flex-1" />

                {/* Timestamp */}
                <span className="text-[11px] text-muted-foreground tabular-nums shrink-0">
                  {timeAgo(log.createdAt)}
                </span>
              </div>
            ))
          )}
          <div ref={logsEndRef} />
        </div>
      </Card>
    </div>
  );
}
