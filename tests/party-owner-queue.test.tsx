// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { PartyOwnerQueue } from "@/components/party-owner-queue";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("PartyOwnerQueue", () => {
  it("opens the applicant resume version that was pinned at application time", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          post: {
            status: "OPEN",
            applications: [
              {
                id: "pa-versioned",
                status: "PENDING",
                message: null,
                createdAt: "2026-07-15T12:00:00.000Z",
                decidedAt: null,
                applicant: {
                  resumeSlug: "m-applicant",
                  versionNumber: 4,
                  characterName: "지원캐릭터",
                  worldName: "크로아",
                  className: "메카닉",
                  level: 295,
                },
              },
            ],
          },
        }),
      }),
    );

    render(<PartyOwnerQueue postSlug="p-versioned" />);

    const applicantLink = await screen.findByRole("link", { name: "지원캐릭터" });
    expect(applicantLink).toHaveAttribute("href", "/r/m-applicant?v=4");
    expect(screen.getByText(/크로아 · 메카닉 · Lv\.295 · v4/)).toBeInTheDocument();
  });
});
