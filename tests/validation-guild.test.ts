import { describe, expect, it } from "vitest";

import { transitionGuildObservation } from "@/domain/guild-observation";
import type { ResumeDraft } from "@/domain/resume";
import { createResumeSchema, resumeDraftSchema } from "@/lib/validation/schemas";

const validDraft: ResumeDraft = {
  targetBoss: "검은 마법사",
  targetBossCadence: "WEEKLY",
  difficulty: "하드",
  role: "DAMAGE",
  partyType: "SEMI_FIXED",
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

  it("accepts an optional weekly or monthly target-boss cadence only", () => {
    const withoutCadence = { ...validDraft };
    delete withoutCadence.targetBossCadence;

    expect(resumeDraftSchema.safeParse(withoutCadence).success).toBe(true);
    expect(resumeDraftSchema.safeParse({ ...validDraft, targetBossCadence: "MONTHLY" }).success).toBe(true);
    expect(resumeDraftSchema.safeParse({ ...validDraft, targetBossCadence: "DAILY" }).success).toBe(false);
  });

  it("keeps MapleScouter conversion as an optional user-provided value", () => {
    const parsed = resumeDraftSchema.parse({ ...validDraft, convertedStat: "110,650" });

    expect(parsed.convertedStat).toBe("110,650");
    expect(resumeDraftSchema.safeParse({ ...validDraft, convertedStat: "1".repeat(41) }).success).toBe(false);
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
