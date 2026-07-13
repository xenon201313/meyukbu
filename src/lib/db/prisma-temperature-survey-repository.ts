import {
  Prisma,
  type PrismaClient,
  type TemperatureSurveyInvitation as DatabaseTemperatureSurveyInvitation,
  type TemperatureSurveyResponse as DatabaseTemperatureSurveyResponse,
} from "@prisma/client";

import {
  isMesoongiExperienceScore,
  isMesoongiPunctualityScore,
  surveyTemperatureDelta,
  type MesoongiTemperatureSurveyInvitation,
  type MesoongiTemperatureSurveyResponse,
} from "@/domain/mesoongi-temperature-survey";
import { getPrismaClient } from "@/lib/db/prisma";
import {
  TemperatureSurveyInvitationConflictError,
  TemperatureSurveyInvitationExpiredError,
  TemperatureSurveyInvitationMismatchError,
  TemperatureSurveyInvitationNotFoundError,
  TemperatureSurveyInvitationRevokedError,
  TemperatureSurveyInvitationUsedError,
  type CreateTemperatureSurveyInvitationInput,
  type SubmitTemperatureSurveyInput,
  type TemperatureSurveyAggregate,
  type TemperatureSurveyRepository,
} from "@/lib/db/temperature-survey-repository";

type Database = PrismaClient | Prisma.TransactionClient;

function dateFromIso(value: string, fieldName: string): Date {
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) {
    throw new TypeError(`${fieldName} must be a valid ISO-8601 date.`);
  }
  return date;
}

function invitationFromDatabase(
  invitation: DatabaseTemperatureSurveyInvitation,
  characterOcid: string,
): MesoongiTemperatureSurveyInvitation {
  return {
    id: invitation.id,
    characterOcid,
    tokenHash: invitation.tokenHash,
    expiresAt: invitation.expiresAt.toISOString(),
    usedAt: invitation.usedAt?.toISOString() ?? null,
    revokedAt: invitation.revokedAt?.toISOString() ?? null,
    createdAt: invitation.createdAt.toISOString(),
  };
}

function responseFromDatabase(
  response: DatabaseTemperatureSurveyResponse,
  characterOcid: string,
): MesoongiTemperatureSurveyResponse {
  if (
    !isMesoongiExperienceScore(response.experienceScore) ||
    !isMesoongiExperienceScore(response.proficiencyScore) ||
    !isMesoongiPunctualityScore(response.punctualityScore)
  ) {
    throw new TypeError("Stored temperature survey response has invalid scores.");
  }
  return {
    id: response.id,
    invitationId: response.invitationId,
    characterOcid,
    experienceScore: response.experienceScore,
    proficiencyScore: response.proficiencyScore,
    punctualityScore: response.punctualityScore,
    totalDelta: response.totalDelta,
    createdAt: response.createdAt.toISOString(),
  };
}

function assertValidScores(input: SubmitTemperatureSurveyInput): void {
  if (
    !isMesoongiExperienceScore(input.experienceScore) ||
    !isMesoongiExperienceScore(input.proficiencyScore) ||
    !isMesoongiPunctualityScore(input.punctualityScore)
  ) {
    throw new TypeError("Temperature survey answers are outside their allowed ranges.");
  }
}

function isKnownRequestError(error: unknown, code: string): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === code;
}

/** Prisma implementation that atomically consumes one-time anonymous survey invitations. */
export class PrismaTemperatureSurveyRepository implements TemperatureSurveyRepository {
  constructor(private readonly prisma: PrismaClient = getPrismaClient()) {}

