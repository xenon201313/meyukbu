import {
  Prisma,
  type PrismaClient,
  type TemperatureFeedback as DatabaseTemperatureFeedback,
  type TemperatureInvitation as DatabaseTemperatureInvitation,
} from "@prisma/client";

import {
  mesoongiTemperatureTagValues,
  type MesoongiTemperatureFeedback,
  type MesoongiTemperatureInvitation,
  type MesoongiTemperatureTag,
} from "@/domain/mesoongi-temperature";
import { getPrismaClient } from "@/lib/db/prisma";
import {
  TemperatureDuplicateReviewerError,
  TemperatureFeedbackForbiddenError,
  TemperatureFeedbackNotFoundError,
  TemperatureInvitationConflictError,
  TemperatureInvitationExpiredError,
  TemperatureInvitationMismatchError,
  TemperatureInvitationNotFoundError,
  TemperatureInvitationRevokedError,
  TemperatureInvitationUsedError,
  type CreateTemperatureInvitationInput,
  type ListTemperatureFeedbackOptions,
  type SubmitTemperatureFeedbackInput,
  type TemperatureRepository,
  type WithdrawTemperatureFeedbackInput,
} from "@/lib/db/temperature-repository";

type Database = PrismaClient | Prisma.TransactionClient;

const validTags = new Set<string>(mesoongiTemperatureTagValues);

function isTemperatureTag(value: unknown): value is MesoongiTemperatureTag {
  return typeof value === "string" && validTags.has(value);
}

function dateFromIso(value: string, fieldName: string): Date {
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) {
    throw new TypeError(`${fieldName} must be a valid ISO-8601 date.`);
  }
  return date;
}

function parseTags(value: Prisma.JsonValue): MesoongiTemperatureTag[] {
  if (!Array.isArray(value) || value.length < 1 || value.length > 3) {
    throw new TypeError("Stored temperature feedback tags are invalid.");
  }
  const tags: MesoongiTemperatureTag[] = [];
  for (const valueItem of value) {
    if (!isTemperatureTag(valueItem)) {
      throw new TypeError("Stored temperature feedback tags are invalid.");
    }
    tags.push(valueItem);
  }
  if (new Set(tags).size !== tags.length) {
    throw new TypeError("Stored temperature feedback tags are invalid.");
  }
  return tags;
}

function tagsForDatabase(tags: readonly MesoongiTemperatureTag[]): Prisma.InputJsonValue {
  if (tags.length < 1 || tags.length > 3 || new Set(tags).size !== tags.length) {
    throw new TypeError("Temperature feedback must contain one to three distinct tags.");
  }
  return [...tags];
}

function invitationFromDatabase(invitation: DatabaseTemperatureInvitation): MesoongiTemperatureInvitation {
  return {
    id: invitation.id,
    resumeId: invitation.resumeId,
    resumeVersionId: invitation.resumeVersionId,
    tokenHash: invitation.tokenHash,
    expiresAt: invitation.expiresAt.toISOString(),
    usedAt: invitation.usedAt?.toISOString() ?? null,
    revokedAt: invitation.revokedAt?.toISOString() ?? null,
    createdAt: invitation.createdAt.toISOString(),
  };
}

function feedbackFromDatabase(feedback: DatabaseTemperatureFeedback): MesoongiTemperatureFeedback {
  return {
    id: feedback.id,
    invitationId: feedback.invitationId,
    resumeId: feedback.resumeId,
    resumeVersionId: feedback.resumeVersionId,
    reviewerResumeId: feedback.reviewerResumeId,
    reviewerSlug: feedback.reviewerSlug,
    reviewerOcid: feedback.reviewerOcid,
    reviewerName: feedback.reviewerName,
    reviewerWorldName: feedback.reviewerWorldName,
    reviewerClassName: feedback.reviewerClassName,
    tags: parseTags(feedback.tags),
    status: feedback.status,
    createdAt: feedback.createdAt.toISOString(),
    withdrawnAt: feedback.withdrawnAt?.toISOString() ?? null,
  };
}

function assertInvitationCanBeRedeemed(
  invitation: DatabaseTemperatureInvitation,
  input: SubmitTemperatureFeedbackInput,
  now: Date,
): void {
  if (invitation.resumeId !== input.resumeId || invitation.resumeVersionId !== input.resumeVersionId) {
    throw new TemperatureInvitationMismatchError();
  }
  if (invitation.revokedAt) {
    throw new TemperatureInvitationRevokedError();
  }
  if (invitation.usedAt) {
    throw new TemperatureInvitationUsedError();
  }
  if (invitation.expiresAt <= now) {
    throw new TemperatureInvitationExpiredError();
  }
}

function isKnownRequestError(error: unknown, code: string): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === code;
}

/** Prisma implementation that atomically consumes one-time feedback invitations. */
export class PrismaTemperatureRepository implements TemperatureRepository {
  constructor(private readonly prisma: PrismaClient = getPrismaClient()) {}

