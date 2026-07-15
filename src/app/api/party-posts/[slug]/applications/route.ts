import { NextRequest, NextResponse } from "next/server";

import { editTokenCookieName } from "@/lib/auth/edit-token";
import {
  ensurePartyMutation,
  ownerEditTokenForPartyPost,
  partyErrorResponse,
  partyPrivateHeaders,
} from "@/lib/party/route-helpers";
import { createPartyApplicationSchema } from "@/lib/validation/party-schemas";
import { applyToPartyPost, getPartyPostForOwner } from "@/server/services/party-service";

export const runtime = "nodejs";

interface Context {
  params: Promise<{ slug: string }>;
}

/** Shows the applicant queue only to the owner of the post's pinned resume. */
export async function GET(request: NextRequest, context: Context) {
  const { slug } = await context.params;
  try {
    const post = await getPartyPostForOwner(slug, await ownerEditTokenForPartyPost(request, slug));
    return NextResponse.json({ post }, { headers: partyPrivateHeaders });
  } catch (error) {
    return partyErrorResponse(error);
  }
}

/** Applies using a separately owned resume, never a public slug alone. */
export async function POST(request: NextRequest, context: Context) {
  const rejected = ensurePartyMutation(request, "apply-party-post", 12);
  if (rejected) {
    return rejected;
  }
  const body: unknown = await request.json().catch(() => null);
  const parsed = createPartyApplicationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.issues[0]?.message ?? "지원 내용을 확인해 주세요." },
      { status: 400, headers: partyPrivateHeaders },
    );
  }
  const { slug } = await context.params;
  try {
    const application = await applyToPartyPost(
      slug,
      parsed.data,
      request.cookies.get(editTokenCookieName(parsed.data.applicantResumeSlug))?.value,
    );
    return NextResponse.json(
      { application: { id: application.id, status: application.status } },
      { status: 201, headers: partyPrivateHeaders },
    );
  } catch (error) {
    return partyErrorResponse(error);
  }
}
