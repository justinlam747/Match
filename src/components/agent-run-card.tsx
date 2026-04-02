"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

interface Step {
  name: string;
  label: string;
  status: "pending" | "running" | "completed" | "failed" | "skipped";
  output?: unknown;
  error?: string;
  startedAt?: string;
  completedAt?: string;
}

interface AgentRun {
  id: string;
  agentType: string;
  status: "pending" | "running" | "completed" | "failed" | "paused";
  error?: string;
  createdAt: string;
  completedAt?: string;
}

interface AgentRunDetail {
  id: string;
  agentType: string;
  status: string;
  input: Record<string, unknown>;
  output?: Record<string, unknown>;
  error?: string;
  steps: Step[];
  currentStep: number;
  childRuns: string[];
  createdAt: string;
  completedAt?: string;
}

interface AgentRunCardProps {
  run: AgentRun;
  detail: AgentRunDetail | null;
  expanded: boolean;
  onToggle: () => void;
  agentLabel: string;
}

const STATUS_CONFIG: Record<string, { color: string; label: string; dot: string }> = {
  pending: { color: "text-muted-foreground", label: "Pending", dot: "bg-muted-foreground" },
  running: { color: "text-primary", label: "Running", dot: "bg-primary animate-pulse" },
  completed: { color: "text-green-600", label: "Completed", dot: "bg-green-500" },
  failed: { color: "text-red-600", label: "Failed", dot: "bg-red-500" },
  paused: { color: "text-yellow-600", label: "Paused", dot: "bg-yellow-500" },
  skipped: { color: "text-muted-foreground", label: "Skipped", dot: "bg-muted-foreground/50" },
};

function timeAgo(date: string): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function duration(start?: string, end?: string): string {
  if (!start) return "";
  const s = new Date(start).getTime();
  const e = end ? new Date(end).getTime() : Date.now();
  const ms = e - s;
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}

