import type {
  FeedbackStatus,
  MesoongiTemperatureFeedback,
  MesoongiTemperatureInvitation,
  MesoongiTemperatureTag,
} from "@/domain/mesoongi-temperature";
import { mesoongiTemperatureTagValues } from "@/domain/mesoongi-temperature";
import { getEnvironment } from "@/lib/env";
import { PrismaTemperatureRepository } from "@/lib/db/prisma-temperature-repository";

export type TemperatureRepositoryErrorCode =
  | "TEMPERATURE_INVITATION_NOT_FOUND"
  | "TEMPERATURE_INVITATION_MISMATCH"
  | "TEMPERATURE_INVITATION_EXPIRED"
  | "TEMPERATURE_INVITATION_USED"
  | "TEMPERATURE_INVITATION_REVOKED"
  | "TEMPERATURE_INVITATION_CONFLICT"
  | "TEMPERATURE_DUPLICATE_REVIEWER"
  | "TEMPERATURE_FEEDBACK_NOT_FOUND"
  | "TEMPERATURE_FEEDBACK_FORBIDDEN";

/** Base class for expected, safely mappable temperature-storage failures. */
export abstract class TemperatureRepositoryError extends Error {
  abstract readonly code: TemperatureRepositoryErrorCode;

  protected constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class TemperatureInvitationNotFoundError extends TemperatureRepositoryError {
  readonly code = "TEMPERATURE_INVITATION_NOT_FOUND" as const;

  constructor() {
    super("The temperature invitation was not found.");
  }
}

export class TemperatureInvitationMismatchError extends TemperatureRepositoryError {
  readonly code = "TEMPERATURE_INVITATION_MISMATCH" as const;

  constructor() {
    super("The temperature invitation does not match this resume version.");
  }
}

export class TemperatureInvitationExpiredError extends TemperatureRepositoryError {
  readonly code = "TEMPERATURE_INVITATION_EXPIRED" as const;

  constructor() {
    super("The temperature invitation has expired.");
  }
}

export class TemperatureInvitationUsedError extends TemperatureRepositoryError {
  readonly code = "TEMPERATURE_INVITATION_USED" as const;

  constructor() {
    super("The temperature invitation has already been used.");
  }
}

export class TemperatureInvitationRevokedError extends TemperatureRepositoryError {
  readonly code = "TEMPERATURE_INVITATION_REVOKED" as const;

  constructor() {
    super("The temperature invitation has been revoked.");
  }
}

export class TemperatureInvitationConflictError extends TemperatureRepositoryError {
  readonly code = "TEMPERATURE_INVITATION_CONFLICT" as const;

  constructor() {
    super("A temperature invitation with this identifier already exists.");
  }
}

export class TemperatureDuplicateReviewerError extends TemperatureRepositoryError {
  readonly code = "TEMPERATURE_DUPLICATE_REVIEWER" as const;

  constructor() {
    super("This reviewer has already left temperature feedback for the resume.");
  }
}

export class TemperatureFeedbackNotFoundError extends TemperatureRepositoryError {
  readonly code = "TEMPERATURE_FEEDBACK_NOT_FOUND" as const;

  constructor() {
    super("The temperature feedback was not found.");
  }
}

export class TemperatureFeedbackForbiddenError extends TemperatureRepositoryError {
  readonly code = "TEMPERATURE_FEEDBACK_FORBIDDEN" as const;

  constructor() {
    super("Only the reviewer can withdraw this temperature feedback.");
  }
}

export type CreateTemperatureInvitationInput = Pick<
  MesoongiTemperatureInvitation,
  "id" | "resumeId" | "resumeVersionId" | "tokenHash" | "expiresAt"
>;

export type SubmitTemperatureFeedbackInput = Pick<
  MesoongiTemperatureFeedback,
  | "id"
  | "resumeId"
  | "resumeVersionId"
  | "reviewerResumeId"
  | "reviewerSlug"
  | "reviewerOcid"
  | "reviewerName"
  | "reviewerWorldName"
  | "reviewerClassName"
  | "tags"
> & {
  /** Hash of the raw URL token; plaintext tokens never reach storage. */
  invitationTokenHash: string;
};

export interface WithdrawTemperatureFeedbackInput {
  feedbackId: string;
  reviewerResumeId: string;
}

export interface ListTemperatureFeedbackOptions {
  /** Withdrawn records are retained for audit but hidden by default. */
  includeWithdrawn?: boolean;
}

/** Persistence boundary for one-time, non-numeric 메붕이 온도 feedback. */
export interface TemperatureRepository {
  createInvitation(input: CreateTemperatureInvitationInput): Promise<MesoongiTemperatureInvitation>;
  submitFeedback(input: SubmitTemperatureFeedbackInput): Promise<MesoongiTemperatureFeedback>;
  listByResumeVersion(
    resumeVersionId: string,
    options?: ListTemperatureFeedbackOptions,
  ): Promise<MesoongiTemperatureFeedback[]>;
  withdrawFeedback(input: WithdrawTemperatureFeedbackInput): Promise<MesoongiTemperatureFeedback>;
  reset?(): void;
}

type StoredInvitation = MesoongiTemperatureInvitation;

type StoredFeedback = MesoongiTemperatureFeedback;

function clone<T>(value: T): T {
  return structuredClone(value);
}

function nowIso(): string {
  return new Date().toISOString();
}

function isTemperatureTag(value: unknown): value is MesoongiTemperatureTag {
  return typeof value === "string" && mesoongiTemperatureTagValues.some((tag) => tag === value);
}

function assertValidDate(value: string, fieldName: string): void {
  if (Number.isNaN(Date.parse(value))) {
    throw new TypeError(`${fieldName} must be a valid ISO-8601 date.`);
  }
}

function assertValidTags(tags: readonly MesoongiTemperatureTag[]): void {
  if (
    tags.length < 1 ||
    tags.length > 3 ||
    new Set(tags).size !== tags.length ||
    tags.some((tag) => !isTemperatureTag(tag))
  ) {
    throw new TypeError("Temperature feedback must contain one to three distinct tags.");
  }
}

function assertInvitationCanBeRedeemed(
  invitation: StoredInvitation,
  input: SubmitTemperatureFeedbackInput,
  now: string,
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
  if (Date.parse(invitation.expiresAt) <= Date.parse(now)) {
    throw new TemperatureInvitationExpiredError();
  }
}

/** In-process store for tests and local mock development. */
export class InMemoryTemperatureRepository implements TemperatureRepository {
  private readonly invitationsById = new Map<string, StoredInvitation>();
  private readonly invitationIdByTokenHash = new Map<string, string>();
  private readonly feedbackById = new Map<string, StoredFeedback>();
  private readonly feedbackIdByTargetReviewer = new Map<string, string>();

