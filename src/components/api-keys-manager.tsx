"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface SavedKey {
  id: string;
  provider: "openai";
  keyHint: string;
}

export function ApiKeysManager() {
  const [keys, setKeys] = useState<SavedKey[]>([]);
  const [editing, setEditing] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/keys")
      .then((r) => r.json())
      .then((data) => setKeys(data.keys || []))
      .catch(() => {});
  }, []);

  const saved = keys.find((k) => k.provider === "openai");

  async function handleSave() {
    if (!inputValue.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: inputValue.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setKeys([data.key]);
      setEditing(false);
      setInputValue("");
      toast.success("OpenAI key saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save key");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    try {
      await fetch("/api/keys", { method: "DELETE" });
      setKeys([]);
      toast.success("Key removed");
    } catch {
      toast.error("Failed to remove key");
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 p-3 border rounded-lg">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">OpenAI</span>
            {saved && !editing && (
              <Badge variant="outline" className="text-xs">
                {saved.keyHint}
              </Badge>
            )}
          </div>

          {editing && (
            <div className="flex items-center gap-2 mt-2">
              <Input
                type="password"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="sk-proj-..."
                className="text-sm font-mono h-8"
                autoFocus
              />
              <Button
                size="sm"
                onClick={handleSave}
                disabled={saving || !inputValue.trim()}
                className="h-8"
              >
                {saving ? "..." : "Save"}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setEditing(false);
                  setInputValue("");
                }}
                className="h-8"
              >
                Cancel
              </Button>
            </div>
          )}
        </div>

        {!editing && (
          <div className="flex items-center gap-1.5 shrink-0">
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              onClick={() => {
                setEditing(true);
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
                onClick={handleDelete}
              >
                Remove
              </Button>
            )}
          </div>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        Keys are encrypted with AES-256-GCM before storage. They are only decrypted server-side when making AI requests.
      </p>
    </div>
  );
}
