"use client";

import { useState, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { ParsedResume } from "@/lib/db/schema";

interface ResumeUploadProps {
  onParsed: (resumeId: string, parsedData: ParsedResume) => void;
}

export function ResumeUpload({ onParsed }: ResumeUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [parsed, setParsed] = useState<ParsedResume | null>(null);

  const handleUpload = useCallback(
    async (file: File) => {
      setError(null);
      setIsUploading(true);

      try {
        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch("/api/parse-resume", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Upload failed");
        }

        const data = await res.json();
        setParsed(data.parsedData);
        onParsed(data.id, data.parsedData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Upload failed");
      } finally {
        setIsUploading(false);
      }
    },
    [onParsed]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file?.type === "application/pdf") {
        handleUpload(file);
      } else {
        setError("Please upload a PDF file");
      }
    },
    [handleUpload]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleUpload(file);
    },
    [handleUpload]
  );

  if (parsed) {
    return (
      <div className="space-y-4 text-sm">
        <div className="flex items-baseline justify-between">
          <span className="font-medium">{parsed.name}</span>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {parsed.seniority_level}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {parsed.years_of_experience}y exp
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {[
            ...parsed.skills.languages,
            ...parsed.skills.frameworks,
            ...parsed.skills.tools,
            ...parsed.skills.databases,
            ...parsed.skills.cloud,
          ].map((skill) => (
            <Badge key={skill} variant="secondary" className="text-xs font-normal">
              {skill}
            </Badge>
          ))}
        </div>

        <Separator />

        <div className="space-y-1.5">
          {parsed.experience.slice(0, 3).map((exp, i) => (
            <div key={i} className="text-muted-foreground">
              <span className="text-foreground font-medium">{exp.title}</span>
              {" at "}
              {exp.company}
              <span className="text-xs"> · {exp.industry}</span>
            </div>
          ))}
        </div>

        {parsed.industries_worked_in.length > 0 && (
          <>
            <Separator />
            <div className="flex flex-wrap gap-1.5">
              {parsed.industries_worked_in.map((ind) => (
                <Badge key={ind} variant="outline" className="text-xs font-normal">
                  {ind}
                </Badge>
              ))}
            </div>
          </>
        )}

        {parsed.standout_signals.length > 0 && (
          <>
            <Separator />
            <div>
              <span className="text-xs text-muted-foreground block mb-1">Standout signals</span>
              <div className="flex flex-wrap gap-1.5">
                {parsed.standout_signals.map((signal) => (
                  <Badge key={signal} className="text-xs font-normal bg-primary/10 text-primary border-0">
                    {signal}
                  </Badge>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <label
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`block border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all ${
          isDragging
            ? "border-primary/50 bg-primary/5 scale-[1.01]"
            : "border-border hover:border-primary/30 hover:bg-muted/50"
        }`}
      >
        {isUploading ? (
          <div className="space-y-2">
            <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
              <span className="h-5 w-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            </div>
            <p className="text-sm text-muted-foreground">Parsing resume with AI...</p>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-muted">
              <svg className="w-5 h-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m6.75 12l-3-3m0 0l-3 3m3-3v6m-1.5-15H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium">Drop a PDF here or click to browse</p>
              <p className="text-xs text-muted-foreground mt-0.5">PDF only, max 10 MB</p>
            </div>
          </div>
        )}
        <input
          type="file"
          accept=".pdf"
          className="hidden"
          onChange={handleFileInput}
        />
      </label>

      {error && (
        <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">
          {error}
        </p>
      )}
    </div>
  );
}
