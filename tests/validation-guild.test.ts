import { describe, expect, it } from "vitest";

import { transitionGuildObservation } from "@/domain/guild-observation";
import type { ResumeDraft } from "@/domain/resume";
import { parseStoredDraft } from "@/lib/db/json";
import { createResumeSchema, resumeDraftSchema } from "@/lib/validation/schemas";

const validDraft: ResumeDraft = {
  targetBoss: "유피테르 (노멀)",
  targetBossCadence: "WEEKLY",
  role: "DAMAGE",
  partyType: "SEMI_FIXED",
  partySize: 3,
  availabilityMode: "SCHEDULED",
  availability: [
    {
      days: ["월", "수"],
      startTime: "20:00",
      endTime: "23:00",
      timezone: "Asia/Seoul",
    },
  ],
  voiceChat: "OPTIONAL",
  lootPolicy: "상호 합의",
  experienceSummary: "동일 보스 파티 경험이 있습니다.",
  roleSummary: "패턴 대응과 생존을 우선합니다.",
  contact: { type: "DISCORD", value: "test-user", isPublic: false },
  theme: "RESUME",
};

describe("resume draft validation", () => {
  it("accepts a bounded, complete party-application draft", () => {
    expect(resumeDraftSchema.safeParse(validDraft).success).toBe(true);
    expect(createResumeSchema.safeParse({ characterName: "테스트캐릭터", draft: validDraft }).success).toBe(
      true,
    );
  });

  it("accepts and preserves the achievement party type", () => {
    const draft = { ...validDraft, partyType: "ACHIEVEMENT" as const };

    expect(resumeDraftSchema.safeParse(draft).success).toBe(true);
    expect(parseStoredDraft(draft).partyType).toBe("ACHIEVEMENT");
  });

  it("rejects invalid time order, oversized plain text, and invalid character names", () => {
    expect(
      resumeDraftSchema.safeParse({
        ...validDraft,
        availability: [{ ...validDraft.availability[0], startTime: "23:00", endTime: "20:00" }],
      }).success,
    ).toBe(false);
    expect(resumeDraftSchema.safeParse({ ...validDraft, targetBoss: "가".repeat(61) }).success).toBe(false);
    expect(
      resumeDraftSchema.safeParse({
        ...validDraft,
        contact: { type: "DISCORD", value: "x".repeat(81), isPublic: true },
      }).success,
    ).toBe(false);
    expect(createResumeSchema.safeParse({ characterName: "<script>", draft: validDraft }).success).toBe(
      false,
    );
  });

  it("accepts catalogued weekly/monthly boss pairs and rejects direct-entry values", () => {
    const withoutCadence = { ...validDraft };
    delete withoutCadence.targetBossCadence;

    expect(resumeDraftSchema.safeParse(withoutCadence).success).toBe(false);
    expect(
      resumeDraftSchema.safeParse({
        ...validDraft,
        targetBossCadence: "MONTHLY",
        targetBoss: "검은 마법사 (하드)",
      }).success,
    ).toBe(true);
    expect(resumeDraftSchema.safeParse({ ...validDraft, targetBossCadence: "MONTHLY" }).success).toBe(false);
    expect(resumeDraftSchema.safeParse({ ...validDraft, targetBoss: "직접 입력 보스" }).success).toBe(false);
    expect(resumeDraftSchema.safeParse({ ...validDraft, targetBossCadence: "DAILY" }).success).toBe(false);
  });

  it("keeps conversion and boss multiplier as optional user-provided values", () => {
    const parsed = resumeDraftSchema.parse({
      ...validDraft,
      convertedStat: "110,650",
      bossMultiplierPercent: "412.5",
    });

    expect(parsed.convertedStat).toBe("110,650");
    expect(parsed.bossMultiplierPercent).toBe("412.5");
    expect(resumeDraftSchema.safeParse({ ...validDraft, convertedStat: "1".repeat(41) }).success).toBe(false);
    expect(resumeDraftSchema.safeParse({ ...validDraft, bossMultiplierPercent: "412.5%" }).success).toBe(
      false,
    );
  });

  it("enforces boss entry-size limits on both direct API input and stored drafts", () => {
    expect(
      resumeDraftSchema.safeParse({
        ...validDraft,
        targetBoss: "스우 (하드)",
        targetBossCadence: "WEEKLY",
        partySize: 3,
      }).success,
    ).toBe(false);
    expect(
      resumeDraftSchema.safeParse({
        ...validDraft,
        targetBoss: "유피테르 (노멀)",
        targetBossCadence: "WEEKLY",
        partySize: 4,
      }).success,
    ).toBe(false);
    expect(
      resumeDraftSchema.safeParse({
        ...validDraft,
        targetBoss: "검은 마법사 (하드)",
        targetBossCadence: "MONTHLY",
        partySize: 6,
      }).success,
    ).toBe(true);
    expect(resumeDraftSchema.safeParse({ ...validDraft, partySize: 0 }).success).toBe(false);
    expect(resumeDraftSchema.safeParse({ ...validDraft, partySize: 2.5 }).success).toBe(false);
    expect(resumeDraftSchema.safeParse({ ...validDraft, partySize: 7 }).success).toBe(false);
  });

  it("allows flexible and negotiable schedules without a fixed time slot", () => {
    expect(
      resumeDraftSchema.safeParse({ ...validDraft, availabilityMode: "FLEXIBLE", availability: [] }).success,
    ).toBe(true);
    expect(
      resumeDraftSchema.safeParse({ ...validDraft, availabilityMode: "NEGOTIABLE", availability: [] })
        .success,
    ).toBe(true);
    expect(
      resumeDraftSchema.safeParse({ ...validDraft, availabilityMode: "SCHEDULED", availability: [] }).success,
    ).toBe(false);
    expect(resumeDraftSchema.safeParse({ ...validDraft, availabilityMode: "INVALID" }).success).toBe(false);
  });

  it("interprets legacy stored drafts as scheduled while retaining an absent party size", () => {
    const legacyDraft = { ...validDraft };
    delete legacyDraft.availabilityMode;
    delete legacyDraft.partySize;

    const parsed = parseStoredDraft(legacyDraft);

    expect(parsed.availabilityMode).toBe("SCHEDULED");
    expect(parsed.partySize).toBeUndefined();
  });

  it("round-trips the optional boss multiplier through stored draft JSON", () => {
    const stored = parseStoredDraft({ ...validDraft, bossMultiplierPercent: "412.5" });

    expect(stored.bossMultiplierPercent).toBe("412.5");
  });
});

