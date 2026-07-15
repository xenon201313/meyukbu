// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SiteHeader } from "@/components/site-header";

describe("SiteHeader", () => {
  it("shows the current party-board navigation item only once", () => {
    render(<SiteHeader currentLabel="파티 게시판" />);

    expect(screen.getAllByText("파티 게시판")).toHaveLength(1);
    expect(screen.getByRole("link", { name: "파티 게시판" })).toHaveAttribute("aria-current", "page");
  });
});
