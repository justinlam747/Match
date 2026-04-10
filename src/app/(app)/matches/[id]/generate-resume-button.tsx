"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

interface GenerateResponse {
  pdfBase64: string;
  coveragePercent: number;
  filename: string;
}

export function GenerateResumeButton({ matchId }: { matchId: string }) {
  const [loading, setLoading] = useState(false);
  const [coverage, setCoverage] = useState<number | null>(null);

  async function handleGenerate() {
    setLoading(true);
    try {
      const res = await fetch("/api/tailor-resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchId }),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error || "Failed to generate resume");
      }
      const data = (await res.json()) as GenerateResponse;
      setCoverage(data.coveragePercent);

      // Trigger download
      const byteChars = atob(data.pdfBase64);
      const byteNums = new Array(byteChars.length);
      for (let i = 0; i < byteChars.length; i++) {
        byteNums[i] = byteChars.charCodeAt(i);
      }
      const blob = new Blob([new Uint8Array(byteNums)], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = data.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success(`Resume ready — ${data.coveragePercent}% keyword coverage`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to generate resume");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Button size="sm" onClick={handleGenerate} disabled={loading}>
        {loading ? "Tailoring..." : "Generate tailored resume"}
      </Button>
      {coverage !== null && (
        <span className="text-xs text-muted-foreground">
          Last: {coverage}% keyword coverage
        </span>
      )}
    </div>
  );
}
