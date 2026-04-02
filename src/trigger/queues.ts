import { queue } from "@trigger.dev/sdk";

/** Rate-limited queue for web scraping / API calls */
export const scoutQueue = queue({
  name: "scout",
  concurrencyLimit: 3,
});

/** Queue for AI-powered scoring */
export const scoringQueue = queue({
  name: "scoring",
  concurrencyLimit: 5,
});

/** Queue for AI content generation (emails, cover letters, etc.) */
export const contentQueue = queue({
  name: "content",
  concurrencyLimit: 3,
});

/** Queue for email sending (low concurrency for warm-up) */
export const outreachQueue = queue({
  name: "outreach",
  concurrencyLimit: 1,
});
