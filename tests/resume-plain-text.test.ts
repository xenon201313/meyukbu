import { describe, expect, it } from "vitest";

import type { ResumeDraft } from "@/domain/resume";
import { formatResumePlainText } from "@/lib/resume-plain-text";
import { getMockProfiles } from "@/lib/nexon/fixtures";
import type { PublicResumeView } from "@/server/services/public-view";

function createResumeView(draft: ResumeDraft): PublicResumeView {
  const profile = getMockProfiles()[0];
  if (!profile) {
    throw new Error("Expected the primary mock profile.");
  }

  return {
    slug: "m-plain-text",
    version: {
      id: "version-1",
      resumeId: "resume-1",
      snapshot: {
        id: "snapshot-1",
        profile,
        provider: "mock",
        fetchedAt: "2026-07-13T00:57:00.000Z",
        sourceDate: "2026-07-13",
        createdAt: "2026-07-13T00:57:00.000Z",
      },
      draft,
      versionNumber: 3,
      contentHash: "a".repeat(64),
      publishedAt: "2026-07-13T00:57:00.000Z",
    },
    latestVersionNumber: 3,
    isLatestVersion: true,
    freshness: "fresh",
    createdAt: "2026-07-13T00:57:00.000Z",
    updatedAt: "2026-07-13T00:57:00.000Z",
    guildObservations: [],
  };
}

const baseDraft: ResumeDraft = {
  targetBoss: "검은 마법사 (하드)",
  targetBossCadence: "MONTHLY",
  convertedStat: "110,650",
  bossMultiplierPercent: "412.5",
  role: "DAMAGE",
  partyType: "ACHIEVEMENT",
  partySize: 3,
  availabilityMode: "SCHEDULED",
  availability: [{ days: ["화", "목"], startTime: "20:00", endTime: "23:00", timezone: "Asia/Seoul" }],
  voiceChat: "OPTIONAL",
  lootPolicy: "상호 협의",
  experienceSummary: "동일 보스 격수 경험이 있습니다.",
  roleSummary: "패턴 대응과 생존을 강점으로 참여합니다.",
  theme: "RESUME",
};

describe("formatResumePlainText", () => {
  it("formats public resume data in the fixed Korean posting order", () => {
    const resume = createResumeView({
      ...baseDraft,
      contact: { type: "DISCORD", value: "resumae#1234", isPublic: true },
    });

    const text = formatResumePlainText(resume, "https://maple-resume.com/r/m-plain-text?v=3");

    expect(text).toContain("[메력서 · RESUMAE]");
    expect(text).toContain("[지원 분야]");
    expect(text).toContain("희망 보스: 월간 · 검은 마법사 (하드)");
    expect(text).toContain("파티 유형: 업적");
    expect(text).toContain("희망 인원: 3인격");
    expect(text).toContain("환산: 110,650");
    expect(text).toContain("보스 배율: 412.5%");
    expect(text).toContain("가능 시간: 화 · 목 20:00 - 23:00 (한국 표준시)");
    expect(text).toContain("디스코드: 선택");
    expect(text).toContain("[공개 연락처]\n디스코드: resumae#1234");
    expect(text).toContain("검증 URL: https://maple-resume.com/r/m-plain-text?v=3");
    expect(text).toContain("Data based on NEXON Open API");
    expect(text.indexOf("[지원 분야]")).toBeLessThan(text.indexOf("[파티 조건]"));
    expect(text.indexOf("[파티 조건]")).toBeLessThan(text.indexOf("[파티 경험]"));
    expect(text.indexOf("[파티 경험]")).toBeLessThan(text.indexOf("[검증 정보]"));
  });

  it("omits non-public contacts while preserving the same field order", () => {
    const resume = createResumeView({
      ...baseDraft,
      contact: { type: "DISCORD", value: "private-discord", isPublic: false },
    });

    const text = formatResumePlainText(resume, "https://maple-resume.com/r/m-plain-text?v=3");

    expect(text).not.toContain("private-discord");
    expect(text).not.toContain("[공개 연락처]");
    expect(text).not.toContain("Remark");
  });

  it("uses the same flexible-availability label as the preview and share PNG", () => {
    const text = formatResumePlainText(
      createResumeView({ ...baseDraft, availabilityMode: "NEGOTIABLE", availability: [] }),
      "https://maple-resume.com/r/m-plain-text?v=3",
    );

    expect(text).toContain("가능 시간: 요일·시간 협의 가능");
  });
});
