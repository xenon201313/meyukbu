import { randomBytes, randomUUID } from "node:crypto";

import { findBossOption, findBossOptionById, maxPartySizeForBoss } from "@/content/bosses";
import type { FreshnessPolicy } from "@/domain/freshness";
import type {
  OwnerPartyPost,
  PartyApplication,
  PartyApplicationOwnerView,
  PartyDecision,
  PartyPost,
  PartyPostKind,
  PartyPostTarget,
  PartyResumeSummary,
  PublicPartyPost,
  PublicPartyPostTarget,
} from "@/domain/party";
import { canFormPartyTogether, partyWorldGroupFor } from "@/domain/party-world";
import {
  getResumeBossTargets,
  type ResumeBossTarget,
  type ResumeRecord,
  type ResumeVersion,
} from "@/domain/resume";
import { verifyEditToken } from "@/lib/auth/edit-token";
import {
  DuplicatePartyApplicationError,
  getPartyRepository,
  PartyApplicationRepositoryNotFoundError,
  PartyApplicationRepositoryNotPendingError,
  PartyPostRepositoryClosedError,
  PartyPostRepositoryNotFoundError,
  type PartyRepository,
} from "@/lib/db/party-repository";
import { getResumeRepository, type ResumeRepository } from "@/lib/db/resume-repository";
import { isPartySnapshotFresh } from "@/lib/party/eligibility";

const partyPostLifetimeMs = 7 * 24 * 60 * 60 * 1000;
const maximumPartyApplicationMessageLength = 240;

export class PartyPostNotFoundError extends Error {}
export class PartyPostAuthorizationError extends Error {}
export class PartyPostUnavailableError extends Error {}
export class PartyPostInputError extends Error {}
export class PartyApplicationDuplicateError extends Error {}
export class PartyApplicationIneligibleError extends Error {}
export class PartyApplicationNotFoundError extends Error {}
export class PartyApplicationDecisionError extends Error {}

export interface CreatePartyPostInput {
  ownerResumeSlug: string;
  kind: PartyPostKind;
  /** Optional subset of the selected resume's boss catalog ids; omitted means every target. */
  targetBossIds?: readonly string[];
}

export interface ApplyToPartyPostInput {
  applicantResumeSlug: string;
  /** Owner-only plain text. It is never returned in public party-post DTOs. */
  message?: string | null;
}

export interface PartyServiceDependencies {
  resumeRepository?: ResumeRepository;
  partyRepository?: PartyRepository;
  now?: () => Date;
  /** Testable override; production uses the environment's public freshness policy. */
  freshnessPolicy?: FreshnessPolicy;
}

interface BossTargetSource {
  sourceBossKey: string;
  sourceBossId: string | null;
  bossName: string;
  cadence: PartyPostTarget["cadence"];
  bossMultiplierPercent: string | null;
  maxPartySize: PartyPostTarget["maxPartySize"];
}

function nowIso(now: () => Date): string {
  return now().toISOString();
}

function currentVersion(record: ResumeRecord): ResumeVersion {
  const version = record.versions.find((candidate) => candidate.id === record.currentVersionId);
  if (!version) {
    throw new PartyPostUnavailableError("메력서의 현재 버전을 찾을 수 없습니다.");
  }
  return version;
}

function requirePublicFreshCurrentVersion(
  record: ResumeRecord,
  now: Date,
  freshnessPolicy?: FreshnessPolicy,
): ResumeVersion {
  if (record.visibility !== "PUBLIC") {
    throw new PartyPostUnavailableError("공개 중인 메력서만 파티 게시판에서 사용할 수 있습니다.");
  }
  const version = currentVersion(record);
  if (!isPartySnapshotFresh(version.snapshot.fetchedAt, now, freshnessPolicy)) {
    throw new PartyPostUnavailableError("최근 조회된 메력서만 파티 게시판에서 사용할 수 있습니다.");
  }
  return version;
}

async function requireOwnedResume(
  slug: string,
  editToken: string | undefined,
  repository: ResumeRepository,
): Promise<ResumeRecord> {
  const record = await repository.findBySlug(slug);
  if (!record) {
    throw new PartyPostNotFoundError("메력서를 찾을 수 없습니다.");
  }
  if (!verifyEditToken(editToken, record.editTokenHash)) {
    throw new PartyPostAuthorizationError("이 메력서를 사용할 권한이 없습니다.");
  }
  return record;
}

