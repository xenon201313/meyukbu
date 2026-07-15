import { describe, expect, it } from "vitest";

import { getEnvironment } from "@/lib/env";

describe("edge environment validation", () => {
  it("accepts the empty optional Cloudflare secret from .env.example in Vercel mode", () => {
    const environment = getEnvironment({
      TRUSTED_PROXY_MODE: "vercel",
      CLOUDFLARE_PROXY_SHARED_SECRET: "",
    });

    expect(environment.TRUSTED_PROXY_MODE).toBe("vercel");
    expect(environment.CLOUDFLARE_PROXY_SHARED_SECRET).toBeUndefined();
  });

  it("requires a non-empty shared secret only for Cloudflare token mode", () => {
    expect(() =>
      getEnvironment({
        TRUSTED_PROXY_MODE: "cloudflare",
        CLOUDFLARE_PROXY_SHARED_SECRET: "",
      }),
    ).toThrow(/requires CLOUDFLARE_PROXY_SHARED_SECRET/);
  });
});
