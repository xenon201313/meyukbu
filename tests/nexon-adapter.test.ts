import { describe, expect, it } from "vitest";

import { nexonErrorMessages, NexonProviderError, userFacingNexonError } from "@/lib/nexon/errors";
import { normalizeCharacterBasic, normalizeCharacterProfile } from "@/lib/nexon/normalize";
import type {
  NexonCharacterBasic,
  NexonCharacterItemEquipment,
  NexonCharacterStat,
} from "@/lib/nexon/schemas";
import { nexonItemEquipmentSchema } from "@/lib/nexon/schemas";

describe("normalizeCharacterBasic", () => {
  it("maps documented basic response fields into the normalized profile", () => {
    const basic: NexonCharacterBasic = {
      date: "2026-07-11T00:00:00+09:00",
      character_name: "테스트캐릭터",
      world_name: "테스트월드",
      character_class: "히어로",
      character_class_level: "6",
      character_level: 286,
      character_guild_name: "테스트길드",
      character_image: "https://example.com/character.png",
      liberation_quest_clear: "완료",
    };

    const profile = normalizeCharacterBasic("ocid-test", basic, "2026-07-12T00:00:00.000Z");

    expect(profile).toMatchObject({
      ocid: "ocid-test",
      characterName: "테스트캐릭터",
      worldName: "테스트월드",
      className: "히어로",
      level: 286,
      imageUrl: "https://example.com/character.png",
      currentGuild: "테스트길드",
      fetchedAt: "2026-07-12T00:00:00.000Z",
      sourceDate: "2026-07-11T00:00:00+09:00",
      provider: "live",
      rawAvailability: expect.objectContaining({
        basic: "available",
        guild: "available",
      }),
    });
    expect(profile.fields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: "level", value: 286, provenance: "NEXON_API" }),
        expect.objectContaining({ key: "classLevel", value: "6", provenance: "NEXON_API" }),
        expect.objectContaining({ key: "liberation", value: "완료", provenance: "NEXON_API" }),
      ]),
    );
  });

  it("preserves missing documented values as null rather than guessed zeroes", () => {
    const profile = normalizeCharacterBasic("ocid-missing", { character_name: "누락테스트" });

    expect(profile.worldName).toBeNull();
    expect(profile.className).toBeNull();
    expect(profile.level).toBeNull();
    expect(profile.currentGuild).toBeNull();
    expect(profile.rawAvailability.guild).toBe("missing");
    expect(profile.fields.map((field) => field.value)).toEqual([null, null, null]);
    expect(profile.fields.some((field) => field.value === 0)).toBe(false);
  });
});

describe("normalizeCharacterProfile optional NEXON data", () => {
  const basic: NexonCharacterBasic = {
    date: "2026-07-11T00:00:00+09:00",
    character_name: "확장테스트",
    world_name: "테스트월드",
    character_class: "히어로",
    character_level: 286,
  };

  const stat: NexonCharacterStat = {
    date: "2026-07-11T00:00:00+09:00",
    character_class: "히어로",
    final_stat: [
      { stat_name: "전투력", stat_value: "123456789" },
      { stat_name: "STR", stat_value: "98765" },
    ],
    remain_ap: 0,
    remain_bonus_ap: 0,
  };

  const equipment: NexonCharacterItemEquipment = {
    date: "2026-07-11T00:00:00+09:00",
    character_gender: "남",
    character_class: "히어로",
    preset_no: 1,
    item_equipment: [
      {
        item_equipment_part: "무기",
        item_equipment_slot: "무기",
        item_name: "아케인셰이드 한손검",
        item_icon: "https://example.com/weapon.png",
        starforce: "22",
        potential_option_grade: "레전드리",
        potential_option_1: "STR : +12%",
        potential_option_2: null,
        potential_option_3: "보스 몬스터 데미지 : +40%",
        additional_potential_option_grade: "에픽",
        additional_potential_option_1: "공격력 : +10",
        additional_potential_option_2: null,
        additional_potential_option_3: "",
        item_total_option: {
          str: "100",
          dex: "20",
          int: "0",
          luk: "0",
          attack_power: "155",
          boss_damage: "30",
          ignore_monster_armor: "20",
          future_nested_option: { source: "future-api-field" },
        },
      },
    ],
  };

  it("maps the raw combat-power stat and detailed equipment data without inventing legacy fields", () => {
    expect(nexonItemEquipmentSchema.safeParse(equipment).success).toBe(true);

    const profile = normalizeCharacterProfile(
      "ocid-extended",
      basic,
      { stat, equipment },
      "2026-07-12T00:00:00.000Z",
    );

    expect(profile.fetchedAt).toBe("2026-07-12T00:00:00.000Z");
    expect(profile.rawAvailability).toMatchObject({
      basic: "available",
      stat: "available",
      equipment: "available",
    });
    expect(profile.stats).toEqual(
      expect.arrayContaining([
        { label: "전투력", value: "123456789" },
        { label: "STR", value: "98765" },
      ]),
    );
    expect(profile.fields).toContainEqual(
      expect.objectContaining({
        key: "combatPower",
        label: "전투력",
        value: "123456789",
        provenance: "NEXON_API",
        category: "combat",
      }),
    );
    expect(profile.fields.filter((field) => field.category === "record").map((field) => field.key)).toEqual([
      "liberation",
    ]);
    expect(profile.equipment).toEqual([
      expect.objectContaining({
        slot: "무기",
        part: "무기",
        name: "아케인셰이드 한손검",
        iconUrl: "https://example.com/weapon.png",
        starforce: "22",
        potentialOptions: ["STR : +12%", "보스 몬스터 데미지 : +40%"],
        additionalPotentialOptions: ["공격력 : +10"],
        totalOptions: expect.arrayContaining([
          { label: "str", value: "100" },
          { label: "dex", value: "20" },
          { label: "attack_power", value: "155" },
          { label: "boss_damage", value: "30" },
        ]),
      }),
    ]);
  });

  it("uses empty optional collections and missing availability when endpoints are not returned", () => {
    const profile = normalizeCharacterProfile("ocid-basic-only", basic, {}, "2026-07-12T00:00:00.000Z");

    expect(profile.stats).toEqual([]);
    expect(profile.equipment).toEqual([]);
    expect(profile.rawAvailability).toMatchObject({
      basic: "available",
      stat: "missing",
      equipment: "missing",
    });
    expect(profile.fields.some((field) => field.key === "combatPower")).toBe(false);
  });
});

describe("NEXON provider errors", () => {
  it("maps known rate-limit and maintenance codes to Korean user-facing text", () => {
    const rateLimited = userFacingNexonError(new NexonProviderError("OPENAPI00007", "provider detail", 429));
    const maintenance = userFacingNexonError(new NexonProviderError("OPENAPI00010", "provider detail", 503));

    expect(rateLimited).toBe(nexonErrorMessages.OPENAPI00007);
    expect(maintenance).toBe(nexonErrorMessages.OPENAPI00010);
    expect(rateLimited).toMatch(/[가-힣]/u);
    expect(maintenance).toMatch(/[가-힣]/u);
  });

  it("uses the safe network message for unexpected errors", () => {
    expect(userFacingNexonError(new Error("internal provider detail"))).toBe(nexonErrorMessages.NETWORK);
  });
});
