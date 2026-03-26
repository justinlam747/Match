"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

interface AuditLog {
  id: string;
  userId: string | null;
  userEmail: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const ACTION_LABELS: Record<string, string> = {
  "resume.uploaded": "Resume Uploaded",
  "resume.parsed": "Resume Parsed",
  "companies.scraped": "Companies Scraped",
  "companies.enriched": "Companies Enriched",
  "matches.scored": "Matches Scored",
  "contacts.found": "Contacts Found",
  "email.drafted": "Email Drafted",
  "email.edited": "Email Edited",
  "email.sent": "Email Sent",
  "email.opened": "Email Opened",
  "email.bounced": "Email Bounced",
  "email.complained": "Email Complaint",
  "user.signed_in": "Signed In",
  "user.signed_out": "Signed Out",
};

const ACTION_COLORS: Record<string, string> = {
  "resume.uploaded": "bg-blue-100 text-blue-800",
  "resume.parsed": "bg-blue-100 text-blue-800",
  "companies.scraped": "bg-purple-100 text-purple-800",
  "companies.enriched": "bg-purple-100 text-purple-800",
  "matches.scored": "bg-green-100 text-green-800",
  "contacts.found": "bg-amber-100 text-amber-800",
  "email.drafted": "bg-slate-100 text-slate-800",
  "email.edited": "bg-slate-100 text-slate-800",
  "email.sent": "bg-emerald-100 text-emerald-800",
  "email.opened": "bg-teal-100 text-teal-800",
  "email.bounced": "bg-red-100 text-red-800",
  "email.complained": "bg-red-100 text-red-800",
  "user.signed_in": "bg-sky-100 text-sky-800",
  "user.signed_out": "bg-sky-100 text-sky-800",
};

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [page, setPage] = useState(1);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();

      const params = new URLSearchParams({ page: String(page), limit: "30" });
      if (actionFilter !== "all") params.set("action", actionFilter);

      const res = await fetch(`/api/audit?${params}`, {
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      });

      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setLogs(data.logs);
      setPagination(data.pagination);
    } catch (err) {
      console.error("Failed to load audit logs:", err);
    } finally {
      setLoading(false);
    }
  }, [page, actionFilter]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  function formatTime(dateStr: string) {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  function renderMetadata(metadata: Record<string, unknown> | null) {
    if (!metadata || Object.keys(metadata).length === 0) return null;
    return (
      <div className="mt-1.5 text-xs text-muted-foreground font-mono bg-muted/50 rounded px-2 py-1 inline-block">
        {Object.entries(metadata).map(([key, value]) => (
          <span key={key} className="mr-3">
            {key}: {typeof value === "object" ? JSON.stringify(value) : String(value)}
          </span>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Audit Log</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Track all actions and changes in your account.
        </p>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <Select value={actionFilter} onValueChange={(v) => { if (v) setActionFilter(v); setPage(1); }}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by action" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All actions</SelectItem>
            {Object.entries(ACTION_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {pagination && (
          <span className="text-sm text-muted-foreground ml-auto">
            {pagination.total} event{pagination.total !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Log entries */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Activity</CardTitle>
          <CardDescription>Recent actions performed on your account.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-5 w-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            </div>
          ) : logs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12">
              No audit events found.
            </p>
          ) : (
            <div className="space-y-0 divide-y">
              {logs.map((log) => (
                <div key={log.id} className="py-3 first:pt-0 last:pb-0">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${ACTION_COLORS[log.action] || "bg-gray-100 text-gray-800"}`}
                        >
                          {ACTION_LABELS[log.action] || log.action}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {log.entityType}
                          {log.entityId ? ` · ${log.entityId.slice(0, 8)}...` : ""}
                        </span>
                      </div>
                      {renderMetadata(log.metadata)}
                    </div>
                    <time className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
                      {formatTime(log.createdAt)}
                    </time>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {pagination.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= pagination.totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
