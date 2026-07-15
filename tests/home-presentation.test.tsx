// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import Home from "@/app/page";

describe("home party-board introduction", () => {
  it("explains how a completed resume can be used to recruit or find a party", () => {
    render(<Home />);

    expect(screen.getByRole("heading", { name: "만든 메력서로 파티를 꾸려보세요." })).toBeInTheDocument();
    expect(screen.getByText(/공개한 메력서를 바탕으로 파티원을 모집하거나/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "공개 파티 둘러보기" })).toHaveAttribute("href", "/parties");
    expect(screen.getByRole("link", { name: "내 이력서로 파티 글 작성" })).toHaveAttribute(
      "href",
      "/parties/new",
    );
  });
});
