import { describe, expect, it } from "vitest";

import type { ResumeDraft, ResumeRecord } from "@/domain/resume";
import { editTokenCookieName, ownedResumeEditTokenReferences } from "@/lib/auth/edit-token";
import type { ResumeRepository } from "@/lib/db/resume-repository";
import { getMockProfiles } from "@/lib/nexon/fixtures";
import { MockNexonProvider } from "@/lib/nexon/mock-provider";
import { archiveResume, createResume, getOwnedResumeSummaries } from "@/server/services/resume-service";

class TestResumeRepository implements ResumeRepository {
  private readonly records = new Map<string, ResumeRecord>();

  async create(record: ResumeRecord): Promise<ResumeRecord> {
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
    return this.records.has(slug);
  }

  async save(record: ResumeRecord): Promise<ResumeRecord> {
    this.records.set(record.slug, structuredClone(record));
    return structuredClone(record);
  }
}

const draft: ResumeDraft = {
  targetBoss: "A Boss",
  targetBossCadence: "WEEKLY",
  role: "DAMAGE",
  partyType: "FIXED",
  availability: [{ days: ["월"], startTime: "20:00", endTime: "22:00", timezone: "Asia/Seoul" }],
  voiceChat: "AVAILABLE",
  contact: { type: "DISCORD", value: "private-contact", isPublic: false },
  theme: "RESUME",
};

function characterName(): string {
  const profile = getMockProfiles()[0];
  if (!profile) {
    throw new Error("A mock profile is required for owned-resume tests.");
  }
  return profile.characterName;
}

describe("owner resume list authentication", () => {
  it("extracts only valid per-resume edit-token cookie references", () => {
    const validToken = "a".repeat(43);
    const references = ownedResumeEditTokenReferences([
      { name: "unrelated", value: validToken },
      { name: editTokenCookieName("m-owned-a"), value: validToken },
      { name: editTokenCookieName("m-invalid"), value: "short" },
      { name: editTokenCookieName("not a slug"), value: validToken },
      { name: editTokenCookieName("m-owned-a"), value: "b".repeat(43) },
    ]);

    expect(references).toEqual([{ slug: "m-owned-a", editToken: validToken }]);
  });

  it("returns only individually authenticated resume summaries without private fields", async () => {
    const repository = new TestResumeRepository();
    const provider = new MockNexonProvider();
    const first = await createResume({ characterName: characterName(), draft }, { repository, provider });
    const hidden = await createResume(
      { characterName: characterName(), draft: { ...draft, targetBoss: "B Boss" } },
      { repository, provider },
    );
    const archived = await createResume(
      { characterName: characterName(), draft: { ...draft, targetBoss: "C Boss" } },
      { repository, provider },
    );
    await archiveResume(archived.record.slug, archived.editToken, repository);

    const summaries = await getOwnedResumeSummaries(
      [
        { slug: hidden.record.slug, editToken: "wrong-token" },
        { slug: "m-not-found", editToken: "a".repeat(43) },
        { slug: archived.record.slug, editToken: archived.editToken },
        { slug: first.record.slug, editToken: first.editToken },
      ],
      repository,
    );

    expect(summaries.map((summary) => summary.slug)).toEqual([first.record.slug, archived.record.slug]);
    expect(summaries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          targetBoss: "A Boss",
          isOwner: true,
          visibility: "PUBLIC",
          versionNumber: 1,
        }),
        expect.objectContaining({
          targetBoss: "C Boss",
          isOwner: true,
          visibility: "ARCHIVED",
          versionNumber: 1,
        }),
      ]),
    );
    expect(JSON.stringify(summaries)).not.toContain(first.editToken);
    expect(JSON.stringify(summaries)).not.toContain("private-contact");
    expect(JSON.stringify(summaries)).not.toContain("editTokenHash");
  });
});
