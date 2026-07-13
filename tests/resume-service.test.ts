import { describe, expect, it } from "vitest";

import type { ResumeDraft, ResumeRecord } from "@/domain/resume";
import { verifyEditToken } from "@/lib/auth/edit-token";
import type { ResumeRepository } from "@/lib/db/resume-repository";
import { contentHash } from "@/lib/hash";
import { getMockProfiles } from "@/lib/nexon/fixtures";
import { MockNexonProvider } from "@/lib/nexon/mock-provider";
import {
  archiveResume,
  createResume,
  getPublicResume,
  ResumeAuthorizationError,
  updateResume,
} from "@/server/services/resume-service";

const validDraft: ResumeDraft = {
  targetBoss: "검은 마법사 (하드)",
  targetBossCadence: "MONTHLY",
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
  theme: "RESUME",
};

class TestResumeRepository implements ResumeRepository {
  private readonly records = new Map<string, ResumeRecord>();

  slugChecks = 0;
  rejectFirstSlugCheck = false;

  async create(record: ResumeRecord): Promise<ResumeRecord> {
    if (this.records.has(record.slug)) {
      throw new Error("Duplicate public slug.");
    }
    this.records.set(record.slug, structuredClone(record));
    return structuredClone(record);
  }

  async findBySlug(slug: string): Promise<ResumeRecord | null> {
    const record = this.records.get(slug);
    return record ? structuredClone(record) : null;
  }

  async findBySlugs(slugs: readonly string[]): Promise<ResumeRecord[]> {
    return [...new Set(slugs)].flatMap((slug) => {
      const record = this.records.get(slug);
      return record ? [structuredClone(record)] : [];
    });
  }

  async slugExists(slug: string): Promise<boolean> {
    this.slugChecks += 1;
    if (this.rejectFirstSlugCheck && this.slugChecks === 1) {
      return true;
    }
    return this.records.has(slug);
  }

  async save(record: ResumeRecord): Promise<ResumeRecord> {
    this.records.set(record.slug, structuredClone(record));
    return structuredClone(record);
  }
}

function testCharacterName(): string {
  const profile = getMockProfiles()[0];
  if (!profile) {
    throw new Error("Mock character fixture is required for service tests.");
  }
  return profile.characterName;
}

describe("resume publishing service", () => {
  it("publishes a mock-provider profile through an injected repository and retries public-slug collisions", async () => {
    const repository = new TestResumeRepository();
    repository.rejectFirstSlugCheck = true;
    const provider = new MockNexonProvider();

    const created = await createResume(
      { characterName: testCharacterName(), draft: validDraft },
      { repository, provider },
    );

    expect(repository.slugChecks).toBeGreaterThanOrEqual(2);
    expect(created.record.slug).toMatch(/^m-[a-z0-9_-]+$/);
    expect(created.record.visibility).toBe("PUBLIC");
    expect(created.record.versions).toHaveLength(1);
    expect(created.record.versions[0]).toMatchObject({
      versionNumber: 1,
      snapshot: { profile: { provider: "mock" } },
    });
    expect(created.record.editTokenHash).not.toBe(created.editToken);
    expect(verifyEditToken(created.editToken, created.record.editTokenHash)).toBe(true);

    const published = await getPublicResume(created.record.slug, undefined, repository);
    if (!published) {
      throw new Error("Published resume should be publicly retrievable.");
    }
    expect(published.version.versionNumber).toBe(1);
    expect(published.isLatestVersion).toBe(true);
  });

  it("keeps separate boss resumes for the same character instead of overwriting the first record", async () => {
    const repository = new TestResumeRepository();
    const provider = new MockNexonProvider();
    const first = await createResume(
      { characterName: testCharacterName(), draft: validDraft },
      { repository, provider },
    );
    const second = await createResume(
      {
        characterName: testCharacterName(),
        draft: {
          ...validDraft,
          targetBossCadence: "WEEKLY",
          targetBoss: "스우 (하드)",
          partySize: 2,
        },
      },
      { repository, provider },
    );

    expect(second.record.id).not.toBe(first.record.id);
    expect(second.record.slug).not.toBe(first.record.slug);
    expect(first.record.versions).toHaveLength(1);
    expect(second.record.versions).toHaveLength(1);
    expect(first.record.versions[0]?.versionNumber).toBe(1);
    expect(second.record.versions[0]?.versionNumber).toBe(1);

    const original = await getPublicResume(first.record.slug, undefined, repository);
    const copied = await getPublicResume(second.record.slug, undefined, repository);
    expect(original?.version.draft.targetBoss).toBe(validDraft.targetBoss);
    expect(copied?.version.draft.targetBoss).toBe("스우 (하드)");
  });

  it("requires the edit token for mutations and preserves immutable published versions", async () => {
    const repository = new TestResumeRepository();
    const created = await createResume(
      { characterName: testCharacterName(), draft: validDraft },
      { repository, provider: new MockNexonProvider() },
    );

    await expect(
      updateResume(
        created.record.slug,
        { ...validDraft, targetBoss: "검은 마법사 (익스트림)" },
        undefined,
        repository,
      ),
    ).rejects.toBeInstanceOf(ResumeAuthorizationError);
    await expect(
      updateResume(
        created.record.slug,
        { ...validDraft, targetBoss: "검은 마법사 (익스트림)" },
        "wrong-token",
        repository,
      ),
    ).rejects.toBeInstanceOf(ResumeAuthorizationError);

    const updated = await updateResume(
      created.record.slug,
      { ...validDraft, targetBoss: "검은 마법사 (익스트림)" },
      created.editToken,
      repository,
    );
    expect(updated.versions).toHaveLength(2);
    expect(updated.versions.map((version) => version.versionNumber)).toEqual([1, 2]);
    expect(updated.versions[0]?.contentHash).not.toBe(updated.versions[1]?.contentHash);

    const original = await getPublicResume(created.record.slug, 1, repository);
    const latest = await getPublicResume(created.record.slug, undefined, repository);
    if (!original || !latest) {
      throw new Error("Both historical and latest public versions should be retrievable.");
    }
    expect(original.isLatestVersion).toBe(false);
    expect(original.version.draft.targetBoss).toBe(validDraft.targetBoss);
    expect(latest.isLatestVersion).toBe(true);
    expect(latest.version.draft.targetBoss).toBe("검은 마법사 (익스트림)");

    await expect(archiveResume(created.record.slug, "wrong-token", repository)).rejects.toBeInstanceOf(
      ResumeAuthorizationError,
    );
    await archiveResume(created.record.slug, created.editToken, repository);
    await expect(getPublicResume(created.record.slug, undefined, repository)).resolves.toBeNull();
  });
});

describe("content hash", () => {
  it("is stable when object-key order differs", () => {
    const first = {
      profile: { ocid: "mock-1", name: "테스트" },
      draft: { targetBoss: "검은 마법사", role: "DAMAGE" },
      versionNumber: 1,
    };
    const sameValueInDifferentOrder = {
      versionNumber: 1,
      draft: { role: "DAMAGE", targetBoss: "검은 마법사" },
      profile: { name: "테스트", ocid: "mock-1" },
    };

    expect(contentHash(first)).toBe(contentHash(sameValueInDifferentOrder));
    expect(contentHash(first)).toMatch(/^[a-f0-9]{64}$/);
  });
});
