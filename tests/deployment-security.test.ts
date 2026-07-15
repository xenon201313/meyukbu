import { describe, expect, it } from "vitest";

import { applicationHeaders, securityHeadersForEnvironment } from "../next.config";

function findHeader(headers: { key: string; value: string }[], key: string): string | undefined {
  return headers.find((header) => header.key === key)?.value;
}

describe("deployment security headers", () => {
  it("uses a production CSP without development eval and keeps framing disabled", () => {
    const headers = securityHeadersForEnvironment(true);
    const csp = findHeader(headers, "Content-Security-Policy");

    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("img-src 'self' data: blob: https:");
    expect(csp).not.toContain("unsafe-eval");
    expect(findHeader(headers, "X-Frame-Options")).toBe("DENY");
    expect(findHeader(headers, "Strict-Transport-Security")).toBe("max-age=31536000");
  });

  it("keeps API and generated resume images out of shared caches", async () => {
    const rules = await applicationHeaders();
    const apiRule = rules.find((rule) => rule.source === "/api/:path*");
    const imageRule = rules.find((rule) => rule.source === "/r/:slug/image");

    expect(findHeader(apiRule?.headers ?? [], "Cache-Control")).toContain("no-store");
    expect(findHeader(imageRule?.headers ?? [], "Cache-Control")).toContain("no-store");
  });

  it("allows only public image paths to opt into an application edge cache", async () => {
    const rules = await applicationHeaders();
    const imageAssetRule = rules.find((rule) => rule.source === "/images/:path*");

    expect(findHeader(imageAssetRule?.headers ?? [], "Cache-Control")).toContain("s-maxage=604800");
    expect(rules.some((rule) => rule.source === "/_next/static/:path*")).toBe(false);
  });
});
