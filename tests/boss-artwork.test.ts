import { existsSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { bossArtworkKeys, bossArtworkUrl, bossOptions, findBossOptionById } from "@/content/bosses";

describe("catalogued boss artwork", () => {
  it("maps every selectable boss to a bundled, user-authorized artwork asset", () => {
    for (const boss of bossOptions) {
      expect(bossArtworkKeys.has(boss.artworkKey)).toBe(true);
      expect(bossArtworkUrl(boss.artworkKey)).toBe(`/images/bosses/${boss.artworkKey}.png`);
      expect(existsSync(join(process.cwd(), "public", "images", "bosses", `${boss.artworkKey}.png`))).toBe(
        true,
      );
    }
  });

  it("keeps Baldrix and Jupiter mapped to their own artwork keys", () => {
    expect(findBossOptionById("hbal")?.artworkKey).toBe("baldrix");
    expect(findBossOptionById("hjup")?.artworkKey).toBe("jupiter");
  });
});
