// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SiteWatermark } from "@/components/site-watermark";

describe("SiteWatermark", () => {
  it("renders the site-level authorship watermark outside a resume artifact", () => {
    render(<SiteWatermark />);

    expect(screen.getByText("크로아/얀보 제작")).toHaveClass("site-watermark");
  });
});