function normalizedBossTarget(target: ResumeBossTarget): BossTargetSource {
  const inputName = target.bossName.trim();
  if (!inputName || inputName.length > 96) {
    throw new PartyPostInputError("희망 보스 정보를 확인해 주세요.");
  }
  const catalogued = target.bossId
    ? findBossOptionById(target.bossId)
    : target.cadence
      ? findBossOption(target.cadence, inputName)
      : undefined;
  if (!catalogued) {
    throw new PartyPostInputError("목록에서 선택한 보스만 파티 게시판에 등록할 수 있습니다.");
  }

  const bossName = catalogued?.name ?? inputName;
  const cadence = catalogued?.cadence ?? target.cadence ?? null;
  const sourceBossId = catalogued?.id ?? target.bossId ?? null;
  const sourceBossKey = sourceBossId ?? `legacy:${cadence ?? "NONE"}:${bossName.normalize("NFC")}`;
  const multiplier = target.bossMultiplierPercent?.trim() || null;
  if (multiplier && multiplier.length > 40) {
    throw new PartyPostInputError("보스 배율은 40자 이하로 입력해 주세요.");
  }

  return {
    sourceBossKey,
    sourceBossId,
    bossName,
    cadence,
    bossMultiplierPercent: multiplier,
    maxPartySize: maxPartySizeForBoss(catalogued),
  };
}

function resumeBossTargetSources(version: ResumeVersion): BossTargetSource[] {
  const sources = getResumeBossTargets(version.draft).map(normalizedBossTarget);
  if (!sources.length || sources.length > 6) {
    throw new PartyPostInputError("희망 보스는 1개에서 6개까지 등록할 수 있습니다.");
  }
  const keys = new Set<string>();
  for (const source of sources) {
    if (keys.has(source.sourceBossKey)) {
      throw new PartyPostInputError("같은 보스는 한 번만 등록할 수 있습니다.");
    }
    keys.add(source.sourceBossKey);
  }
  return sources;
}

function ensureTargetPartySize(version: ResumeVersion, targets: readonly BossTargetSource[]): void {
  const maximumPartySize = Math.min(...targets.map((target) => target.maxPartySize));
  if (version.draft.partySize && version.draft.partySize > maximumPartySize) {
    throw new PartyPostInputError(`선택한 보스는 최대 ${maximumPartySize}인격까지 입장할 수 있습니다.`);
  }
}

function selectPostTargets(
  version: ResumeVersion,
  selectedBossIds: readonly string[] | undefined,
): BossTargetSource[] {
  const allTargets = resumeBossTargetSources(version);
  if (!selectedBossIds?.length) {
    ensureTargetPartySize(version, allTargets);
    return allTargets;
  }
  if (selectedBossIds.length > 6) {
    throw new PartyPostInputError("희망 보스는 1개에서 6개까지 선택할 수 있습니다.");
  }
  const selected = new Set<string>();
  for (const value of selectedBossIds) {
    const normalized = value.trim();
    if (!normalized || selected.has(normalized)) {
      throw new PartyPostInputError("같은 보스는 한 번만 선택할 수 있습니다.");
    }
    selected.add(normalized);
  }
  const targets = allTargets.filter((target) => selected.has(target.sourceBossKey));
  if (targets.length !== selected.size) {
    throw new PartyPostInputError("메력서에 포함된 희망 보스만 선택할 수 있습니다.");
  }
  ensureTargetPartySize(version, targets);
  return targets;
}

function partyResumeSummary(record: ResumeRecord, version: ResumeVersion): PartyResumeSummary {
  const profile = version.snapshot.profile;
  return {
    resumeSlug: record.slug,
    versionNumber: version.versionNumber,
    characterName: profile.characterName,
    worldName: profile.worldName,
    worldGroup: partyWorldGroupFor(profile.worldName),
    className: profile.className,
    level: profile.level,
    imageUrl: profile.imageUrl,
    role: version.draft.role,
    partyType: version.draft.partyType,
    partySize: version.draft.partySize ?? null,
    availabilityMode: version.draft.availabilityMode ?? "SCHEDULED",
    availability: structuredClone(version.draft.availability),
    voiceChat: version.draft.voiceChat,
    worldTransferAvailability: version.draft.worldTransferAvailability ?? null,
  };
}

function publicTarget(target: PartyPostTarget): PublicPartyPostTarget {
  return {
    bossName: target.bossName,
    cadence: target.cadence,
    bossMultiplierPercent: target.bossMultiplierPercent,
    maxPartySize: target.maxPartySize,
    sortOrder: target.sortOrder,
  };
}

