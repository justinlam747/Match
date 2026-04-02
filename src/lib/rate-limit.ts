import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

interface RateLimitResult {
  success: boolean;
  remaining: number;
  reset: number;
}

/**
 * Sliding-window rate limiter using Redis.
 * @param key - unique key (e.g. "score-matches:<userId>")
 * @param limit - max requests in window
 * @param windowSeconds - window size in seconds
 */
export async function rateLimit(
  key: string,
  limit: number,
  windowSeconds: number
): Promise<RateLimitResult> {
  const now = Date.now();
  const windowMs = windowSeconds * 1000;
  const windowStart = now - windowMs;
  const member = `${now}-${Math.random().toString(36).slice(2, 8)}`;

  const pipeline = redis.pipeline();
  pipeline.zremrangebyscore(key, 0, windowStart);
  pipeline.zadd(key, { score: now, member });
  pipeline.zcard(key);
  pipeline.expire(key, windowSeconds);

  const results = await pipeline.exec();
  const count = results[2] as number;

  return {
    success: count <= limit,
    remaining: Math.max(0, limit - count),
    reset: Math.ceil(windowSeconds - (now - windowStart) / 1000),
  };
}
