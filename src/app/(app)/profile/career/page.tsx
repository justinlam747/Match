"use client";

import { useState, useEffect, useCallback, type KeyboardEvent } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipProvider,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { Sparkles, X, Info } from "lucide-react";
import {
  ROLE_ARCHETYPES,
  ARCHETYPE_DESCRIPTIONS,
  type RoleArchetype,
} from "@/lib/ai/archetype-detector";
import { getProfileCompleteness } from "@/lib/profile/completeness";
import {
  COMPENSATION_CURRENCIES,
  REMOTE_PREFERENCES,
  isRemotePreference,
  type RemotePreference,
} from "@/lib/profile/constants";
import type { UserProfileRow } from "@/lib/db/schema";

type CareerProfileForm = Omit<UserProfileRow, "id" | "userId" | "createdAt" | "updatedAt"> & {
  remotePreference: RemotePreference | null;
};

const EMPTY_PROFILE: CareerProfileForm = {
  targetRoles: [],
  targetArchetypes: [],
  professionalNarrative: null,
  exitNarrative: null,
  compensationTarget: null,
  compensationMinimum: null,
  compensationCurrency: "USD",
  locationPreference: null,
  remotePreference: null,
  visaStatus: null,
  timezone: null,
  signatureStrengths: [],
  portfolioUrls: [],
};

const REMOTE_PREF_LABELS: Record<RemotePreference, string> = {
  "remote-only": "Remote only",
  hybrid: "Hybrid",
  onsite: "Onsite",
  flexible: "Flexible",
};

