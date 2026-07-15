import type { FreshnessPolicy } from "@/domain/freshness";
import { getFreshnessStatus } from "@/domain/freshness";
import { getEnvironment } from "@/lib/env";

/** Uses the same environment-controlled snapshot policy as public verification pages. */
export function partyFreshnessPolicy(): FreshnessPolicy {
  const environment = getEnvironment();
  return {
    freshHours: environment.PROFILE_FRESH_HOURS,
    expiryDays: environment.PROFILE_PUBLIC_EXPIRY_DAYS,
  };
}

/** Returns whether a snapshot is recent enough to create, display, or apply to a party post. */
export function isPartySnapshotFresh(
  fetchedAt: string,
  now = new Date(),
  policy: FreshnessPolicy = partyFreshnessPolicy(),
): boolean {
  return getFreshnessStatus(fetchedAt, policy, now) === "fresh";
}

/** Server-only public-board eligibility used by the owned-resume list response. */
export function isPartyResumeEligible(
  visibility: "PUBLIC" | "UNLISTED" | "ARCHIVED",
  fetchedAt: string,
  now = new Date(),
): boolean {
  return visibility === "PUBLIC" && isPartySnapshotFresh(fetchedAt, now);
}
