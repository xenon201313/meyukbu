import { z } from "zod";
import { Prisma } from "@prisma/client";

import { findBossOption } from "@/content/bosses";
import type { NormalizedCharacterProfile } from "@/domain/character";
import { dataProvenanceValues } from "@/domain/provenance";
import {
  availabilityModeValues,
  contactTypeValues,
  maxResumeBossTargets,
  partySizeValues,
  partyTypeValues,
  resumeRoleValues,
  type ResumeBossTarget,
  type ResumeDraft,
  voiceChatValues,
} from "@/domain/resume";

/** Serializes data for Prisma JSON fields without trusting a type assertion. */
export function toPrismaJson(value: unknown): Prisma.InputJsonValue {
  if (value === null) {
    throw new Error("A top-level Prisma JSON value cannot be null.");
  }
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => (item === null ? null : toPrismaJson(item)));
  }
  if (value && typeof value === "object") {
    const object: Record<string, Prisma.InputJsonValue | null> = {};
    for (const [key, child] of Object.entries(value)) {
      object[key] = child === null ? null : toPrismaJson(child);
    }
    return object;
  }
  throw new Error("Unsupported JSON value.");
}

const profileSchema = z.object({
  ocid: z.string(),
  characterName: z.string(),
  worldName: z.string().nullable(),
  className: z.string().nullable(),
  level: z.number().nullable(),
  imageUrl: z.string().nullable(),
  currentGuild: z.string().nullable(),
  fetchedAt: z.string(),
  sourceDate: z.string().nullable(),
  provider: z.enum(["mock", "live"]),
  fields: z.array(
    z.object({
      key: z.string(),
      label: z.string(),
      value: z.union([z.string(), z.number(), z.null()]),
      unit: z.string().optional(),
      provenance: z.enum(dataProvenanceValues),
      category: z.enum(["combat", "growth", "record", "equipment", "identity"]),
      priorityByRole: z
        .object({
          DAMAGE: z.number().optional(),
          SUPPORT: z.number().optional(),
          UTILITY: z.number().optional(),
          OTHER: z.number().optional(),
        })
        .optional(),
    }),
  ),
  stats: z
    .array(
      z.object({
        label: z.string(),
        value: z.string(),
      }),
    )
    .default([]),
  peakCombatPower: z.object({ value: z.number(), observedAt: z.string() }).nullable().optional(),
  equipmentPresetNo: z.number().int().nullable().default(null),
  equipment: z
    .array(
      z.object({
        slot: z.string().nullable(),
        part: z.string().nullable(),
        name: z.string(),
        iconUrl: z.string().nullable(),
        shapeName: z.string().nullable(),
        shapeIconUrl: z.string().nullable(),
        description: z.string().nullable(),
        starforce: z.string().nullable(),
        scrollUpgrade: z.string().nullable(),
        potentialGrade: z.string().nullable(),
        potentialOptions: z.array(z.string()),
        additionalPotentialGrade: z.string().nullable(),
        additionalPotentialOptions: z.array(z.string()),
        totalOptions: z.array(z.object({ label: z.string(), value: z.string() })),
        baseOptions: z.array(z.object({ label: z.string(), value: z.string() })),
        addOptions: z.array(z.object({ label: z.string(), value: z.string() })),
        exceptionalOptions: z.array(z.object({ label: z.string(), value: z.string() })),
        etcOptions: z.array(z.object({ label: z.string(), value: z.string() })),
        soulName: z.string().nullable(),
        soulOption: z.string().nullable(),
      }),
    )
    .default([]),
  symbols: z
    .array(
      z.object({
        name: z.string(),
        iconUrl: z.string().nullable(),
        level: z.string().nullable(),
        force: z.string().nullable(),
        stats: z.array(z.object({ label: z.string(), value: z.string() })),
      }),
    )
    .default([]),
  cashEquipment: z
    .array(
      z.object({
        slot: z.string().nullable(),
        part: z.string().nullable(),
        name: z.string(),
        iconUrl: z.string().nullable(),
        expiresAt: z.string().nullable(),
      }),
    )
    .default([]),
  setEffects: z
    .array(
      z.object({
        name: z.string(),
        equippedCount: z.string().nullable(),
        effects: z.array(z.object({ setCount: z.string().nullable(), options: z.array(z.string()) })),
      }),
    )
    .default([]),
  rawAvailability: z.record(z.string(), z.enum(["available", "missing", "unsupported"])),
  notice: z.string().optional(),
});

