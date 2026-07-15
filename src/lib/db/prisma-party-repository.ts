import {
  Prisma,
  type PartyApplication as DatabasePartyApplication,
  type PartyPost as DatabasePartyPost,
  type PartyPostTarget as DatabasePartyPostTarget,
  type PrismaClient,
} from "@prisma/client";

import type {
  PartyApplication,
  PartyApplicationStatus,
  PartyPost,
  PartyPostTarget,
  PartyPostStatus,
} from "@/domain/party";
import { getPrismaClient } from "@/lib/db/prisma";
import {
  DuplicatePartyApplicationError,
  PartyApplicationRepositoryNotFoundError,
  PartyApplicationRepositoryNotPendingError,
  PartyPostRepositoryClosedError,
  PartyPostRepositoryNotFoundError,
  type PartyRepository,
} from "@/lib/db/party-repository";

const partyPostWithTargets = {
  targets: { orderBy: { sortOrder: "asc" } },
} satisfies Prisma.PartyPostInclude;

type StoredPartyPost = Prisma.PartyPostGetPayload<{ include: typeof partyPostWithTargets }>;

function toDate(value: string, fieldName: string): Date {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.valueOf())) {
    throw new TypeError(`${fieldName} must be a valid ISO-8601 date.`);
  }
  return parsed;
}

function partyPostStatusFromDatabase(value: DatabasePartyPost["status"]): PartyPostStatus {
  return value === "OPEN" ? "OPEN" : "CLOSED";
}

function partyApplicationStatusFromDatabase(
  value: DatabasePartyApplication["status"],
): PartyApplicationStatus {
  if (value === "PENDING") {
    return "PENDING";
  }
  return value === "ACCEPTED" ? "ACCEPTED" : "DECLINED";
}

function partySizeFromDatabase(value: number): PartyPostTarget["maxPartySize"] {
  switch (value) {
    case 1:
    case 2:
    case 3:
    case 4:
    case 5:
    case 6:
      return value;
    default:
      throw new TypeError("Stored party post target has an invalid maximum party size.");
  }
}

function targetFromDatabase(target: DatabasePartyPostTarget): PartyPostTarget {
  return {
    id: target.id,
    postId: target.postId,
    sourceBossKey: target.sourceBossKey,
    sourceBossId: target.sourceBossId,
    bossName: target.bossName,
    cadence: target.cadence === "WEEKLY" || target.cadence === "MONTHLY" ? target.cadence : null,
    bossMultiplierPercent: target.bossMultiplierPercent,
    maxPartySize: partySizeFromDatabase(target.maxPartySize),
    sortOrder: target.sortOrder,
  };
}

function postFromDatabase(post: StoredPartyPost): PartyPost {
  return {
    id: post.id,
    slug: post.slug,
    kind: post.kind === "RECRUITING" ? "RECRUITING" : "LOOKING",
    status: partyPostStatusFromDatabase(post.status),
    ownerResumeId: post.ownerResumeId,
    ownerResumeSlug: post.ownerResumeSlug,
    ownerResumeVersionId: post.ownerResumeVersionId,
    ownerCharacterOcid: post.ownerCharacterOcid,
    expiresAt: post.expiresAt.toISOString(),
    createdAt: post.createdAt.toISOString(),
    updatedAt: post.updatedAt.toISOString(),
    closedAt: post.closedAt?.toISOString() ?? null,
    targets: post.targets.map(targetFromDatabase),
  };
}

function applicationFromDatabase(application: DatabasePartyApplication): PartyApplication {
  return {
    id: application.id,
    postId: application.postId,
    applicantResumeId: application.applicantResumeId,
    applicantResumeSlug: application.applicantResumeSlug,
    applicantResumeVersionId: application.applicantResumeVersionId,
    applicantCharacterOcid: application.applicantCharacterOcid,
    status: partyApplicationStatusFromDatabase(application.status),
    message: application.message,
    createdAt: application.createdAt.toISOString(),
    decidedAt: application.decidedAt?.toISOString() ?? null,
  };
}

function isKnownRequestError(error: unknown, code: string): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === code;
}

/** PostgreSQL persistence with unique character-per-post applications and atomic state transitions. */
export class PrismaPartyRepository implements PartyRepository {
  constructor(private readonly prisma: PrismaClient = getPrismaClient()) {}

  async createPost(post: PartyPost): Promise<PartyPost> {
    const stored = await this.prisma.partyPost.create({
      data: {
        id: post.id,
        slug: post.slug,
        kind: post.kind,
        status: post.status,
        ownerResumeId: post.ownerResumeId,
        ownerResumeSlug: post.ownerResumeSlug,
        ownerResumeVersionId: post.ownerResumeVersionId,
        ownerCharacterOcid: post.ownerCharacterOcid,
        expiresAt: toDate(post.expiresAt, "expiresAt"),
        createdAt: toDate(post.createdAt, "createdAt"),
        updatedAt: toDate(post.updatedAt, "updatedAt"),
        closedAt: post.closedAt ? toDate(post.closedAt, "closedAt") : null,
        targets: {
          create: post.targets.map((target) => ({
            id: target.id,
            sourceBossKey: target.sourceBossKey,
            sourceBossId: target.sourceBossId,
            bossName: target.bossName,
            cadence: target.cadence,
            bossMultiplierPercent: target.bossMultiplierPercent,
            maxPartySize: target.maxPartySize,
            sortOrder: target.sortOrder,
          })),
        },
      },
      include: partyPostWithTargets,
    });
    return postFromDatabase(stored);
  }

