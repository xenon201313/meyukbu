import type { NormalizedCharacterProfile } from "@/domain/character";

export const resumeRoleValues = ["DAMAGE", "SUPPORT", "UTILITY", "OTHER"] as const;
export type ResumeRole = (typeof resumeRoleValues)[number];

export const partyTypeValues = ["FIXED", "SEMI_FIXED", "TEMPORARY", "PROGRESSION", "ACHIEVEMENT"] as const;
export type PartyType = (typeof partyTypeValues)[number];

export const voiceChatValues = ["AVAILABLE", "OPTIONAL", "UNAVAILABLE"] as const;
export type VoiceChat = (typeof voiceChatValues)[number];

/** Author-provided preference for cross-world party play (월드 통합). */
export const worldTransferAvailabilityValues = ["AVAILABLE", "UNAVAILABLE"] as const;
export type WorldTransferAvailability = (typeof worldTransferAvailabilityValues)[number];

export const availabilityModeValues = ["SCHEDULED", "NEGOTIABLE", "FLEXIBLE"] as const;
export type AvailabilityMode = (typeof availabilityModeValues)[number];

export const partySizeValues = [1, 2, 3, 4, 5, 6] as const;
export type PartySize = (typeof partySizeValues)[number];

export const contactTypeValues = ["DISCORD", "OPEN_CHAT", "COMMUNITY"] as const;
export type ContactType = (typeof contactTypeValues)[number];

export const targetBossCadenceValues = ["WEEKLY", "MONTHLY"] as const;
export type TargetBossCadence = (typeof targetBossCadenceValues)[number];

/** A resume can show at most six boss/multiplier pairs without overflowing its share card. */
export const maxResumeBossTargets = 6;

/**
 * One catalogued boss included in a multi-boss party application.
 *
 * New drafts always contain the catalog `bossId` and `cadence`. They are
 * optional here only so an immutable legacy version with a historical scalar
 * target can still be rendered after the catalog changes.
 */
export interface ResumeBossTarget {
  bossId?: string;
  bossName: string;
  cadence?: TargetBossCadence;
  /** User-provided MapleScouter-style percentage; never a service calculation. */
  bossMultiplierPercent?: string;
}

export interface AvailabilitySlot {
  days: string[];
  startTime: string;
  endTime: string;
  timezone: "Asia/Seoul";
}

export interface ResumeContact {
  type: ContactType;
  value: string;
  isPublic: boolean;
}

export interface ResumeDraft {
  /**
   * Ordered boss/multiplier pairs for new multi-boss resumes. The old scalar
   * fields below remain as a compatibility alias for the primary target until
   * every immutable historical version has naturally aged out.
   */
  bossTargets?: ResumeBossTarget[];
  /** @deprecated Use `bossTargets`; retained to render legacy immutable versions. */
  targetBoss: string;
  /** @deprecated Use `bossTargets`; retained to render legacy immutable versions. */
  targetBossCadence?: TargetBossCadence;
  /**
   * User-entered converted stat (환산), e.g. the MapleScouter figure. It is
   * displayed as USER_PROVIDED with an external verification link, never as
   * an API value or a service calculation.
   */
  convertedStat?: string;
  /** @deprecated Use the per-target multiplier in `bossTargets`. */
  bossMultiplierPercent?: string;
  role: ResumeRole;
  partyType: PartyType;
  /** Desired total party size. Older immutable versions may not contain this field. */
  partySize?: PartySize;
  /** Undefined legacy values are treated as SCHEDULED. */
  availabilityMode?: AvailabilityMode;
  availability: AvailabilitySlot[];
  voiceChat: VoiceChat;
  /** Optional for immutable legacy versions created before the field existed. */
  worldTransferAvailability?: WorldTransferAvailability;
  lootPolicy?: string;
  experienceSummary?: string;
  roleSummary?: string;
  contact?: ResumeContact;
  theme: "RESUME" | "MINIMAL";
}

export interface ProfileSnapshot {
  id: string;
  profile: NormalizedCharacterProfile;
  provider: "mock" | "live";
  fetchedAt: string;
  sourceDate: string | null;
  createdAt: string;
}

export interface ResumeVersion {
  id: string;
  resumeId: string;
  snapshot: ProfileSnapshot;
  draft: ResumeDraft;
  versionNumber: number;
  contentHash: string;
  publishedAt: string;
}

