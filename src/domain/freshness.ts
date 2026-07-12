export type FreshnessStatus = "fresh" | "stale" | "expired";

export interface FreshnessPolicy {
  freshHours: number;
  expiryDays: number;
}

export const defaultFreshnessPolicy: FreshnessPolicy = {
  freshHours: 24,
  expiryDays: 30,
};

/** Classifies a snapshot without relying on the browser timezone. */
export function getFreshnessStatus(
  fetchedAt: string | Date,
  policy: FreshnessPolicy = defaultFreshnessPolicy,
  now = new Date(),
): FreshnessStatus {
  const timestamp = new Date(fetchedAt).getTime();
  if (Number.isNaN(timestamp)) {
    return "expired";
  }

  const ageMs = Math.max(0, now.getTime() - timestamp);
  if (ageMs < policy.freshHours * 60 * 60 * 1000) {
    return "fresh";
  }
  if (ageMs < policy.expiryDays * 24 * 60 * 60 * 1000) {
    return "stale";
  }
  return "expired";
}

export const freshnessLabels: Record<FreshnessStatus, string> = {
  fresh: "최근 조회",
  stale: "업데이트 확인 권장",
  expired: "갱신 필요",
};
