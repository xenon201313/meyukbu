import { randomBytes, randomUUID } from "node:crypto";

import type { NormalizedCharacterProfile, ProfileField } from "@/domain/character";
import { transitionGuildObservation } from "@/domain/guild-observation";
import { getResumeBossTargets } from "@/domain/resume";
import type {
  OwnedResumeSummary,
  PublicResume,
  ProfileSnapshot,
  ResumeDraft,
  ResumeRecord,
  ResumeVersion,
} from "@/domain/resume";
import {
  createEditToken,
  hashEditToken,
  type OwnedResumeEditTokenReference,
  verifyEditToken,
} from "@/lib/auth/edit-token";
import { getCombatPowerRepository, type CombatPowerRepository } from "@/lib/db/combat-power-repository";
import { getResumeRepository, type ResumeRepository } from "@/lib/db/resume-repository";
import { parseNumericValue } from "@/lib/format";
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

/**
 * Records the current API combat power and merges the highest observed value into
 * the profile. A peak from a past observation replaces the combat power field with
 * a SERVICE_OBSERVED entry so hunting-gear lookups keep showing the best setup.
 * Observation failures never block a lookup; the raw profile is returned as-is.
 */
export async function applyPeakCombatPower(
  profile: NormalizedCharacterProfile,
  repository: CombatPowerRepository = getCombatPowerRepository(),
): Promise<NormalizedCharacterProfile> {
  const currentValue = parseNumericValue(
    profile.stats.find((stat) => stat.label === "전투력")?.value ??
      profile.fields.find((field) => field.key === "combatPower")?.value ??
      null,
  );
  let peak: Awaited<ReturnType<CombatPowerRepository["record"]>> = null;
  try {
    peak = await repository.record({
      ocid: profile.ocid,
      characterName: profile.characterName,
      worldName: profile.worldName,
      combatPower: currentValue,
      observedAt: profile.fetchedAt,
    });
  } catch (error) {
    console.error("Combat power observation failed:", error instanceof Error ? error.message : error);
    return profile;
  }
  if (!peak) {
    return profile;
  }

  const enriched: NormalizedCharacterProfile = { ...profile, peakCombatPower: peak };
  if (currentValue === null || peak.value > currentValue) {
    const observedField: ProfileField = {
      key: "combatPower",
      label: "전투력",
      value: String(peak.value),
      provenance: "SERVICE_OBSERVED",
      category: "combat",
      priorityByRole: { DAMAGE: 1, SUPPORT: 1, UTILITY: 1, OTHER: 1 },
    };
    enriched.fields = [observedField, ...profile.fields.filter((field) => field.key !== "combatPower")];
  }
  return enriched;
}

async function fetchProfile(
  name: string,
  provider: NexonProvider,
  combatPowerRepository?: CombatPowerRepository,
): Promise<NormalizedCharacterProfile> {
  const identifier = await provider.resolveCharacter(name);
  const profile = await provider.getProfile(identifier.ocid);
  return applyPeakCombatPower(profile, combatPowerRepository ?? getCombatPowerRepository());
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
  const profile = await applyPeakCombatPower(await provider.getProfile(record.characterOcid));
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

/**
 * Returns only records for which the caller supplied that record's own valid
 * edit token. References come exclusively from same-origin HttpOnly cookies;
 * the result intentionally omits credentials, contacts, and version history.
 */
export async function getOwnedResumeSummaries(
  references: readonly OwnedResumeEditTokenReference[],
  repository: ResumeRepository = getResumeRepository(),
): Promise<OwnedResumeSummary[]> {
  const tokensBySlug = new Map<string, string>();
  for (const reference of references) {
    if (!tokensBySlug.has(reference.slug)) {
      tokensBySlug.set(reference.slug, reference.editToken);
    }
  }
  if (!tokensBySlug.size) {
    return [];
  }

  const records = await repository.findBySlugs([...tokensBySlug.keys()]);
  const summaries: OwnedResumeSummary[] = [];
  for (const record of records) {
    const editToken = tokensBySlug.get(record.slug);
    if (!verifyEditToken(editToken, record.editTokenHash)) {
      continue;
    }
    const version = record.versions.find((candidate) => candidate.id === record.currentVersionId);
    if (!version) {
      continue;
    }
    const profile = version.snapshot.profile;
    summaries.push({
      slug: record.slug,
      characterName: profile.characterName,
      worldName: profile.worldName,
      className: profile.className,
      characterImageUrl: profile.imageUrl,
      targetBoss: version.draft.targetBoss,
      targetBossCadence: version.draft.targetBossCadence ?? null,
      bossTargets: [...getResumeBossTargets(version.draft)],
      role: version.draft.role,
      partyType: version.draft.partyType,
      partySize: version.draft.partySize ?? null,
      visibility: record.visibility,
      versionNumber: version.versionNumber,
      publishedAt: version.publishedAt,
      fetchedAt: version.snapshot.fetchedAt,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      isOwner: true,
    });
  }

  return summaries.sort(
    (left, right) =>
      left.targetBoss.localeCompare(right.targetBoss, "ko") ||
      right.updatedAt.localeCompare(left.updatedAt) ||
      left.slug.localeCompare(right.slug),
  );
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
