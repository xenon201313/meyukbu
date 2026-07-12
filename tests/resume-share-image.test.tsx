import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { ResumeDraft } from "@/domain/resume";
import { ResumeShareImage } from "@/lib/image/resume-share-image";
import { getMockProfiles } from "@/lib/nexon/fixtures";
import type { PublicResumeView } from "@/server/services/public-view";

function createResumeView(draft: ResumeDraft): PublicResumeView {
  const profile = getMockProfiles()[0];
  if (!profile) {
    throw new Error("Expected the primary mock profile.");
  }

  return {
    slug: "m-test",
    version: {
      id: "version-1",
      resumeId: "resume-1",
      snapshot: {
        id: "snapshot-1",
        profile,
        provider: "mock",
        fetchedAt: profile.fetchedAt,
        sourceDate: profile.sourceDate,
        createdAt: profile.fetchedAt,
      },
      draft,
      versionNumber: 1,
      contentHash: "a".repeat(64),
      publishedAt: profile.fetchedAt,
    },
    latestVersionNumber: 1,
    isLatestVersion: true,
    freshness: "fresh",
    createdAt: profile.fetchedAt,
    updatedAt: profile.fetchedAt,
    guildObservations: [],
  };
}

describe("ResumeShareImage", () => {
  it("clips and scales a transparent character sprite so it fills the PNG avatar square", () => {
    const draft: ResumeDraft = {
      targetBoss: "검은 마법사",
      difficulty: "하드",
      role: "DAMAGE",
      partyType: "FIXED",
      availability: [{ days: ["토"], startTime: "20:00", endTime: "23:00", timezone: "Asia/Seoul" }],
      voiceChat: "OPTIONAL",
      theme: "RESUME",
    };

    const markup = renderToStaticMarkup(
      <ResumeShareImage
        resume={createResumeView(draft)}
        qrDataUri="data:image/png;base64,abc"
        canonicalUrl="https://example.test/r/m-test"
        avatarDataUri="data:image/png;base64,avatar"
      />,
    );

    expect(markup).toContain("overflow:hidden");
    expect(markup).toContain("object-fit:cover");
    expect(markup).toContain("transform:scale(1.9)");
  });

  it("includes user-provided conversion and boss multiplier on the PNG card source", () => {
    const draft: ResumeDraft = {
      targetBoss: "검은 마법사",
      targetBossCadence: "MONTHLY",
      difficulty: "하드",
      convertedStat: "110,650",
      bossMultiplierPercent: "412.5",
      role: "DAMAGE",
      partyType: "FIXED",
      availability: [{ days: ["월"], startTime: "20:00", endTime: "23:00", timezone: "Asia/Seoul" }],
      voiceChat: "OPTIONAL",
      theme: "RESUME",
    };

    const markup = renderToStaticMarkup(
      <ResumeShareImage
        resume={createResumeView(draft)}
        qrDataUri="data:image/png;base64,abc"
        canonicalUrl="https://example.test/r/m-test"
        avatarDataUri={null}
      />,
    );

    expect(markup).toContain("환산 · 작성 내용");
    expect(markup).toContain("110,650");
    expect(markup).toContain("보스 배율 · 작성 내용");
    expect(markup).toContain("412.5%");
  });
});
