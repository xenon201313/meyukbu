import { z } from "zod";

export const nexonOcidSchema = z.object({
  ocid: z.string().min(1),
});

/** Documented response shape for GET /character/basic. */
export const nexonCharacterBasicSchema = z.object({
  date: z.string().nullable().optional(),
  character_name: z.string(),
  world_name: z.string().nullable().optional(),
  character_gender: z.string().nullable().optional(),
  character_class: z.string().nullable().optional(),
  character_class_level: z.string().nullable().optional(),
  character_level: z.number().nullable().optional(),
  character_exp: z.number().nullable().optional(),
  character_exp_rate: z.string().nullable().optional(),
  character_guild_name: z.string().nullable().optional(),
  character_image: z.string().nullable().optional(),
  character_date_create: z.string().nullable().optional(),
  access_flag: z.string().nullable().optional(),
  liberation_quest_clear: z.string().nullable().optional(),
});

export type NexonCharacterBasic = z.infer<typeof nexonCharacterBasicSchema>;

/** NEXON sometimes represents a displayed numeric value as either text or a number. */
const nexonDisplayValueSchema = z.union([z.string(), z.number()]).nullable().optional();
// Option objects change more frequently than their top-level endpoint schema. Keep a
// documented primitive value when possible, but never discard the entire equipment
// response just because a newly added option has a nested value.
const nexonOptionMapSchema = z.record(z.string(), z.unknown()).nullable().optional();

/** Documented response shape for GET /character/stat. */
export const nexonCharacterStatSchema = z
  .object({
    date: z.string().nullable().optional(),
    character_class: z.string().nullable().optional(),
    final_stat: z
      .array(
        z.object({
          stat_name: z.string(),
          stat_value: nexonDisplayValueSchema,
        }),
      )
      .nullable()
      .optional(),
    remain_ap: nexonDisplayValueSchema,
  })
  .passthrough();

export type NexonCharacterStat = z.infer<typeof nexonCharacterStatSchema>;

/** One current equipment item from GET /character/item-equipment. */
export const nexonItemEquipmentItemSchema = z
  .object({
    item_equipment_part: z.string().nullable().optional(),
    item_equipment_slot: z.string().nullable().optional(),
    // Preset/special equipment objects use this documented alternate slot name.
    equipment_slot: z.string().nullable().optional(),
    item_name: z.string().nullable().optional(),
    item_icon: z.string().nullable().optional(),
    item_description: z.string().nullable().optional(),
    item_shape_name: z.string().nullable().optional(),
    item_shape_icon: z.string().nullable().optional(),
    item_total_option: nexonOptionMapSchema,
    item_base_option: nexonOptionMapSchema,
    item_add_option: nexonOptionMapSchema,
    item_exceptional_option: nexonOptionMapSchema,
    item_etc_option: nexonOptionMapSchema,
    starforce: nexonDisplayValueSchema,
    scroll_upgrade: nexonDisplayValueSchema,
    potential_option_grade: z.string().nullable().optional(),
    potential_option_1: z.string().nullable().optional(),
    potential_option_2: z.string().nullable().optional(),
    potential_option_3: z.string().nullable().optional(),
    additional_potential_option_grade: z.string().nullable().optional(),
    additional_potential_option_1: z.string().nullable().optional(),
    additional_potential_option_2: z.string().nullable().optional(),
    additional_potential_option_3: z.string().nullable().optional(),
    soul_name: z.string().nullable().optional(),
    soul_option: z.string().nullable().optional(),
  })
  .passthrough();

/** Documented response shape for GET /character/item-equipment. */
export const nexonItemEquipmentSchema = z
  .object({
    date: z.string().nullable().optional(),
    preset_no: z.union([z.number(), z.string()]).nullable().optional(),
    item_equipment: z.array(nexonItemEquipmentItemSchema).nullable().optional(),
  })
  .passthrough();

export type NexonItemEquipment = z.infer<typeof nexonItemEquipmentSchema>;
// Kept as an explicit alias because consumers describe this as the character equipment response.
export type NexonCharacterItemEquipment = NexonItemEquipment;

/** Documented response shape for GET /character/symbol-equipment. */
export const nexonSymbolEquipmentSchema = z
  .object({
    date: z.string().nullable().optional(),
    symbol: z
      .array(
        z
          .object({
            symbol_name: z.string().nullable().optional(),
            symbol_icon: z.string().nullable().optional(),
            symbol_level: nexonDisplayValueSchema,
            symbol_force: nexonDisplayValueSchema,
            symbol_str: nexonDisplayValueSchema,
            symbol_dex: nexonDisplayValueSchema,
            symbol_int: nexonDisplayValueSchema,
            symbol_luk: nexonDisplayValueSchema,
            symbol_hp: nexonDisplayValueSchema,
            symbol_drop_rate: nexonDisplayValueSchema,
            symbol_meso_rate: nexonDisplayValueSchema,
            symbol_exp_rate: nexonDisplayValueSchema,
          })
          .passthrough(),
      )
      .nullable()
      .optional(),
  })
  .passthrough();

export type NexonSymbolEquipment = z.infer<typeof nexonSymbolEquipmentSchema>;

/** Documented response shape for GET /character/cashitem-equipment. */
export const nexonCashItemEquipmentSchema = z
  .object({
    date: z.string().nullable().optional(),
    cash_item_equipment_base: z
      .array(
        z
          .object({
            cash_item_equipment_part: z.string().nullable().optional(),
            cash_item_equipment_slot: z.string().nullable().optional(),
            cash_item_name: z.string().nullable().optional(),
            cash_item_icon: z.string().nullable().optional(),
            date_expire: z.string().nullable().optional(),
          })
          .passthrough(),
      )
      .nullable()
      .optional(),
  })
  .passthrough();

export type NexonCashItemEquipment = z.infer<typeof nexonCashItemEquipmentSchema>;

/** Documented response shape for GET /character/set-effect. */
export const nexonSetEffectSchema = z
  .object({
    date: z.string().nullable().optional(),
    set_effect: z
      .array(
        z
          .object({
            set_name: z.string().nullable().optional(),
            total_set_count: nexonDisplayValueSchema,
            set_effect_info: z
              .array(
                z.object({
                  set_count: nexonDisplayValueSchema,
                  set_option: z.array(z.string()).nullable().optional(),
                }),
              )
              .nullable()
              .optional(),
          })
          .passthrough(),
      )
      .nullable()
      .optional(),
  })
  .passthrough();

export type NexonSetEffect = z.infer<typeof nexonSetEffectSchema>;

export const nexonErrorSchema = z.object({
  error: z.object({
    name: z.string(),
    message: z.string().optional(),
  }),
});
