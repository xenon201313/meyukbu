// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { BossCadencePicker } from "@/components/boss-cadence-picker";

describe("BossCadencePicker", () => {
  it("uses the official boss list instead of a manual-entry option", () => {
    const onBossSelect = vi.fn();

    render(<BossCadencePicker value="MONTHLY" targetBoss="검은 마법사 (하드)" onBossSelect={onBossSelect} />);

    const select = screen.getByLabelText("희망 보스 선택");
    expect(select).toHaveValue("hblack");
    expect(screen.queryByText("직접 입력")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /주간 보스/ }));
    expect(onBossSelect).toHaveBeenLastCalledWith(
      expect.objectContaining({ id: "njup", name: "유피테르 (노멀)", cadence: "WEEKLY" }),
    );

    fireEvent.change(select, { target: { value: "xblack" } });
    expect(onBossSelect).toHaveBeenCalledWith(
      expect.objectContaining({ id: "xblack", name: "검은 마법사 (익스트림)", cadence: "MONTHLY" }),
    );
  });
});
