import { NextRequest, NextResponse } from "next/server";

import { hasTrustedMutationOrigin } from "@/lib/auth/csrf";
import { editTokenCookieName } from "@/lib/auth/edit-token";
import { NexonProviderError, userFacingNexonError } from "@/lib/nexon/errors";
import { requestRateLimitKey, takeRateLimit } from "@/lib/rate-limit";
import {
  getPublicResume,
  refreshResume,
  ResumeArchivedError,
  ResumeAuthorizationError,
  ResumeNotFoundError,
} from "@/server/services/resume-service";
import { toPublicResumeView } from "@/server/services/public-view";

export const runtime = "nodejs";

interface Context {
  params: Promise<{ slug: string }>;
}

export async function POST(request: NextRequest, context: Context) {
  if (!hasTrustedMutationOrigin(request)) {
    return NextResponse.json({ message: "허용되지 않은 요청 출처입니다." }, { status: 403 });
  }
  const rateLimit = takeRateLimit(requestRateLimitKey(request.headers, "refresh-resume"), 10);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { message: "요청이 많습니다. 잠시 후 다시 시도해 주세요." },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } },
    );
  }
  const { slug } = await context.params;
  try {
    const record = await refreshResume(slug, request.cookies.get(editTokenCookieName(slug))?.value);
    const result = await getPublicResume(record.slug);
    return NextResponse.json({ resume: result ? toPublicResumeView(result) : null });
  } catch (error) {
    if (error instanceof NexonProviderError) {
      return NextResponse.json({ message: userFacingNexonError(error) }, { status: error.status });
    }
    if (error instanceof ResumeAuthorizationError) {
      return NextResponse.json({ message: "이 메력서를 갱신할 권한이 없습니다." }, { status: 403 });
    }
    if (error instanceof ResumeNotFoundError) {
      return NextResponse.json({ message: "메력서를 찾지 못했습니다." }, { status: 404 });
    }
    if (error instanceof ResumeArchivedError) {
      return NextResponse.json({ message: "공개가 중단된 메력서입니다." }, { status: 410 });
    }
    return NextResponse.json({ message: "갱신에 실패했습니다." }, { status: 500 });
  }
}
