import { Prisma, type PrismaClient } from "@prisma/client";

import { getFreshnessStatus } from "@/domain/freshness";
import type { GuildObservation, ResumeRecord, ResumeVersion } from "@/domain/resume";
import { getEnvironment } from "@/lib/env";
import { contentHash } from "@/lib/hash";
import { parseStoredDraft, parseStoredProfile, toPrismaJson } from "@/lib/db/json";
import { getPrismaClient } from "@/lib/db/prisma";
import type { ResumeRepository } from "@/lib/db/resume-repository";

type Database = PrismaClient | Prisma.TransactionClient;

function providerForDatabase(provider: "mock" | "live") {
  return provider === "live" ? "NEXON_OPEN_API" : "MOCK";
}

function visibilityForDatabase(visibility: ResumeRecord["visibility"]) {
  return visibility === "ARCHIVED" ? "WITHDRAWN" : visibility;
}

function visibilityFromDatabase(visibility: "PUBLIC" | "UNLISTED" | "WITHDRAWN"): ResumeRecord["visibility"] {
  return visibility === "WITHDRAWN" ? "ARCHIVED" : visibility;
}

function freshnessForDatabase(fetchedAt: string) {
  const environment = getEnvironment();
  const status = getFreshnessStatus(fetchedAt, {
    freshHours: environment.PROFILE_FRESH_HOURS,
    expiryDays: environment.PROFILE_PUBLIC_EXPIRY_DAYS,
  });
  if (status === "fresh") {
    return "FRESH";
  }
  if (status === "stale") {
    return "STALE";
  }
  return "EXPIRED";
}

function datesForSnapshot(fetchedAt: string) {
  const environment = getEnvironment();
  const fetched = new Date(fetchedAt);
  return {
    freshUntil: new Date(fetched.getTime() + environment.PROFILE_FRESH_HOURS * 60 * 60 * 1000),
    expiresAt: new Date(fetched.getTime() + environment.PROFILE_PUBLIC_EXPIRY_DAYS * 24 * 60 * 60 * 1000),
  };
}

function asDate(value: string): Date {
  return new Date(value);
}

/** Prisma implementation for persistent, immutable resume records. */
export class PrismaResumeRepository implements ResumeRepository {
  constructor(private readonly prisma: PrismaClient = getPrismaClient()) {}

  async create(record: ResumeRecord): Promise<ResumeRecord> {
    await this.prisma.$transaction(async (database) => {
      const firstVersion = record.versions[0];
      if (!firstVersion) {
        throw new Error("A resume must contain a version.");
      }
      const profile = firstVersion.snapshot.profile;
      const character = await database.character.upsert({
        where: { ocid: record.characterOcid },
        create: {
          ocid: record.characterOcid,
          name: profile.characterName,
          worldName: profile.worldName,
          lastSeenAt: asDate(profile.fetchedAt),
        },
        update: {
          name: profile.characterName,
          worldName: profile.worldName,
          lastSeenAt: asDate(profile.fetchedAt),
        },
      });
      await database.resume.create({
        data: {
          id: record.id,
          slug: record.slug,
          characterId: character.id,
          editTokenHash: record.editTokenHash,
          visibility: visibilityForDatabase(record.visibility),
          createdAt: asDate(record.createdAt),
          updatedAt: asDate(record.updatedAt),
        },
      });
      for (const version of record.versions) {
        await this.persistVersion(database, character.id, version);
      }
      await database.resume.update({
        where: { id: record.id },
        data: { currentVersionId: record.currentVersionId },
      });
      await this.persistObservations(database, character.id, record.guildObservations);
    });
    return structuredClone(record);
  }

