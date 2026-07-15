import { z } from "zod";

import { findBossOption, findBossOptionById, maxPartySizeForBoss } from "@/content/bosses";
import {
  availabilityModeValues,
  contactTypeValues,
  maxResumeBossTargets,
  partySizeValues,
  partyTypeValues,
  resumeRoleValues,
  targetBossCadenceValues,
  voiceChatValues,
  type ResumeBossTarget,
} from "@/domain/resume";

const characterNamePattern = /^[가-힣A-Za-z0-9_]+$/u;
const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;

export const characterNameSchema = z
  .string()
  .trim()
  .min(2, "캐릭터명은 2자 이상 입력해 주세요.")
  .max(12, "캐릭터명은 12자 이하로 입력해 주세요.")
  .regex(characterNamePattern, "한글, 영문, 숫자, 밑줄만 사용할 수 있습니다.");

const availabilitySchema = z
  .object({
    days: z
      .array(z.enum(["월", "화", "수", "목", "금", "토", "일"]))
      .min(1, "요일을 하나 이상 선택해 주세요."),
    startTime: z.string().regex(timePattern, "시작 시간을 확인해 주세요."),
    endTime: z.string().regex(timePattern, "종료 시간을 확인해 주세요."),
    timezone: z.literal("Asia/Seoul"),
  })
  .refine((slot) => slot.startTime < slot.endTime, {
    message: "종료 시간은 시작 시간보다 뒤여야 합니다.",
    path: ["endTime"],
  });

const contactSchema = z.object({
  type: z.enum(contactTypeValues),
  value: z.string().trim().min(2).max(80),
  isPublic: z.boolean(),
});

const partySizeSchema = z.union(partySizeValues.map((value) => z.literal(value)));

const bossMultiplierPercentSchema = z
  .string()
  .trim()
  .max(40, "보스 배율은 40자 이하로 입력해 주세요.")
  .regex(/^\d[\d,]*(?:\.\d+)?$/, "보스 배율은 숫자로 입력해 주세요.")
  .optional();

/** Converts a client-supplied catalog id into durable, versioned display data. */
const bossTargetInputSchema = z
  .object({
    bossId: z.string().trim().min(1, "목록에서 희망 보스를 선택해 주세요."),
    bossMultiplierPercent: bossMultiplierPercentSchema,
  })
  .transform((input, context): ResumeBossTarget | typeof z.NEVER => {
    const boss = findBossOptionById(input.bossId);
    if (!boss) {
      context.addIssue({
        code: "custom",
        path: ["bossId"],
        message: "목록에서 희망 보스를 선택해 주세요.",
      });
      return z.NEVER;
    }

    return {
      bossId: boss.id,
      bossName: boss.name,
      cadence: boss.cadence,
      bossMultiplierPercent: input.bossMultiplierPercent,
    };
  });

const commonResumeDraftSchema = z.object({
  convertedStat: z.string().trim().max(40, "환산은 40자 이하로 입력해 주세요.").optional(),
  role: z.enum(resumeRoleValues),
  partyType: z.enum(partyTypeValues),
  partySize: partySizeSchema.optional(),
  availabilityMode: z.enum(availabilityModeValues).optional(),
  availability: z.array(availabilitySchema).max(3),
  voiceChat: z.enum(voiceChatValues),
  lootPolicy: z.string().trim().max(80).optional(),
  experienceSummary: z.string().trim().max(280).optional(),
  roleSummary: z.string().trim().max(220).optional(),
  contact: contactSchema.optional(),
  theme: z.enum(["RESUME", "MINIMAL"]),
});

/**
 * Accepts the new multi-boss payload and scalar-only legacy payloads. Output
 * always provides bossTargets and primary scalar aliases for existing readers.
 */