function mapRepositoryError(error: unknown): never {
  if (error instanceof PartyPostRepositoryNotFoundError) {
    throw new PartyPostNotFoundError("파티 게시글을 찾을 수 없습니다.");
  }
  if (error instanceof PartyPostRepositoryClosedError) {
    throw new PartyPostUnavailableError("마감된 파티 게시글입니다.");
  }
  if (error instanceof DuplicatePartyApplicationError) {
    throw new PartyApplicationDuplicateError("이 캐릭터는 이미 지원했습니다.");
  }
  if (error instanceof PartyApplicationRepositoryNotFoundError) {
    throw new PartyApplicationNotFoundError("파티 지원 정보를 찾을 수 없습니다.");
  }
  if (error instanceof PartyApplicationRepositoryNotPendingError) {
    throw new PartyApplicationDecisionError("이미 처리된 파티 지원입니다.");
  }
  throw error;
}

async function uniquePartyPostSlug(repository: PartyRepository): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const slug = `p-${randomBytes(6).toString("base64url").toLowerCase()}`;
    if (!(await repository.findPostBySlug(slug))) {
      return slug;
    }
  }
  throw new Error("Unable to allocate a party post slug.");
}

async function eligiblePublicView(
  post: PartyPost,
  resumeRepository: ResumeRepository,
  now: Date,
  freshnessPolicy?: FreshnessPolicy,
): Promise<PublicPartyPost | null> {
  if (post.status !== "OPEN" || new Date(post.expiresAt).getTime() <= now.getTime()) {
    return null;
  }
  const owner = await resumeRepository.findBySlug(post.ownerResumeSlug);
  if (
    !owner ||
    owner.id !== post.ownerResumeId ||
    owner.characterOcid !== post.ownerCharacterOcid ||
    owner.visibility !== "PUBLIC" ||
    owner.currentVersionId !== post.ownerResumeVersionId
  ) {
    return null;
  }
  const version = owner.versions.find((candidate) => candidate.id === post.ownerResumeVersionId);
  if (!version || !isPartySnapshotFresh(version.snapshot.fetchedAt, now, freshnessPolicy)) {
    return null;
  }
  if (!partyWorldGroupFor(version.snapshot.profile.worldName)) {
    return null;
  }
  return {
    slug: post.slug,
    kind: post.kind,
    status: post.status,
    targets: post.targets.map(publicTarget),
    owner: partyResumeSummary(owner, version),
    createdAt: post.createdAt,
    expiresAt: post.expiresAt,
  };
}

function normalizeApplicationMessage(message: string | null | undefined): string | null {
  if (message === null || message === undefined) {
    return null;
  }
  if (typeof message !== "string") {
    throw new PartyPostInputError("지원 메시지를 확인해 주세요.");
  }
  const normalized = message.replace(/\s+/gu, " ").trim();
  if (!normalized) {
    return null;
  }
  if (normalized.length > maximumPartyApplicationMessageLength) {
    throw new PartyPostInputError("지원 메시지는 240자 이하로 입력해 주세요.");
  }
  return normalized;
}

/** Creates an immutable, seven-day party post from an owned fresh public resume version. */
export async function createPartyPost(
  input: CreatePartyPostInput,
  ownerEditToken: string | undefined,
  dependencies: PartyServiceDependencies = {},
): Promise<PartyPost> {
  if (input.kind !== "RECRUITING" && input.kind !== "LOOKING") {
    throw new PartyPostInputError("파티 게시글 유형을 확인해 주세요.");
  }
  const resumeRepository = dependencies.resumeRepository ?? getResumeRepository();
  const partyRepository = dependencies.partyRepository ?? getPartyRepository();
  const now = dependencies.now ?? (() => new Date());
  const owner = await requireOwnedResume(input.ownerResumeSlug, ownerEditToken, resumeRepository);
  const ownerVersion = requirePublicFreshCurrentVersion(owner, now(), dependencies.freshnessPolicy);
  if (!partyWorldGroupFor(ownerVersion.snapshot.profile.worldName)) {
    throw new PartyPostUnavailableError(
      "월드 정보를 확인할 수 있는 메력서만 파티 게시글에 사용할 수 있습니다.",
    );
  }
  const targetSources = selectPostTargets(ownerVersion, input.targetBossIds);
  const createdAt = nowIso(now);
  const postId = randomUUID();
  const post: PartyPost = {
    id: postId,
    slug: await uniquePartyPostSlug(partyRepository),
    kind: input.kind,
    status: "OPEN",
    ownerResumeId: owner.id,
    ownerResumeSlug: owner.slug,
    ownerResumeVersionId: ownerVersion.id,
    ownerCharacterOcid: owner.characterOcid,
    expiresAt: new Date(new Date(createdAt).getTime() + partyPostLifetimeMs).toISOString(),
    createdAt,
    updatedAt: createdAt,
    closedAt: null,
    targets: targetSources.map((target, index) => ({
      id: randomUUID(),
      postId,
      sourceBossKey: target.sourceBossKey,
      sourceBossId: target.sourceBossId,
      bossName: target.bossName,
      cadence: target.cadence,
      bossMultiplierPercent: target.bossMultiplierPercent,
      maxPartySize: target.maxPartySize,
      sortOrder: index,
    })),
  };
  return partyRepository.createPost(post);
}

