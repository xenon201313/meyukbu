import { timingSafeEqual } from "node:crypto";
import { isIP } from "node:net";

import { getEnvironment, type AppEnvironment } from "@/lib/env";

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

export type RateLimitProxyConfig = Pick<
  AppEnvironment,
  "TRUSTED_PROXY_MODE" | "CLOUDFLARE_PROXY_SHARED_SECRET"
>;

const maximumRateLimitKeys = 10_000;

declare global {
  var meyukbuRateLimitStore: Map<string, RateLimitEntry> | undefined;
}

function store(): Map<string, RateLimitEntry> {
  if (!globalThis.meyukbuRateLimitStore) {
    globalThis.meyukbuRateLimitStore = new Map();
  }
  return globalThis.meyukbuRateLimitStore;
}

function discardExpiredOrExcessEntries(entries: Map<string, RateLimitEntry>, now: number): void {
  if (entries.size < maximumRateLimitKeys) {
    return;
  }

  for (const [key, entry] of entries) {
    if (entry.resetAt <= now) {
      entries.delete(key);
    }
  }

  // A hostile client must not be able to make this process retain an
  // unbounded number of IP buckets. Losing a few oldest buckets is safer than
  // letting the in-process fallback limiter exhaust memory.
  while (entries.size >= maximumRateLimitKeys) {
    const oldestKey = entries.keys().next().value;
    if (!oldestKey) {
      return;
    }
    entries.delete(oldestKey);
  }
}

/** Small same-process limiter for mutation routes; production can replace this with Redis. */
export function takeRateLimit(
  key: string,
  limit = 20,
  windowMs = 60_000,
  now = Date.now(),
): { allowed: boolean; retryAfterSeconds: number } {
  const entries = store();
  discardExpiredOrExcessEntries(entries, now);
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

function validIp(value: string | null | undefined): string | null {
  const candidate = value?.trim();
  return candidate && isIP(candidate) !== 0 ? candidate : null;
}

function firstForwardedIp(headers: Headers): string | null {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    for (const candidate of forwarded.split(",")) {
      const parsed = validIp(candidate);
      if (parsed) {
        return parsed;
      }
    }
  }
  return validIp(headers.get("x-real-ip"));
}

function vercelClientIp(headers: Headers): string | null {
  // Vercel sets this header at its edge. Requiring it prevents a local or
  // direct-origin caller from opting into a forwarded-address bucket merely by
  // inventing X-Forwarded-For.
  if (!headers.get("x-vercel-id")) {
    return null;
  }
  return validIp(headers.get("x-vercel-forwarded-for")) ?? firstForwardedIp(headers);
}

function hasExpectedSharedSecret(value: string | null, expected: string | undefined): boolean {
  if (!value || !expected) {
    return false;
  }

  const valueBytes = Buffer.from(value);
  const expectedBytes = Buffer.from(expected);
  return valueBytes.length === expectedBytes.length && timingSafeEqual(valueBytes, expectedBytes);
}

/**
 * Resolves a client IP only from a proxy that was explicitly configured as
 * trusted. A direct request therefore cannot defeat rate limits merely by
 * spoofing X-Forwarded-For or CF-Connecting-IP.
 */
export function trustedClientIp(headers: Headers, proxyConfig: RateLimitProxyConfig): string | null {
  if (proxyConfig.TRUSTED_PROXY_MODE === "vercel") {
    return vercelClientIp(headers);
  }

  if (proxyConfig.TRUSTED_PROXY_MODE === "forwarded") {
    return firstForwardedIp(headers);
  }

  if (proxyConfig.TRUSTED_PROXY_MODE === "cloudflare") {
    const suppliedSecret = headers.get("x-meyukbu-proxy-token");
    if (!hasExpectedSharedSecret(suppliedSecret, proxyConfig.CLOUDFLARE_PROXY_SHARED_SECRET)) {
      return null;
    }
    return validIp(headers.get("cf-connecting-ip"));
  }

  return null;
}

/**
 * Uses an IP bucket only after the source proxy is authenticated. Without a
 * trusted proxy the conservative shared bucket protects an origin from header
 * spoofing. Vercel deployments use Vercel's rewritten forwarding headers by
 * default; Cloudflare's token mode is an optional additional boundary.
 */
export function requestRateLimitKey(
  headers: Headers,
  scope: string,
  proxyConfig: RateLimitProxyConfig = getEnvironment(),
): string {
  const clientIp = trustedClientIp(headers, proxyConfig);
  return clientIp ? `${scope}:ip:${clientIp}` : `${scope}:untrusted`;
}
