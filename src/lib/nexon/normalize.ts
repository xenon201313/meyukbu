import type {
  CashEquipment,
  CharacterStat,
  EquippedItem,
  EquipmentOption,
  NormalizedCharacterProfile,
  ProfileField,
  SetEffect,
  SymbolEquipment,
} from "@/domain/character";

import type {
  NexonCashItemEquipment,
  NexonCharacterBasic,
  NexonCharacterStat,
  NexonItemEquipment,
  NexonSetEffect,
  NexonSymbolEquipment,
} from "@/lib/nexon/schemas";

const identityPriorities = { DAMAGE: 4, SUPPORT: 4, UTILITY: 4, OTHER: 4 } as const;
const combatPriorities = { DAMAGE: 1, SUPPORT: 1, UTILITY: 1, OTHER: 1 } as const;
const previewStatLabels = new Set([
  "전투력",
  "보스 몬스터 데미지",
  "방어율 무시",
  "최종 데미지",
  "크리티컬 데미지",
]);

export interface CharacterProfileSupplements {
  stat?: NexonCharacterStat;
  equipment?: NexonItemEquipment;
  symbols?: NexonSymbolEquipment;
  cashEquipment?: NexonCashItemEquipment;
  setEffects?: NexonSetEffect;
}

function displayValue(value: unknown): string | null {
  if ((typeof value !== "string" && typeof value !== "number") || value === "") {
    return null;
  }
  return String(value);
}

function optionEntries(options: Record<string, unknown> | null | undefined): EquipmentOption[] {
  if (!options) {
    return [];
  }

  return Object.entries(options).flatMap(([label, value]) => {
    const text = displayValue(value);
    return text === null ? [] : [{ label, value: text }];
  });
}

function optionLines(...values: Array<string | null | undefined>): string[] {
  return values.filter((value): value is string => Boolean(value?.trim()));
}

function normalizeStats(stat?: NexonCharacterStat): CharacterStat[] {
  return (stat?.final_stat ?? []).flatMap((item) => {
    const value = displayValue(item.stat_value);
    return value === null ? [] : [{ label: item.stat_name, value }];
  });
}

function normalizeEquipment(equipment?: NexonItemEquipment): EquippedItem[] {
  return (equipment?.item_equipment ?? []).flatMap((item) => {
    if (!item.item_name) {
      return [];
    }

    return [
      {
        slot: item.item_equipment_slot ?? item.equipment_slot ?? null,
        part: item.item_equipment_part ?? null,
        name: item.item_name,
        iconUrl: item.item_icon ?? null,
        shapeName: item.item_shape_name ?? null,
        shapeIconUrl: item.item_shape_icon ?? null,
        description: item.item_description ?? null,
        starforce: displayValue(item.starforce),
        scrollUpgrade: displayValue(item.scroll_upgrade),
        potentialGrade: item.potential_option_grade ?? null,
        potentialOptions: optionLines(
          item.potential_option_1,
          item.potential_option_2,
          item.potential_option_3,
        ),
        additionalPotentialGrade: item.additional_potential_option_grade ?? null,
        additionalPotentialOptions: optionLines(
          item.additional_potential_option_1,
          item.additional_potential_option_2,
          item.additional_potential_option_3,
        ),
        totalOptions: optionEntries(item.item_total_option),
        baseOptions: optionEntries(item.item_base_option),
        addOptions: optionEntries(item.item_add_option),
        exceptionalOptions: optionEntries(item.item_exceptional_option),
        etcOptions: optionEntries(item.item_etc_option),
        soulName: item.soul_name ?? null,
        soulOption: item.soul_option ?? null,
      },
    ];
  });
}

function normalizeSymbols(symbols?: NexonSymbolEquipment): SymbolEquipment[] {
  return (symbols?.symbol ?? []).flatMap((symbol) => {
    if (!symbol.symbol_name) {
      return [];
    }
    const statPairs: Array<[string, string | number | null | undefined]> = [
      ["STR", symbol.symbol_str],
      ["DEX", symbol.symbol_dex],
      ["INT", symbol.symbol_int],
      ["LUK", symbol.symbol_luk],
      ["HP", symbol.symbol_hp],
      ["드롭률", symbol.symbol_drop_rate],
      ["메소 획득량", symbol.symbol_meso_rate],
      ["경험치 획득량", symbol.symbol_exp_rate],
    ];

    return [
      {
        name: symbol.symbol_name,
        iconUrl: symbol.symbol_icon ?? null,
        level: displayValue(symbol.symbol_level),
        force: displayValue(symbol.symbol_force),
        stats: statPairs.flatMap(([label, value]) => {
          const text = displayValue(value);
          return text === null ? [] : [{ label, value: text }];
        }),
      },
    ];
  });
}

