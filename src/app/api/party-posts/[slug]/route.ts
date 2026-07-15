import { NextRequest, NextResponse } from "next/server";

import {
  ensurePartyMutation,
  ownerEditTokenForPartyPost,
  partyErrorResponse,
  partyPrivateHeaders,
} from "@/lib/party/route-helpers";
import { closePartyPostSchema } from "@/lib/validation/party-schemas";
import { closePartyPost, getPublicPartyPost } from "@/server/services/party-service";

export const runtime = "nodejs";

interface Context {
  params: Promise<{ slug: string }>;
}

/** Reads a discoverable post without exposing owner-only applications or messages. */
export async function GET(_request: NextRequest, context: Context) {
  const { slug } = await context.params;
  try {
    const post = await getPublicPartyPost(slug);
    if (!post) {
      return NextResponse.json({ message: "파티 게시글을 찾지 못했습니다." }, { status: 404 });
    }
    return NextResponse.json({ post }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json(
      { message: "파티 게시글을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요." },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}

/** Closes a post for its resume owner while keeping the private audit trail intact. */
export async function PATCH(request: NextRequest, context: Context) {
  const rejected = ensurePartyMutation(request, "close-party-post", 10);
  if (rejected) {
    return rejected;
  }
  const body: unknown = await request.json().catch(() => null);
  const parsed = closePartyPostSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: "요청을 확인해 주세요." },
      { status: 400, headers: partyPrivateHeaders },
    );
  }
  const { slug } = await context.params;
  try {
    await closePartyPost(slug, await ownerEditTokenForPartyPost(request, slug));
    return NextResponse.json({ closed: true }, { headers: partyPrivateHeaders });
  } catch (error) {
    return partyErrorResponse(error);
  }
}
