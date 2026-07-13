import { randomUUID } from "node:crypto";

import type {
  IssuedMesoongiTemperatureInvitation,
  MesoongiTemperatureFeedback,
  MesoongiTemperatureTag,
  PublicMesoongiTemperatureFeedback,
} from "@/domain/mesoongi-temperature";
import type { ResumeRecord, ResumeVersion } from "@/domain/resume";
import { createEditToken, hashEditToken, verifyEditToken } from "@/lib/auth/edit-token";
import {
  getTemperatureRepository,
  TemperatureDuplicateReviewerError,
  TemperatureInvitationExpiredError,
  TemperatureInvitationMismatchError,
  TemperatureInvitationNotFoundError,
  TemperatureInvitationRevokedError,
  TemperatureInvitationUsedError,
  type TemperatureRepository,
} from "@/lib/db/temperature-repository";
import { getResumeRepository, type ResumeRepository } from "@/lib/db/resume-repository";

const invitationLifetimeMs = 7 * 24 * 60 * 60 * 1000;

export class MesoongiTemperatureNotFoundError extends Error {}
export class MesoongiTemperatureAuthorizationError extends Error {}
export class MesoongiTemperatureUnavailableError extends Error {}
export class MesoongiTemperatureSelfFeedbackError extends Error {}
export class MesoongiTemperatureDuplicateFeedbackError extends Error {}

export interface CreateMesoongiTemperatureInvitationDependencies {
  resumeRepository?: ResumeRepository;
  temperatureRepository?: TemperatureRepository;
  now?: () => Date;
}

export interface SubmitMesoongiTemperatureFeedbackInput {
  invitationToken: string;
  reviewerSlug: string;
  tags: readonly MesoongiTemperatureTag[];
}

export interface SubmitMesoongiTemperatureFeedbackDependencies {
  resumeRepository?: ResumeRepository;
  temperatureRepository?: TemperatureRepository;
}

function getCurrentVersion(record: ResumeRecord): ResumeVersion {
  const version = record.versions.find((candidate) => candidate.id === record.currentVersionId);
  if (!version) {
    throw new MesoongiTemperatureNotFoundError();
  }
  return version;
}

function requirePublicResume(record: ResumeRecord | null): ResumeRecord {
  if (!record || record.visibility !== "PUBLIC") {
    throw new MesoongiTemperatureNotFoundError();
  }
  return record;
}

function mapRepositoryError(error: unknown): never {
  if (error instanceof TemperatureDuplicateReviewerError) {
    throw new MesoongiTemperatureDuplicateFeedbackError();
  }
  if (
    error instanceof TemperatureInvitationNotFoundError ||
    error instanceof TemperatureInvitationMismatchError ||
    error instanceof TemperatureInvitationExpiredError ||
    error instanceof TemperatureInvitationUsedError ||
    error instanceof TemperatureInvitationRevokedError
  ) {
    throw new MesoongiTemperatureUnavailableError();
  }
  throw error;
}

/**
 * Creates a one-time, seven-day link for a party companion. The raw token is
 * returned only to the owner for delivery and persistence receives its hash.
 */
export async function createMesoongiTemperatureInvitation(
  slug: string,
  ownerEditToken: string | undefined,
  dependencies: CreateMesoongiTemperatureInvitationDependencies = {},
): Promise<IssuedMesoongiTemperatureInvitation> {
  const resumeRepository = dependencies.resumeRepository ?? getResumeRepository();
  const temperatureRepository = dependencies.temperatureRepository ?? getTemperatureRepository();
  const target = requirePublicResume(await resumeRepository.findBySlug(slug));
  if (!verifyEditToken(ownerEditToken, target.editTokenHash)) {
    throw new MesoongiTemperatureAuthorizationError();
  }
  const targetVersion = getCurrentVersion(target);
  const issuedAt = dependencies.now?.() ?? new Date();
  const rawToken = createEditToken();
  const invitation = await temperatureRepository.createInvitation({
    id: randomUUID(),
    resumeId: target.id,
    resumeVersionId: targetVersion.id,
    tokenHash: hashEditToken(rawToken),
    expiresAt: new Date(issuedAt.getTime() + invitationLifetimeMs).toISOString(),
  });

  return {
    invitation: {
      id: invitation.id,
      resumeId: invitation.resumeId,
      resumeVersionId: invitation.resumeVersionId,
      expiresAt: invitation.expiresAt,
      usedAt: invitation.usedAt,
      revokedAt: invitation.revokedAt,
      createdAt: invitation.createdAt,
    },
    rawToken,
  };
}

