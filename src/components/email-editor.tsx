"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

export interface EmailData {
  id: string;
  contactName: string;
  contactTitle: string | null;
  contactEmail: string;
  companyName: string;
  matchScore: number;
  subject: string;
  body: string;
  status: string;
}

interface EmailEditorProps {
  email: EmailData;
  onSave: (id: string, subject: string, body: string) => void;
  onSend: (id: string) => void;
}

function statusConfig(status: string) {
  const map: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive"; dotColor: string }> = {
    draft: { label: "Draft", variant: "secondary", dotColor: "bg-muted-foreground" },
    edited: { label: "Edited", variant: "secondary", dotColor: "bg-primary" },
    sent: { label: "Sent", variant: "default", dotColor: "bg-green-500" },
    opened: { label: "Opened", variant: "default", dotColor: "bg-green-500" },
    replied: { label: "Replied", variant: "default", dotColor: "bg-green-500" },
    bounced: { label: "Bounced", variant: "destructive", dotColor: "bg-destructive" },
  };
  return map[status] || { label: status, variant: "secondary" as const, dotColor: "bg-muted-foreground" };
}

function scoreLabel(score: number): string {
  if (score >= 75) return "strong";
  if (score >= 50) return "good";
  return "fair";
}

export function EmailEditor({ email, onSave, onSend }: EmailEditorProps) {
  const [subject, setSubject] = useState(email.subject);
  const [body, setBody] = useState(email.body);
  const [isSaving, setIsSaving] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const isDirty = subject !== email.subject || body !== email.body;
  const isSent = ["sent", "opened", "replied"].includes(email.status);
  const { label, variant, dotColor } = statusConfig(email.status);

  return (
    <div className="border rounded-lg overflow-hidden transition-shadow hover:shadow-sm">
      {/* Summary row */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 flex items-center gap-4 text-left text-sm hover:bg-muted/50 transition-colors"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium truncate">{email.contactName}</span>
            <span className="text-muted-foreground text-xs truncate hidden sm:inline">
              {email.companyName}
            </span>
          </div>
          <p className="text-xs text-muted-foreground truncate mt-0.5">
            {subject}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs tabular-nums text-muted-foreground" title={`${scoreLabel(email.matchScore)} match`}>
            {email.matchScore}
          </span>
          <Badge variant={variant} className="text-xs gap-1">
            <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
            {label}
          </Badge>
          <svg
            className={`w-4 h-4 text-muted-foreground transition-transform ${expanded ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Expanded editor */}
      {expanded && (
        <div className="border-t px-4 py-4 space-y-3">
          <div className="text-xs text-muted-foreground flex items-center gap-2">
            <span>To:</span>
            <span className="font-medium text-foreground">{email.contactName}</span>
            {email.contactTitle && (
              <span>({email.contactTitle})</span>
            )}
            <span>&mdash;</span>
            <span>{email.contactEmail}</span>
          </div>

          <Input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            disabled={isSent}
            placeholder="Subject"
            className="text-sm"
          />

          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            disabled={isSent}
            rows={8}
            className="font-mono text-sm resize-y"
          />

          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {body.split(/\s+/).filter(Boolean).length} words
            </span>

            {!isSent && (
              <div className="flex gap-2">
                {isDirty && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      setIsSaving(true);
                      try { await onSave(email.id, subject, body); } finally { setIsSaving(false); }
                    }}
                    disabled={isSaving}
                  >
                    {isSaving ? "Saving..." : "Save"}
                  </Button>
                )}
                <Button
                  size="sm"
                  onClick={async () => {
                    setIsSending(true);
                    try { await onSend(email.id); } finally { setIsSending(false); }
                  }}
                  disabled={isSending}
                >
                  {isSending ? "Sending..." : "Send"}
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
