// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { ResumePreview } from "@/components/resume-preview";
import type { ResumeDraft } from "@/domain/resume";
import { getMockProfiles } from "@/lib/nexon/fixtures";

const draft: ResumeDraft = {
  targetBoss: "검은 마법사 (하드)",
  targetBossCadence: "MONTHLY",
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
  afterEach(() => {
    cleanup();
  });

  it("uses a larger square character image and a document-form field order", () => {
    const profile = getMockProfiles()[0];
    if (!profile) {
      throw new Error("Expected the primary mock profile.");
    }

    const profileWithImage = { ...profile, imageUrl: "https://example.invalid/character.png" };
    render(<ResumePreview profile={profileWithImage} draft={draft} mode="mock" />);

    expect(screen.getByText("어필 포인트")).toBeInTheDocument();
    expect(screen.getByText("환산 · 보스 배율")).toBeInTheDocument();
    expect(screen.getByText("디스코드")).toBeInTheDocument();
    expect(screen.getAllByText("미입력").length).toBeGreaterThan(0);
    const avatar = screen.getByAltText(`${profileWithImage.characterName} 캐릭터 이미지`);
    expect(avatar).toHaveClass(
      "h-full",
      "w-full",
      "scale-[1.55]",
      "object-contain",
      "[image-rendering:auto]",
    );
    expect(avatar).not.toHaveClass("[image-rendering:pixelated]");
    expect(avatar.parentElement).toHaveClass("h-full", "w-full", "overflow-hidden");
    expect(avatar.parentElement?.parentElement).toHaveClass("h-40", "w-40", "overflow-hidden");
    expect(screen.queryByText("크로아/얀보 제작")).not.toBeInTheDocument();
  });

  it("shows manually confirmed conversion and boss multiplier as user-provided values", () => {
    const profile = getMockProfiles()[0];
    if (!profile) {
      throw new Error("Expected the primary mock profile.");
    }

    render(
      <ResumePreview
        profile={profile}
        draft={{ ...draft, convertedStat: "110,650", bossMultiplierPercent: "412.5" }}
        mode="mock"
      />,
    );

    expect(screen.getByText("환산 · 보스 배율")).toBeInTheDocument();
    expect(screen.getByText("환산")).toBeInTheDocument();
    expect(screen.getByText("110,650")).toBeInTheDocument();
    expect(screen.getByText("보스 배율")).toBeInTheDocument();
    expect(screen.getByText("412.5%")).toBeInTheDocument();
    const bossArtwork = document.querySelector('img[data-boss-art-key="blackmage"]');
    expect(bossArtwork).toHaveAttribute("src", "/images/bosses/blackmage.png");
  });

  it("shows the achievement party type in the live preview", () => {
    const profile = getMockProfiles()[0];
    if (!profile) {
      throw new Error("Expected the primary mock profile.");
    }

    render(<ResumePreview profile={profile} draft={{ ...draft, partyType: "ACHIEVEMENT" }} mode="mock" />);

    expect(screen.getByText("업적")).toBeInTheDocument();
  });
});