export default function CareerProfilePage() {
  const [profile, setProfile] = useState<CareerProfileForm>(EMPTY_PROFILE);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/profile/career");
        if (!res.ok) throw new Error("Failed to load profile");
        const data = await res.json();
        if (cancelled) return;
        if (data) {
          setProfile({
            targetRoles: data.targetRoles ?? [],
            targetArchetypes: data.targetArchetypes ?? [],
            professionalNarrative: data.professionalNarrative ?? null,
            exitNarrative: data.exitNarrative ?? null,
            compensationTarget: data.compensationTarget ?? null,
            compensationMinimum: data.compensationMinimum ?? null,
            compensationCurrency: data.compensationCurrency ?? "USD",
            locationPreference: data.locationPreference ?? null,
            remotePreference: data.remotePreference ?? null,
            visaStatus: data.visaStatus ?? null,
            timezone: data.timezone ?? null,
            signatureStrengths: data.signatureStrengths ?? [],
            portfolioUrls: data.portfolioUrls ?? [],
          });
        }
      } catch {
        toast.error("Could not load your career profile");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const completeness = getProfileCompleteness(profile);

  const update = useCallback(<K extends keyof CareerProfileForm>(
    key: K,
    value: CareerProfileForm[K],
  ) => {
    setProfile((prev) => ({ ...prev, [key]: value }));
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/profile/career", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Save failed");
      }
      toast.success("Career profile saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  // Stub: real LLM draft lands with the form-assist work.
  function handleAiDraftStub() {
    toast.info("AI draft assist coming soon");
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const saveBar = (
    <div className="flex items-center justify-end pt-4">
      <Button onClick={handleSave} disabled={saving}>
        {saving ? "Saving..." : "Save profile"}
      </Button>
    </div>
  );

  return (
    <TooltipProvider>
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Career Profile</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Tell us who you are and what you&apos;re targeting. We use this to
            score matches, draft outreach, and prep you for interviews.
          </p>
        </div>

        <Card>
          <CardContent className="pt-6 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Profile completeness</span>
              <span className="text-sm text-muted-foreground">
                {completeness.percent}%
              </span>
            </div>
            <Progress value={completeness.percent} />
            {completeness.missingFields.length > 0 && (
              <p className="text-xs text-muted-foreground pt-1">
                Missing: {completeness.missingFields.join(", ")}
              </p>
            )}
          </CardContent>
        </Card>

        <Tabs defaultValue="roles" className="w-full">
          <TabsList className="flex flex-wrap h-auto">
            <TabsTrigger value="roles">1. Roles</TabsTrigger>
            <TabsTrigger value="comp">2. Compensation</TabsTrigger>
            <TabsTrigger value="location">3. Location</TabsTrigger>
            <TabsTrigger value="narrative">4. Narrative</TabsTrigger>
            <TabsTrigger value="strengths">5. Strengths</TabsTrigger>
          </TabsList>

          {/* Step 1 — Target roles & archetypes */}
          <TabsContent value="roles">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Target roles & archetypes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>Target roles</Label>
                  <p className="text-xs text-muted-foreground">
                    Press Enter or comma to add a role (e.g. &quot;Forward Deployed Engineer&quot;).
                  </p>
                  <TagInput
                    values={profile.targetRoles}
                    onChange={(next) => update("targetRoles", next)}
                    placeholder="Add a target role..."
                  />
                </div>

                <Separator />

                <div className="space-y-3">
                  <Label>Target archetypes</Label>
                  <p className="text-xs text-muted-foreground">
                    Pick any archetypes that describe the kind of work you want.
                  </p>
                  <div className="space-y-2">
                    {ROLE_ARCHETYPES.map((a) => {
                      const checked = profile.targetArchetypes.includes(a);
                      return (
                        <label
                          key={a}
                          className="flex items-start gap-3 rounded-md border p-3 cursor-pointer hover:bg-muted/40"
                        >
                          <input
                            type="checkbox"
                            className="mt-1 h-4 w-4 accent-primary"
                            checked={checked}
                            onChange={(e) => {
                              const next = e.target.checked
                                ? [...profile.targetArchetypes, a]
                                : profile.targetArchetypes.filter((x) => x !== a);
                              update("targetArchetypes", next);
                            }}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium capitalize">
                              {a.replace(/-/g, " ")}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {ARCHETYPE_DESCRIPTIONS[a as RoleArchetype]}
                            </div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {saveBar}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Step 2 — Compensation */}
          <TabsContent value="comp">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Compensation</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="comp-target">Target (annual total comp)</Label>
                    <Input
                      id="comp-target"
                      type="number"
                      min={0}
                      value={profile.compensationTarget ?? ""}
                      onChange={(e) =>
                        update(
                          "compensationTarget",
                          e.target.value === "" ? null : Number(e.target.value),
                        )
                      }
                      placeholder="250000"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="comp-min">Minimum acceptable</Label>
                    <Input
                      id="comp-min"
                      type="number"
                      min={0}
                      value={profile.compensationMinimum ?? ""}
                      onChange={(e) =>
                        update(
                          "compensationMinimum",
                          e.target.value === "" ? null : Number(e.target.value),
                        )
                      }
                      placeholder="180000"
                    />
                  </div>
                </div>
                <div className="space-y-1.5 max-w-[180px]">
                  <Label>Currency</Label>
                  <Select
                    value={profile.compensationCurrency}
                    onValueChange={(v) => v && update("compensationCurrency", String(v))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {COMPENSATION_CURRENCIES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {saveBar}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Step 3 — Location & remote */}
          <TabsContent value="location">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Location & remote</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="location">Location preference</Label>
                  <Input
                    id="location"
                    value={profile.locationPreference ?? ""}
                    onChange={(e) =>
                      update("locationPreference", e.target.value || null)
                    }
                    placeholder="San Francisco Bay Area"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Remote preference</Label>
                  <Select
                    value={profile.remotePreference ?? ""}
                    onValueChange={(v) =>
                      update("remotePreference", isRemotePreference(v) ? v : null)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select preference" />
                    </SelectTrigger>
                    <SelectContent>
                      {REMOTE_PREFERENCES.map((value) => (
                        <SelectItem key={value} value={value}>
                          {REMOTE_PREF_LABELS[value]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="timezone">Timezone</Label>
                    <Tooltip>
                      <TooltipTrigger
                        render={
                          <button
                            type="button"
                            className="text-muted-foreground hover:text-foreground"
                            aria-label="Timezone help"
                          >
                            <Info className="h-3.5 w-3.5" />
                          </button>
                        }
                      />
                      <TooltipContent>
                        IANA zone, e.g. America/Los_Angeles, Europe/London
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <Input
                    id="timezone"
                    value={profile.timezone ?? ""}
                    onChange={(e) => update("timezone", e.target.value || null)}
                    placeholder="America/Los_Angeles"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="visa">Visa status</Label>
                  <Input
                    id="visa"
                    value={profile.visaStatus ?? ""}
                    onChange={(e) => update("visaStatus", e.target.value || null)}
                    placeholder="US citizen / H-1B / No sponsorship needed"
                  />
                </div>

                {saveBar}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Step 4 — Professional narrative */}
          <TabsContent value="narrative">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Your story</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="narrative">Professional narrative</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleAiDraftStub}
                      className="gap-1.5"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      Help me draft this
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    A crisp 2-3 sentence summary of who you are and what you build.
                  </p>
                  <Textarea
                    id="narrative"
                    rows={5}
                    value={profile.professionalNarrative ?? ""}
                    onChange={(e) =>
                      update("professionalNarrative", e.target.value || null)
                    }
                    placeholder="I'm a forward-deployed engineer who..."
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="exit">Exit narrative</Label>
                  <p className="text-xs text-muted-foreground">
                    Why you&apos;re leaving your current role. Used in outreach and interviews.
                  </p>
                  <Textarea
                    id="exit"
                    rows={4}
                    value={profile.exitNarrative ?? ""}
                    onChange={(e) =>
                      update("exitNarrative", e.target.value || null)
                    }
                    placeholder="I'm looking for a smaller team where I can..."
                  />
                </div>

                {saveBar}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Step 5 — Signature strengths & portfolio */}
          <TabsContent value="strengths">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Signature strengths & portfolio</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>Signature strengths</Label>
                  <p className="text-xs text-muted-foreground">
                    Your top differentiators. One per chip.
                  </p>
                  <TagInput
                    values={profile.signatureStrengths}
                    onChange={(next) => update("signatureStrengths", next)}
                    placeholder="Add a strength..."
                  />
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label>Portfolio URLs</Label>
                  <p className="text-xs text-muted-foreground">
                    Demos, projects, talks. Must be valid URLs.
                  </p>
                  <TagInput
                    values={profile.portfolioUrls}
                    onChange={(next) => update("portfolioUrls", next)}
                    placeholder="https://..."
                    validate={(v) => {
                      try {
                        new URL(v);
                        return null;
                      } catch {
                        return "Not a valid URL";
                      }
                    }}
                  />
                </div>

                {saveBar}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </TooltipProvider>
  );
}

interface TagInputProps {
  values: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  validate?: (v: string) => string | null;
}

function TagInput({ values, onChange, placeholder, validate }: TagInputProps) {
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);

  function commit(raw: string) {
    const trimmed = raw.trim().replace(/,$/, "").trim();
    if (!trimmed) return;
    if (values.includes(trimmed)) {
      setDraft("");
      return;
    }
    if (validate) {
      const err = validate(trimmed);
      if (err) {
        setError(err);
        return;
      }
    }
    onChange([...values, trimmed]);
    setDraft("");
    setError(null);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      commit(draft);
    } else if (e.key === "Backspace" && !draft && values.length > 0) {
      onChange(values.slice(0, -1));
    }
  }

  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap gap-1.5">
        {values.map((v) => (
          <Badge key={v} variant="secondary" className="gap-1 pr-1">
            <span className="max-w-[220px] truncate">{v}</span>
            <button
              type="button"
              onClick={() => onChange(values.filter((x) => x !== v))}
              className="rounded hover:bg-foreground/10 p-0.5"
              aria-label={`Remove ${v}`}
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
      </div>
      <Input
        value={draft}
        onChange={(e) => {
          setDraft(e.target.value);
          if (error) setError(null);
        }}
        onKeyDown={handleKeyDown}
        onBlur={() => {
          if (draft) commit(draft);
        }}
        placeholder={placeholder}
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
