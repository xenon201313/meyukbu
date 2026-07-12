import { z } from "zod";

import {
  contactTypeValues,
  partyTypeValues,
  resumeRoleValues,
  targetBossCadenceValues,
  voiceChatValues,
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

export const resumeDraftSchema = z.object({
  targetBoss: z.string().trim().min(1, "목표 보스를 입력해 주세요.").max(60),
  targetBossCadence: z.enum(targetBossCadenceValues).optional(),
  difficulty: z.string().trim().min(1, "난이도를 입력해 주세요.").max(40),
  convertedStat: z.string().trim().max(40, "환산은 40자 이하로 입력해 주세요.").optional(),
  bossMultiplierPercent: z
    .string()
    .trim()
    .max(40, "보스 배율은 40자 이하로 입력해 주세요.")
    .regex(/^\d[\d,]*(?:\.\d+)?$/, "보스 배율은 숫자로 입력해 주세요.")
    .optional(),
  role: z.enum(resumeRoleValues),
  partyType: z.enum(partyTypeValues),
  availability: z.array(availabilitySchema).min(1, "가능 시간을 하나 이상 입력해 주세요.").max(3),
  voiceChat: z.enum(voiceChatValues),
  lootPolicy: z.string().trim().max(80).optional(),
  experienceSummary: z.string().trim().max(280).optional(),
  roleSummary: z.string().trim().max(220).optional(),
  contact: contactSchema.optional(),
  theme: z.enum(["RESUME", "MINIMAL"]),
});

export const createResumeSchema = z.object({
  characterName: characterNameSchema,
  draft: resumeDraftSchema,
});

export const updateResumeSchema = z.object({
  draft: resumeDraftSchema,
});

export type ResumeDraftInput = z.infer<typeof resumeDraftSchema>;
