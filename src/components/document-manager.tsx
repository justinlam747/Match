"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface Doc {
  id: string;
  type: string;
  title: string;
  sourceUrl: string | null;
  rawText: string | null;
  createdAt: string;
}

function GitHubIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
    </svg>
  );
}

function LinkedInIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}

function DocIcon({ type }: { type: string }) {
  if (type === "github") {
    return (
      <div className="w-9 h-9 rounded-lg bg-[#24292f] flex items-center justify-center shrink-0">
        <GitHubIcon className="w-5 h-5 text-white" />
      </div>
    );
  }
  if (type === "linkedin") {
    return (
      <div className="w-9 h-9 rounded-lg bg-[#0A66C2] flex items-center justify-center shrink-0">
        <LinkedInIcon className="w-4.5 h-4.5 text-white" />
      </div>
    );
  }
  if (type === "resume") {
    return (
      <div className="w-9 h-9 rounded-lg bg-red-500/10 flex items-center justify-center shrink-0">
        <svg className="w-4.5 h-4.5 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
        </svg>
      </div>
    );
  }
  if (type === "portfolio") {
    return (
      <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
        <svg className="w-4.5 h-4.5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5a17.92 17.92 0 01-8.716-2.247m0 0A9 9 0 013 12c0-1.47.353-2.856.978-4.082" />
        </svg>
      </div>
    );
  }
  return (
    <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
      <svg className="w-4.5 h-4.5 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.86-2.54a4.5 4.5 0 00-1.242-7.244l-4.5-4.5a4.5 4.5 0 00-6.364 6.364L4.34 8.627" />
      </svg>
    </div>
  );
}

const TYPE_LABELS: Record<string, string> = {
  resume: "Resume",
  portfolio: "Portfolio",
  github: "GitHub",
  linkedin: "LinkedIn",
  website: "Website",
  other: "Other",
};

