import type {
  AvailabilityMode,
  AvailabilitySlot,
  PartySize,
  PartyType,
  ResumeRole,
  TargetBossCadence,
  VoiceChat,
  WorldTransferAvailability,
} from "@/domain/resume";
import type { PartyWorldGroup } from "@/domain/party-world";

/** A post can recruit members or advertise that its author is looking for a party. */
export const partyPostKindValues = ["RECRUITING", "LOOKING"] as const;
export type PartyPostKind = (typeof partyPostKindValues)[number];

/** A post is discoverable only while it is open and its pinned resume is eligible. */
export const partyPostStatusValues = ["OPEN", "CLOSED"] as const;
export type PartyPostStatus = (typeof partyPostStatusValues)[number];

/** An application is intentionally a small workflow, not a chat or reputation system. */
export const partyApplicationStatusValues = ["PENDING", "ACCEPTED", "DECLINED"] as const;
export type PartyApplicationStatus = (typeof partyApplicationStatusValues)[number];

export const partyDecisionValues = ["ACCEPT", "DECLINE"] as const;
export type PartyDecision = (typeof partyDecisionValues)[number];

export const partyPostKindLabels: Record<PartyPostKind, string> = {
  RECRUITING: "파티원 모집",
  LOOKING: "파티 찾기",
};

export const partyPostStatusLabels: Record<PartyPostStatus, string> = {
  OPEN: "모집 중",
  CLOSED: "마감",
};

export const partyApplicationStatusLabels: Record<PartyApplicationStatus, string> = {
  PENDING: "지원 대기",
  ACCEPTED: "수락됨",
  DECLINED: "거절됨",
};

/**
 * Immutable copy of one target from the resume version that created a post.
 * The multiplier is author-provided context and must never become an automatic
 * eligibility or ranking signal.
 */
export interface PartyPostTarget {
  id: string;
  postId: string;
  /** Internal stable key used for duplicate prevention and resume-target matching. */
  sourceBossKey: string;
  sourceBossId: string | null;
  bossName: string;
  cadence: TargetBossCadence | null;
  bossMultiplierPercent: string | null;
  maxPartySize: PartySize;
  sortOrder: number;
}

/** The non-sensitive target fields rendered on public party-board cards. */
export interface PublicPartyPostTarget {
  bossName: string;
  cadence: TargetBossCadence | null;
  bossMultiplierPercent: string | null;
  maxPartySize: PartySize;
  sortOrder: number;
}

/** Stored party-board record; all resume data remains pinned by immutable version id. */
export interface PartyPost {
  id: string;
  slug: string;
  kind: PartyPostKind;
  status: PartyPostStatus;
  ownerResumeId: string;
  ownerResumeSlug: string;
  ownerResumeVersionId: string;
  ownerCharacterOcid: string;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
  targets: PartyPostTarget[];
}

/** Stored application. The applicant identity is used only for self/duplicate protection. */
export interface PartyApplication {
  id: string;
  postId: string;
  applicantResumeId: string;
  applicantResumeSlug: string;
  applicantResumeVersionId: string;
  applicantCharacterOcid: string;
  status: PartyApplicationStatus;
  /** Owner-only plain-text intent; it is never included on public list/detail DTOs. */
  message: string | null;
  createdAt: string;
  decidedAt: string | null;
}

/** Whitelisted resume data that may be used in a party-board view. */
export interface PartyResumeSummary {
  resumeSlug: string;
  versionNumber: number;
  characterName: string;
  worldName: string | null;
  /** Derived from the pinned API world; never supplied by the browser. */
  worldGroup: PartyWorldGroup | null;
  className: string | null;
  level: number | null;
  imageUrl: string | null;
  role: ResumeRole;
  partyType: PartyType;
  partySize: PartySize | null;
  availabilityMode: AvailabilityMode;
  availability: AvailabilitySlot[];
  voiceChat: VoiceChat;
  /** User-provided preference, distinct from the server-enforced world group. */
  worldTransferAvailability: WorldTransferAvailability | null;
}

/** Public party-board DTO. It deliberately has no contact, token, or survey-answer field. */
export interface PublicPartyPost {
  slug: string;
  kind: PartyPostKind;
  status: PartyPostStatus;
  targets: PublicPartyPostTarget[];
  owner: PartyResumeSummary;
  createdAt: string;
  expiresAt: string;
}

/** Owner-only applicant DTO. Contact fields and private resume JSON remain excluded. */
export interface PartyApplicationOwnerView {
  id: string;
  status: PartyApplicationStatus;
  message: string | null;
  createdAt: string;
  decidedAt: string | null;
  applicant: PartyResumeSummary | null;
}

export interface OwnerPartyPost extends PublicPartyPost {
  applications: PartyApplicationOwnerView[];
}