const storedBossTargetSchema = z.object({
  bossId: z.string().optional(),
  bossName: z.string(),
  cadence: z.enum(["WEEKLY", "MONTHLY"]).optional(),
  bossMultiplierPercent: z.string().optional(),
});

function normalizeStoredBossTarget(target: ResumeBossTarget): ResumeBossTarget {
  if (target.bossId || !target.cadence) {
    return target;
  }
  const catalogued = findBossOption(target.cadence, target.bossName);
  return catalogued ? { ...target, bossId: catalogued.id } : target;
}

/**
 * Parses both immutable scalar-only versions and new multi-boss versions.
 * It only derives a catalog id for legacy display; it never rewrites database JSON.
 */
const draftSchema = z
  .object({
    targetBoss: z.string().optional(),
    targetBossCadence: z.enum(["WEEKLY", "MONTHLY"]).optional(),
    convertedStat: z.string().optional(),
    bossMultiplierPercent: z.string().optional(),
    bossTargets: z.array(storedBossTargetSchema).min(1).max(maxResumeBossTargets).optional(),
    role: z.enum(resumeRoleValues),
    partyType: z.enum(partyTypeValues),
    partySize: z.union(partySizeValues.map((value) => z.literal(value))).optional(),
    availabilityMode: z.enum(availabilityModeValues).default("SCHEDULED"),
    availability: z.array(
      z.object({
        days: z.array(z.string()),
        startTime: z.string(),
        endTime: z.string(),
        timezone: z.literal("Asia/Seoul"),
      }),
    ),
    voiceChat: z.enum(voiceChatValues),
    lootPolicy: z.string().optional(),
    experienceSummary: z.string().optional(),
    roleSummary: z.string().optional(),
    contact: z
      .object({ type: z.enum(contactTypeValues), value: z.string(), isPublic: z.boolean() })
      .optional(),
    theme: z.enum(["RESUME", "MINIMAL"]),
  })
  .transform((draft, context) => {
    const explicitTargets = draft.bossTargets?.map(normalizeStoredBossTarget);
    if (explicitTargets?.length) {
      const primaryTarget = explicitTargets[0];
      if (!primaryTarget) {
        context.addIssue({
          code: "custom",
          path: ["bossTargets"],
          message: "Stored boss target is missing.",
        });
        return z.NEVER;
      }
      return {
        ...draft,
        bossTargets: explicitTargets,
        targetBoss: primaryTarget.bossName,
        targetBossCadence: primaryTarget.cadence,
        bossMultiplierPercent: primaryTarget.bossMultiplierPercent,
      };
    }

    if (!draft.targetBoss) {
      context.addIssue({ code: "custom", path: ["targetBoss"], message: "Stored target boss is missing." });
      return z.NEVER;
    }
    const legacyTarget = normalizeStoredBossTarget({
      bossName: draft.targetBoss,
      cadence: draft.targetBossCadence,
      bossMultiplierPercent: draft.bossMultiplierPercent,
    });
    return {
      ...draft,
      bossTargets: [legacyTarget],
      targetBoss: legacyTarget.bossName,
      targetBossCadence: legacyTarget.cadence,
      bossMultiplierPercent: legacyTarget.bossMultiplierPercent,
    };
  });

export function parseStoredProfile(value: unknown): NormalizedCharacterProfile {
  return profileSchema.parse(value);
}

export function parseStoredDraft(value: unknown): ResumeDraft {
  return draftSchema.parse(value);
}
