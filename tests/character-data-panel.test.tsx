// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CharacterDataPanel } from "@/components/character-data-panel";
import { getMockProfiles } from "@/lib/nexon/fixtures";

describe("CharacterDataPanel", () => {
  it("shows raw combat power, final stats, current equipment, and mock-mode guidance", () => {
    const profile = getMockProfiles()[0];
    if (!profile) {
      throw new Error("Expected the primary mock profile.");
    }

    render(<CharacterDataPanel profile={profile} mode="mock" />);

    expect(screen.getByRole("heading", { name: "전투력과 현재 장착 장비" })).toBeInTheDocument();
    expect(screen.getByLabelText("인게임 전투력")).toHaveTextContent("178,420,000");
    expect(
      screen.getByText(
        "현재 데모 데이터입니다. 실제 닉네임 조회는 NEXON Open API 키를 설정한 live 모드에서 사용할 수 있습니다.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("데모 양손검")).toBeInTheDocument();
    expect(screen.getByText("8개")).toBeInTheDocument();
  });

  it("explains an empty equipment response without inventing equipment values", () => {
    const source = getMockProfiles()[2];
    if (!source) {
      throw new Error("Expected the sparse mock profile.");
    }
    const profile = {
      ...source,
      rawAvailability: { ...source.rawAvailability, equipment: "missing" as const },
    };

    render(<CharacterDataPanel profile={profile} mode="live" />);

    expect(
      screen.getByText("실시간 NEXON Open API 조회 결과입니다. 값은 서비스에서 계산하지 않습니다."),
    ).toBeInTheDocument();
    expect(screen.getByText(/장착 장비 API 응답을 받지 못했습니다/)).toBeInTheDocument();
    expect(screen.getByText(/현재 장착 장비 API 결과가 없습니다/)).toBeInTheDocument();
  });
});
