// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CombatStatsPanel } from "@/components/combat-stats-panel";
import { getMockProfiles } from "@/lib/nexon/fixtures";

describe("CombatStatsPanel", () => {
  it("shows published combat stats without exposing equipment or cosmetic windows", () => {
    const profile = getMockProfiles()[0];
    if (!profile) {
      throw new Error("Expected the primary mock profile.");
    }

    render(<CombatStatsPanel profile={profile} />);

    expect(screen.getByRole("heading", { name: "전투력과 최종 능력치" })).toBeInTheDocument();
    expect(screen.getAllByText("178,420,000")).toHaveLength(2);
    expect(screen.getByText("보스 몬스터 데미지")).toBeInTheDocument();
    expect(screen.queryByText("데모 양손검")).not.toBeInTheDocument();
    expect(screen.queryByText("현재 장착 전투 장비")).not.toBeInTheDocument();
  });
});