  async createInvitation(
    input: CreateTemperatureSurveyInvitationInput,
  ): Promise<MesoongiTemperatureSurveyInvitation> {
    const expiresAt = dateFromIso(input.expiresAt, "expiresAt");
    try {
      return await this.prisma.$transaction(async (database) => {
        const character = await database.character.findUnique({
          where: { ocid: input.characterOcid },
          select: { id: true, ocid: true },
        });
        if (!character) {
          throw new TemperatureSurveyInvitationMismatchError();
        }
        const invitation = await database.temperatureSurveyInvitation.create({
          data: {
            id: input.id,
            characterId: character.id,
            tokenHash: input.tokenHash,
            expiresAt,
          },
        });
        return invitationFromDatabase(invitation, character.ocid);
      });
    } catch (error) {
      if (isKnownRequestError(error, "P2002")) {
        throw new TemperatureSurveyInvitationConflictError();
      }
      throw error;
    }
  }

  async submitSurvey(input: SubmitTemperatureSurveyInput): Promise<MesoongiTemperatureSurveyResponse> {
    assertValidScores(input);
    return this.runSubmissionWithRetry(input);
  }

  async getAggregate(characterOcid: string): Promise<TemperatureSurveyAggregate> {
    const character = await this.prisma.character.findUnique({
      where: { ocid: characterOcid },
      select: { id: true },
    });
    if (!character) {
      return { responseCount: 0, totalDelta: 0 };
    }
    const aggregate = await this.prisma.temperatureSurveyResponse.aggregate({
      where: { characterId: character.id },
      _count: { id: true },
      _sum: { totalDelta: true },
    });
    return {
      responseCount: aggregate._count.id,
      totalDelta: aggregate._sum.totalDelta ?? 0,
    };
  }

  private async runSubmissionWithRetry(
    input: SubmitTemperatureSurveyInput,
  ): Promise<MesoongiTemperatureSurveyResponse> {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        return await this.prisma.$transaction(
          (database) => this.consumeInvitationAndCreateResponse(database, input),
          { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
        );
      } catch (error) {
        if (isKnownRequestError(error, "P2002")) {
          throw new TemperatureSurveyInvitationConflictError();
        }
        if (isKnownRequestError(error, "P2034") && attempt === 0) {
          continue;
        }
        throw error;
      }
    }
    throw new TemperatureSurveyInvitationUsedError();
  }

  private async consumeInvitationAndCreateResponse(
    database: Database,
    input: SubmitTemperatureSurveyInput,
  ): Promise<MesoongiTemperatureSurveyResponse> {
    const now = new Date();
    const invitation = await database.temperatureSurveyInvitation.findUnique({
      where: { tokenHash: input.invitationTokenHash },
    });
    if (!invitation) {
      throw new TemperatureSurveyInvitationNotFoundError();
    }
    const character = await database.character.findUnique({
      where: { ocid: input.characterOcid },
      select: { id: true, ocid: true },
    });
    if (!character || invitation.characterId !== character.id) {
      throw new TemperatureSurveyInvitationMismatchError();
    }
    if (invitation.revokedAt) {
      throw new TemperatureSurveyInvitationRevokedError();
    }
    if (invitation.usedAt) {
      throw new TemperatureSurveyInvitationUsedError();
    }
    if (invitation.expiresAt <= now) {
      throw new TemperatureSurveyInvitationExpiredError();
    }

    const consumed = await database.temperatureSurveyInvitation.updateMany({
      where: {
        id: invitation.id,
        characterId: character.id,
        tokenHash: input.invitationTokenHash,
        usedAt: null,
        revokedAt: null,
        expiresAt: { gt: now },
      },
      data: { usedAt: now },
    });
    if (consumed.count !== 1) {
      throw new TemperatureSurveyInvitationUsedError();
    }

    const totalDelta = surveyTemperatureDelta(
      input.experienceScore,
      input.proficiencyScore,
      input.punctualityScore,
    );
    const response = await database.temperatureSurveyResponse.create({
      data: {
        id: input.id,
        characterId: character.id,
        invitationId: invitation.id,
        experienceScore: input.experienceScore,
        proficiencyScore: input.proficiencyScore,
        punctualityScore: input.punctualityScore,
        totalDelta,
        createdAt: now,
      },
    });
    return responseFromDatabase(response, character.ocid);
  }
}
