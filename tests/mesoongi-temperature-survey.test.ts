import { describe, expect, it } from "vitest";

import type { ResumeDraft, ResumeRecord } from "@/domain/resume";
import { InMemoryTemperatureSurveyRepository } from "@/lib/db/temperature-survey-repository";
import type { ResumeRepository } from "@/lib/db/resume-repository";
import { getMockProfiles } from "@/lib/nexon/fixtures";
import { MockNexonProvider } from "@/lib/nexon/mock-provider";
import {
  createMesoongiTemperatureSurveyInvitation,
  getPublicMesoongiTemperatureSummary,
  MesoongiTemperatureSurveyAuthorizationError,
  MesoongiTemperatureSurveyUnavailableError,
  submitMesoongiTemperatureSurvey,
} from "@/server/services/mesoongi-temperature-survey-service";
import { createResume } from "@/server/services/resume-service";

const validDraft: ResumeDraft = {
  targetBoss: "검은 마법사 (하드)",
  targetBossCadence: "MONTHLY",
  role: "DAMAGE",
  partyType: "SEMI_FIXED",
  availability: [{ days: ["화", "목"], startTime: "20:00", endTime: "23:00", timezone: "Asia/Seoul" }],
  voiceChat: "OPTIONAL",
  theme: "RESUME",
};

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

function dependencies() {
  return {
    resumeRepository: new TestResumeRepository(),
    surveyRepository: new InMemoryTemperatureSurveyRepository(),
  };
}

function mockCharacterName(index = 0): string {
  const profile = getMockProfiles()[index];
  if (!profile) {
    throw new Error("The primary mock character fixture is required for survey tests.");
  }
  return profile.characterName;
}

async function createTargetResume(repository: ResumeRepository) {
  return createResume(
    { characterName: mockCharacterName(), draft: validDraft },
    { repository, provider: new MockNexonProvider() },
  );
}

describe("메숭이 체온 익명 설문", () => {
  it("starts at 36.5°C, accepts anonymous three-question scores, and exposes only an aggregate", async () => {
    const { resumeRepository, surveyRepository } = dependencies();
    const target = await createTargetResume(resumeRepository);

    await expect(
      createMesoongiTemperatureSurveyInvitation(target.record.slug, "wrong-token", {
        resumeRepository,
        surveyRepository,
      }),
    ).rejects.toBeInstanceOf(MesoongiTemperatureSurveyAuthorizationError);

    const emptySummary = await getPublicMesoongiTemperatureSummary(target.record, { surveyRepository });
    expect(emptySummary).toEqual({
      temperatureCelsius: 36.5,
      responseCount: 0,
      baselineCelsius: 36.5,
      minCelsius: 0,
      maxCelsius: 100,
    });

    const invitation = await createMesoongiTemperatureSurveyInvitation(target.record.slug, target.editToken, {
      resumeRepository,
      surveyRepository,
    });
    expect("tokenHash" in invitation.invitation).toBe(false);

    const response = await submitMesoongiTemperatureSurvey(
      target.record.slug,
      {
        invitationToken: invitation.rawToken,
        experienceScore: 2,
        proficiencyScore: -1,
        punctualityScore: 1,
      },
      { resumeRepository, surveyRepository },
    );

    expect(response).toMatchObject({
      characterOcid: target.record.characterOcid,
      experienceScore: 2,
      proficiencyScore: -1,
      punctualityScore: 1,
      totalDelta: 2,
    });
    expect(response).not.toHaveProperty("reviewerSlug");
    expect(response).not.toHaveProperty("reviewerOcid");
    expect(response).not.toHaveProperty("reviewerName");

    const summary = await getPublicMesoongiTemperatureSummary(target.record, { surveyRepository });
    expect(summary).toEqual({
      temperatureCelsius: 38.5,
      responseCount: 1,
      baselineCelsius: 36.5,
      minCelsius: 0,
      maxCelsius: 100,
    });
    expect(summary).not.toHaveProperty("responses");
    expect(summary).not.toHaveProperty("reviewer");
  });

  it("consumes every invite once and keeps the aggregate when the same character creates another resume", async () => {
    const { resumeRepository, surveyRepository } = dependencies();
    const original = await createTargetResume(resumeRepository);
    const invitation = await createMesoongiTemperatureSurveyInvitation(
      original.record.slug,
      original.editToken,
      {
        resumeRepository,
        surveyRepository,
      },
    );
    const answers = {
      invitationToken: invitation.rawToken,
      experienceScore: 2 as const,
      proficiencyScore: 2 as const,
      punctualityScore: 1 as const,
    };

    await submitMesoongiTemperatureSurvey(original.record.slug, answers, {
      resumeRepository,
      surveyRepository,
    });
    await expect(
      submitMesoongiTemperatureSurvey(original.record.slug, answers, {
        resumeRepository,
        surveyRepository,
      }),
    ).rejects.toBeInstanceOf(MesoongiTemperatureSurveyUnavailableError);

    const separateResume = await createResume(
      {
        characterName: mockCharacterName(),
        draft: { ...validDraft, targetBoss: "스우 (익스트림)", targetBossCadence: "WEEKLY", partySize: 2 },
      },
      { repository: resumeRepository, provider: new MockNexonProvider() },
    );
    expect(separateResume.record.id).not.toBe(original.record.id);
    expect(separateResume.record.characterOcid).toBe(original.record.characterOcid);

    await expect(
      getPublicMesoongiTemperatureSummary(separateResume.record, { surveyRepository }),
    ).resolves.toMatchObject({
      temperatureCelsius: 41.5,
      responseCount: 1,
    });
  });

  it("rejects expired links and a different character without changing that character's temperature", async () => {
    const { resumeRepository, surveyRepository } = dependencies();
    const target = await createTargetResume(resumeRepository);
    const otherCharacter = await createResume(
      {
        characterName: mockCharacterName(1),
        draft: { ...validDraft, targetBoss: "스우 (익스트림)", targetBossCadence: "WEEKLY", partySize: 2 },
      },
      { repository: resumeRepository, provider: new MockNexonProvider() },
    );
    const answers = {
      experienceScore: 1 as const,
      proficiencyScore: 1 as const,
      punctualityScore: 1 as const,
    };

    const expired = await createMesoongiTemperatureSurveyInvitation(target.record.slug, target.editToken, {
      resumeRepository,
      surveyRepository,
      now: () => new Date("2000-01-01T00:00:00.000Z"),
    });
    await expect(
      submitMesoongiTemperatureSurvey(
        target.record.slug,
        { invitationToken: expired.rawToken, ...answers },
        { resumeRepository, surveyRepository },
      ),
    ).rejects.toBeInstanceOf(MesoongiTemperatureSurveyUnavailableError);

    const invitation = await createMesoongiTemperatureSurveyInvitation(target.record.slug, target.editToken, {
      resumeRepository,
      surveyRepository,
    });
    await expect(
      submitMesoongiTemperatureSurvey(
        otherCharacter.record.slug,
        { invitationToken: invitation.rawToken, ...answers },
        { resumeRepository, surveyRepository },
      ),
    ).rejects.toBeInstanceOf(MesoongiTemperatureSurveyUnavailableError);

    await submitMesoongiTemperatureSurvey(
      target.record.slug,
      { invitationToken: invitation.rawToken, ...answers },
      { resumeRepository, surveyRepository },
    );
    await expect(
      getPublicMesoongiTemperatureSummary(otherCharacter.record, { surveyRepository }),
    ).resolves.toMatchObject({ temperatureCelsius: 36.5, responseCount: 0 });
  });
});
