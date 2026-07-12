import { describe, expect, it } from "vitest";

import { bossArtworkKeys, defaultBossArtworkKeys } from "@/content/bosses";

describe("default boss artwork", () => {
  it("uses Jupiter for the weekly card and keeps every default artwork key resolvable", () => {
    expect(defaultBossArtworkKeys.WEEKLY).toBe("jupiter");
    expect(defaultBossArtworkKeys.MONTHLY).toBe("blackmage");

    expect(bossArtworkKeys.has(defaultBossArtworkKeys.WEEKLY)).toBe(true);
    expect(bossArtworkKeys.has(defaultBossArtworkKeys.MONTHLY)).toBe(true);
  });
});
