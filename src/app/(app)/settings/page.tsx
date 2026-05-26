"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/supabase/use-auth";
import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ApiKeysManager } from "@/components/api-keys-manager";

const SOURCE_LABELS: Record<string, string> = {
  google: "Google",
  linkedin: "LinkedIn",
  github: "GitHub",
};

export default function SettingsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);
  const [avatarModalOpen, setAvatarModalOpen] = useState(false);
  const [avatarOptions, setAvatarOptions] = useState<Record<string, string>>({});
  const [currentAvatar, setCurrentAvatar] = useState<{ url?: string; source?: string }>({});
  const [saving, setSaving] = useState(false);

  const fetchAvatarOptions = useCallback(async () => {
    try {
      const res = await fetch("/api/avatar");
      if (res.ok) {
        const data = await res.json();
        setAvatarOptions(data.options || {});
        setCurrentAvatar(data.current || {});
      }
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    if (!loading && user) fetchAvatarOptions();
  }, [loading, user, fetchAvatarOptions]);

  async function selectAvatar(source: string) {
    setSaving(true);
    try {
      const res = await fetch("/api/avatar", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source }),
      });
      if (res.ok) {
        const data = await res.json();
        setCurrentAvatar({ url: data.avatarUrl, source: data.avatarSource });
        setAvatarModalOpen(false);
        router.refresh();
      }
    } catch {
      // silent
    } finally {
      setSaving(false);
    }
  }

  async function handleSignOut() {
    setSigningOut(true);
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push("/");
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="h-6 w-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  const name = user?.user_metadata?.full_name || "User";
  const email = user?.email || "";
  const displayAvatar = currentAvatar.url || user?.user_metadata?.avatar_url;
  const provider = user?.app_metadata?.provider || "google";
  const createdAt = user?.created_at
    ? new Date(user.created_at).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "Unknown";

  const initials = name
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const optionCount = Object.keys(avatarOptions).length;

  return (
    <div className="space-y-6 max-w-xl mx-auto">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your account and preferences.
        </p>
      </div>

      {/* Profile */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Profile</CardTitle>
          <CardDescription>Your account information from Google.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="relative group">
              <Avatar className="h-14 w-14">
                {displayAvatar && <AvatarImage src={displayAvatar} alt={name} />}
                <AvatarFallback className="text-lg bg-primary/10 text-primary">
                  {initials}
                </AvatarFallback>
              </Avatar>
              {optionCount > 1 && (
                <button
                  onClick={() => setAvatarModalOpen(true)}
                  className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground text-[10px] font-medium px-1.5 py-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                >
                  Edit
                </button>
              )}
            </div>
            <div>
              <p className="font-medium">{name}</p>
              <p className="text-sm text-muted-foreground">{email}</p>
              {optionCount > 1 && (
                <button
                  onClick={() => setAvatarModalOpen(true)}
                  className="text-xs text-primary hover:underline mt-0.5"
                >
                  Change profile photo
                </button>
              )}
            </div>
          </div>

          <Separator />

          <div className="grid gap-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Provider</span>
              <Badge variant="outline" className="text-xs capitalize">
                {provider}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Member since</span>
              <span>{createdAt}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* API Keys */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">API Keys</CardTitle>
          <CardDescription>
            Bring your own keys for AI features. Your keys are encrypted at rest.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ApiKeysManager />
        </CardContent>
      </Card>

      {/* Danger zone */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Account</CardTitle>
          <CardDescription>Sign out of your account.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            onClick={handleSignOut}
            disabled={signingOut}
          >
            {signingOut ? "Signing out..." : "Sign out"}
          </Button>
        </CardContent>
      </Card>

      {/* Avatar picker modal */}
      <Dialog open={avatarModalOpen} onOpenChange={setAvatarModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Choose profile photo</DialogTitle>
            <DialogDescription>
              Select which profile photo to use across Match.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 py-4">
            {Object.entries(avatarOptions).map(([source, url]) => (
              <button
                key={source}
                onClick={() => selectAvatar(source)}
                disabled={saving}
                className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all hover:bg-muted ${
                  currentAvatar.source === source
                    ? "border-primary bg-primary/5"
                    : "border-transparent hover:border-border"
                }`}
              >
                <Avatar className="h-16 w-16">
                  <AvatarImage src={url} alt={source} />
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {source[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="text-xs font-medium">
                  {SOURCE_LABELS[source] || source}
                </span>
                {currentAvatar.source === source && (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                    Current
                  </Badge>
                )}
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
