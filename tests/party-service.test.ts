import { describe, expect, it } from "vitest";

import { findBossOptionById } from "@/content/bosses";
import type { PartyApplication, PartyPost } from "@/domain/party";
import type { ResumeBossTarget, ResumeDraft, ResumeRecord } from "@/domain/resume";
import { InMemoryPartyRepository, PartyPostRepositoryClosedError } from "@/lib/db/party-repository";
import type { ResumeRepository } from "@/lib/db/resume-repository";
import { getMockProfiles } from "@/lib/nexon/fixtures";
import { MockNexonProvider } from "@/lib/nexon/mock-provider";
import {
  applyToPartyPost,
  closePartyPost,
  createPartyPost,
  decidePartyApplication,
  getPartyPostForOwner,
  getPublicPartyPost,
  getPublicPartyPosts,
  PartyApplicationDecisionError,
  PartyApplicationDuplicateError,
  PartyApplicationIneligibleError,
  PartyPostAuthorizationError,
  PartyPostInputError,
  PartyPostUnavailableError,
} from "@/server/services/party-service";
import { createResume, updateResume } from "@/server/services/resume-service";

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

function fixtureName(index: number): string {
  const profile = getMockProfiles()[index];
  if (!profile) {
    throw new Error(`Missing mock profile ${index}.`);
  }
  return profile.characterName;
}

function bossTarget(bossId: string, multiplier?: string): ResumeBossTarget {
  const boss = findBossOptionById(bossId);
  if (!boss) {
    throw new Error(`Missing boss option ${bossId}.`);
  }
  return {
    bossId: boss.id,
    bossName: boss.name,
    cadence: boss.cadence,
    bossMultiplierPercent: multiplier,
  };
}

function draft(bossIds: string[], privateContact = false): ResumeDraft {
  const bossTargets = bossIds.map((bossId, index) => bossTarget(bossId, index === 0 ? "412.5" : "251.9"));
  const primary = bossTargets[0];
  if (!primary) {
    throw new Error("At least one boss is required for a test draft.");
  }
  return {
    bossTargets,
    targetBoss: primary.bossName,
    targetBossCadence: primary.cadence,
    bossMultiplierPercent: primary.bossMultiplierPercent,
    role: "DAMAGE",
    partyType: "FIXED",
    partySize: 2,
    availabilityMode: "SCHEDULED",
    availability: [{ days: ["토"], startTime: "20:00", endTime: "23:00", timezone: "Asia/Seoul" }],
    voiceChat: "AVAILABLE",
    contact: privateContact
      ? { type: "DISCORD", value: "private-contact-value", isPublic: false }
      : undefined,
    theme: "RESUME",
  };
}

function dependencies() {
  const resumeRepository = new TestResumeRepository();
  const partyRepository = new InMemoryPartyRepository();
  const clock = new Date();
  return {
    resumeRepository,
    partyRepository,
    now: () => new Date(clock),
  };
}

function repositoryPost(id: string, slug: string, expiresAt: string): PartyPost {
  return {
    id,
    slug,
    kind: "RECRUITING",
    status: "OPEN",
    ownerResumeId: "owner-resume",
    ownerResumeSlug: "owner-resume-slug",
    ownerResumeVersionId: "owner-version",
    ownerCharacterOcid: "owner-ocid",
    expiresAt,
    createdAt: "2030-01-01T00:00:00.000Z",
    updatedAt: "2030-01-01T00:00:00.000Z",
    closedAt: null,
    targets: [],
  };
}

function repositoryApplication(id: string, postId: string, createdAt: string): PartyApplication {
  return {
    id,
    postId,
    applicantResumeId: "applicant-resume",
    applicantResumeSlug: "applicant-resume-slug",
    applicantResumeVersionId: "applicant-version",
    applicantCharacterOcid: "applicant-ocid",
    status: "PENDING",
    message: null,
    createdAt,
    decidedAt: null,
  };
}

async function createOwnedResume(name: string, resumeDraft: ResumeDraft, repository: ResumeRepository) {
  return createResume(
    { characterName: name, draft: resumeDraft },
    { repository, provider: new MockNexonProvider() },
  );
}

