import { NextRequest, NextResponse } from "next/server";

import { editTokenCookieName } from "@/lib/auth/edit-token";
import { ensurePartyMutation, partyErrorResponse, partyPrivateHeaders } from "@/lib/party/route-helpers";
import { createPartyPostSchema } from "@/lib/validation/party-schemas";
import { createPartyPost, getPublicPartyPosts } from "@/server/services/party-service";

export const runtime = "nodejs";

/** Lists current public recruit / looking-for-party posts. */
export async function GET() {
  try {
    const posts = await getPublicPartyPosts();
    return NextResponse.json({ posts }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json(
      { message: "파티 게시글을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요." },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}

/** Creates an open, seven-day post from an edit-token-owned current resume. */
export async function POST(request: NextRequest) {
  const rejected = ensurePartyMutation(request, "create-party-post", 10);
  if (rejected) {
    return rejected;
  }
  const body: unknown = await request.json().catch(() => null);
  const parsed = createPartyPostSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.issues[0]?.message ?? "파티 게시글 정보를 확인해 주세요." },
      { status: 400, headers: partyPrivateHeaders },
    );
  }
  try {
    const post = await createPartyPost(
      parsed.data,
      request.cookies.get(editTokenCookieName(parsed.data.ownerResumeSlug))?.value,
    );
    return NextResponse.json({ post: { slug: post.slug } }, { status: 201, headers: partyPrivateHeaders });
  } catch (error) {
    return partyErrorResponse(error);
  }
}
