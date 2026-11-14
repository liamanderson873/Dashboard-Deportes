/**
 * In-memory sliding-window limiter. Each server instance keeps its own count,
 * so on a serverless host it slows down repeated use rather than giving a
 * global guarantee. Enough for a free demo without an external store.
 */
export function createRateLimiter({
  limit,
  windowMs,
  maxKeys = 1000,
}: {
  limit: number;
  windowMs: number;
  maxKeys?: number;
}) {
  const hits = new Map<string, number[]>();
  return {
    /** Records one use for `key`; returns how many seconds to wait when over the limit. */
    take(
      key: string,
      now = Date.now(),
    ): { ok: true } | { ok: false; retryAfter: number } {
      const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
      if (recent.length >= limit) {
        hits.set(key, recent);
        return {
          ok: false,
          retryAfter: Math.max(
            1,
            Math.ceil((recent[0] + windowMs - now) / 1000),
          ),
        };
      }
      recent.push(now);
      hits.delete(key);
      hits.set(key, recent);
      // Forget the least recently used visitors so memory stays bounded.
      while (hits.size > maxKeys) hits.delete(hits.keys().next().value!);
      return { ok: true };
    },
  };
}

/** Client address as set by the hosting proxy; "anon" when it is absent (local runs, tests). */
export function clientKey(request: Request): string {
  const real = request.headers.get("x-real-ip")?.trim();
  if (real) return real;
  const forwarded = request.headers
    .get("x-forwarded-for")
    ?.split(",")[0]
    ?.trim();
  return forwarded || "anon";
}
