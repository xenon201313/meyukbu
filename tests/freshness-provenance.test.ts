import { describe, expect, it } from "vitest";

import type { NormalizedCharacterProfile } from "@/domain/character";
import { defaultFreshnessPolicy, getFreshnessStatus } from "@/domain/freshness";
import { provenanceLabels } from "@/domain/provenance";
import { prioritizedFields } from "@/domain/resume";

const now = new Date("2026-07-12T00:00:00.000Z");

function profileWithFields(fields: NormalizedCharacterProfile["fields"]): NormalizedCharacterProfile {
  return {
    ocid: "test-ocid",
    characterName: "테스트캐릭터",
    worldName: "테스트월드",
    className: "테스트직업",
    level: 285,
    imageUrl: null,
    currentGuild: null,
    fetchedAt: now.toISOString(),
    sourceDate: "2026-07-12",
    provider: "mock",
    fields,
    stats: [],
    equipmentPresetNo: null,
    equipment: [],
    symbols: [],
    cashEquipment: [],
    setEffects: [],
    rawAvailability: {},
  };
}

describe("snapshot freshness", () => {
  it("uses the 24-hour and 30-day boundaries without relying on local timezone", () => {
    expect(
      getFreshnessStatus(new Date(now.getTime() - (24 * 60 * 60 * 1000 - 1)), defaultFreshnessPolicy, now),
    ).toBe("fresh");
    expect(
      getFreshnessStatus(new Date(now.getTime() - 24 * 60 * 60 * 1000), defaultFreshnessPolicy, now),
    ).toBe("stale");
    expect(
      getFreshnessStatus(
        new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000 - 1)),
        defaultFreshnessPolicy,
        now,
      ),
    ).toBe("stale");
    expect(
      getFreshnessStatus(new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000), defaultFreshnessPolicy, now),
    ).toBe("expired");
  });

  it("fails closed for an invalid source timestamp", () => {
    expect(getFreshnessStatus("not-a-date", defaultFreshnessPolicy, now)).toBe("expired");
  });
});

describe("provenance and unavailable profile values", () => {
  it("keeps every provenance label distinguishable in Korean", () => {
    expect(provenanceLabels).toEqual({
      NEXON_API: "API 조회",
      SERVICE_CALCULATED: "서비스 계산",
      USER_PROVIDED: "작성 내용",
      SERVICE_OBSERVED: "서비스 관측",
    });
  });

  it("omits null fields instead of turning missing API values into zero", () => {
    const fields = prioritizedFields(
      profileWithFields([
        {
          key: "missing-record",
          label: "조회 불가 기록",
          value: null,
          provenance: "NEXON_API",
          category: "record",
          priorityByRole: { DAMAGE: 1 },
        },
        {
          key: "actual-zero",
          label: "실제 0 값",
          value: 0,
          provenance: "NEXON_API",
          category: "combat",
          priorityByRole: { DAMAGE: 2 },
        },
        {
          key: "provided-note",
          label: "작성자 설명",
          value: "파티 경험 있음",
          provenance: "USER_PROVIDED",
          category: "identity",
          priorityByRole: { DAMAGE: 3 },
        },
      ]),
      "DAMAGE",
    );

    expect(fields.map((field) => field.key)).toEqual(["actual-zero", "provided-note"]);
    expect(fields.find((field) => field.key === "actual-zero")?.value).toBe(0);
    expect(fields.some((field) => field.value === null)).toBe(false);
  });
});