/** Lists only posts backed by a current, public, and fresh immutable resume version. */
export async function getPublicPartyPosts(
  dependencies: PartyServiceDependencies = {},
): Promise<PublicPartyPost[]> {
  const resumeRepository = dependencies.resumeRepository ?? getResumeRepository();
  const partyRepository = dependencies.partyRepository ?? getPartyRepository();
  const now = dependencies.now?.() ?? new Date();
  const views = await Promise.all(
    (await partyRepository.listPosts()).map((post) =>
      eligiblePublicView(post, resumeRepository, now, dependencies.freshnessPolicy),
    ),
  );
  return views.filter((view): view is PublicPartyPost => view !== null);
}

/** Looks up one currently discoverable post without leaking a closed or stale record. */
export async function getPublicPartyPost(
  slug: string,
  dependencies: PartyServiceDependencies = {},
): Promise<PublicPartyPost | null> {
  const resumeRepository = dependencies.resumeRepository ?? getResumeRepository();
  const partyRepository = dependencies.partyRepository ?? getPartyRepository();
  const post = await partyRepository.findPostBySlug(slug);
  if (!post) {
    return null;
  }
  return eligiblePublicView(
    post,
    resumeRepository,
    dependencies.now?.() ?? new Date(),
    dependencies.freshnessPolicy,
  );
}

/** Applies with the applicant's own current public resume, never with a public slug alone. */
export async function applyToPartyPost(
  postSlug: string,
  input: ApplyToPartyPostInput,
  applicantEditToken: string | undefined,
  dependencies: PartyServiceDependencies = {},
): Promise<PartyApplication> {
  const resumeRepository = dependencies.resumeRepository ?? getResumeRepository();
  const partyRepository = dependencies.partyRepository ?? getPartyRepository();
  const now = dependencies.now ?? (() => new Date());
  const post = await partyRepository.findPostBySlug(postSlug);
  if (!post) {
    throw new PartyPostNotFoundError("파티 게시글을 찾을 수 없습니다.");
  }
  const publicPost = await eligiblePublicView(post, resumeRepository, now(), dependencies.freshnessPolicy);
  if (!publicPost) {
    throw new PartyPostUnavailableError("현재 지원할 수 없는 파티 게시글입니다.");
  }
  const applicant = await requireOwnedResume(input.applicantResumeSlug, applicantEditToken, resumeRepository);
  const applicantVersion = requirePublicFreshCurrentVersion(applicant, now(), dependencies.freshnessPolicy);
  if (applicant.characterOcid === post.ownerCharacterOcid) {
    throw new PartyApplicationIneligibleError("본인의 파티 게시글에는 지원할 수 없습니다.");
  }
  if (!canFormPartyTogether(publicPost.owner.worldName, applicantVersion.snapshot.profile.worldName)) {
    throw new PartyApplicationIneligibleError(
      "파티는 같은 월드 그룹에서만 구성할 수 있습니다. 본서버, 에오스·헬리오스, 챌린저스는 서로 다른 그룹입니다.",
    );
  }
  const applicantTargetKeys = new Set(
    resumeBossTargetSources(applicantVersion).map((target) => target.sourceBossKey),
  );
  if (!post.targets.some((target) => applicantTargetKeys.has(target.sourceBossKey))) {
    throw new PartyApplicationIneligibleError("같은 희망 보스가 있는 메력서로만 지원할 수 있습니다.");
  }
  const createdAt = nowIso(now);
  try {
    return await partyRepository.createApplication({
      id: randomUUID(),
      postId: post.id,
      applicantResumeId: applicant.id,
      applicantResumeSlug: applicant.slug,
      applicantResumeVersionId: applicantVersion.id,
      applicantCharacterOcid: applicant.characterOcid,
      status: "PENDING",
      message: normalizeApplicationMessage(input.message),
      createdAt,
      decidedAt: null,
    });
  } catch (error) {
    return mapRepositoryError(error);
  }
}

