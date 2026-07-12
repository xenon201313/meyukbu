import type { NormalizedCharacterProfile } from "@/domain/character";

import { getEnvironment } from "@/lib/env";
import type { AppEnvironment } from "@/lib/env";
import { LiveNexonProvider } from "@/lib/nexon/live-provider";
import { MockNexonProvider } from "@/lib/nexon/mock-provider";

export interface NexonProvider {
  readonly mode: "mock" | "live";
  resolveCharacter(name: string): Promise<{ ocid: string }>;
  getProfile(ocid: string, options?: { date?: string }): Promise<NormalizedCharacterProfile>;
}

export type NexonProviderConfigurationReason = "LIVE_READY" | "MOCK_REQUESTED" | "MISSING_API_KEY";

/**
 * Safe-to-publish provider diagnostics. It intentionally contains only the API-key
 * presence, never its value, so operators can distinguish a demo response from live data.
 */
export interface NexonProviderStatus {
  requestedMode: "mock" | "live";
  activeMode: "mock" | "live";
  apiKeyConfigured: boolean;
  liveReady: boolean;
  reason: NexonProviderConfigurationReason;
}

export function getNexonProviderStatus(environment: AppEnvironment = getEnvironment()): NexonProviderStatus {
  const apiKeyConfigured = Boolean(environment.NEXON_OPEN_API_KEY);
  const liveReady = environment.NEXON_PROVIDER === "live" && apiKeyConfigured;

  return {
    requestedMode: environment.NEXON_PROVIDER,
    activeMode: liveReady ? "live" : "mock",
    apiKeyConfigured,
    liveReady,
    reason: liveReady
      ? "LIVE_READY"
      : environment.NEXON_PROVIDER === "live"
        ? "MISSING_API_KEY"
        : "MOCK_REQUESTED",
  };
}

export function getNexonProvider(): NexonProvider {
  const environment = getEnvironment();
  if (getNexonProviderStatus(environment).activeMode === "live") {
    return new LiveNexonProvider(environment);
  }
  return new MockNexonProvider();
}