  async findPostBySlug(slug: string): Promise<PartyPost | null> {
    const post = await this.prisma.partyPost.findUnique({
      where: { slug },
      include: partyPostWithTargets,
    });
    return post ? postFromDatabase(post) : null;
  }

  async listPosts(): Promise<PartyPost[]> {
    const posts = await this.prisma.partyPost.findMany({
      include: partyPostWithTargets,
      orderBy: [{ createdAt: "desc" }, { slug: "asc" }],
    });
    return posts.map(postFromDatabase);
  }

  async createApplication(application: PartyApplication): Promise<PartyApplication> {
    const createdAt = toDate(application.createdAt, "createdAt");
    try {
      return await this.prisma.$transaction(async (database) => {
        const openPost = await database.partyPost.updateMany({
          where: {
            id: application.postId,
            status: "OPEN",
            expiresAt: { gt: createdAt },
          },
          data: { updatedAt: createdAt },
        });
        if (openPost.count !== 1) {
          const existing = await database.partyPost.findUnique({
            where: { id: application.postId },
            select: { id: true },
          });
          if (!existing) {
            throw new PartyPostRepositoryNotFoundError();
          }
          throw new PartyPostRepositoryClosedError();
        }
        const stored = await database.partyApplication.create({
          data: {
            id: application.id,
            postId: application.postId,
            applicantResumeId: application.applicantResumeId,
            applicantResumeSlug: application.applicantResumeSlug,
            applicantResumeVersionId: application.applicantResumeVersionId,
            applicantCharacterOcid: application.applicantCharacterOcid,
            status: application.status,
            message: application.message,
            createdAt,
            decidedAt: application.decidedAt ? toDate(application.decidedAt, "decidedAt") : null,
          },
        });
        return applicationFromDatabase(stored);
      });
    } catch (error) {
      if (isKnownRequestError(error, "P2002")) {
        throw new DuplicatePartyApplicationError();
      }
      throw error;
    }
  }

  async listApplications(postId: string): Promise<PartyApplication[]> {
    const applications = await this.prisma.partyApplication.findMany({
      where: { postId },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    });
    return applications.map(applicationFromDatabase);
  }

  async decideApplication(
    postId: string,
    applicationId: string,
    status: Extract<PartyApplicationStatus, "ACCEPTED" | "DECLINED">,
    decidedAt: string,
  ): Promise<PartyApplication> {
    const decisionTime = toDate(decidedAt, "decidedAt");
    return this.prisma.$transaction(async (database) => {
      const openPost = await database.partyPost.updateMany({
        where: {
          id: postId,
          status: "OPEN",
          expiresAt: { gt: decisionTime },
        },
        data: { updatedAt: decisionTime },
      });
      if (openPost.count !== 1) {
        const existing = await database.partyPost.findUnique({ where: { id: postId }, select: { id: true } });
        if (!existing) {
          throw new PartyPostRepositoryNotFoundError();
        }
        throw new PartyPostRepositoryClosedError();
      }
      const transitioned = await database.partyApplication.updateMany({
        where: { id: applicationId, postId, status: "PENDING" },
        data: { status, decidedAt: decisionTime },
      });
      if (transitioned.count !== 1) {
        const application = await database.partyApplication.findUnique({
          where: { id: applicationId },
          select: { postId: true, status: true },
        });
        if (!application || application.postId !== postId) {
          throw new PartyApplicationRepositoryNotFoundError();
        }
        throw new PartyApplicationRepositoryNotPendingError();
      }
      const updated = await database.partyApplication.findUnique({ where: { id: applicationId } });
      if (!updated) {
        throw new PartyApplicationRepositoryNotFoundError();
      }
      return applicationFromDatabase(updated);
    });
  }

  async closePost(postId: string, closedAt: string): Promise<PartyPost> {
    const closeTime = toDate(closedAt, "closedAt");
    const transitioned = await this.prisma.partyPost.updateMany({
      where: { id: postId, status: "OPEN" },
      data: { status: "CLOSED", closedAt: closeTime, updatedAt: closeTime },
    });
    const stored = await this.prisma.partyPost.findUnique({
      where: { id: postId },
      include: partyPostWithTargets,
    });
    if (!stored) {
      throw new PartyPostRepositoryNotFoundError();
    }
    if (transitioned.count === 0 && stored.status !== "CLOSED") {
      throw new PartyPostRepositoryClosedError();
    }
    return postFromDatabase(stored);
  }
}
