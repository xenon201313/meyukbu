import type {
  MesoongiExperienceScore,
  MesoongiTemperatureSurveyInvitation,
  MesoongiTemperatureSurveyResponse,
} from "@/domain/mesoongi-temperature-survey";
import {
  isMesoongiExperienceScore,
  isMesoongiPunctualityScore,
  surveyTemperatureDelta,
} from "@/domain/mesoongi-temperature-survey";
import { getEnvironment } from "@/lib/env";
import { PrismaTemperatureSurveyRepository } from "@/lib/db/prisma-temperature-survey-repository";

export type TemperatureSurveyRepositoryErrorCode =
  | "TEMPERATURE_SURVEY_INVITATION_NOT_FOUND"
  | "TEMPERATURE_SURVEY_INVITATION_MISMATCH"
  | "TEMPERATURE_SURVEY_INVITATION_EXPIRED"
  | "TEMPERATURE_SURVEY_INVITATION_USED"
  | "TEMPERATURE_SURVEY_INVITATION_REVOKED"
  | "TEMPERATURE_SURVEY_INVITATION_CONFLICT";

/** Base class for expected anonymous-survey persistence failures. */
export abstract class TemperatureSurveyRepositoryError extends Error {
  abstract readonly code: TemperatureSurveyRepositoryErrorCode;

  protected constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class TemperatureSurveyInvitationNotFoundError extends TemperatureSurveyRepositoryError {
  readonly code = "TEMPERATURE_SURVEY_INVITATION_NOT_FOUND" as const;

  constructor() {
    super("The temperature survey invitation was not found.");
  }
}

export class TemperatureSurveyInvitationMismatchError extends TemperatureSurveyRepositoryError {
  readonly code = "TEMPERATURE_SURVEY_INVITATION_MISMATCH" as const;

  constructor() {
    super("The temperature survey invitation does not match this character.");
  }
}

export class TemperatureSurveyInvitationExpiredError extends TemperatureSurveyRepositoryError {
  readonly code = "TEMPERATURE_SURVEY_INVITATION_EXPIRED" as const;

  constructor() {
    super("The temperature survey invitation has expired.");
  }
}

export class TemperatureSurveyInvitationUsedError extends TemperatureSurveyRepositoryError {
  readonly code = "TEMPERATURE_SURVEY_INVITATION_USED" as const;

  constructor() {
    super("The temperature survey invitation has already been used.");
  }
}

export class TemperatureSurveyInvitationRevokedError extends TemperatureSurveyRepositoryError {
  readonly code = "TEMPERATURE_SURVEY_INVITATION_REVOKED" as const;

  constructor() {
    super("The temperature survey invitation has been revoked.");
  }
}

export class TemperatureSurveyInvitationConflictError extends TemperatureSurveyRepositoryError {
  readonly code = "TEMPERATURE_SURVEY_INVITATION_CONFLICT" as const;

  constructor() {
    super("A conflicting temperature survey invitation or response exists.");
  }
}

export type CreateTemperatureSurveyInvitationInput = Pick<
  MesoongiTemperatureSurveyInvitation,
  "id" | "characterOcid" | "tokenHash" | "expiresAt"
>;

export type SubmitTemperatureSurveyInput = Pick<
  MesoongiTemperatureSurveyResponse,
  "id" | "characterOcid" | "experienceScore" | "proficiencyScore" | "punctualityScore"
> & {
  /** Hash of the fragment-delivered invite token; plaintext never reaches persistence. */
  invitationTokenHash: string;
};

/** Aggregate data is internal; callers expose only a bounded public summary. */
export interface TemperatureSurveyAggregate {
  responseCount: number;
  totalDelta: number;
}

/** Character-scoped storage for anonymous Mesoongi temperature surveys. */
export interface TemperatureSurveyRepository {
  createInvitation(
    input: CreateTemperatureSurveyInvitationInput,
  ): Promise<MesoongiTemperatureSurveyInvitation>;
  submitSurvey(input: SubmitTemperatureSurveyInput): Promise<MesoongiTemperatureSurveyResponse>;
  getAggregate(characterOcid: string): Promise<TemperatureSurveyAggregate>;
  reset?(): void;
}

type StoredInvitation = MesoongiTemperatureSurveyInvitation;
type StoredResponse = MesoongiTemperatureSurveyResponse;

function clone<T>(value: T): T {
  return structuredClone(value);
}

function nowIso(): string {
  return new Date().toISOString();
}

function assertValidDate(value: string, fieldName: string): void {
  if (Number.isNaN(Date.parse(value))) {
    throw new TypeError(`${fieldName} must be a valid ISO-8601 date.`);
  }
}

function assertValidScores(
  experienceScore: number,
  proficiencyScore: number,
  punctualityScore: number,
): asserts experienceScore is MesoongiExperienceScore & number {
  if (
    !isMesoongiExperienceScore(experienceScore) ||
    !isMesoongiExperienceScore(proficiencyScore) ||
    !isMesoongiPunctualityScore(punctualityScore)
  ) {
    throw new TypeError("Temperature survey answers are outside their allowed ranges.");
  }
}

function assertInvitationCanBeRedeemed(
  invitation: StoredInvitation,
  input: SubmitTemperatureSurveyInput,
  now: string,
): void {
  if (invitation.characterOcid !== input.characterOcid) {
    throw new TemperatureSurveyInvitationMismatchError();
  }
  if (invitation.revokedAt) {
    throw new TemperatureSurveyInvitationRevokedError();
  }
  if (invitation.usedAt) {
    throw new TemperatureSurveyInvitationUsedError();
  }
  if (Date.parse(invitation.expiresAt) <= Date.parse(now)) {
    throw new TemperatureSurveyInvitationExpiredError();
  }
}

/** In-process implementation for isolated tests and local mock development. */
export class InMemoryTemperatureSurveyRepository implements TemperatureSurveyRepository {
  private readonly invitationsById = new Map<string, StoredInvitation>();
  private readonly invitationIdByTokenHash = new Map<string, string>();
  private readonly responsesById = new Map<string, StoredResponse>();