function DocEntry({ doc, label, onDelete }: { doc: Doc; label: string; onDelete: () => void }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 p-2.5 hover:bg-muted/50 transition-colors text-left"
      >
        <DocIcon type={doc.type} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium truncate text-sm">{doc.title}</span>
            <Badge variant="outline" className="text-[10px] shrink-0">
              {label}
            </Badge>
          </div>
          {doc.sourceUrl && (
            <span className="text-xs text-muted-foreground truncate block">
              {doc.sourceUrl}
            </span>
          )}
        </div>
        <svg
          className={`w-4 h-4 text-muted-foreground transition-transform shrink-0 ${expanded ? "rotate-180" : ""}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {expanded && (
        <div className="border-t px-3 py-3 space-y-2">
          {doc.rawText ? (
            <>
              {/* Show profile info (strip README content from display) */}
              <pre className="text-xs text-muted-foreground whitespace-pre-wrap break-words leading-relaxed max-h-64 overflow-y-auto font-sans">
                {doc.rawText.split("\n--- README:")[0].slice(0, 3000)}
              </pre>
              {/* Indicate READMEs are included without showing them */}
              {doc.rawText.includes("--- README:") && (
                <div className="flex items-center gap-2 pt-1 text-xs text-muted-foreground">
                  <svg className="w-3.5 h-3.5 text-green-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                  {(doc.rawText.match(/--- README:/g) || []).length} repo README{(doc.rawText.match(/--- README:/g) || []).length !== 1 ? "s" : ""} included in matching data
                </div>
              )}
            </>
          ) : (
            <p className="text-xs text-muted-foreground">No extracted content.</p>
          )}
          <div className="flex items-center justify-between pt-1">
            {doc.sourceUrl && (
              <a
                href={doc.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary hover:underline"
              >
                Open link
              </a>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              className="text-xs text-muted-foreground hover:text-destructive ml-auto"
            >
              Remove
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function DocumentManager({ onDocumentsChange }: { onDocumentsChange?: () => void }) {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [github, setGithub] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [otherUrl, setOtherUrl] = useState("");
  const [loading, setLoading] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const loadDocs = useCallback(async () => {
    try {
      const res = await fetch("/api/documents");
      if (res.ok) {
        const data = await res.json();
        setDocs(data.documents || []);
      }
    } catch {}
  }, []);

  useEffect(() => { loadDocs(); }, [loadDocs]);

  const hasType = (type: string) => docs.some((d) => d.type === type);

  async function addUrl(url: string, type: string, setter: (v: string) => void) {
    if (!url.trim()) return;
    setLoading(type);
    try {
      const res = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim(), type }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setDocs((prev) => [data.document, ...prev]);
      setter("");
      toast.success(`Added: ${data.document.title}`);
      onDocumentsChange?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(null);
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/documents", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setDocs((prev) => [data.document, ...prev]);
      toast.success(`Added: ${data.document.title}`);
      onDocumentsChange?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  }

  async function handleDelete(id: string) {
    try {
      await fetch(`/api/documents?id=${id}`, { method: "DELETE" });
      setDocs((prev) => prev.filter((d) => d.id !== id));
      onDocumentsChange?.();
    } catch {
      toast.error("Failed to remove");
    }
  }

  return (
    <div className="space-y-5">
      {/* Quick-add inputs */}
      <div className="space-y-3">
        {/* GitHub */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#24292f] flex items-center justify-center shrink-0">
            <GitHubIcon className="w-5 h-5 text-white" />
          </div>
          {hasType("github") ? (
            <div className="flex-1 flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {docs.find((d) => d.type === "github")?.title}
              </span>
              <Badge variant="outline" className="text-[10px] text-green-600">Connected</Badge>
            </div>
          ) : (
            <div className="flex-1 flex items-center gap-2">
              <Input
                value={github}
                onChange={(e) => setGithub(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addUrl(github, "github", setGithub)}
                placeholder="github.com/username"
                className="h-9 text-sm flex-1"
              />
              <Button
                size="sm"
                variant="outline"
                className="h-9"
                onClick={() => addUrl(
                  github.startsWith("http") ? github : `https://github.com/${github.replace(/^@/, "")}`,
                  "github",
                  setGithub
                )}
                disabled={loading === "github" || !github.trim()}
              >
                {loading === "github" ? "..." : "Add"}
              </Button>
            </div>
          )}
        </div>

        {/* LinkedIn */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#0A66C2] flex items-center justify-center shrink-0">
            <LinkedInIcon className="w-4 h-4 text-white" />
          </div>
          {hasType("linkedin") ? (
            <div className="flex-1 flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {docs.find((d) => d.type === "linkedin")?.title}
              </span>
              <Badge variant="outline" className="text-[10px] text-green-600">Connected</Badge>
            </div>
          ) : (
            <div className="flex-1 flex items-center gap-2">
              <Input
                value={linkedin}
                onChange={(e) => setLinkedin(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addUrl(linkedin, "linkedin", setLinkedin)}
                placeholder="linkedin.com/in/username"
                className="h-9 text-sm flex-1"
              />
              <Button
                size="sm"
                variant="outline"
                className="h-9"
                onClick={() => addUrl(
                  linkedin.startsWith("http") ? linkedin : `https://linkedin.com/in/${linkedin.replace(/^@/, "")}`,
                  "linkedin",
                  setLinkedin
                )}
                disabled={loading === "linkedin" || !linkedin.trim()}
              >
                {loading === "linkedin" ? "..." : "Add"}
              </Button>
            </div>
          )}
        </div>

        {/* Portfolio / Other URL */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <svg className="w-4 h-4 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.86-2.54a4.5 4.5 0 00-1.242-7.244l-4.5-4.5a4.5 4.5 0 00-6.364 6.364L4.34 8.627" />
            </svg>
          </div>
          <div className="flex-1 flex items-center gap-2">
            <Input
              value={otherUrl}
              onChange={(e) => setOtherUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addUrl(otherUrl, "portfolio", setOtherUrl)}
              placeholder="Portfolio, project site, or any URL"
              className="h-9 text-sm flex-1"
            />
            <Button
              size="sm"
              variant="outline"
              className="h-9"
              onClick={() => addUrl(otherUrl, "portfolio", setOtherUrl)}
              disabled={loading === "portfolio" || !otherUrl.trim()}
            >
              {loading === "portfolio" ? "..." : "Add"}
            </Button>
          </div>
        </div>
      </div>

      {/* File upload */}
      <label className="flex items-center gap-3 p-3 border border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
        <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
          <svg className="w-4 h-4 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
        </div>
        <div className="flex-1">
          <span className="text-sm font-medium">
            {isUploading ? "Uploading..." : "Upload additional file"}
          </span>
          <p className="text-xs text-muted-foreground">PDF, TXT, MD — cover letters, project writeups, etc.</p>
        </div>
        <input
          type="file"
          accept=".pdf,.txt,.md"
          className="hidden"
          onChange={handleFileUpload}
          disabled={isUploading}
        />
      </label>

      {/* Added documents */}
      {docs.length > 0 && (
        <div className="space-y-1.5 pt-2">
          <span className="text-xs text-muted-foreground font-medium">
            {docs.length} document{docs.length !== 1 ? "s" : ""} added
          </span>
          {docs.map((doc) => {
            const label = TYPE_LABELS[doc.type] || "Other";
            return (
              <DocEntry
                key={doc.id}
                doc={doc}
                label={label}
                onDelete={() => handleDelete(doc.id)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
