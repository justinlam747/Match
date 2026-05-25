import { getRedis } from "@/lib/cache/redis";

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
  const redis = getRedis();
  if (!redis) {
    return {
      success: true,
      remaining: limit - 1,
      reset: windowSeconds,
    };
  }

  const now = Date.now();
  const windowMs = windowSeconds * 1000;
  const windowStart = now - windowMs;

  // First: clean expired entries and check current count
  const pipeline = redis.pipeline();
  pipeline.zremrangebyscore(key, 0, windowStart);
  pipeline.zcard(key);

  const results = await pipeline.exec();
  const count = results[1] as number;

  if (count >= limit) {
    // Over limit — do NOT add the request to the set
    return {
      success: false,
      remaining: 0,
      reset: Math.ceil(windowSeconds - (now - windowStart) / 1000),
    };
  }

  // Under limit — record this request
  const member = `${now}-${Math.random().toString(36).slice(2, 8)}`;
  const addPipeline = redis.pipeline();
  addPipeline.zadd(key, { score: now, member });
  addPipeline.expire(key, windowSeconds);
  await addPipeline.exec();

  return {
    success: true,
    remaining: Math.max(0, limit - count - 1),
    reset: Math.ceil(windowSeconds - (now - windowStart) / 1000),
  };
}
