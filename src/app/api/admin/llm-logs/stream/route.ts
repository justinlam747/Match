import { getApiUser } from "@/lib/supabase/api-auth";
import { db } from "@/lib/db";
import { llmLogs } from "@/lib/db/schema";
import { desc, gt } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getApiUser();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }
  const tags = (user.tags as string[] | null) ?? [];
  if (!tags.includes("admin")) {
    return new Response("Forbidden", { status: 403 });
  }

  const encoder = new TextEncoder();
  let cancelled = false;

  const stream = new ReadableStream({
    async start(controller) {
      let lastSeen = new Date();

      const poll = async () => {
        if (cancelled) return;

        try {
          const rows = await db
            .select()
            .from(llmLogs)
            .where(gt(llmLogs.createdAt, lastSeen))
            .orderBy(desc(llmLogs.createdAt))
            .limit(50);

          if (rows.length > 0) {
            lastSeen = rows[0].createdAt;
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify(rows)}\n\n`)
            );
          } else {
            // Keep-alive
            controller.enqueue(encoder.encode(": heartbeat\n\n"));
          }
        } catch {
          // DB hiccup — skip this tick
        }

        if (!cancelled) {
          setTimeout(poll, 1500);
        }
      };

      // Start polling
      poll();
    },
    cancel() {
      cancelled = true;
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
