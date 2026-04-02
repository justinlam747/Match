"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface SavedKey {
  id: string;
  provider: "anthropic" | "openai";
  keyHint: string;
}

const PROVIDERS = [
  {
    id: "anthropic" as const,
    name: "Anthropic",
    placeholder: "sk-ant-api03-...",
    prefix: "sk-ant-",
  },
  {
    id: "openai" as const,
    name: "OpenAI",
    placeholder: "sk-proj-...",
    prefix: "sk-",
  },
];

export function ApiKeysManager() {
  const [keys, setKeys] = useState<SavedKey[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/keys")
      .then((r) => r.json())
      .then((data) => setKeys(data.keys || []))
      .catch(() => {});
  }, []);

  async function handleSave(provider: "anthropic" | "openai") {
    if (!inputValue.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, apiKey: inputValue.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setKeys((prev) => [
        ...prev.filter((k) => k.provider !== provider),
        data.key,
      ]);
      setEditing(null);
      setInputValue("");
      toast.success(`${provider === "anthropic" ? "Anthropic" : "OpenAI"} key saved`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save key");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(provider: "anthropic" | "openai") {
    try {
      await fetch(`/api/keys?provider=${provider}`, { method: "DELETE" });
      setKeys((prev) => prev.filter((k) => k.provider !== provider));
      toast.success("Key removed");
    } catch {
      toast.error("Failed to remove key");
    }
  }

  return (
    <div className="space-y-3">
      {PROVIDERS.map((p) => {
        const saved = keys.find((k) => k.provider === p.id);
        const isEditing = editing === p.id;

        return (
          <div
            key={p.id}
            className="flex items-center gap-3 p-3 border rounded-lg"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{p.name}</span>
                {saved && !isEditing && (
                  <Badge variant="outline" className="text-xs">
                    {saved.keyHint}
                  </Badge>
                )}
              </div>

              {isEditing && (
                <div className="flex items-center gap-2 mt-2">
                  <Input
                    type="password"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder={p.placeholder}
                    className="text-sm font-mono h-8"
                    autoFocus
                  />
                  <Button
                    size="sm"
                    onClick={() => handleSave(p.id)}
                    disabled={saving || !inputValue.trim()}
                    className="h-8"
                  >
                    {saving ? "..." : "Save"}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setEditing(null);
                      setInputValue("");
                    }}
                    className="h-8"
                  >
                    Cancel
                  </Button>
                </div>
              )}
            </div>

            {!isEditing && (
              <div className="flex items-center gap-1.5 shrink-0">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={() => {
                    setEditing(p.id);
                    setInputValue("");
                  }}
                >
                  {saved ? "Update" : "Add key"}
                </Button>
                {saved && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs text-muted-foreground"
                    onClick={() => handleDelete(p.id)}
                  >
                    Remove
                  </Button>
                )}
              </div>
            )}
          </div>
        );
      })}
      <p className="text-xs text-muted-foreground">
        Keys are encrypted with AES-256-GCM before storage. They are only decrypted server-side when making AI requests.
      </p>
    </div>
  );
}
