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

function renderShareImage(draft: ResumeDraft) {
  return renderToStaticMarkup(
    <ResumeShareImage
      resume={createResumeView(draft)}
      qrDataUri="data:image/png;base64,qr"
      canonicalUrl="https://example.test/r/m-test"
      avatarDataUri="data:image/png;base64,avatar"
      bossArtworkDataUri="data:image/png;base64,boss"
    />,
  );
}

describe("ResumeShareImage", () => {
  it("renders a fixed paper-resume form that remains readable without entered reference values", () => {
    const draft: ResumeDraft = {
      targetBoss: "검은 마법사 (하드)",
      targetBossCadence: "MONTHLY",
      role: "DAMAGE",
      partyType: "FIXED",
      partySize: 6,
      availabilityMode: "FLEXIBLE",
      availability: [{ days: ["화"], startTime: "20:00", endTime: "23:00", timezone: "Asia/Seoul" }],
      voiceChat: "OPTIONAL",
      theme: "RESUME",
    };

    const markup = renderShareImage(draft);

    expect(markup).toContain("메력서 · RESUMAE");
    expect(markup).toContain("RESUME DOCUMENT");
    expect(markup).toContain("background:#e8e2d8");
    expect(markup).toContain("background:#fffefa");
    expect(markup).toContain("overflow:hidden");
    expect(markup).toContain("object-fit:contain");
    expect(markup).toContain("transform:scale(1.55)");
    expect(markup).toContain("font-family:Nanum Barun Gothic");
    expect(markup).toContain("font-weight:700");
    expect(markup).toContain("지원 분야");
    expect(markup).toContain("환산 · 보스 배율");
    expect(markup).toContain("파티 경험 및 조건");
    expect(markup).toContain("디스코드");
    expect(markup).toContain("희망 인원");
    expect(markup).toContain("6인격");
    expect(markup).toContain("요일·시간 무관");
    expect(markup).toContain("미입력");
    expect(markup).toContain("data:image/png;base64,qr");
    expect(markup).toContain("Data based on NEXON Open API");
  });

  it("includes both reference metrics and the selected boss artwork in the PNG card", () => {
    const draft: ResumeDraft = {
      targetBoss: "검은 마법사 (하드)",
      targetBossCadence: "MONTHLY",
      convertedStat: "110,650",
      bossMultiplierPercent: "412.5",
      role: "DAMAGE",
      partyType: "FIXED",
      availability: [{ days: ["화"], startTime: "20:00", endTime: "23:00", timezone: "Asia/Seoul" }],
      voiceChat: "OPTIONAL",
      theme: "RESUME",
    };

    const markup = renderShareImage(draft);

    expect(markup).toContain("환산 · 보스 배율");
    expect(markup).toContain("환산");
    expect(markup).toContain("110,650");
    expect(markup).toContain("보스 배율");
    expect(markup).toContain("412.5%");
    expect(markup).toContain("data:image/png;base64,boss");
    expect(markup).toContain("검은 마법사 (하드) 보스 일러스트");
  });

  it("includes the achievement party type in the PNG card", () => {
    const markup = renderShareImage({
      targetBoss: "유피테르 (노멀)",
      targetBossCadence: "WEEKLY",
      role: "DAMAGE",
      partyType: "ACHIEVEMENT",
      availability: [{ days: ["토"], startTime: "20:00", endTime: "23:00", timezone: "Asia/Seoul" }],
      voiceChat: "OPTIONAL",
      theme: "RESUME",
    });

    expect(markup).toContain("업적");
  });

  it("compacts long written descriptions without losing the verification footer", () => {
    const markup = renderShareImage({
      targetBoss: "유피테르 (노멀)",
      targetBossCadence: "WEEKLY",
      role: "DAMAGE",
      partyType: "ACHIEVEMENT",
      availability: [{ days: ["토"], startTime: "20:00", endTime: "23:00", timezone: "Asia/Seoul" }],
      voiceChat: "OPTIONAL",
      experienceSummary: "가".repeat(180),
      roleSummary: "나".repeat(180),
      theme: "RESUME",
    });

    expect(markup).toContain(`${"가".repeat(81)}…`);
    expect(markup).toContain(`${"나".repeat(81)}…`);
    expect(markup).toContain("검증 페이지 QR");
    expect(markup).toContain("Data based on NEXON Open API");
  });
});
