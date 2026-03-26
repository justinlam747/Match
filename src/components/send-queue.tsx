"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmailEditor, type EmailData } from "@/components/email-editor";

interface SendQueueProps {
  emails: EmailData[];
  onUpdateEmail: (id: string, subject: string, body: string) => Promise<void>;
  onSendEmail: (id: string) => Promise<void>;
  onSendAll: (ids: string[]) => Promise<void>;
}

export function SendQueue({
  emails,
  onUpdateEmail,
  onSendEmail,
  onSendAll,
}: SendQueueProps) {
  const [isSendingAll, setIsSendingAll] = useState(false);

  const drafts = emails.filter(
    (e) => e.status === "draft" || e.status === "edited"
  );
  const sentCount = emails.filter(
    (e) => e.status === "sent" || e.status === "opened" || e.status === "replied"
  ).length;
  const openedCount = emails.filter((e) => e.status === "opened").length;
  const repliedCount = emails.filter((e) => e.status === "replied").length;
  const bouncedCount = emails.filter((e) => e.status === "bounced").length;

  if (emails.length === 0) {
    return (
      <div className="text-center py-32 max-w-sm mx-auto">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 text-primary text-xl mb-4">
          ✉
        </div>
        <h2 className="text-lg font-semibold">No emails yet</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Select companies on the Matches page and draft emails.
        </p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => (window.location.href = "/matches")}
        >
          Go to Matches
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats row */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {drafts.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {drafts.length} drafts
            </Badge>
          )}
          {sentCount > 0 && (
            <Badge variant="outline" className="text-xs">
              {sentCount} sent
            </Badge>
          )}
          {openedCount > 0 && (
            <Badge variant="outline" className="text-xs text-green-600">
              {openedCount} opened
            </Badge>
          )}
          {repliedCount > 0 && (
            <Badge variant="default" className="text-xs">
              {repliedCount} replied
            </Badge>
          )}
          {bouncedCount > 0 && (
            <Badge variant="destructive" className="text-xs">
              {bouncedCount} bounced
            </Badge>
          )}
        </div>
        {drafts.length > 0 && (
          <Button
            size="sm"
            onClick={async () => {
              setIsSendingAll(true);
              try {
                await onSendAll(drafts.map((e) => e.id));
              } finally {
                setIsSendingAll(false);
              }
            }}
            disabled={isSendingAll}
          >
            {isSendingAll ? "Sending..." : `Send all (${drafts.length})`}
          </Button>
        )}
      </div>

      {/* Email list */}
      <div className="space-y-2">
        {emails.map((email) => (
          <EmailEditor
            key={email.id}
            email={email}
            onSave={onUpdateEmail}
            onSend={onSendEmail}
          />
        ))}
      </div>
    </div>
  );
}