  async createInvitation(input: CreateTemperatureInvitationInput): Promise<MesoongiTemperatureInvitation> {
    assertValidDate(input.expiresAt, "expiresAt");
    if (this.invitationsById.has(input.id) || this.invitationIdByTokenHash.has(input.tokenHash)) {
      throw new TemperatureInvitationConflictError();
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

  async submitFeedback(input: SubmitTemperatureFeedbackInput): Promise<MesoongiTemperatureFeedback> {
    assertValidTags(input.tags);
    const invitationId = this.invitationIdByTokenHash.get(input.invitationTokenHash);
    const invitation = invitationId ? this.invitationsById.get(invitationId) : undefined;
    if (!invitation) {
      throw new TemperatureInvitationNotFoundError();
    }
    const submittedAt = nowIso();
    assertInvitationCanBeRedeemed(invitation, input, submittedAt);

    const targetReviewerKey = `${input.resumeId}:${input.reviewerOcid}`;
    if (this.feedbackIdByTargetReviewer.has(targetReviewerKey)) {
      throw new TemperatureDuplicateReviewerError();
    }
    if (this.feedbackById.has(input.id)) {
      throw new TemperatureInvitationConflictError();
    }

    invitation.usedAt = submittedAt;
    const feedback: StoredFeedback = {
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
      tags: [...input.tags],
      status: "PUBLISHED",
      createdAt: submittedAt,
      withdrawnAt: null,
    };
    this.invitationsById.set(invitation.id, clone(invitation));
    this.feedbackById.set(feedback.id, clone(feedback));
    this.feedbackIdByTargetReviewer.set(targetReviewerKey, feedback.id);
    return clone(feedback);
  }

  async listByResumeVersion(
    resumeVersionId: string,
    options: ListTemperatureFeedbackOptions = {},
  ): Promise<MesoongiTemperatureFeedback[]> {
    return [...this.feedbackById.values()]
      .filter(
        (feedback) =>
          feedback.resumeVersionId === resumeVersionId &&
          (options.includeWithdrawn || feedback.status === "PUBLISHED"),
      )
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
      .map(clone);
  }

  async withdrawFeedback(input: WithdrawTemperatureFeedbackInput): Promise<MesoongiTemperatureFeedback> {
    const feedback = this.feedbackById.get(input.feedbackId);
    if (!feedback) {
      throw new TemperatureFeedbackNotFoundError();
    }
    if (feedback.reviewerResumeId !== input.reviewerResumeId) {
      throw new TemperatureFeedbackForbiddenError();
    }
    if (feedback.status === "PUBLISHED") {
      feedback.status = "WITHDRAWN";
      feedback.withdrawnAt = nowIso();
      this.feedbackById.set(feedback.id, clone(feedback));
    }
    return clone(feedback);
  }

  reset(): void {
    this.invitationsById.clear();
    this.invitationIdByTokenHash.clear();
    this.feedbackById.clear();
    this.feedbackIdByTargetReviewer.clear();
  }
}

declare global {
  var meyukbuTemperatureRepository: InMemoryTemperatureRepository | undefined;
  var meyukbuPrismaTemperatureRepository: PrismaTemperatureRepository | undefined;
}

/** Selects persistent Prisma storage in deployment and isolated memory storage locally. */
export function getTemperatureRepository(): TemperatureRepository {
  const environment = getEnvironment();
  if (environment.MEYUKBU_STORAGE === "prisma") {
    if (!globalThis.meyukbuPrismaTemperatureRepository) {
      globalThis.meyukbuPrismaTemperatureRepository = new PrismaTemperatureRepository();
    }
    return globalThis.meyukbuPrismaTemperatureRepository;
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error("Production requires MEYUKBU_STORAGE=prisma.");
  }
  if (!globalThis.meyukbuTemperatureRepository) {
    globalThis.meyukbuTemperatureRepository = new InMemoryTemperatureRepository();
  }
  return globalThis.meyukbuTemperatureRepository;
}

/** Clears the shared memory store so test cases do not leak invitations or feedback. */
export function resetInMemoryTemperatureRepository(): void {
  globalThis.meyukbuTemperatureRepository?.reset();
}

export type { FeedbackStatus };
