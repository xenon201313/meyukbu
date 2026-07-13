import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

import { getEnvironment } from "@/lib/env";

const editTokenCookiePrefix = "meyukbu_edit_";
const maxOwnedResumeCookieReferences = 40;
const resumeSlugPattern = /^[A-Za-z0-9_-]{1,96}$/;
const editTokenPattern = /^[A-Za-z0-9_-]{32,256}$/;

export interface EditTokenCookie {
  name: string;
  value: string;
}

/** A bearer token read only on the server from its per-resume HttpOnly cookie. */
export interface OwnedResumeEditTokenReference {
  slug: string;
  editToken: string;
}

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
  return `${editTokenCookiePrefix}${slug}`;
}

/**
 * Extracts bounded, well-formed resume edit-token references from a request's
 * cookies. The slug is only a lookup hint: every token is verified against the
 * stored hash before a resume can be returned.
 */
export function ownedResumeEditTokenReferences(
  cookies: Iterable<EditTokenCookie>,
): OwnedResumeEditTokenReference[] {
  const references: OwnedResumeEditTokenReference[] = [];
  const seenSlugs = new Set<string>();

  for (const cookie of cookies) {
    if (!cookie.name.startsWith(editTokenCookiePrefix)) {
      continue;
    }
    const slug = cookie.name.slice(editTokenCookiePrefix.length);
    if (
      seenSlugs.has(slug) ||
      !resumeSlugPattern.test(slug) ||
      !editTokenPattern.test(cookie.value) ||
      references.length >= maxOwnedResumeCookieReferences
    ) {
      continue;
    }
    seenSlugs.add(slug);
    references.push({ slug, editToken: cookie.value });
  }

  return references;
}
