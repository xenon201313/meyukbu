import { describe, expect, it } from "vitest";

import { getEnvironment } from "@/lib/env";
import { getNexonProviderStatus } from "@/lib/nexon/provider";

describe("NEXON provider configuration status", () => {
  it("reports an explicitly requested mock provider even when a key exists", () => {
    const status = getNexonProviderStatus(
      getEnvironment({ NEXON_PROVIDER: "mock", NEXON_OPEN_API_KEY: "test-key" }),
    );

    expect(status).toEqual({
      requestedMode: "mock",
      activeMode: "mock",
      apiKeyConfigured: true,
      liveReady: false,
      reason: "MOCK_REQUESTED",
    });
  });

  it("makes a missing key distinguishable from a real character-not-found response", () => {
    const status = getNexonProviderStatus(getEnvironment({ NEXON_PROVIDER: "live", NEXON_OPEN_API_KEY: "" }));

    expect(status).toEqual({
      requestedMode: "live",
      activeMode: "mock",
      apiKeyConfigured: false,
      liveReady: false,
      reason: "MISSING_API_KEY",
    });
  });

  it("activates the live provider only when live mode and a key are both configured", () => {
    const status = getNexonProviderStatus(
      getEnvironment({ NEXON_PROVIDER: "live", NEXON_OPEN_API_KEY: "  server-only-key  " }),
    );

    expect(status).toEqual({
      requestedMode: "live",
      activeMode: "live",
      apiKeyConfigured: true,
      liveReady: true,
      reason: "LIVE_READY",
    });
  });
});
