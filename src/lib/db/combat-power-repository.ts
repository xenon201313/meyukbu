import type { PeakCombatPower } from "@/domain/character";
import { getEnvironment } from "@/lib/env";
import { getPrismaClient } from "@/lib/db/prisma";

export interface CombatPowerObservation {
  ocid: string;
  characterName: string;
  worldName: string | null;
  /** Raw combat power parsed from the API stat; null when the stat was unavailable. */
  combatPower: number | null;
  observedAt: string;
}

export interface CombatPowerRepository {
  /**
   * Records one combat power observation and returns the highest value the
   * service has seen for the character, including the value just recorded.
   */
  record(observation: CombatPowerObservation): Promise<PeakCombatPower | null>;
  reset?(): void;
}

class InMemoryCombatPowerRepository implements CombatPowerRepository {
  private readonly peaks = new Map<string, PeakCombatPower>();

  async record(observation: CombatPowerObservation): Promise<PeakCombatPower | null> {
    const known = this.peaks.get(observation.ocid) ?? null;
    if (observation.combatPower === null) {
      return known;
    }
    if (!known || observation.combatPower > known.value) {
      const next = { value: observation.combatPower, observedAt: observation.observedAt };
      this.peaks.set(observation.ocid, next);
      return next;
    }
    return known;
  }

  reset(): void {
    this.peaks.clear();
  }
}

/** Prisma implementation keeps the peak on the stable Character row per ocid. */
class PrismaCombatPowerRepository implements CombatPowerRepository {
  async record(observation: CombatPowerObservation): Promise<PeakCombatPower | null> {
    const prisma = getPrismaClient();
    const existing = await prisma.character.findUnique({
      where: { ocid: observation.ocid },
      select: { peakCombatPower: true, peakCombatPowerAt: true },
    });
    const knownValue = existing?.peakCombatPower === null || existing?.peakCombatPower === undefined
      ? null
      : Number(existing.peakCombatPower);
    const known: PeakCombatPower | null =
      knownValue === null
        ? null
        : {
            value: knownValue,
            observedAt: existing?.peakCombatPowerAt?.toISOString() ?? observation.observedAt,
          };

    if (observation.combatPower === null || !Number.isSafeInteger(observation.combatPower)) {
      return known;
    }
    if (known && observation.combatPower <= known.value) {
      return known;
    }

    const observedAtDate = new Date(observation.observedAt);
    await prisma.character.upsert({
      where: { ocid: observation.ocid },
      create: {
        ocid: observation.ocid,
        name: observation.characterName,
        worldName: observation.worldName,
        lastSeenAt: observedAtDate,
        peakCombatPower: BigInt(observation.combatPower),
        peakCombatPowerAt: observedAtDate,
      },
      update: {
        peakCombatPower: BigInt(observation.combatPower),
        peakCombatPowerAt: observedAtDate,
        lastSeenAt: observedAtDate,
      },
    });
    return { value: observation.combatPower, observedAt: observation.observedAt };
  }
}

declare global {
  var meyukbuCombatPowerRepository: InMemoryCombatPowerRepository | undefined;
  var meyukbuPrismaCombatPowerRepository: PrismaCombatPowerRepository | undefined;
}

export function getCombatPowerRepository(): CombatPowerRepository {
  const environment = getEnvironment();
  if (environment.MEYUKBU_STORAGE === "prisma") {
    if (!globalThis.meyukbuPrismaCombatPowerRepository) {
      globalThis.meyukbuPrismaCombatPowerRepository = new PrismaCombatPowerRepository();
    }
    return globalThis.meyukbuPrismaCombatPowerRepository;
  }
  if (!globalThis.meyukbuCombatPowerRepository) {
    globalThis.meyukbuCombatPowerRepository = new InMemoryCombatPowerRepository();
  }
  return globalThis.meyukbuCombatPowerRepository;
}

export function resetInMemoryCombatPowerRepository(): void {
  globalThis.meyukbuCombatPowerRepository?.reset();
}
