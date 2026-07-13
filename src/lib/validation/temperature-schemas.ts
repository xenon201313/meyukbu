import { z } from "zod";

import { mesoongiTemperatureTagValues } from "@/domain/mesoongi-temperature";

export const mesoongiTemperatureInvitationTokenSchema = z
  .string()
  .min(32, "초대 토큰이 올바르지 않습니다.")
  .max(256, "초대 토큰이 올바르지 않습니다.");

export const reviewerSlugSchema = z
  .string()
  .trim()
  .max(96, "검토자 식별자가 너무 깁니다.")
  .regex(/^m-[a-z0-9_-]+$/, "검토자 식별자 형식이 올바르지 않습니다.");

export const mesoongiTemperatureTagSchema = z.enum(mesoongiTemperatureTagValues);

export const mesoongiTemperatureTagsSchema = z
  .array(mesoongiTemperatureTagSchema)
  .min(1, "평가 태그를 하나 이상 선택해 주세요.")
  .max(3, "평가 태그는 최대 3개까지 선택할 수 있습니다.")
  .refine((tags) => new Set(tags).size === tags.length, {
    message: "같은 평가 태그를 중복해서 선택할 수 없습니다.",
  });

/** The owner needs no caller-provided data to issue a single-use invitation. */
export const mesoongiTemperatureInviteSchema = z.object({}).strict();

/** Input used when an invited reviewer submits tag-only feedback. */
export const mesoongiTemperatureSubmitSchema = z
  .object({
    invitationToken: mesoongiTemperatureInvitationTokenSchema,
    reviewerSlug: reviewerSlugSchema,
    tags: mesoongiTemperatureTagsSchema,
  })
  .strict();

export type MesoongiTemperatureInviteInput = z.infer<typeof mesoongiTemperatureInviteSchema>;
export type MesoongiTemperatureSubmitInput = z.infer<typeof mesoongiTemperatureSubmitSchema>;
