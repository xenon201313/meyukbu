import { NextRequest, NextResponse } from "next/server";

import { hasTrustedMutationOrigin } from "@/lib/auth/csrf";
import { editTokenCookieName, verifyEditToken } from "@/lib/auth/edit-token";
import { updateResumeSchema } from "@/lib/validation/schemas";
import { requestRateLimitKey, takeRateLimit } from "@/lib/rate-limit";
import {
  archiveResume,
  getPublicResume,
  ResumeArchivedError,
  ResumeAuthorizationError,
  ResumeNotFoundError,
  updateResume,
} from "@/server/services/resume-service";
import { toPublicResumeView } from "@/server/services/public-view";

export const runtime = "nodejs";

interface Context {
  params: Promise<{ slug: string }>;
}

function mutationError(error: unknown) {
  if (error instanceof ResumeAuthorizationError) {
    return NextResponse.json({ message: "이 메력서를 수정할 권한이 없습니다." }, { status: 403 });
  }
  if (error instanceof ResumeNotFoundError) {
    return NextResponse.json({ message: "메력서를 찾지 못했습니다." }, { status: 404 });
  }
  if (error instanceof ResumeArchivedError) {
    return NextResponse.json({ message: "공개가 중단된 메력서입니다." }, { status: 410 });
  }
  return NextResponse.json({ message: "요청을 처리하지 못했습니다." }, { status: 500 });
}

export async function GET(request: NextRequest, context: Context) {
  const { slug } = await context.params;
  const versionQuery = request.nextUrl.searchParams.get("v");
  const versionNumber = versionQuery ? Number.parseInt(versionQuery, 10) : undefined;
  const result = await getPublicResume(slug, Number.isFinite(versionNumber) ? versionNumber : undefined);
  if (!result) {
    return NextResponse.json({ message: "메력서를 찾지 못했습니다." }, { status: 404 });
  }
  const canEdit = verifyEditToken(
    request.cookies.get(editTokenCookieName(slug))?.value,
    result.resume.editTokenHash,
  );
  const view = toPublicResumeView(result);
  if (canEdit) {
    // The owner may recover a private contact in the editor; public readers never receive it.
    view.version.draft = structuredClone(result.version.draft);
  }
  return NextResponse.json({ resume: view, canEdit });
}

export async function PATCH(request: NextRequest, context: Context) {
  if (!hasTrustedMutationOrigin(request)) {
    return NextResponse.json({ message: "허용되지 않은 요청 출처입니다." }, { status: 403 });
  }
  const rateLimit = takeRateLimit(requestRateLimitKey(request.headers, "update-resume"));
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { message: "요청이 많습니다. 잠시 후 다시 시도해 주세요." },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } },
    );
  }
  const { slug } = await context.params;
  const body: unknown = await request.json().catch(() => null);
  const parsed = updateResumeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.issues[0]?.message ?? "입력값을 확인해 주세요." },
      { status: 400 },
    );
  }
  try {
    const updated = await updateResume(
      slug,
      parsed.data.draft,
      request.cookies.get(editTokenCookieName(slug))?.value,
    );
    const result = await getPublicResume(updated.slug);
    return NextResponse.json({ resume: result ? toPublicResumeView(result) : null });
  } catch (error) {
    return mutationError(error);
  }
}

export async function DELETE(request: NextRequest, context: Context) {
  if (!hasTrustedMutationOrigin(request)) {
    return NextResponse.json({ message: "허용되지 않은 요청 출처입니다." }, { status: 403 });
  }
  const rateLimit = takeRateLimit(requestRateLimitKey(request.headers, "archive-resume"));
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { message: "요청이 많습니다. 잠시 후 다시 시도해 주세요." },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } },
    );
  }
  const { slug } = await context.params;
  try {
    await archiveResume(slug, request.cookies.get(editTokenCookieName(slug))?.value);
    const response = new NextResponse(null, { status: 204 });
    response.cookies.set(editTokenCookieName(slug), "", { path: "/", maxAge: 0 });
    return response;
  } catch (error) {
    return mutationError(error);
  }
}
