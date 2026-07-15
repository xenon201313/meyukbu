/**
 * Maple worlds that can form parties together. The API only gives us the
 * world name, so this small mapping is deliberately centralized and applied
 * on the server before a party post or application is accepted.
 */
export const partyWorldGroupValues = ["MAIN", "EOS_HELIOS", "CHALLENGERS"] as const;

export type PartyWorldGroup = (typeof partyWorldGroupValues)[number];

export const partyWorldGroupLabels: Record<PartyWorldGroup, string> = {
  MAIN: "본서버",
  EOS_HELIOS: "에오스 · 헬리오스",
  CHALLENGERS: "챌린저스",
};

function normalizedWorldName(worldName: string | null | undefined): string | null {
  const normalized = worldName?.replace(/\s+/gu, "").trim();
  return normalized || null;
}

/**
 * Resolves the game rule for cross-world party formation.
 *
 * - 에오스/헬리오스 are one isolated group.
 * - 챌린저스 variants are one isolated group.
 * - Every other named world belongs to the regular-server group.
 *
 * A missing world is intentionally unknown rather than treated as 본서버, so
 * the server never grants a party application whose world compatibility it
 * cannot verify.
 */
export function partyWorldGroupFor(worldName: string | null | undefined): PartyWorldGroup | null {
  const normalized = normalizedWorldName(worldName);
  if (!normalized) {
    return null;
  }
  if (normalized === "에오스" || normalized === "헬리오스") {
    return "EOS_HELIOS";
  }
  if (normalized.startsWith("챌린저스")) {
    return "CHALLENGERS";
  }
  return "MAIN";
}

/** Returns true only when both known worlds belong to the same party group. */
export function canFormPartyTogether(
  leftWorldName: string | null | undefined,
  rightWorldName: string | null | undefined,
): boolean {
  const left = partyWorldGroupFor(leftWorldName);
  const right = partyWorldGroupFor(rightWorldName);
  return left !== null && left === right;
}
