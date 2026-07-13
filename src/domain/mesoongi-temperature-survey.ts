/**
 * The neutral starting point for every character's Mesoongi temperature.
 * Values are represented in integer tenths internally so the 36.5 baseline
 * cannot accumulate floating-point rounding errors.
 */
export const mesoongiTemperatureBaselineCelsius = 36.5;
export const mesoongiTemperatureBaselineTenths = 365;

/**
 * A broad, inclusive display range protects the gauge from unbounded survey
 * accumulation while preserving the complete underlying anonymous history.
 */
export const mesoongiTemperatureMinCelsius = 0;
export const mesoongiTemperatureMaxCelsius = 100;
export const mesoongiTemperatureMinTenths = mesoongiTemperatureMinCelsius * 10;
export const mesoongiTemperatureMaxTenths = mesoongiTemperatureMaxCelsius * 10;

export type MesoongiExperienceScore = -2 | -1 | 0 | 1 | 2;
export type MesoongiPunctualityScore = -1 | 1;

/**
 * A one-time invite is scoped to a character identity rather than a resume
 * version, so its result remains with the character across resume copies.
 */
export interface MesoongiTemperatureSurveyInvitation {
  id: string;
  characterOcid: string;
  tokenHash: string;
  expiresAt: string;
  usedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
}

/**
 * An anonymous survey response. It intentionally stores no reviewer resume,
 * character, name, contact detail, or other identifying data.
 */
export interface MesoongiTemperatureSurveyResponse {
  id: string;
  invitationId: string;
  characterOcid: string;
  experienceScore: MesoongiExperienceScore;
  proficiencyScore: MesoongiExperienceScore;
  punctualityScore: MesoongiPunctualityScore;
  totalDelta: number;
  createdAt: string;
}

/** Safe owner-only invite data; raw tokens are delivery-only and never persisted. */
export interface IssuedMesoongiTemperatureSurveyInvitation {
  invitation: Omit<MesoongiTemperatureSurveyInvitation, "tokenHash">;
  rawToken: string;
}

/**
 * Public, character-wide aggregate. Individual survey answers and all
 * reviewer-identifying data deliberately remain private.
 */
export interface PublicMesoongiTemperatureSummary {
  temperatureCelsius: number;
  responseCount: number;
  baselineCelsius: typeof mesoongiTemperatureBaselineCelsius;
  minCelsius: typeof mesoongiTemperatureMinCelsius;
  maxCelsius: typeof mesoongiTemperatureMaxCelsius;
}

/** Calculates the bounded public temperature from the persisted response deltas. */
export function toMesoongiTemperatureCelsius(totalDelta: number): number {
  if (!Number.isInteger(totalDelta)) {
    throw new TypeError("Mesoongi temperature deltas must be integers.");
  }
  const unclampedTenths = mesoongiTemperatureBaselineTenths + totalDelta * 10;
  const clampedTenths = Math.min(
    mesoongiTemperatureMaxTenths,
    Math.max(mesoongiTemperatureMinTenths, unclampedTenths),
  );
  return clampedTenths / 10;
}

/** Ensures an answer uses the exact score options exposed by the survey. */
export function isMesoongiExperienceScore(value: number): value is MesoongiExperienceScore {
  return Number.isInteger(value) && value >= -2 && value <= 2;
}

/** Ensures the punctuality question remains a binary -1 / +1 choice. */
export function isMesoongiPunctualityScore(value: number): value is MesoongiPunctualityScore {
  return value === -1 || value === 1;
}

/** The three approved answer values always produce a whole-number delta from -5 through +5. */
export function surveyTemperatureDelta(
  experienceScore: MesoongiExperienceScore,
  proficiencyScore: MesoongiExperienceScore,
  punctualityScore: MesoongiPunctualityScore,
): number {
  return experienceScore + proficiencyScore + punctualityScore;
}
