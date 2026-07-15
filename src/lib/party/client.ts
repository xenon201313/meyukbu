import type { ResumeBossTarget, TargetBossCadence } from "@/domain/resume";

export interface PartyOwnedResume {
  slug: string;
  characterName: string;
  targetBoss: string;
  targetBossCadence: TargetBossCadence | null;
  bossTargets: ResumeBossTarget[];
  visibility: "PUBLIC" | "UNLISTED" | "ARCHIVED";
  fetchedAt: string;
  /** Calculated by the server with the deployment's freshness policy. */
  partyEligible: boolean;
}

export interface PartyOwnerApplication {
  id: string;
  status: "PENDING" | "ACCEPTED" | "DECLINED";
  message: string | null;
  createdAt: string;
  decidedAt: string | null;
  applicant: {
    resumeSlug: string;
    /** Immutable resume version chosen when this application was submitted. */
    versionNumber: number;
    characterName: string;
    worldName: string | null;
    className: string | null;
    level: number | null;
  } | null;
}

export interface PartyOwnerQueue {
  status: "OPEN" | "CLOSED";
  applications: PartyOwnerApplication[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isCadence(value: unknown): value is TargetBossCadence {
  return value === "WEEKLY" || value === "MONTHLY";
}

function isVisibility(value: unknown): value is PartyOwnedResume["visibility"] {
  return value === "PUBLIC" || value === "UNLISTED" || value === "ARCHIVED";
}

function isApplicationStatus(value: unknown): value is PartyOwnerApplication["status"] {
  return value === "PENDING" || value === "ACCEPTED" || value === "DECLINED";
}

function isPostStatus(value: unknown): value is PartyOwnerQueue["status"] {
  return value === "OPEN" || value === "CLOSED";
}

function isPositiveVersionNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

function parseBossTarget(value: unknown): ResumeBossTarget | null {
  if (!isRecord(value) || typeof value.bossName !== "string" || !value.bossName.trim()) {
    return null;
  }

  return {
    bossId: typeof value.bossId === "string" && value.bossId ? value.bossId : undefined,
    bossName: value.bossName,
    cadence: isCadence(value.cadence) ? value.cadence : undefined,
    bossMultiplierPercent:
      typeof value.bossMultiplierPercent === "string" && value.bossMultiplierPercent
        ? value.bossMultiplierPercent
        : undefined,
  };
}

function parseOwnedResume(value: unknown): PartyOwnedResume | null {
  if (
    !isRecord(value) ||
    typeof value.slug !== "string" ||
    typeof value.characterName !== "string" ||
    typeof value.targetBoss !== "string" ||
    typeof value.fetchedAt !== "string" ||
    typeof value.partyEligible !== "boolean" ||
    !isVisibility(value.visibility) ||
    !Array.isArray(value.bossTargets)
  ) {
    return null;
  }

  const bossTargets = value.bossTargets.flatMap((target) => {
    const parsed = parseBossTarget(target);
    return parsed ? [parsed] : [];
  });

  return {
    slug: value.slug,
    characterName: value.characterName,
    targetBoss: value.targetBoss,
    targetBossCadence: isCadence(value.targetBossCadence) ? value.targetBossCadence : null,
    bossTargets,
    visibility: value.visibility,
    fetchedAt: value.fetchedAt,
    partyEligible: value.partyEligible,
  };
}

/** Reads the private, per-edit-token resume list before using it in a client form. */
export function parseOwnedResumesPayload(value: unknown): PartyOwnedResume[] | null {
  if (!isRecord(value) || !Array.isArray(value.resumes)) {
    return null;
  }

  const resumes = value.resumes.flatMap((resume) => {
    const parsed = parseOwnedResume(resume);
    return parsed ? [parsed] : [];
  });
  return resumes.length === value.resumes.length ? resumes : null;
}

function parseApplicant(value: unknown): PartyOwnerApplication["applicant"] | undefined {
  if (value === null) {
    return null;
  }
  if (
    !isRecord(value) ||
    typeof value.resumeSlug !== "string" ||
    !isPositiveVersionNumber(value.versionNumber) ||
    typeof value.characterName !== "string"
  ) {
    return undefined;
  }

  return {
    resumeSlug: value.resumeSlug,
    versionNumber: value.versionNumber,
    characterName: value.characterName,
    worldName: typeof value.worldName === "string" ? value.worldName : null,
    className: typeof value.className === "string" ? value.className : null,
    level: typeof value.level === "number" && Number.isFinite(value.level) ? value.level : null,
  };
}

function parseOwnerApplication(value: unknown): PartyOwnerApplication | null {
  if (
    !isRecord(value) ||
    typeof value.id !== "string" ||
    !isApplicationStatus(value.status) ||
    typeof value.createdAt !== "string"
  ) {
    return null;
  }
  const applicant = parseApplicant(value.applicant);
  if (applicant === undefined) {
    return null;
  }

  return {
    id: value.id,
    status: value.status,
    message: typeof value.message === "string" ? value.message : null,
    createdAt: value.createdAt,
    decidedAt: typeof value.decidedAt === "string" ? value.decidedAt : null,
    applicant,
  };
}

/** Parses the owner-only response without trusting arbitrary JSON as a queue DTO. */
export function parsePartyOwnerQueuePayload(value: unknown): PartyOwnerQueue | null {
  if (
    !isRecord(value) ||
    !isRecord(value.post) ||
    !isPostStatus(value.post.status) ||
    !Array.isArray(value.post.applications)
  ) {
    return null;
  }

  const applications = value.post.applications.flatMap((application) => {
    const parsed = parseOwnerApplication(application);
    return parsed ? [parsed] : [];
  });
  return applications.length === value.post.applications.length
    ? { status: value.post.status, applications }
    : null;
}

/** Extracts a server error message while keeping an intentional fallback for malformed JSON. */
export function partyResponseMessage(value: unknown, fallback: string): string {
  return isRecord(value) && typeof value.message === "string" && value.message.trim()
    ? value.message
    : fallback;
}

/** Extracts the only value a successful post creation response needs to navigate safely. */
export function partyCreatedSlug(value: unknown): string | null {
  if (!isRecord(value) || !isRecord(value.post) || typeof value.post.slug !== "string") {
    return null;
  }
  return /^p-[A-Za-z0-9_-]{6,96}$/u.test(value.post.slug) ? value.post.slug : null;
}
