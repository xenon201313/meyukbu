import {
  availabilityModeLabels,
  targetBossCadenceLabels,
  type AvailabilityMode,
  type AvailabilitySlot,
  type TargetBossCadence,
} from "@/domain/resume";

/** Formats an optional Korean party schedule without inventing unavailable times. */
export function formatPartyAvailability(mode: AvailabilityMode, slots: readonly AvailabilitySlot[]): string {
  if (mode === "FLEXIBLE" || mode === "NEGOTIABLE") {
    return availabilityModeLabels[mode];
  }

  const formatted = slots
    .filter((slot) => slot.days.length > 0 && slot.startTime && slot.endTime)
    .map((slot) => `${slot.days.join(" · ")} ${slot.startTime}–${slot.endTime}`);

  return formatted.length ? formatted.join(" / ") : availabilityModeLabels.SCHEDULED;
}

/** Keeps boss labels consistent between the board, its detail view, and forms. */
export function formatPartyBossLabel(
  bossName: string,
  cadence: TargetBossCadence | null | undefined,
): string {
  return cadence ? `${targetBossCadenceLabels[cadence]} · ${bossName}` : bossName;
}

/** Shows a stable Korea-time timestamp while safely handling unexpected data. */
export function formatPartyDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "날짜 정보 없음";
  }

  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Seoul",
  }).format(date);
}

/** Shows remaining post lifetime as a compact, non-authoritative notice. */
export function formatPartyExpiry(expiresAt: string, now = new Date()): string {
  const target = new Date(expiresAt);
  const remaining = target.getTime() - now.getTime();
  if (!Number.isFinite(remaining) || remaining <= 0) {
    return "마감됨";
  }

  const days = Math.ceil(remaining / (24 * 60 * 60 * 1000));
  return days === 1 ? "마감까지 1일" : `마감까지 ${days}일`;
}
