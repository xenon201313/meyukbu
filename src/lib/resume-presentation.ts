import { availabilityModeLabels, type AvailabilityMode, type AvailabilitySlot } from "@/domain/resume";

/** Formats the user-selected participation schedule consistently in every resume surface. */
export function formatResumeAvailability(
  availability: AvailabilitySlot[],
  availabilityMode: AvailabilityMode | undefined,
): string {
  if (availabilityMode === "FLEXIBLE") {
    return availabilityModeLabels.FLEXIBLE;
  }
  if (availabilityMode === "NEGOTIABLE") {
    return availabilityModeLabels.NEGOTIABLE;
  }
  if (!availability.length) {
    return "미입력";
  }

  return availability
    .map((slot) => `${slot.days.join(" · ")} ${slot.startTime} - ${slot.endTime} (한국 표준시)`)
    .join(" / ");
}