export const resumeDraftSchema = commonResumeDraftSchema
  .extend({
    targetBoss: z.string().trim().optional(),
    targetBossCadence: z.enum(targetBossCadenceValues).optional(),
    bossMultiplierPercent: bossMultiplierPercentSchema,
    bossTargets: z.array(bossTargetInputSchema).min(1).max(maxResumeBossTargets).optional(),
  })
  .transform((draft, context) => {
    const suppliedTargets = draft.bossTargets;
    if (suppliedTargets?.length) {
      const primaryTarget = suppliedTargets[0];
      if (!primaryTarget) {
        context.addIssue({
          code: "custom",
          path: ["bossTargets"],
          message: "희망 보스를 하나 이상 선택해 주세요.",
        });
        return z.NEVER;
      }

      return {
        ...draft,
        bossTargets: suppliedTargets,
        targetBoss: primaryTarget.bossName,
        targetBossCadence: primaryTarget.cadence,
        bossMultiplierPercent: primaryTarget.bossMultiplierPercent,
      };
    }

    const targetBoss = draft.targetBoss;
    const targetBossCadence = draft.targetBossCadence;
    if (!targetBoss) {
      context.addIssue({
        code: "custom",
        path: ["targetBoss"],
        message: "목표 보스를 목록에서 선택해 주세요.",
      });
      return z.NEVER;
    }
    if (targetBoss.length > 60) {
      context.addIssue({
        code: "custom",
        path: ["targetBoss"],
        message: "목표 보스는 60자 이하로 입력해 주세요.",
      });
      return z.NEVER;
    }
    if (!targetBossCadence) {
      context.addIssue({
        code: "custom",
        path: ["targetBossCadence"],
        message: "주간 또는 월간 보스를 선택해 주세요.",
      });
      return z.NEVER;
    }

    const boss = findBossOption(targetBossCadence, targetBoss);
    if (!boss) {
      context.addIssue({
        code: "custom",
        path: ["targetBoss"],
        message: "목록에서 희망 보스를 선택해 주세요.",
      });
      return z.NEVER;
    }

    const legacyTarget: ResumeBossTarget = {
      bossId: boss.id,
      bossName: boss.name,
      cadence: boss.cadence,
      bossMultiplierPercent: draft.bossMultiplierPercent,
    };
    return {
      ...draft,
      targetBoss: boss.name,
      targetBossCadence: boss.cadence,
      bossMultiplierPercent: legacyTarget.bossMultiplierPercent,
      bossTargets: [legacyTarget],
    };
  })
  .superRefine((draft, context) => {
    const bossIds = new Set<string>();
    let maxPartySize = 6;
    let limitingBossName: string | undefined;

    for (const [index, target] of draft.bossTargets.entries()) {
      const bossId = target.bossId;
      if (!bossId) {
        context.addIssue({
          code: "custom",
          path: ["bossTargets", index, "bossId"],
          message: "목록에서 희망 보스를 선택해 주세요.",
        });
        continue;
      }
      if (bossIds.has(bossId)) {
        context.addIssue({
          code: "custom",
          path: ["bossTargets", index, "bossId"],
          message: "같은 보스는 한 번만 선택할 수 있습니다.",
        });
        continue;
      }
      bossIds.add(bossId);

      const boss = findBossOptionById(bossId);
      if (!boss) {
        context.addIssue({
          code: "custom",
          path: ["bossTargets", index, "bossId"],
          message: "목록에서 희망 보스를 선택해 주세요.",
        });
        continue;
      }
      const targetMaxPartySize = maxPartySizeForBoss(boss);
      if (targetMaxPartySize < maxPartySize) {
        maxPartySize = targetMaxPartySize;
        limitingBossName = boss.name;
      }
    }

    if (draft.partySize && draft.partySize > maxPartySize) {
      context.addIssue({
        code: "custom",
        path: ["partySize"],
        message: `${limitingBossName ?? "선택한 보스"}은(는) 최대 ${maxPartySize}인격까지 입장할 수 있습니다.`,
      });
    }

    if ((draft.availabilityMode ?? "SCHEDULED") === "SCHEDULED" && !draft.availability.length) {
      context.addIssue({
        code: "custom",
        path: ["availability"],
        message: "가능 시간을 하나 이상 입력해 주세요.",
      });
    }
  });

export const createResumeSchema = z.object({
  characterName: characterNameSchema,
  draft: resumeDraftSchema,
});

export const updateResumeSchema = z.object({
  draft: resumeDraftSchema,
});

export type ResumeDraftInput = z.infer<typeof resumeDraftSchema>;