describe("party-board service", () => {
  it("pins one to six selected boss snapshots to an owned current fresh resume and exposes a safe public DTO", async () => {
    const setup = dependencies();
    const owner = await createOwnedResume(
      fixtureName(0),
      draft(["xsu", "xblack"], true),
      setup.resumeRepository,
    );

    const post = await createPartyPost(
      { ownerResumeSlug: owner.record.slug, kind: "RECRUITING", targetBossIds: ["xsu", "xblack"] },
      owner.editToken,
      setup,
    );

    expect(post.slug).toMatch(/^p-[a-z0-9_-]+$/);
    expect(post.ownerResumeVersionId).toBe(owner.record.currentVersionId);
    expect(post.targets).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          bossName: "스우 (익스트림)",
          maxPartySize: 2,
          bossMultiplierPercent: "412.5",
        }),
        expect.objectContaining({
          bossName: "검은 마법사 (익스트림)",
          maxPartySize: 6,
          bossMultiplierPercent: "251.9",
        }),
      ]),
    );
    expect(Date.parse(post.expiresAt) - Date.parse(post.createdAt)).toBe(7 * 24 * 60 * 60 * 1000);

    const publicPosts = await getPublicPartyPosts(setup);
    expect(publicPosts).toHaveLength(1);
    expect(publicPosts[0]).toMatchObject({ slug: post.slug, kind: "RECRUITING", status: "OPEN" });
    const serialized = JSON.stringify(publicPosts[0]);
    expect(serialized).not.toContain("private-contact-value");
    expect(serialized).not.toContain(owner.editToken);
    expect(serialized).not.toContain("ownerCharacterOcid");
    expect(serialized).not.toContain("sourceBossKey");
  });

  it("hides a post when its pinned resume stops being the current public version", async () => {
    const setup = dependencies();
    const ownerDraft = draft(["xblack"]);
    const owner = await createOwnedResume(fixtureName(0), ownerDraft, setup.resumeRepository);
    const post = await createPartyPost(
      { ownerResumeSlug: owner.record.slug, kind: "LOOKING" },
      owner.editToken,
      setup,
    );

    await expect(getPublicPartyPost(post.slug, setup)).resolves.not.toBeNull();
    await updateResume(owner.record.slug, ownerDraft, owner.editToken, setup.resumeRepository);

    await expect(getPublicPartyPost(post.slug, setup)).resolves.toBeNull();
    await expect(getPublicPartyPosts(setup)).resolves.toEqual([]);
  });

  it("uses the configured freshness policy and rejects legacy targets that could bypass catalog limits", async () => {
    const setup = dependencies();
    const owner = await createOwnedResume(fixtureName(0), draft(["xsu"]), setup.resumeRepository);
    const stored = await setup.resumeRepository.findBySlug(owner.record.slug);
    if (!stored) {
      throw new Error("The test owner resume was not stored.");
    }
    const version = stored.versions.find((candidate) => candidate.id === stored.currentVersionId);
    if (!version) {
      throw new Error("The test owner current version is missing.");
    }

    version.snapshot.fetchedAt = new Date(setup.now().getTime() - 2 * 60 * 60 * 1000).toISOString();
    await setup.resumeRepository.save(stored);
    await expect(
      createPartyPost({ ownerResumeSlug: owner.record.slug, kind: "RECRUITING" }, owner.editToken, {
        ...setup,
        freshnessPolicy: { freshHours: 1, expiryDays: 30 },
      }),
    ).rejects.toBeInstanceOf(PartyPostUnavailableError);

    version.snapshot.fetchedAt = setup.now().toISOString();
    version.draft = {
      ...version.draft,
      partySize: 6,
      bossTargets: [{ bossName: "스우 (하드)", cadence: "WEEKLY" }],
      targetBoss: "스우 (하드)",
      targetBossCadence: "WEEKLY",
      bossMultiplierPercent: undefined,
    };
    await setup.resumeRepository.save(stored);
    await expect(
      createPartyPost({ ownerResumeSlug: owner.record.slug, kind: "RECRUITING" }, owner.editToken, setup),
    ).rejects.toBeInstanceOf(PartyPostInputError);

    version.draft = {
      ...version.draft,
      partySize: 2,
      bossTargets: [{ bossName: "카탈로그 밖 보스", cadence: "WEEKLY" }],
      targetBoss: "카탈로그 밖 보스",
    };
    await setup.resumeRepository.save(stored);
    await expect(
      createPartyPost({ ownerResumeSlug: owner.record.slug, kind: "RECRUITING" }, owner.editToken, setup),
    ).rejects.toBeInstanceOf(PartyPostInputError);
  });

  it("requires an owned matching public resume, blocks self and duplicate applications, and only reveals a safe owner view", async () => {
    const setup = dependencies();
    const owner = await createOwnedResume(fixtureName(0), draft(["xblack"]), setup.resumeRepository);
    const applicant = await createOwnedResume(
      fixtureName(1),
      draft(["xblack"], true),
      setup.resumeRepository,
    );
    const post = await createPartyPost(
      { ownerResumeSlug: owner.record.slug, kind: "RECRUITING" },
      owner.editToken,
      setup,
    );

    await expect(
      applyToPartyPost(post.slug, { applicantResumeSlug: owner.record.slug }, owner.editToken, setup),
    ).rejects.toBeInstanceOf(PartyApplicationIneligibleError);

    const application = await applyToPartyPost(
      post.slug,
      { applicantResumeSlug: applicant.record.slug, message: "  토요일 저녁 참여 가능합니다.  " },
      applicant.editToken,
      setup,
    );
    expect(application).toMatchObject({ status: "PENDING", message: "토요일 저녁 참여 가능합니다." });

    await expect(
      applyToPartyPost(post.slug, { applicantResumeSlug: applicant.record.slug }, applicant.editToken, setup),
    ).rejects.toBeInstanceOf(PartyApplicationDuplicateError);
    await expect(getPartyPostForOwner(post.slug, "wrong-token", setup)).rejects.toBeInstanceOf(
      PartyPostAuthorizationError,
    );

    const ownerView = await getPartyPostForOwner(post.slug, owner.editToken, setup);
    expect(ownerView.applications).toHaveLength(1);
    expect(ownerView.applications[0]).toMatchObject({
      id: application.id,
      status: "PENDING",
      message: "토요일 저녁 참여 가능합니다.",
      applicant: { resumeSlug: applicant.record.slug, characterName: fixtureName(1) },
    });
    const ownerSerialized = JSON.stringify(ownerView);
    expect(ownerSerialized).not.toContain("private-contact-value");
    expect(ownerSerialized).not.toContain(applicant.editToken);
    expect(ownerSerialized).not.toContain("experienceScore");
  });

  it("rejects a non-overlapping resume and validates the optional 240-character application message", async () => {
    const setup = dependencies();
    const owner = await createOwnedResume(fixtureName(0), draft(["xblack"]), setup.resumeRepository);
    const mismatch = await createOwnedResume(fixtureName(1), draft(["xsu"]), setup.resumeRepository);
    const matching = await createOwnedResume(fixtureName(1), draft(["xblack"]), setup.resumeRepository);
    const post = await createPartyPost(
      { ownerResumeSlug: owner.record.slug, kind: "RECRUITING" },
      owner.editToken,
      setup,
    );

    await expect(
      applyToPartyPost(post.slug, { applicantResumeSlug: mismatch.record.slug }, mismatch.editToken, setup),
    ).rejects.toBeInstanceOf(PartyApplicationIneligibleError);
    await expect(
      applyToPartyPost(
        post.slug,
        { applicantResumeSlug: matching.record.slug, message: "x".repeat(241) },
        matching.editToken,
        setup,
      ),
    ).rejects.toBeInstanceOf(PartyPostInputError);
    await expect(
      createPartyPost(
        { ownerResumeSlug: owner.record.slug, kind: "RECRUITING", targetBossIds: ["not-in-resume"] },
        owner.editToken,
        setup,
      ),
    ).rejects.toBeInstanceOf(PartyPostInputError);
  });

  it("lets only the post owner decide one pending application and closes the public post", async () => {
    const setup = dependencies();
    const owner = await createOwnedResume(fixtureName(0), draft(["xblack"]), setup.resumeRepository);
    const applicant = await createOwnedResume(fixtureName(1), draft(["xblack"]), setup.resumeRepository);
    const post = await createPartyPost(
      { ownerResumeSlug: owner.record.slug, kind: "RECRUITING" },
      owner.editToken,
      setup,
    );
    const application = await applyToPartyPost(
      post.slug,
      { applicantResumeSlug: applicant.record.slug },
      applicant.editToken,
      setup,
    );

    await expect(
      decidePartyApplication(post.slug, application.id, "ACCEPT", applicant.editToken, setup),
    ).rejects.toBeInstanceOf(PartyPostAuthorizationError);
    await expect(
      decidePartyApplication(post.slug, application.id, "ACCEPT", owner.editToken, setup),
    ).resolves.toMatchObject({ status: "ACCEPTED" });
    await expect(
      decidePartyApplication(post.slug, application.id, "DECLINE", owner.editToken, setup),
    ).rejects.toBeInstanceOf(PartyApplicationDecisionError);

    await expect(closePartyPost(post.slug, owner.editToken, setup)).resolves.toMatchObject({
      status: "CLOSED",
    });
    await expect(getPublicPartyPost(post.slug, setup)).resolves.toBeNull();
    await expect(
      applyToPartyPost(post.slug, { applicantResumeSlug: applicant.record.slug }, applicant.editToken, setup),
    ).rejects.toBeInstanceOf(PartyPostUnavailableError);
  });

  it("makes concurrent decisions monotonic and rejects both mutations once a post expires", async () => {
    const setup = dependencies();
    const owner = await createOwnedResume(fixtureName(0), draft(["xblack"]), setup.resumeRepository);
    const applicant = await createOwnedResume(fixtureName(1), draft(["xblack"]), setup.resumeRepository);
    const post = await createPartyPost(
      { ownerResumeSlug: owner.record.slug, kind: "RECRUITING" },
      owner.editToken,
      setup,
    );
    const application = await applyToPartyPost(
      post.slug,
      { applicantResumeSlug: applicant.record.slug },
      applicant.editToken,
      setup,
    );

    const outcomes = await Promise.allSettled([
      decidePartyApplication(post.slug, application.id, "ACCEPT", owner.editToken, setup),
      decidePartyApplication(post.slug, application.id, "DECLINE", owner.editToken, setup),
    ]);
    const fulfilled = outcomes.filter(
      (outcome): outcome is PromiseFulfilledResult<PartyApplication> => outcome.status === "fulfilled",
    );
    const rejected = outcomes.filter(
      (outcome): outcome is PromiseRejectedResult => outcome.status === "rejected",
    );
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect(rejected[0]?.reason).toBeInstanceOf(PartyApplicationDecisionError);

    const ownerView = await getPartyPostForOwner(post.slug, owner.editToken, setup);
    expect(ownerView.applications).toEqual([
      expect.objectContaining({ id: application.id, status: fulfilled[0]?.value.status }),
    ]);

    const expiredSetup = { ...setup, now: () => new Date(post.expiresAt) };
    await expect(
      decidePartyApplication(post.slug, application.id, "ACCEPT", owner.editToken, expiredSetup),
    ).rejects.toBeInstanceOf(PartyPostUnavailableError);
    await expect(
      applyToPartyPost(
        post.slug,
        { applicantResumeSlug: applicant.record.slug },
        applicant.editToken,
        expiredSetup,
      ),
    ).rejects.toBeInstanceOf(PartyPostUnavailableError);
  });

  it("treats expiry as a mutation boundary in the in-memory repository", async () => {
    const repository = new InMemoryPartyRepository();
    const atExpiry = "2030-01-01T00:01:00.000Z";
    const expiredPost = repositoryPost("expired-post", "p-expired", atExpiry);
    await repository.createPost(expiredPost);
    await expect(
      repository.createApplication(repositoryApplication("expired-application", expiredPost.id, atExpiry)),
    ).rejects.toBeInstanceOf(PartyPostRepositoryClosedError);

    const pendingPost = repositoryPost("pending-post", "p-pending", "2030-01-01T00:02:00.000Z");
    await repository.createPost(pendingPost);
    const pendingApplication = await repository.createApplication(
      repositoryApplication("pending-application", pendingPost.id, "2030-01-01T00:01:00.000Z"),
    );
    await expect(
      repository.decideApplication(pendingPost.id, pendingApplication.id, "ACCEPTED", pendingPost.expiresAt),
    ).rejects.toBeInstanceOf(PartyPostRepositoryClosedError);
  });
});
