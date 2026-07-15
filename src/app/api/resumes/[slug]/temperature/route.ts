import { NextRequest, NextResponse } from "next/server";

import { hasTrustedMutationOrigin } from "@/lib/auth/csrf";
import { requestRateLimitKey, takeRateLimit } from "@/lib/rate-limit";
import { mesoongiTemperatureSurveySubmitSchema } from "@/lib/validation/temperature-schemas";
import {
  getPublicMesoongiTemperatureSummary,
  MesoongiTemperatureSurveyNotFoundError,
  MesoongiTemperatureSurveyUnavailableError,
  submitMesoongiTemperatureSurvey,
} from "@/server/services/mesoongi-temperature-survey-service";
import { getPublicResume } from "@/server/services/resume-service";

export const runtime = "nodejs";

interface Context {
  params: Promise<{ slug: string }>;
}

function surveyErrorResponse(error: unknown): NextResponse {
  if (error instanceof MesoongiTemperatureSurveyNotFoundError) {
    return NextResponse.json({ message: "공개 메력서를 찾을 수 없습니다." }, { status: 404 });
  }
  if (error instanceof MesoongiTemperatureSurveyUnavailableError) {
    return NextResponse.json(
      { message: "초대 링크가 만료되었거나 이미 사용되었습니다. 새 링크를 받아 주세요." },
      { status: 409 },
    );
  }
  return NextResponse.json(
    { message: "메붕이 온도 설문을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요." },
    { status: 500 },
  );
}

/** Returns a privacy-safe, character-wide temperature aggregate. */
export async function GET(_request: NextRequest, context: Context) {
  const { slug } = await context.params;
  const result = await getPublicResume(slug);
  if (!result) {
    return NextResponse.json({ message: "공개 메력서를 찾을 수 없습니다." }, { status: 404 });
  }
  const summary = await getPublicMesoongiTemperatureSummary(result.resume);
  return NextResponse.json({ summary });
}

/** Accepts an anonymous answer bound only to a one-time invitation token. */
export async function POST(request: NextRequest, context: Context) {
  if (!hasTrustedMutationOrigin(request)) {
    return NextResponse.json({ message: "허용하지 않은 요청 출처입니다." }, { status: 403 });
  }
  const rateLimit = takeRateLimit(requestRateLimitKey(request.headers, "submit-temperature-survey"), 8);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { message: "요청이 많습니다. 잠시 후 다시 시도해 주세요." },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } },
    );
  }

  const { slug } = await context.params;
  const body: unknown = await request.json().catch(() => null);
  const parsed = mesoongiTemperatureSurveySubmitSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.issues[0]?.message ?? "설문 응답을 확인해 주세요." },
      { status: 400 },
    );
  }

  try {
    await submitMesoongiTemperatureSurvey(slug, parsed.data);
    const result = await getPublicResume(slug);
    if (!result) {
      throw new MesoongiTemperatureSurveyNotFoundError();
    }
    const summary = await getPublicMesoongiTemperatureSummary(result.resume);
    return NextResponse.json({ summary });
  } catch (error) {
    return surveyErrorResponse(error);
  }
}
