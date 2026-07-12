interface RateLimitEntry {
  count: number;
  resetAt: number;
}

declare global {
  var meyukbuRateLimitStore: Map<string, RateLimitEntry> | undefined;
}

function store(): Map<string, RateLimitEntry> {
  if (!globalThis.meyukbuRateLimitStore) {
    globalThis.meyukbuRateLimitStore = new Map();
  }
  return globalThis.meyukbuRateLimitStore;
}

/** Small same-process limiter for mutation routes; production can replace this with Redis. */
export function takeRateLimit(
  key: string,
  limit = 20,
  windowMs = 60_000,
  now = Date.now(),
): { allowed: boolean; retryAfterSeconds: number } {
  const entries = store();
  const current = entries.get(key);
  if (!current || current.resetAt <= now) {
    entries.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSeconds: Math.ceil(windowMs / 1000) };
  }
  if (current.count >= limit) {
    return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000)) };
  }
  current.count += 1;
  return { allowed: true, retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000)) };
}

export function requestRateLimitKey(headers: Headers, scope: string): string {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return `${scope}:${forwarded || headers.get("x-real-ip") || headers.get("host") || "unknown"}`;
}
