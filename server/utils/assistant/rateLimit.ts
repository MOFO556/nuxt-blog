type RateLimitResult =
  | { ok: true; remaining: number }
  | { ok: false; retryAfterMs: number };

type Bucket = {
  timestamps: number[];
};

/**
 * Sliding-window rate limiter keyed by an opaque id (e.g. IP).
 * In-memory only - fine for demo / local debug.
 */
export function createSlidingWindowRateLimiter(options: {
  maxRequests: number;
  windowMs: number;
  now?: () => number;
}) {
  const buckets = new Map<string, Bucket>();
  const now = options.now ?? (() => Date.now());

  function prune(bucket: Bucket, t: number) {
    const cutoff = t - options.windowMs;
    bucket.timestamps = bucket.timestamps.filter((ts) => ts > cutoff);
  }

  function check(key: string): RateLimitResult {
    const t = now();
    const bucket = buckets.get(key) ?? { timestamps: [] };
    prune(bucket, t);
    buckets.set(key, bucket);

    if (bucket.timestamps.length >= options.maxRequests) {
      const oldest = bucket.timestamps[0] ?? t;
      return { ok: false, retryAfterMs: Math.max(0, oldest + options.windowMs - t) };
    }

    bucket.timestamps.push(t);
    return {
      ok: true,
      remaining: Math.max(0, options.maxRequests - bucket.timestamps.length),
    };
  }

  function reset() {
    buckets.clear();
  }

  return { check, reset };
}