/**
 * Persists a non-anonymous, tag-only companion record. The reviewer's edit
 * token proves control of the linked public resume rather than proving game
 * account ownership or party participation.
 */
export async function submitMesoongiTemperatureFeedback(
  targetSlug: string,
  input: SubmitMesoongiTemperatureFeedbackInput,
  reviewerEditToken: string | undefined,
  dependencies: SubmitMesoongiTemperatureFeedbackDependencies = {},
): Promise<MesoongiTemperatureFeedback> {
  const resumeRepository = dependencies.resumeRepository ?? getResumeRepository();
  const temperatureRepository = dependencies.temperatureRepository ?? getTemperatureRepository();
  const target = requirePublicResume(await resumeRepository.findBySlug(targetSlug));
  const reviewer = requirePublicResume(await resumeRepository.findBySlug(input.reviewerSlug));

  if (!verifyEditToken(reviewerEditToken, reviewer.editTokenHash)) {
    throw new MesoongiTemperatureAuthorizationError();
  }
  if (target.characterOcid === reviewer.characterOcid) {
    throw new MesoongiTemperatureSelfFeedbackError();
  }

  const targetVersion = getCurrentVersion(target);
  const reviewerVersion = getCurrentVersion(reviewer);
  const reviewerProfile = reviewerVersion.snapshot.profile;

  try {
    return await temperatureRepository.submitFeedback({
      id: randomUUID(),
      resumeId: target.id,
      resumeVersionId: targetVersion.id,
      reviewerResumeId: reviewer.id,
      reviewerSlug: reviewer.slug,
      reviewerOcid: reviewer.characterOcid,
      reviewerName: reviewerProfile.characterName,
      reviewerWorldName: reviewerProfile.worldName,
      reviewerClassName: reviewerProfile.className,
      tags: [...input.tags],
      invitationTokenHash: hashEditToken(input.invitationToken),
    });
  } catch (error) {
    return mapRepositoryError(error);
  }
}

/**
 * Returns only published records for the exact immutable resume version.
 * Archived reviewer resumes are deliberately hidden from the public display.
 */
export async function getPublicMesoongiTemperatureFeedbacks(
  target: ResumeRecord,
  targetVersion: ResumeVersion,
  dependencies: { resumeRepository?: ResumeRepository; temperatureRepository?: TemperatureRepository } = {},
): Promise<PublicMesoongiTemperatureFeedback[]> {
  if (target.visibility !== "PUBLIC") {
    return [];
  }
  const resumeRepository = dependencies.resumeRepository ?? getResumeRepository();
  const temperatureRepository = dependencies.temperatureRepository ?? getTemperatureRepository();
  const feedbacks = await temperatureRepository.listByResumeVersion(targetVersion.id);
  const visibleFeedbacks = await Promise.all(
    feedbacks.map(async (feedback) => {
      const reviewer = await resumeRepository.findBySlug(feedback.reviewerSlug);
      if (
        !reviewer ||
        reviewer.visibility !== "PUBLIC" ||
        reviewer.id !== feedback.reviewerResumeId ||
        reviewer.characterOcid !== feedback.reviewerOcid
      ) {
        return null;
      }
      return {
        id: feedback.id,
        reviewerSlug: feedback.reviewerSlug,
        reviewerName: feedback.reviewerName,
        reviewerWorldName: feedback.reviewerWorldName,
        reviewerClassName: feedback.reviewerClassName,
        tags: feedback.tags,
        publishedAt: feedback.createdAt,
      };
    }),
  );
  return visibleFeedbacks.filter(
    (feedback): feedback is PublicMesoongiTemperatureFeedback => feedback !== null,
  );
}
