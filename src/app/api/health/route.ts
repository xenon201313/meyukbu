import { NextResponse } from "next/server";

import { getEnvironment } from "@/lib/env";
import { getNexonProviderStatus } from "@/lib/nexon/provider";

export function GET() {
  const environment = getEnvironment();
  const providerStatus = getNexonProviderStatus(environment);

  return NextResponse.json({
    status: "ok",
    provider: providerStatus.activeMode,
    providerConfiguration: providerStatus,
    database: environment.MEYUKBU_STORAGE === "prisma" ? "prisma" : "memory-fallback",
  });
}