describe("guild observations", () => {
  it("records service-observed intervals without claiming historical join or leave dates", () => {
    const first = transitionGuildObservation([], {
      guildName: "첫길드",
      observedAt: "2026-07-01T00:00:00.000Z",
      sourceSnapshotId: "snapshot-1",
    });
    const sameGuild = transitionGuildObservation(first, {
      guildName: "첫길드",
      observedAt: "2026-07-02T00:00:00.000Z",
      sourceSnapshotId: "snapshot-2",
    });
    const changedGuild = transitionGuildObservation(sameGuild, {
      guildName: "다음길드",
      observedAt: "2026-07-03T00:00:00.000Z",
      sourceSnapshotId: "snapshot-3",
    });

    expect(first[0]).toMatchObject({
      guildName: "첫길드",
      observedFrom: "2026-07-01T00:00:00.000Z",
      lastObservedAt: "2026-07-01T00:00:00.000Z",
      observedTo: null,
    });
    expect(sameGuild).toHaveLength(1);
    expect(sameGuild[0]).toMatchObject({
      observedFrom: "2026-07-01T00:00:00.000Z",
      lastObservedAt: "2026-07-02T00:00:00.000Z",
      observedTo: null,
      sourceSnapshotId: "snapshot-2",
    });
    expect(changedGuild).toHaveLength(2);
    expect(changedGuild[0]).toMatchObject({
      guildName: "첫길드",
      observedTo: "2026-07-03T00:00:00.000Z",
    });
    expect(changedGuild[1]).toMatchObject({
      guildName: "다음길드",
      observedFrom: "2026-07-03T00:00:00.000Z",
      observedTo: null,
    });
  });
});
