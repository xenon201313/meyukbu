import { describe, expect, it } from "vitest";

import {
  bossArtworkKeys,
  defaultBossArtworkKeys,
  findBossOptionById,
  maxPartySizeForBoss,
} from "@/content/bosses";

describe("default boss artwork", () => {
  it("uses Jupiter for the weekly card and keeps every default artwork key resolvable", () => {
    expect(defaultBossArtworkKeys.WEEKLY).toBe("jupiter");
    expect(defaultBossArtworkKeys.MONTHLY).toBe("blackmage");

    expect(bossArtworkKeys.has(defaultBossArtworkKeys.WEEKLY)).toBe(true);
    expect(bossArtworkKeys.has(defaultBossArtworkKeys.MONTHLY)).toBe(true);
  });
});

describe("boss party-size limits", () => {
  it("limits every Suwu difficulty to two players", () => {
    for (const id of ["nsu", "hsu", "xsu"]) {
      expect(maxPartySizeForBoss(findBossOptionById(id))).toBe(2);
    }
  });

  it("limits the specified high-end bosses to three players and leaves normal bosses at six", () => {
    for (const id of [
      "eadv",
      "nadv",
      "hadv",
      "xadv",
      "nlimbo",
      "hlimbo",
      "nbal",
      "hbal",
      "nstar",
      "hstar",
      "njup",
      "hjup",
    ]) {
      expect(maxPartySizeForBoss(findBossOptionById(id))).toBe(3);
    }

    expect(maxPartySizeForBoss(findBossOptionById("hblack"))).toBe(6);
  });
});
