import type { NormalizedCharacterProfile } from "@/domain/character";

import { NexonProviderError } from "@/lib/nexon/errors";
import { getMockProfiles } from "@/lib/nexon/fixtures";
import type { NexonProvider } from "@/lib/nexon/provider";

function cloneProfile(profile: NormalizedCharacterProfile): NormalizedCharacterProfile {
  return structuredClone(profile);
}

export class MockNexonProvider implements NexonProvider {
  readonly mode = "mock" as const;

  async resolveCharacter(name: string): Promise<{ ocid: string }> {
    const profile = getMockProfiles().find((candidate) => candidate.characterName === name.trim());
    if (!profile) {
      throw new NexonProviderError("NOT_FOUND", "Mock fixture was not found.", 404);
    }
    return { ocid: profile.ocid };
  }

  async getProfile(ocid: string): Promise<NormalizedCharacterProfile> {
    const profile = getMockProfiles().find((candidate) => candidate.ocid === ocid);
    if (!profile) {
      throw new NexonProviderError("NOT_FOUND", "Mock fixture was not found.", 404);
    }
    return cloneProfile(profile);
  }
}
