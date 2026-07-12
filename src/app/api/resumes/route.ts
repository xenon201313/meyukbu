import { NextRequest, NextResponse } from "next/server";

import { hasTrustedMutationOrigin } from "@/lib/auth/csrf";
import { editTokenCookieName } from "@/lib/auth/edit-token";
import { createResumeSchema } from "@/lib/validation/schemas";
import { requestRateLimitKey, takeRateLimit } from "@/lib/rate-limit";
import { createResume } from "@/server/services/resume-service";
import { NexonProviderError, userFacingNexonError } from "@/lib/nexon/errors";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  if (!hasTrustedMutationOrigin(request)) {
    return NextResponse.json({ message: "허용되지 않은 요청 출처입니다." }, { status: 403 });
  }
  const rateLimit = takeRateLimit(requestRateLimitKey(request.headers, "create-resume"), 10);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { message: "요청이 많습니다. 잠시 후 다시 시도해 주세요." },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } },
    );
  }
  const body: unknown = await request.json().catch(() => null);
  const parsed = createResumeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.issues[0]?.message ?? "입력값을 확인해 주세요." },
      { status: 400 },
    );
  }

  try {
    const result = await createResume(parsed.data);
    const response = NextResponse.json({
      slug: result.record.slug,
      versionNumber: 1,
      imageUrl: `/r/${result.record.slug}/image?v=1&template=2`,
    });
    response.cookies.set(editTokenCookieName(result.record.slug), result.editToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 180,
    });
    return response;
  } catch (error) {
    const status = error instanceof NexonProviderError ? error.status : 500;
    return NextResponse.json({ message: userFacingNexonError(error) }, { status });
  }
}