export interface GuildObservation {
  id: string;
  guildName: string | null;
  observedFrom: string;
  lastObservedAt: string;
  observedTo: string | null;
  sourceSnapshotId: string;
}

export interface ResumeRecord {
  id: string;
  slug: string;
  characterOcid: string;
  editTokenHash: string;
  currentVersionId: string;
  visibility: "PUBLIC" | "UNLISTED" | "ARCHIVED";
  versions: ResumeVersion[];
  guildObservations: GuildObservation[];
  createdAt: string;
  updatedAt: string;
}

/**
 * A deliberately minimal owner-only representation used by the "my resumes"
 * view. It must not grow into a full record because it is returned from an
 * endpoint authenticated only by per-resume edit tokens.
 */
export interface OwnedResumeSummary {
  slug: string;
  characterName: string;
  worldName: string | null;
  className: string | null;
  characterImageUrl: string | null;
  targetBoss: string;
  targetBossCadence: TargetBossCadence | null;
  /** Ordered public boss bundle, with the primary target retained above for legacy consumers. */
  bossTargets: ResumeBossTarget[];
  role: ResumeRole;
  partyType: PartyType;
  partySize: PartySize | null;
  visibility: ResumeRecord["visibility"];
  versionNumber: number;
  publishedAt: string;
  fetchedAt: string;
  createdAt: string;
  updatedAt: string;
  /** Documents that every returned record passed its own edit-token check. */
  isOwner: true;
}

export interface PublicResume {
  resume: ResumeRecord;
  version: ResumeVersion;
  isLatestVersion: boolean;
}

export const roleLabels: Record<ResumeRole, string> = {
  DAMAGE: "격수",
  SUPPORT: "지원",
  UTILITY: "보조",
  OTHER: "기타",
};

export const partyTypeLabels: Record<PartyType, string> = {
  FIXED: "고정",
  SEMI_FIXED: "반고정",
  TEMPORARY: "용병",
  PROGRESSION: "트라이",
  ACHIEVEMENT: "업적",
};

export const voiceChatLabels: Record<VoiceChat, string> = {
  AVAILABLE: "가능",
  OPTIONAL: "선택",
  UNAVAILABLE: "불가",
};

export const worldTransferAvailabilityLabels: Record<WorldTransferAvailability, string> = {
  AVAILABLE: "가능",
  UNAVAILABLE: "불가능",
};

/** Keeps legacy documents honest instead of assuming their 월드 통합 preference. */
export function worldTransferAvailabilityLabel(value: WorldTransferAvailability | undefined): string {
  return value ? worldTransferAvailabilityLabels[value] : "미입력";
}

export const availabilityModeLabels: Record<AvailabilityMode, string> = {
  SCHEDULED: "요일·시간 지정",
  NEGOTIABLE: "요일·시간 협의 가능",
  FLEXIBLE: "요일·시간 무관",
};

/** Keeps the wording of the optional party-size field consistent across every output. */
export function partySizeLabel(partySize: PartySize | undefined): string {
  return partySize ? `${partySize}인격` : "미입력";
}

export const targetBossCadenceLabels: Record<TargetBossCadence, string> = {
  WEEKLY: "주간",
  MONTHLY: "월간",
};

/**
 * Returns the canonical multi-boss list while keeping old scalar-only
 * immutable versions readable. Callers must not mutate the returned list.
 */
export function getResumeBossTargets(draft: ResumeDraft): readonly ResumeBossTarget[] {
  if (draft.bossTargets?.length) {
    return draft.bossTargets;
  }

  return [
    {
      bossName: draft.targetBoss,
      cadence: draft.targetBossCadence,
      bossMultiplierPercent: draft.bossMultiplierPercent,
    },
  ];
}

export function prioritizedFields(profile: NormalizedCharacterProfile, role: ResumeRole) {
  return [...profile.fields]
    .filter((field) => field.value !== null)
    .sort((left, right) => {
      const leftPriority = left.priorityByRole?.[role] ?? 99;
      const rightPriority = right.priorityByRole?.[role] ?? 99;
      return leftPriority - rightPriority || left.label.localeCompare(right.label, "ko");
    })
    .slice(0, 6);
}
