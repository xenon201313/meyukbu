// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ResumePreview } from "@/components/resume-preview";
import type { ResumeDraft } from "@/domain/resume";
import { getMockProfiles } from "@/lib/nexon/fixtures";

const draft: ResumeDraft = {
  targetBoss: "검은 마법사",
  targetBossCadence: "MONTHLY",
  difficulty: "하드",
  role: "DAMAGE",
  partyType: "FIXED",
  availability: [{ days: ["화", "목"], startTime: "20:00", endTime: "23:00", timezone: "Asia/Seoul" }],
  voiceChat: "OPTIONAL",
  lootPolicy: "상호 협의",
  experienceSummary: "동일 보스 파티 경험이 있습니다.",
  roleSummary: "패턴 대응과 생존을 강점으로 참여합니다.",
  theme: "RESUME",
};

describe("ResumePreview", () => {
  it("uses a larger square character image and labels role copy as an appeal point", () => {
    const profile = getMockProfiles()[0];
    if (!profile) {
      throw new Error("Expected the primary mock profile.");
    }

    const profileWithImage = { ...profile, imageUrl: "https://example.invalid/character.png" };
    render(<ResumePreview profile={profileWithImage} draft={draft} mode="mock" />);

    expect(screen.getByText("어필 포인트")).toBeInTheDocument();
    expect(screen.queryByText("환산 (기존 사용자 입력)")).not.toBeInTheDocument();
    const avatar = screen.getByAltText(`${profileWithImage.characterName} 캐릭터 이미지`);
    expect(avatar).toHaveClass("h-full", "w-full", "object-cover");
    expect(avatar.parentElement).toHaveClass("h-40", "w-40", "overflow-hidden");
  });
});