  async createInvitation(
    input: CreateTemperatureSurveyInvitationInput,
  ): Promise<MesoongiTemperatureSurveyInvitation> {
    assertValidDate(input.expiresAt, "expiresAt");
    if (this.invitationsById.has(input.id) || this.invitationIdByTokenHash.has(input.tokenHash)) {
      throw new TemperatureSurveyInvitationConflictError();
    }
    const invitation: StoredInvitation = {
      ...input,
      usedAt: null,
      revokedAt: null,
      createdAt: nowIso(),
    };
    this.invitationsById.set(invitation.id, clone(invitation));
    this.invitationIdByTokenHash.set(invitation.tokenHash, invitation.id);
    return clone(invitation);
  }

  async submitSurvey(input: SubmitTemperatureSurveyInput): Promise<MesoongiTemperatureSurveyResponse> {
    assertValidScores(input.experienceScore, input.proficiencyScore, input.punctualityScore);
    const invitationId = this.invitationIdByTokenHash.get(input.invitationTokenHash);
    const invitation = invitationId ? this.invitationsById.get(invitationId) : undefined;
    if (!invitation) {
      throw new TemperatureSurveyInvitationNotFoundError();
    }
    const submittedAt = nowIso();
    assertInvitationCanBeRedeemed(invitation, input, submittedAt);
    if (this.responsesById.has(input.id)) {
      throw new TemperatureSurveyInvitationConflictError();
    }

    invitation.usedAt = submittedAt;
    const response: StoredResponse = {
      id: input.id,
      invitationId: invitation.id,
      characterOcid: input.characterOcid,
      experienceScore: input.experienceScore,
      proficiencyScore: input.proficiencyScore,
      punctualityScore: input.punctualityScore,
      totalDelta: surveyTemperatureDelta(
        input.experienceScore,
        input.proficiencyScore,
        input.punctualityScore,
      ),
      createdAt: submittedAt,
    };
    this.invitationsById.set(invitation.id, clone(invitation));
    this.responsesById.set(response.id, clone(response));
    return clone(response);
  }

  async getAggregate(characterOcid: string): Promise<TemperatureSurveyAggregate> {
    let responseCount = 0;
    let totalDelta = 0;
    for (const response of this.responsesById.values()) {
      if (response.characterOcid === characterOcid) {
        responseCount += 1;
        totalDelta += response.totalDelta;
      }
    }
    return { responseCount, totalDelta };
  }

  reset(): void {
    this.invitationsById.clear();
    this.invitationIdByTokenHash.clear();
    this.responsesById.clear();
  }
}

declare global {
  var meyukbuTemperatureSurveyRepository: InMemoryTemperatureSurveyRepository | undefined;
  var meyukbuPrismaTemperatureSurveyRepository: PrismaTemperatureSurveyRepository | undefined;
}

/** Selects persistent Prisma storage in deployment and isolated memory storage locally. */
export function getTemperatureSurveyRepository(): TemperatureSurveyRepository {
  const environment = getEnvironment();
  if (environment.MEYUKBU_STORAGE === "prisma") {
    if (!globalThis.meyukbuPrismaTemperatureSurveyRepository) {
      globalThis.meyukbuPrismaTemperatureSurveyRepository = new PrismaTemperatureSurveyRepository();
    }
    return globalThis.meyukbuPrismaTemperatureSurveyRepository;
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error("Production requires MEYUKBU_STORAGE=prisma.");
  }
  if (!globalThis.meyukbuTemperatureSurveyRepository) {
    globalThis.meyukbuTemperatureSurveyRepository = new InMemoryTemperatureSurveyRepository();
  }
  return globalThis.meyukbuTemperatureSurveyRepository;
}

/** Clears the shared memory store so test cases do not leak anonymous responses. */
export function resetInMemoryTemperatureSurveyRepository(): void {
  globalThis.meyukbuTemperatureSurveyRepository?.reset();
}
