import { NextRequest, NextResponse } from "next/server";

import { editTokenCookieName } from "@/lib/auth/edit-token";
import { hasTrustedMutationOrigin } from "@/lib/auth/csrf";
import { getEnvironment } from "@/lib/env";
import { requestRateLimitKey, takeRateLimit } from "@/lib/rate-limit";
import { mesoongiTemperatureInviteSchema } from "@/lib/validation/temperature-schemas";
import {
  createMesoongiTemperatureInvitation,
  MesoongiTemperatureAuthorizationError,
  MesoongiTemperatureNotFoundError,
} from "@/server/services/mesoongi-temperature-service";

export const runtime = "nodejs";

interface Context {
  params: Promise<{ slug: string }>;
}

export async function POST(request: NextRequest, context: Context) {
  if (!hasTrustedMutationOrigin(request)) {
    return NextResponse.json({ message: "허용되지 않은 요청 출처입니다." }, { status: 403 });
  }
  const rateLimit = takeRateLimit(requestRateLimitKey(request.headers, "issue-temperature-invite"), 10);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { message: "요청이 많습니다. 잠시 후 다시 시도해 주세요." },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } },
    );
  }

  const body: unknown = await request.json().catch(() => null);
  const parsed = mesoongiTemperatureInviteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: "초대 링크 요청 형식이 올바르지 않습니다." }, { status: 400 });
  }

  const { slug } = await context.params;
  try {
    const issued = await createMesoongiTemperatureInvitation(
      slug,
      request.cookies.get(editTokenCookieName(slug))?.value,
    );
    const invitationUrl = new URL(`/r/${encodeURIComponent(slug)}/temperature`, getEnvironment().APP_ORIGIN);
    invitationUrl.hash = new URLSearchParams({ invite: issued.rawToken }).toString();

    return NextResponse.json({
      invitation: issued.invitation,
      url: invitationUrl.toString(),
    });
  } catch (error) {
    if (error instanceof MesoongiTemperatureAuthorizationError) {
      return NextResponse.json({ message: "이 메력서의 관리 권한이 없습니다." }, { status: 403 });
    }
    if (error instanceof MesoongiTemperatureNotFoundError) {
      return NextResponse.json({ message: "공개 메력서를 찾을 수 없습니다." }, { status: 404 });
    }
    return NextResponse.json(
      { message: "초대 링크를 만들지 못했습니다. 잠시 후 다시 시도해 주세요." },
      { status: 500 },
    );
  }
}
