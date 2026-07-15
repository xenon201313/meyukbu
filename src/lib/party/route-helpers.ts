import { NextRequest, NextResponse } from "next/server";

import { hasTrustedMutationOrigin } from "@/lib/auth/csrf";
import { editTokenCookieName } from "@/lib/auth/edit-token";
import { getPartyRepository } from "@/lib/db/party-repository";
import { requestRateLimitKey, takeRateLimit } from "@/lib/rate-limit";
import {
  PartyApplicationDecisionError,
  PartyApplicationDuplicateError,
  PartyApplicationIneligibleError,
  PartyApplicationNotFoundError,
  PartyPostAuthorizationError,
  PartyPostInputError,
  PartyPostNotFoundError,
  PartyPostUnavailableError,
} from "@/server/services/party-service";

const privateHeaders = { "Cache-Control": "private, no-store, max-age=0", Vary: "Cookie" };

/** Returns a uniform Korean error without leaking repository or token details. */
export function partyErrorResponse(error: unknown, headers?: HeadersInit): NextResponse {
  const responseHeaders = headers ?? privateHeaders;
  if (error instanceof PartyPostNotFoundError || error instanceof PartyApplicationNotFoundError) {
    return NextResponse.json({ message: error.message }, { status: 404, headers: responseHeaders });
  }
  if (error instanceof PartyPostAuthorizationError) {
    return NextResponse.json(
      { message: "이 작업을 수행할 권한이 없습니다." },
      { status: 403, headers: responseHeaders },
    );
  }
  if (error instanceof PartyPostUnavailableError || error instanceof PartyApplicationDecisionError) {
    return NextResponse.json({ message: error.message }, { status: 409, headers: responseHeaders });
  }
  if (error instanceof PartyPostInputError || error instanceof PartyApplicationIneligibleError) {
    return NextResponse.json({ message: error.message }, { status: 400, headers: responseHeaders });
  }
  if (error instanceof PartyApplicationDuplicateError) {
    return NextResponse.json({ message: error.message }, { status: 409, headers: responseHeaders });
  }
  return NextResponse.json(
    { message: "파티 게시판 요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요." },
    { status: 500, headers: responseHeaders },
  );
}

/** Rejects cross-site party mutations and gives all routes the same conservative rate limit. */
export function ensurePartyMutation(request: NextRequest, scope: string, limit = 12): NextResponse | null {
  if (!hasTrustedMutationOrigin(request)) {
    return NextResponse.json(
      { message: "허용되지 않은 요청 출처입니다." },
      { status: 403, headers: privateHeaders },
    );
  }
  const rateLimit = takeRateLimit(requestRateLimitKey(request.headers, scope), limit);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { message: "요청이 많습니다. 잠시 후 다시 시도해 주세요." },
      {
        status: 429,
        headers: { ...privateHeaders, "Retry-After": String(rateLimit.retryAfterSeconds) },
      },
    );
  }
  return null;
}

/** Reads the owner cookie only after resolving the post; it is never accepted from a request body. */
export async function ownerEditTokenForPartyPost(
  request: NextRequest,
  slug: string,
): Promise<string | undefined> {
  const post = await getPartyRepository().findPostBySlug(slug);
  if (!post) {
    throw new PartyPostNotFoundError("파티 게시글을 찾을 수 없습니다.");
  }
  return request.cookies.get(editTokenCookieName(post.ownerResumeSlug))?.value;
}

export { privateHeaders as partyPrivateHeaders };
