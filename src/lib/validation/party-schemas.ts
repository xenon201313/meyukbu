import { z } from "zod";

import { partyDecisionValues, partyPostKindValues } from "@/domain/party";

const resumeSlugSchema = z
  .string()
  .trim()
  .regex(/^m-[A-Za-z0-9_-]{6,96}$/u, "메력서 정보를 확인해 주세요.");

const bossIdSchema = z.string().trim().min(1).max(96);

/** Input accepted when an owner turns a current resume into a seven-day party post. */
export const createPartyPostSchema = z.object({
  ownerResumeSlug: resumeSlugSchema,
  kind: z.enum(partyPostKindValues),
  targetBossIds: z.array(bossIdSchema).min(1).max(6).optional(),
});

/** Applicant message is deliberately short, plain text, and owner-only. */
export const createPartyApplicationSchema = z.object({
  applicantResumeSlug: resumeSlugSchema,
  message: z.string().trim().max(240, "지원 메시지는 240자 이하로 입력해 주세요.").optional(),
});

export const partyApplicationDecisionSchema = z.object({
  decision: z.enum(partyDecisionValues),
});

export const closePartyPostSchema = z.object({
  action: z.literal("close"),
});