async function requireOwnedPost(
  slug: string,
  ownerEditToken: string | undefined,
  resumeRepository: ResumeRepository,
  partyRepository: PartyRepository,
): Promise<{ post: PartyPost; owner: ResumeRecord }> {
  const post = await partyRepository.findPostBySlug(slug);
  if (!post) {
    throw new PartyPostNotFoundError("파티 게시글을 찾을 수 없습니다.");
  }
  const owner = await requireOwnedResume(post.ownerResumeSlug, ownerEditToken, resumeRepository);
  if (owner.id !== post.ownerResumeId || owner.characterOcid !== post.ownerCharacterOcid) {
    throw new PartyPostAuthorizationError("이 파티 게시글을 관리할 권한이 없습니다.");
  }
  return { post, owner };
}

async function ownerApplicationView(
  application: PartyApplication,
  resumeRepository: ResumeRepository,
): Promise<PartyApplicationOwnerView> {
  const applicant = await resumeRepository.findBySlug(application.applicantResumeSlug);
  const version =
    applicant &&
    applicant.id === application.applicantResumeId &&
    applicant.characterOcid === application.applicantCharacterOcid &&
    applicant.visibility === "PUBLIC"
      ? applicant.versions.find((candidate) => candidate.id === application.applicantResumeVersionId)
      : undefined;
  return {
    id: application.id,
    status: application.status,
    message: application.message,
    createdAt: application.createdAt,
    decidedAt: application.decidedAt,
    applicant: applicant && version ? partyResumeSummary(applicant, version) : null,
  };
}

/** Provides a safe owner view with pending/decided applications but no private resume contact data. */
export async function getPartyPostForOwner(
  slug: string,
  ownerEditToken: string | undefined,
  dependencies: PartyServiceDependencies = {},
): Promise<OwnerPartyPost> {
  const resumeRepository = dependencies.resumeRepository ?? getResumeRepository();
  const partyRepository = dependencies.partyRepository ?? getPartyRepository();
  const { post, owner } = await requireOwnedPost(slug, ownerEditToken, resumeRepository, partyRepository);
  const version = owner.versions.find((candidate) => candidate.id === post.ownerResumeVersionId);
  if (!version) {
    throw new PartyPostNotFoundError("파티 게시글의 이력서 버전을 찾을 수 없습니다.");
  }
  const applications = await partyRepository.listApplications(post.id);
  return {
    slug: post.slug,
    kind: post.kind,
    status: post.status,
    targets: post.targets.map(publicTarget),
    owner: partyResumeSummary(owner, version),
    createdAt: post.createdAt,
    expiresAt: post.expiresAt,
    applications: await Promise.all(
      applications.map((application) => ownerApplicationView(application, resumeRepository)),
    ),
  };
}

/** Lets only the author of the pinned resume accept or decline one pending application. */
export async function decidePartyApplication(
  postSlug: string,
  applicationId: string,
  decision: PartyDecision,
  ownerEditToken: string | undefined,
  dependencies: PartyServiceDependencies = {},
): Promise<PartyApplication> {
  if (decision !== "ACCEPT" && decision !== "DECLINE") {
    throw new PartyPostInputError("지원 처리 방식을 확인해 주세요.");
  }
  const resumeRepository = dependencies.resumeRepository ?? getResumeRepository();
  const partyRepository = dependencies.partyRepository ?? getPartyRepository();
  const { post } = await requireOwnedPost(postSlug, ownerEditToken, resumeRepository, partyRepository);
  try {
    return await partyRepository.decideApplication(
      post.id,
      applicationId,
      decision === "ACCEPT" ? "ACCEPTED" : "DECLINED",
      nowIso(dependencies.now ?? (() => new Date())),
    );
  } catch (error) {
    return mapRepositoryError(error);
  }
}

/** Closes a post without deleting its immutable target snapshot or application audit trail. */
export async function closePartyPost(
  slug: string,
  ownerEditToken: string | undefined,
  dependencies: PartyServiceDependencies = {},
): Promise<PartyPost> {
  const resumeRepository = dependencies.resumeRepository ?? getResumeRepository();
  const partyRepository = dependencies.partyRepository ?? getPartyRepository();
  const { post } = await requireOwnedPost(slug, ownerEditToken, resumeRepository, partyRepository);
  try {
    return await partyRepository.closePost(post.id, nowIso(dependencies.now ?? (() => new Date())));
  } catch (error) {
    return mapRepositoryError(error);
  }
}
