import { randomBytes, randomUUID } from "node:crypto";

import type { NormalizedCharacterProfile } from "@/domain/character";
import { transitionGuildObservation } from "@/domain/guild-observation";
import type {
  PublicResume,
  ProfileSnapshot,
  ResumeDraft,
  ResumeRecord,
  ResumeVersion,
} from "@/domain/resume";
import { createEditToken, hashEditToken, verifyEditToken } from "@/lib/auth/edit-token";
import { getResumeRepository, type ResumeRepository } from "@/lib/db/resume-repository";
import { contentHash } from "@/lib/hash";
import type { NexonProvider } from "@/lib/nexon/provider";
import { getNexonProvider } from "@/lib/nexon/provider";

export class ResumeNotFoundError extends Error {}
export class ResumeAuthorizationError extends Error {}
export class ResumeArchivedError extends Error {}

function createSnapshot(profile: NormalizedCharacterProfile): ProfileSnapshot {
  return {
    id: randomUUID(),
    profile,
    provider: profile.provider,
    fetchedAt: profile.fetchedAt,
    sourceDate: profile.sourceDate,
    createdAt: new Date().toISOString(),
  };
}

function createVersion(
  resumeId: string,
  versionNumber: number,
  snapshot: ProfileSnapshot,
  draft: ResumeDraft,
): ResumeVersion {
  const payload = { profile: snapshot.profile, draft, versionNumber };
  return {
    id: randomUUID(),
    resumeId,
    snapshot,
    draft,
    versionNumber,
    contentHash: contentHash(payload),
    publishedAt: new Date().toISOString(),
  };
}

async function uniqueSlug(repository: ResumeRepository): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const slug = `m-${randomBytes(6).toString("base64url").toLowerCase()}`;
    if (!(await repository.slugExists(slug))) {
      return slug;
    }
  }
  throw new Error("Unable to allocate a public slug.");
}

async function fetchProfile(name: string, provider: NexonProvider): Promise<NormalizedCharacterProfile> {
  const identifier = await provider.resolveCharacter(name);
  return provider.getProfile(identifier.ocid);
}

export interface CreateResumeInput {
  characterName: string;
  draft: ResumeDraft;
}

export interface CreateResumeResult {
  record: ResumeRecord;
  editToken: string;
}

/** Resolves a fresh profile on the server, then creates the first immutable public version. */
export async function createResume(
  input: CreateResumeInput,
  dependencies: { repository?: ResumeRepository; provider?: NexonProvider } = {},
): Promise<CreateResumeResult> {
  const repository = dependencies.repository ?? getResumeRepository();
  const provider = dependencies.provider ?? getNexonProvider();
  const profile = await fetchProfile(input.characterName, provider);
  const id = randomUUID();
  const snapshot = createSnapshot(profile);
  const version = createVersion(id, 1, snapshot, input.draft);
  const editToken = createEditToken();
  const now = new Date().toISOString();
  const record: ResumeRecord = {
    id,
    slug: await uniqueSlug(repository),
    characterOcid: profile.ocid,
    editTokenHash: hashEditToken(editToken),
    currentVersionId: version.id,
    visibility: "PUBLIC",
    versions: [version],
    guildObservations: transitionGuildObservation([], {
      guildName: profile.currentGuild,
      observedAt: snapshot.fetchedAt,
      sourceSnapshotId: snapshot.id,
    }),
    createdAt: now,
    updatedAt: now,
  };
  return { record: await repository.create(record), editToken };
}

export async function resolveProfileByName(
  name: string,
  provider: NexonProvider = getNexonProvider(),
): Promise<NormalizedCharacterProfile> {
  return fetchProfile(name, provider);
}

async function getAuthorizedRecord(
  slug: string,
  editToken: string | undefined,
  repository: ResumeRepository,
): Promise<ResumeRecord> {
  const record = await repository.findBySlug(slug);
  if (!record) {
    throw new ResumeNotFoundError();
  }
  if (!verifyEditToken(editToken, record.editTokenHash)) {
    throw new ResumeAuthorizationError();
  }
  return record;
}

export async function updateResume(
  slug: string,
  draft: ResumeDraft,
  editToken: string | undefined,
  repository: ResumeRepository = getResumeRepository(),
): Promise<ResumeRecord> {
  const record = await getAuthorizedRecord(slug, editToken, repository);
  if (record.visibility === "ARCHIVED") {
    throw new ResumeArchivedError();
  }
  const latest = record.versions.find((version) => version.id === record.currentVersionId);
  if (!latest) {
    throw new ResumeNotFoundError();
  }
  const version = createVersion(record.id, latest.versionNumber + 1, latest.snapshot, draft);
  record.versions.push(version);
  record.currentVersionId = version.id;
  record.updatedAt = new Date().toISOString();
  return repository.save(record);
}

export async function refreshResume(
  slug: string,
  editToken: string | undefined,
  dependencies: { repository?: ResumeRepository; provider?: NexonProvider } = {},
): Promise<ResumeRecord> {
  const repository = dependencies.repository ?? getResumeRepository();
  const record = await getAuthorizedRecord(slug, editToken, repository);
  if (record.visibility === "ARCHIVED") {
    throw new ResumeArchivedError();
  }
  const provider = dependencies.provider ?? getNexonProvider();
  const profile = await provider.getProfile(record.characterOcid);
  const snapshot = createSnapshot(profile);
  const latest = record.versions.find((version) => version.id === record.currentVersionId);
  if (!latest) {
    throw new ResumeNotFoundError();
  }
  const version = createVersion(record.id, latest.versionNumber + 1, snapshot, latest.draft);
  record.versions.push(version);
  record.currentVersionId = version.id;
  record.guildObservations = transitionGuildObservation(record.guildObservations, {
    guildName: profile.currentGuild,
    observedAt: snapshot.fetchedAt,
    sourceSnapshotId: snapshot.id,
  });
  record.updatedAt = new Date().toISOString();
  return repository.save(record);
}

export async function archiveResume(
  slug: string,
  editToken: string | undefined,
  repository: ResumeRepository = getResumeRepository(),
): Promise<void> {
  const record = await getAuthorizedRecord(slug, editToken, repository);
  record.visibility = "ARCHIVED";
  record.updatedAt = new Date().toISOString();
  await repository.save(record);
}

/** Retrieves either the current version or a stable historical version for verification. */
export async function getPublicResume(
  slug: string,
  versionNumber?: number,
  repository: ResumeRepository = getResumeRepository(),
): Promise<PublicResume | null> {
  const resume = await repository.findBySlug(slug);
  if (!resume || resume.visibility !== "PUBLIC") {
    return null;
  }
  const current = resume.versions.find((version) => version.id === resume.currentVersionId);
  const version = versionNumber
    ? resume.versions.find((candidate) => candidate.versionNumber === versionNumber)
    : current;
  if (!version || !current) {
    return null;
  }
  return { resume, version, isLatestVersion: version.id === current.id };
}
