import type { NextRequest } from "next/server";

import { getEnvironment } from "@/lib/env";

/** Rejects cross-site mutations while allowing direct same-site browser navigation. */
export function hasTrustedMutationOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");
  const expected = new URL(getEnvironment().APP_ORIGIN);

  const trusted = (value: string | null): boolean => {
    if (!value) {
      return true;
    }
    try {
      const parsed = new URL(value);
      return parsed.origin === expected.origin || parsed.host === request.headers.get("host");
    } catch {
      return false;
    }
  };

  return trusted(origin) && trusted(referer);
}
