import { describe, expect, it } from "vitest";

import { parsePartyOwnerQueuePayload } from "@/lib/party/client";

describe("party owner queue payload", () => {
  it("keeps the applicant resume version pinned by the submitted application", () => {
    const parsed = parsePartyOwnerQueuePayload({
      post: {
        status: "OPEN",
        applications: [
          {
            id: "pa-versioned",
            status: "PENDING",
            message: "토요일 저녁에 참여할 수 있습니다.",
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
    });

    expect(parsed?.applications[0]?.applicant).toMatchObject({
      resumeSlug: "m-applicant",
      versionNumber: 4,
    });
  });

  it("rejects an applicant payload without a valid pinned version", () => {
    expect(
      parsePartyOwnerQueuePayload({
        post: {
          status: "OPEN",
          applications: [
            {
              id: "pa-missing-version",
              status: "PENDING",
              createdAt: "2026-07-15T12:00:00.000Z",
              applicant: { resumeSlug: "m-applicant", characterName: "지원캐릭터" },
            },
          ],
        },
      }),
    ).toBeNull();
  });
});