function StepIcon({ status }: { status: Step["status"] }) {
  if (status === "completed") {
    return (
      <div className="w-7 h-7 rounded-full bg-green-500/10 border-2 border-green-500 flex items-center justify-center flex-shrink-0">
        <svg className="w-3.5 h-3.5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>
    );
  }

  if (status === "running") {
    return (
      <div className="w-7 h-7 rounded-full bg-primary/10 border-2 border-primary flex items-center justify-center flex-shrink-0">
        <div className="w-3 h-3 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (status === "failed") {
    return (
      <div className="w-7 h-7 rounded-full bg-red-500/10 border-2 border-red-500 flex items-center justify-center flex-shrink-0">
        <svg className="w-3.5 h-3.5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </div>
    );
  }

  if (status === "skipped") {
    return (
      <div className="w-7 h-7 rounded-full bg-muted border-2 border-border flex items-center justify-center flex-shrink-0">
        <svg className="w-3.5 h-3.5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
        </svg>
      </div>
    );
  }

  // pending
  return (
    <div className="w-7 h-7 rounded-full bg-muted border-2 border-border flex items-center justify-center flex-shrink-0">
      <div className="w-2 h-2 rounded-full bg-muted-foreground/40" />
    </div>
  );
}

function StepLine({ status }: { status: Step["status"] }) {
  return (
    <div className={`w-0.5 flex-1 min-h-[20px] ml-[13px] ${
      status === "completed" ? "bg-green-500/30" :
      status === "running" ? "bg-primary/30" :
      status === "failed" ? "bg-red-500/30" :
      "bg-border"
    }`} />
  );
}

function OutputPreview({ output }: { output: unknown }) {
  if (!output) return null;
  const text = typeof output === "string" ? output : JSON.stringify(output, null, 2);
  if (text.length < 5) return null;
  return (
    <pre className="mt-2 p-2.5 bg-muted/50 border text-xs text-muted-foreground overflow-x-auto max-h-32 rounded-md font-mono leading-relaxed">
      {text.length > 300 ? text.slice(0, 300) + "..." : text}
    </pre>
  );
}

export function AgentRunCard({ run, detail, expanded, onToggle, agentLabel }: AgentRunCardProps) {
  const config = STATUS_CONFIG[run.status] || STATUS_CONFIG.pending;

  return (
    <Card className="overflow-hidden">
      {/* Collapsed header -- always visible */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-muted/30 transition-colors"
      >
        {/* Status dot */}
        <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${config.dot}`} />

        {/* Agent info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm">{agentLabel}</span>
            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${config.color}`}>
              {config.label}
            </Badge>
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {timeAgo(run.createdAt)}
            {run.completedAt && ` \u00B7 ${duration(run.createdAt, run.completedAt)}`}
          </div>
        </div>

        {/* Step progress (mini) */}
        {detail && (
          <div className="hidden sm:flex items-center gap-1">
            {detail.steps.map((step, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full ${
                  step.status === "completed" ? "bg-green-500" :
                  step.status === "running" ? "bg-primary animate-pulse" :
                  step.status === "failed" ? "bg-red-500" :
                  step.status === "skipped" ? "bg-muted-foreground/30" :
                  "bg-border"
                }`}
              />
            ))}
          </div>
        )}

        {/* Expand arrow */}
        <svg
          className={`w-4 h-4 text-muted-foreground transition-transform flex-shrink-0 ${expanded ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Expanded detail -- workflow visualization */}
      {expanded && detail && (
        <CardContent className="pt-0 pb-5 px-5 border-t">
          {/* Error banner */}
          {detail.error && (
            <div className="mb-4 p-3 bg-red-500/5 border border-red-500/20 rounded-md">
              <div className="text-xs font-medium text-red-600">Error</div>
              <div className="text-xs text-red-500/80 mt-0.5">{detail.error}</div>
            </div>
          )}

          {/* Steps workflow */}
          <div className="mt-3">
            {detail.steps.map((step, i) => (
              <div key={step.name}>
                <div className="flex items-start gap-3">
                  <StepIcon status={step.status} />
                  <div className="flex-1 min-w-0 pb-1">
                    <div className="flex items-center justify-between">
                      <span className={`text-sm font-medium ${
                        step.status === "completed" ? "text-foreground" :
                        step.status === "running" ? "text-primary" :
                        step.status === "failed" ? "text-red-600" :
                        "text-muted-foreground"
                      }`}>
                        {step.label}
                      </span>
                      {step.startedAt && (
                        <span className="text-xs text-muted-foreground tabular-nums">
                          {duration(step.startedAt, step.completedAt)}
                        </span>
                      )}
                    </div>

                    {step.error && (
                      <p className="text-xs text-red-500 mt-1">{step.error}</p>
                    )}

                    {step.status === "completed" && step.output != null ? (
                      <OutputPreview output={step.output} />
                    ) : null}
                  </div>
                </div>

                {/* Connector line between steps */}
                {i < detail.steps.length - 1 && <StepLine status={step.status} />}
              </div>
            ))}
          </div>

          {/* Child runs */}
          {detail.childRuns.length > 0 && (
            <div className="mt-4 pt-3 border-t">
              <div className="text-xs font-medium text-muted-foreground mb-2">
                Spawned Runs ({detail.childRuns.length})
              </div>
              <div className="flex flex-wrap gap-1.5">
                {detail.childRuns.map((id) => (
                  <Badge key={id} variant="secondary" className="text-[10px] font-mono">
                    {id.slice(0, 8)}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Output summary */}
          {detail.output && detail.status === "completed" && (
            <div className="mt-4 pt-3 border-t">
              <div className="text-xs font-medium text-muted-foreground mb-2">Result</div>
              <OutputPreview output={detail.output} />
            </div>
          )}
        </CardContent>
      )}

      {/* Expanded but loading detail */}
      {expanded && !detail && (
        <CardContent className="pt-0 pb-5 border-t">
          <div className="flex items-center justify-center py-8">
            <div className="h-5 w-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          </div>
        </CardContent>
      )}
    </Card>
  );
}
