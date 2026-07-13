import { randomUUID } from "node:crypto";

import { describe, expect, it } from "vitest";

import type { ResumeDraft, ResumeRecord } from "@/domain/resume";
import { createEditToken, hashEditToken } from "@/lib/auth/edit-token";
import {
  InMemoryTemperatureRepository,
  TemperatureInvitationExpiredError,
  type TemperatureRepository,
} from "@/lib/db/temperature-repository";
import type { ResumeRepository } from "@/lib/db/resume-repository";
import { getMockProfiles } from "@/lib/nexon/fixtures";
import { MockNexonProvider } from "@/lib/nexon/mock-provider";
import {
  createMesoongiTemperatureInvitation,
  getPublicMesoongiTemperatureFeedbacks,
  MesoongiTemperatureDuplicateFeedbackError,
  MesoongiTemperatureSelfFeedbackError,
  MesoongiTemperatureUnavailableError,
  submitMesoongiTemperatureFeedback,
} from "@/server/services/mesoongi-temperature-service";
import { archiveResume, createResume } from "@/server/services/resume-service";

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

  async slugExists(slug: string): Promise<boolean> {
    return this.records.has(slug);
  }

  async save(record: ResumeRecord): Promise<ResumeRecord> {
    this.records.set(record.slug, structuredClone(record));
    return structuredClone(record);
  }
}

function testDependencies(): { repository: ResumeRepository; temperatureRepository: TemperatureRepository } {
  return {
    repository: new TestResumeRepository(),
    temperatureRepository: new InMemoryTemperatureRepository(),
  };
}

async function createDifferentResumes(repository: ResumeRepository) {
  const profiles = getMockProfiles();
  const targetProfile = profiles[0];
  const reviewerProfile = profiles[1];
  if (!targetProfile || !reviewerProfile) {
    throw new Error("Two mock character fixtures are required for temperature feedback tests.");
  }
  const provider = new MockNexonProvider();
  const target = await createResume(
    { characterName: targetProfile.characterName, draft: validDraft },
    { repository, provider },
  );
  const reviewer = await createResume(
    { characterName: reviewerProfile.characterName, draft: validDraft },
    { repository, provider },
  );
  return { target, reviewer };
}

describe("메숭이 체온 동행 기록", () => {
  it("records named tag-only companion feedback for the immutable version and hides it when reviewer unpublishes", async () => {
    const { repository, temperatureRepository } = testDependencies();
    const { target, reviewer } = await createDifferentResumes(repository);
    const invitation = await createMesoongiTemperatureInvitation(target.record.slug, target.editToken, {
      resumeRepository: repository,
      temperatureRepository,
    });

    const feedback = await submitMesoongiTemperatureFeedback(
      target.record.slug,
      {
        invitationToken: invitation.rawToken,
        reviewerSlug: reviewer.record.slug,
        tags: ["PUNCTUAL", "COMMUNICATIVE"],
      },
      reviewer.editToken,
      { resumeRepository: repository, temperatureRepository },
    );

    expect(feedback.status).toBe("PUBLISHED");
    expect(feedback.tags).toEqual(["PUNCTUAL", "COMMUNICATIVE"]);
    expect("comment" in feedback).toBe(false);
    expect("score" in feedback).toBe(false);

    const targetVersion = target.record.versions[0];
    if (!targetVersion) {
      throw new Error("Target version is required.");
    }
    const publicFeedbacks = await getPublicMesoongiTemperatureFeedbacks(target.record, targetVersion, {
      resumeRepository: repository,
      temperatureRepository,
    });
    expect(publicFeedbacks).toHaveLength(1);
    expect(publicFeedbacks[0]).toMatchObject({ reviewerSlug: reviewer.record.slug, tags: feedback.tags });

    await archiveResume(reviewer.record.slug, reviewer.editToken, repository);
    await expect(
      getPublicMesoongiTemperatureFeedbacks(target.record, targetVersion, {
        resumeRepository: repository,
        temperatureRepository,
      }),
    ).resolves.toEqual([]);
  });

  it("blocks self feedback, reusing an invitation, and duplicate reviewers", async () => {
    const { repository, temperatureRepository } = testDependencies();
    const { target, reviewer } = await createDifferentResumes(repository);

    const selfInvitation = await createMesoongiTemperatureInvitation(target.record.slug, target.editToken, {
      resumeRepository: repository,
      temperatureRepository,
    });
    await expect(
      submitMesoongiTemperatureFeedback(
        target.record.slug,
        {
          invitationToken: selfInvitation.rawToken,
          reviewerSlug: target.record.slug,
          tags: ["PUNCTUAL"],
        },
        target.editToken,
        { resumeRepository: repository, temperatureRepository },
      ),
    ).rejects.toBeInstanceOf(MesoongiTemperatureSelfFeedbackError);

    const firstInvitation = await createMesoongiTemperatureInvitation(target.record.slug, target.editToken, {
      resumeRepository: repository,
      temperatureRepository,
    });
    const submission = {
      invitationToken: firstInvitation.rawToken,
      reviewerSlug: reviewer.record.slug,
      tags: ["PREPARED"] as const,
    };
    await submitMesoongiTemperatureFeedback(target.record.slug, submission, reviewer.editToken, {
      resumeRepository: repository,
      temperatureRepository,
    });
    await expect(
      submitMesoongiTemperatureFeedback(target.record.slug, submission, reviewer.editToken, {
        resumeRepository: repository,
        temperatureRepository,
      }),
    ).rejects.toBeInstanceOf(MesoongiTemperatureUnavailableError);

    const secondInvitation = await createMesoongiTemperatureInvitation(target.record.slug, target.editToken, {
      resumeRepository: repository,
      temperatureRepository,
    });
    await expect(
      submitMesoongiTemperatureFeedback(
        target.record.slug,
        {
          invitationToken: secondInvitation.rawToken,
          reviewerSlug: reviewer.record.slug,
          tags: ["FAIR_LOOT"],
        },
        reviewer.editToken,
        { resumeRepository: repository, temperatureRepository },
      ),
    ).rejects.toBeInstanceOf(MesoongiTemperatureDuplicateFeedbackError);
  });

  it("rejects an expired invitation before persisting feedback", async () => {
    const temperatureRepository = new InMemoryTemperatureRepository();
    const token = createEditToken();
    await temperatureRepository.createInvitation({
      id: randomUUID(),
      resumeId: "target-resume",
      resumeVersionId: "target-version",
      tokenHash: hashEditToken(token),
      expiresAt: "2020-01-01T00:00:00.000Z",
    });

    await expect(
      temperatureRepository.submitFeedback({
        id: randomUUID(),
        resumeId: "target-resume",
        resumeVersionId: "target-version",
        reviewerResumeId: "reviewer-resume",
        reviewerSlug: "m-reviewer",
        reviewerOcid: "reviewer-ocid",
        reviewerName: "검토자",
        reviewerWorldName: "크로아",
        reviewerClassName: "비숍",
        tags: ["PUNCTUAL"],
        invitationTokenHash: hashEditToken(token),
      }),
    ).rejects.toBeInstanceOf(TemperatureInvitationExpiredError);
  });
});
