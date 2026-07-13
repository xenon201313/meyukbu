import { randomUUID } from "node:crypto";

import {
  mesoongiTemperatureBaselineCelsius,
  mesoongiTemperatureMaxCelsius,
  mesoongiTemperatureMinCelsius,
  toMesoongiTemperatureCelsius,
  type IssuedMesoongiTemperatureSurveyInvitation,
  type MesoongiExperienceScore,
  type MesoongiPunctualityScore,
  type MesoongiTemperatureSurveyResponse,
  type PublicMesoongiTemperatureSummary,
} from "@/domain/mesoongi-temperature-survey";
import type { ResumeRecord } from "@/domain/resume";
import { createEditToken, hashEditToken, verifyEditToken } from "@/lib/auth/edit-token";
import {
  getTemperatureSurveyRepository,
  type TemperatureSurveyRepository,
} from "@/lib/db/temperature-survey-repository";
import { getResumeRepository, type ResumeRepository } from "@/lib/db/resume-repository";

const invitationLifetimeMs = 7 * 24 * 60 * 60 * 1000;

export class MesoongiTemperatureSurveyNotFoundError extends Error {}
export class MesoongiTemperatureSurveyAuthorizationError extends Error {}
export class MesoongiTemperatureSurveyUnavailableError extends Error {}

export interface CreateMesoongiTemperatureSurveyInvitationDependencies {
  resumeRepository?: ResumeRepository;
  surveyRepository?: TemperatureSurveyRepository;
  now?: () => Date;
}

export interface SubmitMesoongiTemperatureSurveyInput {
  invitationToken: string;
  experienceScore: MesoongiExperienceScore;
  proficiencyScore: MesoongiExperienceScore;
  punctualityScore: MesoongiPunctualityScore;
}

export interface MesoongiTemperatureSurveyDependencies {
  resumeRepository?: ResumeRepository;
  surveyRepository?: TemperatureSurveyRepository;
}

function requirePublicResume(record: ResumeRecord | null): ResumeRecord {
  if (!record || record.visibility !== "PUBLIC") {
    throw new MesoongiTemperatureSurveyNotFoundError();
  }
  return record;
}

function isUnavailableSurveyInvitationError(error: unknown): boolean {
  if (typeof error !== "object" || error === null || !("code" in error)) {
    return false;
  }
  const code = error.code;
  return (
    code === "TEMPERATURE_SURVEY_INVITATION_NOT_FOUND" ||
    code === "TEMPERATURE_SURVEY_INVITATION_MISMATCH" ||
    code === "TEMPERATURE_SURVEY_INVITATION_EXPIRED" ||
    code === "TEMPERATURE_SURVEY_INVITATION_USED" ||
    code === "TEMPERATURE_SURVEY_INVITATION_REVOKED" ||
    code === "TEMPERATURE_SURVEY_INVITATION_CONFLICT"
  );
}

/**
 * Normalizes expected invitation failures without relying on `instanceof`.
 * Next can load route and repository modules in separate bundles, where an
 * error class may have a different prototype despite sharing the same code.
 */
function mapRepositoryError(error: unknown): never {
  if (isUnavailableSurveyInvitationError(error)) {
    throw new MesoongiTemperatureSurveyUnavailableError();
  }
  throw error;
}

/**
 * Creates a one-time, seven-day anonymous survey link for the target character.
 * The invite is character-scoped instead of resume-version-scoped so responses
 * remain attached to the character when the owner creates another resume.
 */
export async function createMesoongiTemperatureSurveyInvitation(
  slug: string,
  ownerEditToken: string | undefined,
  dependencies: CreateMesoongiTemperatureSurveyInvitationDependencies = {},
): Promise<IssuedMesoongiTemperatureSurveyInvitation> {
  const resumeRepository = dependencies.resumeRepository ?? getResumeRepository();
  const surveyRepository = dependencies.surveyRepository ?? getTemperatureSurveyRepository();
  const target = requirePublicResume(await resumeRepository.findBySlug(slug));
  if (!verifyEditToken(ownerEditToken, target.editTokenHash)) {
    throw new MesoongiTemperatureSurveyAuthorizationError();
  }

  const issuedAt = dependencies.now?.() ?? new Date();
  const rawToken = createEditToken();
  const invitation = await surveyRepository.createInvitation({
    id: randomUUID(),
    characterOcid: target.characterOcid,
    tokenHash: hashEditToken(rawToken),
    expiresAt: new Date(issuedAt.getTime() + invitationLifetimeMs).toISOString(),
  });

  return {
    invitation: {
      id: invitation.id,
      characterOcid: invitation.characterOcid,
      expiresAt: invitation.expiresAt,
      usedAt: invitation.usedAt,
      revokedAt: invitation.revokedAt,
      createdAt: invitation.createdAt,
    },
    rawToken,
  };
}

/**
 * Saves an anonymous response. No caller identity or edit-token is accepted,
 * and the storage input contains no reviewer identity fields.
 */
export async function submitMesoongiTemperatureSurvey(
  targetSlug: string,
  input: SubmitMesoongiTemperatureSurveyInput,
  dependencies: MesoongiTemperatureSurveyDependencies = {},
): Promise<MesoongiTemperatureSurveyResponse> {
  const resumeRepository = dependencies.resumeRepository ?? getResumeRepository();
  const surveyRepository = dependencies.surveyRepository ?? getTemperatureSurveyRepository();
  const target = requirePublicResume(await resumeRepository.findBySlug(targetSlug));

  try {
    return await surveyRepository.submitSurvey({
      id: randomUUID(),
      characterOcid: target.characterOcid,
      experienceScore: input.experienceScore,
      proficiencyScore: input.proficiencyScore,
      punctualityScore: input.punctualityScore,
      invitationTokenHash: hashEditToken(input.invitationToken),
    });
  } catch (error) {
    return mapRepositoryError(error);
  }
}

/**
 * Returns only a bounded character-wide aggregate. Individual answers and all
 * reviewer identity/detail remain private, including on copied resumes.
 */
export async function getPublicMesoongiTemperatureSummary(
  target: ResumeRecord,
  dependencies: Pick<MesoongiTemperatureSurveyDependencies, "surveyRepository"> = {},
): Promise<PublicMesoongiTemperatureSummary> {
  if (target.visibility !== "PUBLIC") {
    throw new MesoongiTemperatureSurveyNotFoundError();
  }
  const surveyRepository = dependencies.surveyRepository ?? getTemperatureSurveyRepository();
  const aggregate = await surveyRepository.getAggregate(target.characterOcid);
  return {
    temperatureCelsius: toMesoongiTemperatureCelsius(aggregate.totalDelta),
    responseCount: aggregate.responseCount,
    baselineCelsius: mesoongiTemperatureBaselineCelsius,
    minCelsius: mesoongiTemperatureMinCelsius,
    maxCelsius: mesoongiTemperatureMaxCelsius,
  };
}
