"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ExternalLink, Plus, RefreshCw } from "lucide-react";

const ATS_TYPES = ["greenhouse", "ashby", "lever", "custom"] as const;
type AtsType = (typeof ATS_TYPES)[number];

const ATS_LABELS: Record<AtsType, string> = {
  greenhouse: "Greenhouse",
  ashby: "Ashby",
  lever: "Lever",
  custom: "Custom",
};

interface LastScan {
  scannedAt: string;
  jobsFound: number;
  newJobs: number;
  error: string | null;
}

interface Portal {
  id: string;
  userId: string | null;
  name: string;
  careersUrl: string;
  apiEndpoint: string | null;
  atsType: AtsType;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  lastScan: LastScan | null;
}

interface NewPortalForm {
  name: string;
  careersUrl: string;
  atsType: AtsType;
  apiEndpoint: string;
  notes: string;
}

const EMPTY_FORM: NewPortalForm = {
  name: "",
  careersUrl: "",
  atsType: "greenhouse",
  apiEndpoint: "",
  notes: "",
};

function formatRelative(iso: string | null): string {
  if (!iso) return "Never";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "Never";
  const diffMs = Date.now() - then;
  if (diffMs < 0) return "Just now";
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

export default function PortalsPage() {
  const [portals, setPortals] = useState<Portal[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<NewPortalForm>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [scanningId, setScanningId] = useState<string | null>(null);

  const loadPortals = useCallback(async () => {
    try {
      const res = await fetch("/api/portals");
      if (!res.ok) throw new Error("Failed to load portals");
      const data = (await res.json()) as Portal[];
      setPortals(data);
    } catch {
      toast.error("Could not load portals");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPortals();
  }, [loadPortals]);

  function updateForm<K extends keyof NewPortalForm>(key: K, value: NewPortalForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleCreate() {
    if (!form.name.trim()) {
      toast.error("Name is required");
      return;
    }
    if (!form.careersUrl.trim()) {
      toast.error("Careers URL is required");
      return;
    }
    try {
      new URL(form.careersUrl);
    } catch {
      toast.error("Careers URL must be a valid URL");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/portals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          careersUrl: form.careersUrl.trim(),
          atsType: form.atsType,
          apiEndpoint: form.apiEndpoint.trim() || undefined,
          notes: form.notes.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error || "Failed to create portal");
      }
      toast.success("Portal added");
      setForm(EMPTY_FORM);
      setDialogOpen(false);
      await loadPortals();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create portal");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleScan(portalId: string) {
    setScanningId(portalId);
    try {
      const res = await fetch(`/api/portals/${portalId}/scan`, { method: "POST" });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error || "Scan failed to dispatch");
      }
      toast.success("Scan queued");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Scan failed");
    } finally {
      setScanningId(null);
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Company Portals</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configured careers pages we scan for new roles. Add portals to expand coverage.
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger
            render={
              <Button className="gap-1.5">
                <Plus className="h-4 w-4" />
                Add Portal
              </Button>
            }
          />
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add company portal</DialogTitle>
              <DialogDescription>
                Register a careers page so we can track new jobs.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="portal-name">Company name</Label>
                <Input
                  id="portal-name"
                  value={form.name}
                  onChange={(e) => updateForm("name", e.target.value)}
                  placeholder="Acme Inc."
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="portal-url">Careers URL</Label>
                <Input
                  id="portal-url"
                  type="url"
                  value={form.careersUrl}
                  onChange={(e) => updateForm("careersUrl", e.target.value)}
                  placeholder="https://jobs.acme.com"
                />
              </div>
              <div className="space-y-1.5">
                <Label>ATS type</Label>
                <Select
                  value={form.atsType}
                  onValueChange={(v) => {
                    if (typeof v === "string" && (ATS_TYPES as readonly string[]).includes(v)) {
                      updateForm("atsType", v as AtsType);
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ATS_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {ATS_LABELS[t]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="portal-api">API endpoint (optional)</Label>
                <Input
                  id="portal-api"
                  type="url"
                  value={form.apiEndpoint}
                  onChange={(e) => updateForm("apiEndpoint", e.target.value)}
                  placeholder="https://boards-api.greenhouse.io/v1/boards/acme/jobs"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="portal-notes">Notes (optional)</Label>
                <Textarea
                  id="portal-notes"
                  rows={3}
                  value={form.notes}
                  onChange={(e) => updateForm("notes", e.target.value)}
                  placeholder="Only eng roles, US only, etc."
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button onClick={handleCreate} disabled={submitting}>
                  {submitting ? "Adding..." : "Add portal"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : portals.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-sm text-muted-foreground">
              No portals configured yet. Add one to get started.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {portals.map((portal) => {
            const isSystem = portal.userId === null;
            const isScanning = scanningId === portal.id;
            return (
              <Card key={portal.id}>
                <CardContent className="py-4">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-base font-medium truncate">{portal.name}</h2>
                        <Badge variant="secondary">{ATS_LABELS[portal.atsType]}</Badge>
                        {isSystem && <Badge variant="outline">System</Badge>}
                        {!portal.isActive && <Badge variant="outline">Inactive</Badge>}
                      </div>
                      <a
                        href={portal.careersUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 truncate max-w-full"
                      >
                        <span className="truncate">{portal.careersUrl}</span>
                        <ExternalLink className="h-3 w-3 shrink-0" />
                      </a>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground pt-1">
                        <span>Last scan: {formatRelative(portal.lastScan?.scannedAt ?? null)}</span>
                        {portal.lastScan && (
                          <>
                            <span>&middot;</span>
                            <span>
                              {portal.lastScan.jobsFound} jobs
                              {portal.lastScan.newJobs > 0 && (
                                <span className="text-foreground"> ({portal.lastScan.newJobs} new)</span>
                              )}
                            </span>
                          </>
                        )}
                        {portal.lastScan?.error && (
                          <span className="text-destructive">&middot; error</span>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleScan(portal.id)}
                      disabled={isScanning || !portal.isActive}
                      className="gap-1.5"
                    >
                      <RefreshCw className={`h-3.5 w-3.5 ${isScanning ? "animate-spin" : ""}`} />
                      {isScanning ? "Scanning..." : "Scan now"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
