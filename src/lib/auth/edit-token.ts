import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

import { getEnvironment } from "@/lib/env";

/** Generates a 256-bit bearer token. Only its one-way hash is persisted. */
export function createEditToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashEditToken(token: string): string {
  const secret = getEnvironment().APP_SECRET;
  return createHash("sha256").update(`${secret}:${token}`).digest("hex");
}

export function verifyEditToken(token: string | undefined, expectedHash: string): boolean {
  if (!token) {
    return false;
  }
  const received = Buffer.from(hashEditToken(token), "utf8");
  const expected = Buffer.from(expectedHash, "utf8");
  return received.length === expected.length && timingSafeEqual(received, expected);
}

export function editTokenCookieName(slug: string): string {
  return `meyukbu_edit_${slug}`;
}