function normalizeCashEquipment(cashEquipment?: NexonCashItemEquipment): CashEquipment[] {
  return (cashEquipment?.cash_item_equipment_base ?? []).flatMap((item) => {
    if (!item.cash_item_name) {
      return [];
    }
    return [
      {
        slot: item.cash_item_equipment_slot ?? null,
        part: item.cash_item_equipment_part ?? null,
        name: item.cash_item_name,
        iconUrl: item.cash_item_icon ?? null,
        expiresAt: item.date_expire ?? null,
      },
    ];
  });
}

function normalizeSetEffects(setEffects?: NexonSetEffect): SetEffect[] {
  return (setEffects?.set_effect ?? []).flatMap((setEffect) => {
    if (!setEffect.set_name) {
      return [];
    }
    return [
      {
        name: setEffect.set_name,
        equippedCount: displayValue(setEffect.total_set_count),
        effects: (setEffect.set_effect_info ?? []).map((effect) => ({
          setCount: displayValue(effect.set_count),
          options: effect.set_option ?? [],
        })),
      },
    ];
  });
}

function profileFields(stats: CharacterStat[]): ProfileField[] {
  const identityFields: ProfileField[] = [
    {
      key: "level",
      label: "레벨",
      value: null,
      provenance: "NEXON_API",
      category: "identity",
      priorityByRole: identityPriorities,
    },
  ];

  const statFields = stats
    .filter((stat) => previewStatLabels.has(stat.label))
    .map<ProfileField>((stat) => ({
      key: stat.label === "전투력" ? "combatPower" : `stat:${stat.label}`,
      label: stat.label,
      value: stat.value,
      provenance: "NEXON_API",
      category: "combat",
      priorityByRole: combatPriorities,
    }));

  return [...statFields, ...identityFields];
}

function parsePresetNo(value: string | number | null | undefined): number | null {
  if (typeof value === "number" && Number.isInteger(value)) {
    return value;
  }
  if (typeof value === "string" && /^\d+$/.test(value)) {
    return Number(value);
  }
  return null;
}

/**
 * Maps only documented NEXON responses to the provider-neutral profile. `basic` is
 * required; every other endpoint is optional so a partial API outage does not block writing.
 */
export function normalizeCharacterProfile(
  ocid: string,
  basic: NexonCharacterBasic,
  supplements: CharacterProfileSupplements = {},
  fetchedAt = new Date().toISOString(),
): NormalizedCharacterProfile {
  const stats = normalizeStats(supplements.stat);
  const fields = profileFields(stats).map((field) => {
    if (field.key === "level") {
      return { ...field, value: basic.character_level ?? null };
    }
    return field;
  });
  fields.push(
    {
      key: "classLevel",
      label: "전직 차수",
      value: basic.character_class_level ?? null,
      provenance: "NEXON_API",
      category: "identity",
    },
    {
      key: "liberation",
      label: "해방 상태",
      value: basic.liberation_quest_clear ?? null,
      provenance: "NEXON_API",
      category: "record",
    },
  );

  const unavailable = [
    !supplements.stat ? "전투력/능력치" : null,
    !supplements.equipment ? "장착 장비" : null,
    !supplements.symbols ? "심볼" : null,
    !supplements.cashEquipment ? "캐시 장비" : null,
    !supplements.setEffects ? "세트 효과" : null,
  ].filter((value): value is string => Boolean(value));

  return {
    ocid,
    characterName: basic.character_name,
    worldName: basic.world_name ?? null,
    className: basic.character_class ?? null,
    level: basic.character_level ?? null,
    imageUrl: basic.character_image ?? null,
    currentGuild: basic.character_guild_name ?? null,
    fetchedAt,
    sourceDate: basic.date ?? supplements.stat?.date ?? supplements.equipment?.date ?? null,
    provider: "live",
    fields,
    stats,
    equipmentPresetNo: parsePresetNo(supplements.equipment?.preset_no),
    equipment: normalizeEquipment(supplements.equipment),
    symbols: normalizeSymbols(supplements.symbols),
    cashEquipment: normalizeCashEquipment(supplements.cashEquipment),
    setEffects: normalizeSetEffects(supplements.setEffects),
    rawAvailability: {
      basic: "available",
      stat: supplements.stat ? "available" : "missing",
      equipment: supplements.equipment ? "available" : "missing",
      symbol: supplements.symbols ? "available" : "missing",
      cashEquipment: supplements.cashEquipment ? "available" : "missing",
      setEffect: supplements.setEffects ? "available" : "missing",
      hexa: "unsupported",
      union: "unsupported",
      guild: basic.character_guild_name ? "available" : "missing",
    },
    ...(unavailable.length
      ? {
          notice: `${unavailable.join(", ")} 정보를 불러오지 못했습니다. 기본 정보로 계속 작성할 수 있습니다.`,
        }
      : {}),
  };
}

/** Backwards-compatible basic-only mapper used by focused adapter tests. */
export function normalizeCharacterBasic(
  ocid: string,
  basic: NexonCharacterBasic,
  fetchedAt = new Date().toISOString(),
): NormalizedCharacterProfile {
  return normalizeCharacterProfile(ocid, basic, {}, fetchedAt);
}
