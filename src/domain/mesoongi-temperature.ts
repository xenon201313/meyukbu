/** Positive, non-numeric feedback that a completed party member can leave on a resume. */
export const mesoongiTemperatureTagValues = [
  "PUNCTUAL",
  "PREPARED",
  "COMMUNICATIVE",
  "PERSISTENT",
  "FAIR_LOOT",
] as const;

export type MesoongiTemperatureTag = (typeof mesoongiTemperatureTagValues)[number];

export const mesoongiTemperatureTagLabels: Record<MesoongiTemperatureTag, string> = {
  PUNCTUAL: "약속 시간 준수",
  PREPARED: "공략 준비",
  COMMUNICATIVE: "원활한 소통",
  PERSISTENT: "재도전 적극적",
  FAIR_LOOT: "공정한 분배",
};

export const feedbackStatusValues = ["PUBLISHED", "WITHDRAWN"] as const;
export type FeedbackStatus = (typeof feedbackStatusValues)[number];

/**
 * A single-use invitation. The raw token is never stored; persistence uses
 * tokenHash so an invitation cannot be redeemed from database contents.
 */
export interface MesoongiTemperatureInvitation {
  id: string;
  resumeId: string;
  resumeVersionId: string;
  tokenHash: string;
  expiresAt: string;
  usedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
}

/** A tag-only review. It intentionally has no score, temperature, or free-form comment. */
export interface MesoongiTemperatureFeedback {
  id: string;
  invitationId: string;
  resumeId: string;
  resumeVersionId: string;
  reviewerResumeId: string;
  reviewerSlug: string;
  reviewerOcid: string;
  reviewerName: string;
  reviewerWorldName: string | null;
  reviewerClassName: string | null;
  tags: MesoongiTemperatureTag[];
  status: FeedbackStatus;
  createdAt: string;
  withdrawnAt: string | null;
}

/** Safe data returned when an invitation is issued; the raw token is delivery-only. */
export interface IssuedMesoongiTemperatureInvitation {
  invitation: Omit<MesoongiTemperatureInvitation, "tokenHash">;
  rawToken: string;
}

/** Public verification-page representation. Invitation tokens stay private, while feedback is never anonymous. */
export interface PublicMesoongiTemperatureFeedback {
  id: string;
  reviewerSlug: string;
  reviewerName: string;
  reviewerWorldName: string | null;
  reviewerClassName: string | null;
  tags: MesoongiTemperatureTag[];
  publishedAt: string;
}

/** Non-numeric public feedback section for one resume. */
export interface PublicMesoongiTemperature {
  resumeSlug: string;
  feedbacks: PublicMesoongiTemperatureFeedback[];
}
