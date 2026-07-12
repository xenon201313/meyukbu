import { describe, expect, it } from "vitest";

import type { PeakCombatPower } from "@/domain/character";
import type { CombatPowerObservation, CombatPowerRepository } from "@/lib/db/combat-power-repository";
import { formatNumericDisplay, parseNumericValue } from "@/lib/format";
import { getMockProfiles } from "@/lib/nexon/fixtures";
import { applyPeakCombatPower } from "@/server/services/resume-service";

class TestCombatPowerRepository implements CombatPowerRepository {
  private readonly peaks = new Map<string, PeakCombatPower>();

  async record(observation: CombatPowerObservation): Promise<PeakCombatPower | null> {
    const known = this.peaks.get(observation.ocid) ?? null;
    if (observation.combatPower === null) {
      return known;
    }
    if (!known || observation.combatPower > known.value) {
      const next = { value: observation.combatPower, observedAt: observation.observedAt };
      this.peaks.set(observation.ocid, next);
      return next;
    }
    return known;
  }
}

function primaryMockProfile() {
  const profile = getMockProfiles()[0];
  if (!profile) {
    throw new Error("Expected the primary mock profile.");
  }
  return profile;
}

describe("numeric display formatting", () => {
  it("adds thousands separators to raw combat power values", () => {
    expect(formatNumericDisplay("275095920")).toBe("275,095,920");
    expect(formatNumericDisplay(650000000)).toBe("650,000,000");
  });

  it("keeps provider decimals and passes non-numeric values through", () => {
    expect(formatNumericDisplay("341.00")).toBe("341.00");
    expect(formatNumericDisplay("92.58")).toBe("92.58");
    expect(formatNumericDisplay("412%")).toBe("412%");
    expect(formatNumericDisplay("178,420,000")).toBe("178,420,000");
    expect(formatNumericDisplay(null)).toBe("조회 불가");
  });

  it("parses comma-separated values and rejects text", () => {
    expect(parseNumericValue("178,420,000")).toBe(178420000);
    expect(parseNumericValue("92.58")).toBe(92.58);
    expect(parseNumericValue("412%")).toBeNull();
    expect(parseNumericValue(null)).toBeNull();
  });
});

describe("peak combat power observation", () => {
  it("keeps the raw API field when the current value is the highest observed", async () => {
    const repository = new TestCombatPowerRepository();
    const profile = primaryMockProfile();

    const enriched = await applyPeakCombatPower(profile, repository);

    expect(enriched.peakCombatPower).toEqual({ value: 178420000, observedAt: profile.fetchedAt });
    const combatField = enriched.fields.find((field) => field.key === "combatPower");
    expect(combatField?.provenance).toBe("NEXON_API");
    expect(combatField?.value).toBe("178,420,000");
  });

  it("surfaces the observed peak when a later lookup returns a lower hunting-gear value", async () => {
    const repository = new TestCombatPowerRepository();
    const strongProfile = primaryMockProfile();
    await applyPeakCombatPower(strongProfile, repository);

    const huntingProfile = {
      ...strongProfile,
      fetchedAt: new Date().toISOString(),
      stats: strongProfile.stats.map((stat) =>
        stat.label === "전투력" ? { ...stat, value: "90,000,000" } : stat,
      ),
      fields: strongProfile.fields.map((field) =>
        field.key === "combatPower" ? { ...field, value: "90,000,000" } : field,
      ),
    };

    const enriched = await applyPeakCombatPower(huntingProfile, repository);

    expect(enriched.peakCombatPower?.value).toBe(178420000);
    const combatField = enriched.fields.find((field) => field.key === "combatPower");
    expect(combatField?.provenance).toBe("SERVICE_OBSERVED");
    expect(combatField?.value).toBe("178420000");
    expect(enriched.fields.filter((field) => field.key === "combatPower")).toHaveLength(1);
  });

  it("returns the profile unchanged when the observation store fails", async () => {
    const failingRepository: CombatPowerRepository = {
      async record() {
        throw new Error("database unavailable");
      },
    };
    const profile = primaryMockProfile();

    const enriched = await applyPeakCombatPower(profile, failingRepository);

    expect(enriched).toBe(profile);
    expect(enriched.peakCombatPower).toBeUndefined();
  });
});
