"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { SendQueue } from "@/components/send-queue";
import type { EmailData } from "@/components/email-editor";
import { toast } from "sonner";

interface EmailStatus {
  sentToday: number;
  dailyLimit: number;
  remaining: number;
  isGoodSendTime: boolean;
}

export default function EmailsPage() {
  const [emails, setEmails] = useState<EmailData[]>([]);
  const [loading, setLoading] = useState(true);
  const [emailStatus, setEmailStatus] = useState<EmailStatus | null>(null);

  useEffect(() => {
    async function loadEmails() {
      try {
        const res = await fetch("/api/emails");
        if (!res.ok) throw new Error("Failed to load");
        const data = await res.json();
        setEmails(data.emails);
      } catch {
        toast.error("Failed to load emails");
      } finally {
        setLoading(false);
      }
    }

    async function loadStatus() {
      try {
        const res = await fetch("/api/email-status");
        if (res.ok) {
          const data = await res.json();
          setEmailStatus(data);
        }
      } catch {
        // silently fail
      }
    }
    loadEmails();
    loadStatus();
  }, []);

  async function handleUpdateEmail(id: string, subject: string, body: string) {
    const res = await fetch(`/api/emails/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subject, body }),
    });
    if (!res.ok) throw new Error("Failed to update");
    setEmails((prev) =>
      prev.map((e) => (e.id === id ? { ...e, subject, body, status: "edited" } : e))
    );
    toast.success("Saved");
  }

  async function handleSendEmail(id: string) {
    const res = await fetch("/api/send-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emailIds: [id] }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    setEmails((prev) =>
      prev.map((e) => (e.id === id ? { ...e, status: "sent" } : e))
    );
    toast.success("Sent");
  }

  async function handleSendAll(ids: string[]) {
    const res = await fetch("/api/send-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emailIds: ids }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    const sentIds = new Set(
      data.results
        .filter((r: { success: boolean }) => r.success)
        .map((r: { emailId: string }) => r.emailId)
    );
    setEmails((prev) =>
      prev.map((e) => (sentIds.has(e.id) ? { ...e, status: "sent" } : e))
    );
    toast.success(`Sent ${sentIds.size}/${ids.length}`);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="text-center space-y-3">
          <div className="h-6 w-6 rounded-full border-2 border-primary border-t-transparent animate-spin mx-auto" />
          <p className="text-sm text-muted-foreground">Loading emails...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-3xl mx-auto">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Emails</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Review, edit, and send personalized outreach.
          </p>
        </div>
        {emails.length > 0 && (
          <Badge variant="outline" className="text-xs">
            {emails.length} total
          </Badge>
        )}
      </div>

      {/* Warm-up status */}
      {emailStatus && (
        <div className="rounded-lg border px-4 py-3 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">
              Daily send limit: {emailStatus.sentToday}/{emailStatus.dailyLimit}
            </span>
            <span className={emailStatus.isGoodSendTime ? "text-green-600" : "text-muted-foreground"}>
              {emailStatus.isGoodSendTime ? "Good send window" : "Outside optimal hours"}
            </span>
          </div>
          <Progress
            value={(emailStatus.sentToday / emailStatus.dailyLimit) * 100}
            className="h-1.5"
          />
          <p className="text-xs text-muted-foreground">
            {emailStatus.remaining} sends remaining today. Emails are sent with 3-min delays for deliverability.
          </p>
        </div>
      )}

      <SendQueue
        emails={emails}
        onUpdateEmail={handleUpdateEmail}
        onSendEmail={handleSendEmail}
        onSendAll={handleSendAll}
      />
    </div>
  );
}
