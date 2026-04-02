"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface ResumeItem {
  id: string;
  name: string;
  isActive: boolean;
  createdAt: string;
}

export function ResumeList({
  onActiveChange,
}: {
  onActiveChange?: (id: string) => void;
}) {
  const [list, setList] = useState<ResumeItem[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  useEffect(() => {
    fetch("/api/resumes")
      .then((r) => r.json())
      .then((data) => setList(data.resumes || []))
      .catch(() => {});
  }, []);

  async function handleSetActive(id: string) {
    try {
      await fetch("/api/resumes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, setActive: true }),
      });
      setList((prev) =>
        prev.map((r) => ({ ...r, isActive: r.id === id }))
      );
      onActiveChange?.(id);
      toast.success("Switched resume");
    } catch {
      toast.error("Failed to switch");
    }
  }

  async function handleRename(id: string) {
    if (!editName.trim()) return;
    try {
      await fetch("/api/resumes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, name: editName.trim() }),
      });
      setList((prev) =>
        prev.map((r) => (r.id === id ? { ...r, name: editName.trim() } : r))
      );
      setEditing(null);
      setEditName("");
    } catch {
      toast.error("Failed to rename");
    }
  }

  async function handleDelete(id: string) {
    try {
      await fetch(`/api/resumes?id=${id}`, { method: "DELETE" });
      setList((prev) => prev.filter((r) => r.id !== id));
    } catch {
      toast.error("Failed to delete");
    }
  }

  if (list.length === 0) return null;

  return (
    <div className="space-y-1.5">
      <span className="text-xs text-muted-foreground font-medium">
        Your resumes
      </span>
      {list.map((r) => (
        <div
          key={r.id}
          className={`flex items-center gap-3 p-2.5 border rounded-lg transition-colors ${
            r.isActive ? "border-primary/30 bg-primary/[0.02]" : ""
          }`}
        >
          {/* Radio-style selector */}
          <button
            onClick={() => handleSetActive(r.id)}
            className={`w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center ${
              r.isActive
                ? "border-primary"
                : "border-muted-foreground/30 hover:border-primary/50"
            }`}
          >
            {r.isActive && (
              <div className="w-2 h-2 rounded-full bg-primary" />
            )}
          </button>

          <div className="flex-1 min-w-0">
            {editing === r.id ? (
              <div className="flex items-center gap-1.5">
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleRename(r.id);
                    if (e.key === "Escape") setEditing(null);
                  }}
                  className="h-7 text-sm"
                  autoFocus
                />
                <button
                  onClick={() => handleRename(r.id)}
                  className="text-xs text-primary hover:underline shrink-0"
                >
                  Save
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium truncate">{r.name}</span>
                {r.isActive && (
                  <Badge variant="default" className="text-[10px]">Active</Badge>
                )}
              </div>
            )}
            <span className="text-[11px] text-muted-foreground">
              {new Date(r.createdAt).toLocaleDateString()}
            </span>
          </div>

          {editing !== r.id && (
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => {
                  setEditing(r.id);
                  setEditName(r.name);
                }}
                className="text-xs text-muted-foreground hover:text-foreground px-1.5 py-0.5"
              >
                Rename
              </button>
              {!r.isActive && (
                <button
                  onClick={() => handleDelete(r.id)}
                  className="text-xs text-muted-foreground hover:text-destructive px-1.5 py-0.5"
                >
                  Delete
                </button>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
