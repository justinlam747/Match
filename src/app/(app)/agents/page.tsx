"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { AgentRunCard } from "@/components/agent-run-card";

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
  steps: {
    name: string;
    label: string;
    status: "pending" | "running" | "completed" | "failed" | "skipped";
    output?: unknown;
    error?: string;
    startedAt?: string;
    completedAt?: string;
  }[];
  currentStep: number;
  childRuns: string[];
  createdAt: string;
  completedAt?: string;
}

const AGENT_LABELS: Record<string, string> = {
  pipeline: "Full Pipeline",
  scoring: "Match Scoring",
  contacts: "Contact Discovery",
  "email-drafter": "Email Drafting",
  outreach: "Email Outreach",
  "scout-new-leads": "Lead Scout",
  "daily-user-pipeline": "Daily Pipeline",
};

export default function AgentsPage() {
  const [runs, setRuns] = useState<AgentRun[]>([]);
  const [expandedRunId, setExpandedRunId] = useState<string | null>(null);
  const [expandedRun, setExpandedRun] = useState<AgentRunDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [launching, setLaunching] = useState(false);
  const [launchDialogOpen, setLaunchDialogOpen] = useState(false);
  const [activeResumeId, setActiveResumeId] = useState<string | null>(null);

  // Fetch the active resume for agent input
  useEffect(() => {
    fetch("/api/dashboard-status")
      .then((r) => r.json())
      .then((d) => setActiveResumeId(d.resumeId))
      .catch(() => {});
  }, []);

  const fetchRuns = useCallback(async () => {
    try {
      const res = await fetch("/api/agents/status");
      if (res.ok) {
        const data = await res.json();
        setRuns(data.runs || []);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchRunDetail = useCallback(async (runId: string) => {
    try {
      const res = await fetch(`/api/agents/status?runId=${runId}`);
      if (res.ok) {
        const data = await res.json();
        setExpandedRun(data);
      }
    } catch {
      // silent
    }
  }, []);

  // Initial fetch + polling
  useEffect(() => {
    fetchRuns();
    const interval = setInterval(() => {
      fetchRuns();
      if (expandedRunId) fetchRunDetail(expandedRunId);
    }, 3000);
    return () => clearInterval(interval);
  }, [fetchRuns, fetchRunDetail, expandedRunId]);

  function toggleExpand(runId: string) {
    if (expandedRunId === runId) {
      setExpandedRunId(null);
      setExpandedRun(null);
    } else {
      setExpandedRunId(runId);
      fetchRunDetail(runId);
    }
  }

  async function launchAgent(agentType: string) {
    if (!activeResumeId && agentType !== "scout-new-leads") {
      // Can't run without a resume
      return;
    }
    setLaunching(true);
    try {
      const input: Record<string, unknown> = {};
      if (activeResumeId) input.resumeId = activeResumeId;
      if (agentType === "pipeline") {
        input.contentTypes = [
          "email",
          "resume-tips",
          "cover-letter",
          "interview-prep",
        ];
        input.topN = 10;
      }

      const res = await fetch("/api/agents/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentType, input }),
      });
      if (res.ok) {
        const data = await res.json();
        setLaunchDialogOpen(false);
        // Auto-expand the new run
        setExpandedRunId(data.runId);
        fetchRunDetail(data.runId);
        fetchRuns();
      }
    } catch {
      // silent
    } finally {
      setLaunching(false);
    }
  }

  const hasRunning = runs.some(
    (r) => r.status === "running" || r.status === "pending"
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="h-6 w-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Agents</h1>
          <p className="text-sm text-muted-foreground mt-1">
            AI agents that scout leads, score matches, and draft content for
            you.
          </p>
        </div>
        <div className="flex gap-2">
          {hasRunning && (
            <Badge variant="outline" className="gap-1.5 py-1">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              Running
            </Badge>
          )}
          <Button onClick={() => setLaunchDialogOpen(true)}>Run Agent</Button>
        </div>
      </div>

      {/* Runs list */}
      {runs.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <div className="text-4xl mb-4">
              <svg
                className="w-10 h-10 mx-auto text-muted-foreground/50"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9.75 3.104v5.714a2.25 2.25 0 0 1-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 0 1 4.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0 1 12 15a9.065 9.065 0 0 0-6.23.693L5 14.5m14.8.8 1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0 1 12 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5"
                />
              </svg>
            </div>
            <h3 className="font-semibold text-lg">No agent runs yet</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
              Launch your first agent to start scouting leads, scoring matches,
              and drafting personalized content.
            </p>
            <Button
              className="mt-4"
              onClick={() => setLaunchDialogOpen(true)}
            >
              Run your first agent
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {runs.map((run) => (
            <AgentRunCard
              key={run.id}
              run={run}
              detail={expandedRunId === run.id ? expandedRun : null}
              expanded={expandedRunId === run.id}
              onToggle={() => toggleExpand(run.id)}
              agentLabel={AGENT_LABELS[run.agentType] || run.agentType}
            />
          ))}
        </div>
      )}

      {/* Launch dialog */}
      <Dialog open={launchDialogOpen} onOpenChange={setLaunchDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Run an Agent</DialogTitle>
            <DialogDescription>
              Choose which agent to run. The full pipeline will score, find
              contacts, and draft content.
            </DialogDescription>
          </DialogHeader>
          {!activeResumeId && (
            <div className="text-xs bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 px-3 py-2 rounded-md">
              Upload a resume first from the Dashboard to run most agents.
            </div>
          )}
          <div className="grid gap-3 py-4">
            {[
              {
                type: "pipeline",
                label: "Full Pipeline",
                desc: "Score matches, find contacts, draft emails, cover letters, and interview prep",
                needsResume: true,
              },
              {
                type: "scoring",
                label: "Match Scoring",
                desc: "Score your resume against 500+ YC startups",
                needsResume: true,
              },
              {
                type: "email-drafter",
                label: "Email Drafting",
                desc: "Draft cold emails for your top matches",
                needsResume: true,
              },
              {
                type: "contacts",
                label: "Contact Discovery",
                desc: "Find decision-makers at matched companies",
                needsResume: true,
              },
            ].map((agent) => (
              <button
                key={agent.type}
                onClick={() => launchAgent(agent.type)}
                disabled={launching || (agent.needsResume && !activeResumeId)}
                className="flex items-start gap-3 p-4 text-left border rounded-lg hover:bg-muted/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                  {agent.type === "pipeline" && (
                    <svg
                      className="w-4 h-4 text-primary"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z"
                      />
                    </svg>
                  )}
                  {agent.type === "scoring" && (
                    <svg
                      className="w-4 h-4 text-primary"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
                      />
                    </svg>
                  )}
                  {agent.type === "email-drafter" && (
                    <svg
                      className="w-4 h-4 text-primary"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
                      />
                    </svg>
                  )}
                  {agent.type === "contacts" && (
                    <svg
                      className="w-4 h-4 text-primary"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
                      />
                    </svg>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm">{agent.label}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {agent.desc}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
