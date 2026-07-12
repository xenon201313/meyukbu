import { NextRequest, NextResponse } from "next/server";

import { NexonProviderError, userFacingNexonError } from "@/lib/nexon/errors";
import { getNexonProviderStatus } from "@/lib/nexon/provider";
import { characterNameSchema } from "@/lib/validation/schemas";
import { resolveProfileByName } from "@/server/services/resume-service";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const parsedName = characterNameSchema.safeParse(request.nextUrl.searchParams.get("name") ?? "");
  if (!parsedName.success) {
    return NextResponse.json(
      { message: parsedName.error.issues[0]?.message ?? "캐릭터명을 입력해 주세요." },
      { status: 400 },
    );
  }

  try {
    const profile = await resolveProfileByName(parsedName.data);
    return NextResponse.json({
      profile,
      mode: profile.provider,
      providerConfiguration: getNexonProviderStatus(),
    });
  } catch (error) {
    const providerStatus = getNexonProviderStatus();
    const status = error instanceof NexonProviderError ? error.status : 502;
    const mockSearchMiss =
      providerStatus.activeMode === "mock" &&
      error instanceof NexonProviderError &&
      error.code === "NOT_FOUND";

    return NextResponse.json(
      {
        message: mockSearchMiss
          ? "현재 데모 모드입니다. 실제 캐릭터를 검색하려면 NEXON_PROVIDER=live 및 NEXON_OPEN_API_KEY를 설정한 뒤 서버를 다시 시작하세요."
          : userFacingNexonError(error),
        providerConfiguration: providerStatus,
      },
      { status },
    );
  }
}
