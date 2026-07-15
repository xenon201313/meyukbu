import { NextRequest, NextResponse } from "next/server";

import {
  ensurePartyMutation,
  ownerEditTokenForPartyPost,
  partyErrorResponse,
  partyPrivateHeaders,
} from "@/lib/party/route-helpers";
import { partyApplicationDecisionSchema } from "@/lib/validation/party-schemas";
import { decidePartyApplication } from "@/server/services/party-service";

export const runtime = "nodejs";

interface Context {
  params: Promise<{ slug: string; applicationId: string }>;
}

/** Lets the post owner accept or decline one pending application. */
export async function PATCH(request: NextRequest, context: Context) {
  const rejected = ensurePartyMutation(request, "decide-party-application", 18);
  if (rejected) {
    return rejected;
  }
  const body: unknown = await request.json().catch(() => null);
  const parsed = partyApplicationDecisionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: "지원 처리 방식을 확인해 주세요." },
      { status: 400, headers: partyPrivateHeaders },
    );
  }
  const { slug, applicationId } = await context.params;
  try {
    const application = await decidePartyApplication(
      slug,
      applicationId,
      parsed.data.decision,
      await ownerEditTokenForPartyPost(request, slug),
    );
    return NextResponse.json(
      { application: { id: application.id, status: application.status } },
      { headers: partyPrivateHeaders },
    );
  } catch (error) {
    return partyErrorResponse(error);
  }
}
