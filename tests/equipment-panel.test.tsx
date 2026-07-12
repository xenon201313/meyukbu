// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { EquipmentPanel } from "@/components/equipment-panel";
import { getMockProfiles } from "@/lib/nexon/fixtures";

describe("EquipmentPanel", () => {
  it("keeps API equipment fields in a readable, expandable detail card", () => {
    const profile = getMockProfiles()[0];
    if (!profile) {
      throw new Error("Expected the primary mock profile.");
    }

    render(<EquipmentPanel profile={profile} />);

    expect(screen.getByRole("heading", { name: "장착 장비와 전투력" })).toBeInTheDocument();
    expect(screen.getByText("데모 양손검")).toBeInTheDocument();
    expect(screen.getAllByLabelText("스타포스 22")).toHaveLength(profile.equipment.length);
    expect(screen.getAllByText("최종 옵션")).toHaveLength(profile.equipment.length);
    expect(screen.getAllByText("잠재능력", { exact: true })).toHaveLength(profile.equipment.length);
    expect(screen.getAllByText("에디셔널 잠재능력")).toHaveLength(profile.equipment.length);
    expect(screen.getAllByText("보스 몬스터 데미지").length).toBeGreaterThan(0);
  });
});
