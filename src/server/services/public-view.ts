import { getFreshnessStatus } from "@/domain/freshness";
import type { GuildObservation, PublicResume, ResumeVersion } from "@/domain/resume";
import { getEnvironment } from "@/lib/env";

export interface PublicResumeView {
  slug: string;
  version: ResumeVersion;
  latestVersionNumber: number;
  isLatestVersion: boolean;
  freshness: "fresh" | "stale" | "expired";
  createdAt: string;
  updatedAt: string;
  guildObservations: GuildObservation[];
}

/** Removes edit credentials and private contact information before public rendering. */
export function toPublicResumeView(result: PublicResume): PublicResumeView {
  const environment = getEnvironment();
  const freshness = getFreshnessStatus(result.version.snapshot.fetchedAt, {
    freshHours: environment.PROFILE_FRESH_HOURS,
    expiryDays: environment.PROFILE_PUBLIC_EXPIRY_DAYS,
  });
  const version = structuredClone(result.version);
  if (version.draft.contact && !version.draft.contact.isPublic) {
    delete version.draft.contact;
  }
  if (freshness === "expired") {
    version.snapshot.profile.fields = [];
  }

  return {
    slug: result.resume.slug,
    version,
    latestVersionNumber: Math.max(...result.resume.versions.map((candidate) => candidate.versionNumber)),
    isLatestVersion: result.isLatestVersion,
    freshness,
    createdAt: result.resume.createdAt,
    updatedAt: result.resume.updatedAt,
    guildObservations: structuredClone(result.resume.guildObservations),
  };
}
