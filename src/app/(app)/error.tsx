"use client";

import { Button } from "@/components/ui/button";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex items-center justify-center py-32">
      <div className="text-center space-y-4 max-w-sm">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-destructive/10 text-destructive text-xl">
          !
        </div>
        <h2 className="text-lg font-semibold">Something went wrong</h2>
        <p className="text-sm text-muted-foreground">
          {error.message || "An unexpected error occurred. Please try again."}
        </p>
        <div className="flex gap-2 justify-center">
          <Button variant="outline" onClick={() => (window.location.href = "/dashboard")}>
            Go to Dashboard
          </Button>
          <Button onClick={reset}>Try again</Button>
        </div>
      </div>
    </div>
  );
}
