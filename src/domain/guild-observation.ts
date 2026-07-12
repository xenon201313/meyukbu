import type { GuildObservation } from "@/domain/resume";

export interface GuildSnapshotInput {
  guildName: string | null;
  observedAt: string;
  sourceSnapshotId: string;
}

/** Appends or closes only observations witnessed by this service. */
export function transitionGuildObservation(
  previous: GuildObservation[],
  next: GuildSnapshotInput,
): GuildObservation[] {
  const observations = previous.map((observation) => ({ ...observation }));
  const active = observations.find((observation) => observation.observedTo === null);

  if (!active) {
    return [
      ...observations,
      {
        id: `guild-${next.sourceSnapshotId}`,
        guildName: next.guildName,
        observedFrom: next.observedAt,
        lastObservedAt: next.observedAt,
        observedTo: null,
        sourceSnapshotId: next.sourceSnapshotId,
      },
    ];
  }

  if (active.guildName === next.guildName) {
    active.lastObservedAt = next.observedAt;
    active.sourceSnapshotId = next.sourceSnapshotId;
    return observations;
  }

  active.observedTo = next.observedAt;
  return [
    ...observations,
    {
      id: `guild-${next.sourceSnapshotId}`,
      guildName: next.guildName,
      observedFrom: next.observedAt,
      lastObservedAt: next.observedAt,
      observedTo: null,
      sourceSnapshotId: next.sourceSnapshotId,
    },
  ];
}