  async findBySlug(slug: string): Promise<ResumeRecord | null> {
    const record = await this.prisma.resume.findUnique({
      where: { slug },
      include: {
        character: true,
        versions: { include: { snapshot: true }, orderBy: { versionNumber: "asc" } },
      },
    });
    if (!record) {
      return null;
    }
    const observations = await this.prisma.guildObservation.findMany({
      where: { characterId: record.characterId },
      orderBy: { observedFrom: "asc" },
    });
    return {
      id: record.id,
      slug: record.slug,
      characterOcid: record.character.ocid,
      editTokenHash: record.editTokenHash,
      currentVersionId: record.currentVersionId ?? record.versions.at(-1)?.id ?? "",
      visibility: visibilityFromDatabase(record.visibility),
      versions: record.versions.map((version) => ({
        id: version.id,
        resumeId: version.resumeId,
        snapshot: {
          id: version.snapshot.id,
          profile: parseStoredProfile(version.snapshot.normalized),
          provider: version.snapshot.provider === "NEXON_OPEN_API" ? "live" : "mock",
          fetchedAt: version.snapshot.fetchedAt.toISOString(),
          sourceDate: version.snapshot.sourceDate,
          createdAt: version.snapshot.createdAt.toISOString(),
        },
        draft: parseStoredDraft(version.userInput),
        versionNumber: version.versionNumber,
        contentHash: version.contentHash,
        publishedAt: version.publishedAt.toISOString(),
      })),
      guildObservations: observations.map((observation) => ({
        id: observation.id,
        guildName: observation.guildName,
        observedFrom: observation.observedFrom.toISOString(),
        lastObservedAt: observation.lastObservedAt.toISOString(),
        observedTo: observation.observedTo?.toISOString() ?? null,
        sourceSnapshotId: observation.sourceSnapshotId,
      })),
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
    };
  }

  async slugExists(slug: string): Promise<boolean> {
    return Boolean(await this.prisma.resume.findUnique({ where: { slug }, select: { id: true } }));
  }

  async save(record: ResumeRecord): Promise<ResumeRecord> {
    const existing = await this.prisma.resume.findUnique({
      where: { slug: record.slug },
      select: { id: true, characterId: true },
    });
    if (!existing) {
      return this.create(record);
    }
    await this.prisma.$transaction(async (database) => {
      for (const version of record.versions) {
        const present = await database.resumeVersion.findUnique({
          where: { id: version.id },
          select: { id: true },
        });
        if (!present) {
          await this.persistVersion(database, existing.characterId, version);
        }
      }
      await database.resume.update({
        where: { id: existing.id },
        data: {
          currentVersionId: record.currentVersionId,
          visibility: visibilityForDatabase(record.visibility),
          updatedAt: asDate(record.updatedAt),
          withdrawnAt: record.visibility === "ARCHIVED" ? asDate(record.updatedAt) : null,
        },
      });
      await this.persistObservations(database, existing.characterId, record.guildObservations);
    });
    return structuredClone(record);
  }

  private async persistVersion(
    database: Database,
    characterId: string,
    version: ResumeVersion,
  ): Promise<void> {
    const snapshot = version.snapshot;
    const existingSnapshot = await database.profileSnapshot.findUnique({
      where: { id: snapshot.id },
      select: { id: true },
    });
    if (!existingSnapshot) {
      const { freshUntil, expiresAt } = datesForSnapshot(snapshot.fetchedAt);
      await database.profileSnapshot.create({
        data: {
          id: snapshot.id,
          characterId,
          fetchedAt: asDate(snapshot.fetchedAt),
          sourceDate: snapshot.sourceDate,
          provider: providerForDatabase(snapshot.provider),
          normalized: toPrismaJson(snapshot.profile),
          rawAvailability: toPrismaJson(snapshot.profile.rawAvailability),
          freshness: freshnessForDatabase(snapshot.fetchedAt),
          freshUntil,
          expiresAt,
          contentHash: contentHash(snapshot.profile),
          createdAt: asDate(snapshot.createdAt),
        },
      });
    }
    await database.resumeVersion.create({
      data: {
        id: version.id,
        resumeId: version.resumeId,
        snapshotId: snapshot.id,
        userInput: toPrismaJson(version.draft),
        theme: version.draft.theme,
        contentHash: version.contentHash,
        versionNumber: version.versionNumber,
        publishedAt: asDate(version.publishedAt),
      },
    });
  }

  private async persistObservations(
    database: Database,
    characterId: string,
    observations: GuildObservation[],
  ): Promise<void> {
    for (const observation of observations) {
      await database.guildObservation.upsert({
        where: { id: observation.id },
        create: {
          id: observation.id,
          characterId,
          guildName: observation.guildName,
          observedFrom: asDate(observation.observedFrom),
          lastObservedAt: asDate(observation.lastObservedAt),
          observedTo: observation.observedTo ? asDate(observation.observedTo) : null,
          sourceSnapshotId: observation.sourceSnapshotId,
        },
        update: {
          guildName: observation.guildName,
          lastObservedAt: asDate(observation.lastObservedAt),
          observedTo: observation.observedTo ? asDate(observation.observedTo) : null,
          sourceSnapshotId: observation.sourceSnapshotId,
        },
      });
    }
  }
}
