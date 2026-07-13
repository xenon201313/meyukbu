import { NextRequest, NextResponse } from "next/server";

import { editTokenCookieName } from "@/lib/auth/edit-token";
import { hasTrustedMutationOrigin } from "@/lib/auth/csrf";
import { requestRateLimitKey, takeRateLimit } from "@/lib/rate-limit";
import { mesoongiTemperatureSubmitSchema } from "@/lib/validation/temperature-schemas";
import {
  getPublicMesoongiTemperatureFeedbacks,
  MesoongiTemperatureAuthorizationError,
  MesoongiTemperatureDuplicateFeedbackError,
  MesoongiTemperatureNotFoundError,
  MesoongiTemperatureSelfFeedbackError,
  MesoongiTemperatureUnavailableError,
  submitMesoongiTemperatureFeedback,
} from "@/server/services/mesoongi-temperature-service";
import { getPublicResume } from "@/server/services/resume-service";

export const runtime = "nodejs";

interface Context {
  params: Promise<{ slug: string }>;
}

function feedbackErrorResponse(error: unknown): NextResponse {
  if (error instanceof MesoongiTemperatureAuthorizationError) {
    return NextResponse.json(
      { message: "연결한 공개 메력서를 관리하는 브라우저에서만 동행 기록을 남길 수 있습니다." },
      { status: 403 },
    );
  }
  if (error instanceof MesoongiTemperatureNotFoundError) {
    return NextResponse.json({ message: "공개 메력서를 찾을 수 없습니다." }, { status: 404 });
  }
  if (error instanceof MesoongiTemperatureSelfFeedbackError) {
    return NextResponse.json({ message: "내 메력서에는 동행 기록을 남길 수 없습니다." }, { status: 409 });
  }
  if (error instanceof MesoongiTemperatureDuplicateFeedbackError) {
    return NextResponse.json({ message: "이 메력서에는 이미 동행 기록을 남겼습니다." }, { status: 409 });
  }
  if (error instanceof MesoongiTemperatureUnavailableError) {
    return NextResponse.json(
      { message: "초대 링크가 만료되었거나 이미 사용되었습니다. 새 링크를 받아 주세요." },
      { status: 409 },
    );
  }
  return NextResponse.json(
    { message: "동행 기록을 남기지 못했습니다. 잠시 후 다시 시도해 주세요." },
    { status: 500 },
  );
}

export async function GET(_request: NextRequest, context: Context) {
  const { slug } = await context.params;
  const result = await getPublicResume(slug);
  if (!result) {
    return NextResponse.json({ message: "공개 메력서를 찾을 수 없습니다." }, { status: 404 });
  }
  const feedbacks = await getPublicMesoongiTemperatureFeedbacks(result.resume, result.version);
  return NextResponse.json({ feedbacks });
}

export async function POST(request: NextRequest, context: Context) {
  if (!hasTrustedMutationOrigin(request)) {
    return NextResponse.json({ message: "허용되지 않은 요청 출처입니다." }, { status: 403 });
  }
  const rateLimit = takeRateLimit(requestRateLimitKey(request.headers, "submit-temperature"), 8);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { message: "요청이 많습니다. 잠시 후 다시 시도해 주세요." },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } },
    );
  }

  const { slug } = await context.params;
  const body: unknown = await request.json().catch(() => null);
  const parsed = mesoongiTemperatureSubmitSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.issues[0]?.message ?? "입력값을 확인해 주세요." },
      { status: 400 },
    );
  }

  try {
    const feedback = await submitMesoongiTemperatureFeedback(
      slug,
      parsed.data,
      request.cookies.get(editTokenCookieName(parsed.data.reviewerSlug))?.value,
    );
    return NextResponse.json({
      feedback: {
        id: feedback.id,
        reviewerSlug: feedback.reviewerSlug,
        tags: feedback.tags,
        publishedAt: feedback.createdAt,
      },
    });
  } catch (error) {
    return feedbackErrorResponse(error);
  }
}
