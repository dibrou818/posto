type Bucket = { count: number; resetAt: number };

// Module-level state: lives for as long as this server process/isolate does.
// Good enough for a single-instance MVP — no extra account/dependency needed.
// It is NOT shared across multiple concurrent serverless instances/regions,
// so a determined attacker spread across many edge locations could still get
// more than `limit` requests through in aggregate. If this app ever scales
// onto multi-instance serverless (e.g. several Vercel regions under load),
// swap this for a shared store instead — @upstash/ratelimit backed by
// Upstash Redis's free tier is the standard drop-in for that.
const buckets = new Map<string, Bucket>();

/** Fixed-window rate limit check, keyed by an arbitrary string (e.g.
 * "search:203.0.113.4"). Returns true if the call is allowed. Also does
 * lazy, opportunistic cleanup of expired entries so the map doesn't grow
 * unbounded over a long-lived process — no Node-only timer API, so this
 * stays safe to run on the Edge runtime. */
export function checkRateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();

  if (buckets.size > 5000) {
    for (const [k, bucket] of buckets) {
      if (now > bucket.resetAt) buckets.delete(k);
    }
  }

  const bucket = buckets.get(key);
  if (!bucket || now > bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (bucket.count >= limit) return false;

  bucket.count += 1;
  return true;
}
