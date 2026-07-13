import type { NormalizedCharacterProfile } from "@/domain/character";

export const resumeRoleValues = ["DAMAGE", "SUPPORT", "UTILITY", "OTHER"] as const;
export type ResumeRole = (typeof resumeRoleValues)[number];

export const partyTypeValues = ["FIXED", "SEMI_FIXED", "TEMPORARY", "PROGRESSION", "ACHIEVEMENT"] as const;
export type PartyType = (typeof partyTypeValues)[number];

export const voiceChatValues = ["AVAILABLE", "OPTIONAL", "UNAVAILABLE"] as const;
export type VoiceChat = (typeof voiceChatValues)[number];

export const availabilityModeValues = ["SCHEDULED", "NEGOTIABLE", "FLEXIBLE"] as const;
export type AvailabilityMode = (typeof availabilityModeValues)[number];

export const partySizeValues = [1, 2, 3, 4, 5, 6] as const;
export type PartySize = (typeof partySizeValues)[number];

export const contactTypeValues = ["DISCORD", "OPEN_CHAT", "COMMUNITY"] as const;
export type ContactType = (typeof contactTypeValues)[number];

export const targetBossCadenceValues = ["WEEKLY", "MONTHLY"] as const;
export type TargetBossCadence = (typeof targetBossCadenceValues)[number];

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
  targetBoss: string;
  /** Weekly/monthly is user-selected context, not a value inferred from API data. */
  targetBossCadence?: TargetBossCadence;
  /**
   * User-entered converted stat (환산), e.g. the MapleScouter figure. It is
   * displayed as USER_PROVIDED with an external verification link, never as
   * an API value or a service calculation.
   */
  convertedStat?: string;
  /**
   * User-entered boss multiplier percentage. This is intentionally kept
   * separate from the conversion figure and is never inferred or calculated
   * by the service.
   */
  bossMultiplierPercent?: string;
  role: ResumeRole;
  partyType: PartyType;
  /** Desired total party size. Older immutable versions may not contain this field. */
  partySize?: PartySize;
  /** Undefined legacy values are treated as SCHEDULED. */
  availabilityMode?: AvailabilityMode;
  availability: AvailabilitySlot[];
  voiceChat: VoiceChat;
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
