"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface GmailStatus {
  connected: boolean;
  emailAddress?: string;
}

export function GmailConnect() {
  const [status, setStatus] = useState<GmailStatus | null>(null);
  const [disconnecting, setDisconnecting] = useState(false);

  useEffect(() => {
    fetch("/api/gmail/status")
      .then((r) => r.json())
      .then(setStatus)
      .catch(() => setStatus({ connected: false }));
  }, []);

  async function handleDisconnect() {
    setDisconnecting(true);
    try {
      await fetch("/api/gmail/disconnect", { method: "POST" });
      setStatus({ connected: false });
    } finally {
      setDisconnecting(false);
    }
  }

  if (!status) return null;

  if (status.connected) {
    return (
      <div className="rounded-lg border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <GmailIcon />
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Gmail connected</span>
              <Badge variant="outline" className="text-xs text-green-600">
                Active
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Sending as {status.emailAddress}
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDisconnect}
          disabled={disconnecting}
        >
          {disconnecting ? "..." : "Disconnect"}
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-dashed px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <GmailIcon />
        <div>
          <span className="text-sm font-medium">Connect your Gmail</span>
          <p className="text-xs text-muted-foreground">
            Send emails from your own account for better deliverability.
          </p>
        </div>
      </div>
      <Button
        size="sm"
        onClick={() => { window.location.href = "/api/gmail/auth"; }}
      >
        Connect
      </Button>
    </div>
  );
}

function GmailIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
      <path
        d="M22 6L12 13L2 6V4l10 7 10-7v2z"
        fill="#EA4335"
      />
      <path
        d="M2 6v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6l-10 7L2 6z"
        fill="#FBBC05"
        opacity="0.3"
      />
      <rect x="2" y="4" width="20" height="16" rx="2" stroke="#EA4335" strokeWidth="1.5" fill="none" />
    </svg>
  );
}