  async createInvitation(input: CreateTemperatureInvitationInput): Promise<MesoongiTemperatureInvitation> {
    const expiresAt = dateFromIso(input.expiresAt, "expiresAt");
    try {
      const invitation = await this.prisma.$transaction(async (database) => {
        const version = await database.resumeVersion.findFirst({
          where: { id: input.resumeVersionId, resumeId: input.resumeId },
          select: { id: true },
        });
        if (!version) {
          throw new TemperatureInvitationMismatchError();
        }
        return database.temperatureInvitation.create({
          data: {
            id: input.id,
            resumeId: input.resumeId,
            resumeVersionId: input.resumeVersionId,
            tokenHash: input.tokenHash,
            expiresAt,
          },
        });
      });
      return invitationFromDatabase(invitation);
    } catch (error) {
      if (isKnownRequestError(error, "P2002")) {
        throw new TemperatureInvitationConflictError();
      }
      throw error;
    }
  }

  async submitFeedback(input: SubmitTemperatureFeedbackInput): Promise<MesoongiTemperatureFeedback> {
    tagsForDatabase(input.tags);
    return this.runSubmissionWithRetry(input);
  }

  async listByResumeVersion(
    resumeVersionId: string,
    options: ListTemperatureFeedbackOptions = {},
  ): Promise<MesoongiTemperatureFeedback[]> {
    const feedbacks = await this.prisma.temperatureFeedback.findMany({
      where: {
        resumeVersionId,
        ...(options.includeWithdrawn ? {} : { status: "PUBLISHED" }),
      },
      orderBy: { createdAt: "desc" },
    });
    return feedbacks.map(feedbackFromDatabase);
  }

  async withdrawFeedback(input: WithdrawTemperatureFeedbackInput): Promise<MesoongiTemperatureFeedback> {
    return this.prisma.$transaction(async (database) => {
      const feedback = await database.temperatureFeedback.findUnique({ where: { id: input.feedbackId } });
      if (!feedback) {
        throw new TemperatureFeedbackNotFoundError();
      }
      if (feedback.reviewerResumeId !== input.reviewerResumeId) {
        throw new TemperatureFeedbackForbiddenError();
      }
      if (feedback.status === "WITHDRAWN") {
        return feedbackFromDatabase(feedback);
      }
      const withdrawn = await database.temperatureFeedback.update({
        where: { id: feedback.id },
        data: { status: "WITHDRAWN", withdrawnAt: new Date() },
      });
      return feedbackFromDatabase(withdrawn);
    });
  }

  private async runSubmissionWithRetry(
    input: SubmitTemperatureFeedbackInput,
  ): Promise<MesoongiTemperatureFeedback> {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        return await this.prisma.$transaction(
          (database) => this.consumeInvitationAndCreateFeedback(database, input),
          { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
        );
      } catch (error) {
        if (isKnownRequestError(error, "P2002")) {
          throw new TemperatureDuplicateReviewerError();
        }
        if (isKnownRequestError(error, "P2034") && attempt === 0) {
          continue;
        }
        throw error;
      }
    }
    throw new TemperatureInvitationUsedError();
  }

  private async consumeInvitationAndCreateFeedback(
    database: Database,
    input: SubmitTemperatureFeedbackInput,
  ): Promise<MesoongiTemperatureFeedback> {
    const now = new Date();
    const invitation = await database.temperatureInvitation.findUnique({
      where: { tokenHash: input.invitationTokenHash },
    });
    if (!invitation) {
      throw new TemperatureInvitationNotFoundError();
    }
    assertInvitationCanBeRedeemed(invitation, input, now);

    const duplicate = await database.temperatureFeedback.findUnique({
      where: {
        resumeId_reviewerOcid: {
          resumeId: input.resumeId,
          reviewerOcid: input.reviewerOcid,
        },
      },
      select: { id: true },
    });
    if (duplicate) {
      throw new TemperatureDuplicateReviewerError();
    }

    const consumed = await database.temperatureInvitation.updateMany({
      where: {
        id: invitation.id,
        resumeId: input.resumeId,
        resumeVersionId: input.resumeVersionId,
        tokenHash: input.invitationTokenHash,
        usedAt: null,
        revokedAt: null,
        expiresAt: { gt: now },
      },
      data: { usedAt: now },
    });
    if (consumed.count !== 1) {
      throw new TemperatureInvitationUsedError();
    }

    const feedback = await database.temperatureFeedback.create({
      data: {
        id: input.id,
        invitationId: invitation.id,
        resumeId: input.resumeId,
        resumeVersionId: input.resumeVersionId,
        reviewerResumeId: input.reviewerResumeId,
        reviewerSlug: input.reviewerSlug,
        reviewerOcid: input.reviewerOcid,
        reviewerName: input.reviewerName,
        reviewerWorldName: input.reviewerWorldName,
        reviewerClassName: input.reviewerClassName,
        tags: tagsForDatabase(input.tags),
        status: "PUBLISHED",
        createdAt: now,
      },
    });
    return feedbackFromDatabase(feedback);
  }
}
