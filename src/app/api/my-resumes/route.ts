import { NextRequest, NextResponse } from "next/server";

import { ownedResumeEditTokenReferences } from "@/lib/auth/edit-token";
import { getOwnedResumeSummaries } from "@/server/services/resume-service";

export const runtime = "nodejs";

const privateListHeaders = {
  "Cache-Control": "private, no-store, max-age=0",
  Vary: "Cookie",
};

/**
 * Lists only resumes whose individual, HttpOnly edit-token cookie is valid.
 * There is intentionally no slug query parameter or account-wide owner id.
 */
export async function GET(request: NextRequest) {
  try {
    const references = ownedResumeEditTokenReferences(request.cookies.getAll());
    const resumes = await getOwnedResumeSummaries(references);
    return NextResponse.json({ resumes }, { headers: privateListHeaders });
  } catch {
    return NextResponse.json(
      { message: "내 메력서 목록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요." },
      { status: 500, headers: privateListHeaders },
    );
  }
}
