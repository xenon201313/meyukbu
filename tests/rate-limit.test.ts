import { describe, expect, it } from "vitest";

import { requestRateLimitKey, takeRateLimit, trustedClientIp } from "@/lib/rate-limit";

const cloudflareSecret = "cloudflare-shared-secret-for-meyukbu-123456";

describe("rate-limit proxy boundaries", () => {
  it("does not trust forwarded visitor headers by default", () => {
    const headers = new Headers({
      "cf-connecting-ip": "2001:db8::7",
      "x-forwarded-for": "198.51.100.7",
      "x-real-ip": "198.51.100.8",
    });

    expect(
      requestRateLimitKey(headers, "resume", {
        TRUSTED_PROXY_MODE: "none",
        CLOUDFLARE_PROXY_SHARED_SECRET: undefined,
      }),
    ).toBe("resume:untrusted");
  });

  it("uses forwarded addresses only in explicitly configured proxy mode", () => {
    const headers = new Headers({ "x-forwarded-for": "invalid, 198.51.100.7, 10.0.0.1" });

    expect(
      requestRateLimitKey(headers, "resume", {
        TRUSTED_PROXY_MODE: "forwarded",
        CLOUDFLARE_PROXY_SHARED_SECRET: undefined,
      }),
    ).toBe("resume:ip:198.51.100.7");
  });

  it("uses Vercel's stamped forwarding headers without relying on a Cloudflare secret", () => {
    const headers = new Headers({
      "x-vercel-id": "icn1::test-request",
      "x-vercel-forwarded-for": "203.0.113.17",
      "x-forwarded-for": "198.51.100.7",
    });

    expect(
      requestRateLimitKey(headers, "resume", {
        TRUSTED_PROXY_MODE: "vercel",
        CLOUDFLARE_PROXY_SHARED_SECRET: undefined,
      }),
    ).toBe("resume:ip:203.0.113.17");
  });

  it("does not accept a Vercel forwarding header without Vercel's edge marker", () => {
    const headers = new Headers({ "x-vercel-forwarded-for": "203.0.113.17" });

    expect(
      requestRateLimitKey(headers, "resume", {
        TRUSTED_PROXY_MODE: "vercel",
        CLOUDFLARE_PROXY_SHARED_SECRET: undefined,
      }),
    ).toBe("resume:untrusted");
  });

  it("accepts CF-Connecting-IP only when Cloudflare overwrote the shared secret", () => {
    const headers = new Headers({
      "cf-connecting-ip": "2001:db8::7",
      "x-forwarded-for": "198.51.100.7",
      "x-meyukbu-proxy-token": cloudflareSecret,
    });
    const configuration = {
      TRUSTED_PROXY_MODE: "cloudflare" as const,
      CLOUDFLARE_PROXY_SHARED_SECRET: cloudflareSecret,
    };

    expect(trustedClientIp(headers, configuration)).toBe("2001:db8::7");
    expect(requestRateLimitKey(headers, "resume", configuration)).toBe("resume:ip:2001:db8::7");
  });

  it("falls back to the conservative shared bucket for a missing or forged token", () => {
    const headers = new Headers({
      "cf-connecting-ip": "198.51.100.7",
      "x-meyukbu-proxy-token": "forged-token",
    });
    const configuration = {
      TRUSTED_PROXY_MODE: "cloudflare" as const,
      CLOUDFLARE_PROXY_SHARED_SECRET: cloudflareSecret,
    };

    expect(trustedClientIp(headers, configuration)).toBeNull();
    expect(requestRateLimitKey(headers, "resume", configuration)).toBe("resume:untrusted");
  });
});

describe("rate-limit storage", () => {
  it("counts within a window and resets at the window boundary", () => {
    const key = `test-${crypto.randomUUID()}`;

    expect(takeRateLimit(key, 2, 1_000, 100).allowed).toBe(true);
    expect(takeRateLimit(key, 2, 1_000, 101).allowed).toBe(true);
    expect(takeRateLimit(key, 2, 1_000, 102).allowed).toBe(false);
    expect(takeRateLimit(key, 2, 1_000, 1_100).allowed).toBe(true);
  });
});
