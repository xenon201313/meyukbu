// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PartyPostCard } from "@/components/party-post-card";
import type { PublicPartyPost } from "@/domain/party";
import { formatPartyAvailability } from "@/lib/party/presentation";

const post: PublicPartyPost = {
  slug: "p-testcard",
  kind: "RECRUITING",
  status: "OPEN",
  createdAt: "2026-07-15T00:00:00.000Z",
  expiresAt: "2026-07-21T00:00:00.000Z",
  targets: [
    {
      bossName: "스우 (익스트림)",
      cadence: "WEEKLY",
      bossMultiplierPercent: "45.86",
      maxPartySize: 2,
      sortOrder: 0,
    },
    {
      bossName: "검은 마법사 (하드)",
      cadence: "MONTHLY",
      bossMultiplierPercent: "72.10",
      maxPartySize: 6,
      sortOrder: 1,
    },
  ],
  owner: {
    resumeSlug: "m-owner-card",
    versionNumber: 2,
    characterName: "테스트캐릭터",
    worldName: "크로아",
    worldGroup: "MAIN",
    className: "메카닉",
    level: 295,
    imageUrl: null,
    role: "DAMAGE",
    partyType: "FIXED",
    partySize: 2,
    availabilityMode: "SCHEDULED",
    availability: [{ days: ["화", "목"], startTime: "20:00", endTime: "23:00", timezone: "Asia/Seoul" }],
    voiceChat: "AVAILABLE",
    worldTransferAvailability: "AVAILABLE",
  },
};

describe("party board presentation", () => {
  it("renders every bundled boss multiplier and the game party-size cap", () => {
    render(<PartyPostCard post={post} />);

    expect(screen.getByText("파티원 모집")).toBeInTheDocument();
    expect(screen.getByText("주간 · 스우 (익스트림)")).toBeInTheDocument();
    expect(screen.getByText("월간 · 검은 마법사 (하드)")).toBeInTheDocument();
    expect(screen.getByText(/배율 45.86% · 최대 2인/)).toBeInTheDocument();
    expect(screen.getByText(/배율 72.10% · 최대 6인/)).toBeInTheDocument();
    expect(screen.getByText(/파티 그룹 본서버 · 월드 통합 가능/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "게시글 열기" })).toHaveAttribute("href", "/parties/p-testcard");
  });

  it("uses a larger, smoothly rendered source image for the post owner", () => {
    render(
      <PartyPostCard
        post={{
          ...post,
          owner: { ...post.owner, imageUrl: "https://example.invalid/character.png" },
        }}
      />,
    );

    const avatar = screen.getByAltText(`${post.owner.characterName} 캐릭터 이미지`);
    expect(avatar).toHaveAttribute("width", "192");
    expect(avatar).toHaveAttribute("height", "192");
    expect(avatar).toHaveClass(
      "h-full",
      "w-full",
      "scale-[1.38]",
      "object-contain",
      "[image-rendering:auto]",
    );
    expect(avatar.parentElement).toHaveClass("h-20", "w-20", "overflow-hidden", "sm:h-24", "sm:w-24");
  });

  it("keeps negotiated and flexible availability honest instead of inventing a schedule", () => {
    expect(formatPartyAvailability("NEGOTIABLE", [])).toBe("요일·시간 협의 가능");
    expect(formatPartyAvailability("FLEXIBLE", [])).toBe("요일·시간 무관");
    expect(
      formatPartyAvailability("SCHEDULED", [
        { days: ["화", "목"], startTime: "20:00", endTime: "23:00", timezone: "Asia/Seoul" },
      ]),
    ).toBe("화 · 목 20:00–23:00");
  });
});
