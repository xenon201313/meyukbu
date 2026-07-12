import type { DataProvenance } from "@/domain/provenance";
import type { ResumeRole } from "@/domain/resume";

export const profileFieldCategories = ["combat", "growth", "record", "equipment", "identity"] as const;

export type ProfileFieldCategory = (typeof profileFieldCategories)[number];
export type ProfileAvailability = "available" | "missing" | "unsupported";

export interface ProfileField {
  key: string;
  label: string;
  value: string | number | null;
  unit?: string;
  provenance: DataProvenance;
  category: ProfileFieldCategory;
  priorityByRole?: Partial<Record<ResumeRole, number>>;
}

/** A single final stat from NEXON's `/character/stat` response. Values stay uncalculated. */
export interface CharacterStat {
  label: string;
  value: string;
}

/** A named option published for an equipped item by NEXON. */
export interface EquipmentOption {
  label: string;
  value: string;
}

/**
 * Current non-cash equipment from NEXON's `/character/item-equipment` response.
 * It intentionally contains only API values; the app never computes a score from it.
 */
export interface EquippedItem {
  slot: string | null;
  part: string | null;
  name: string;
  iconUrl: string | null;
  shapeName: string | null;
  shapeIconUrl: string | null;
  description: string | null;
  starforce: string | null;
  scrollUpgrade: string | null;
  potentialGrade: string | null;
  potentialOptions: string[];
  additionalPotentialGrade: string | null;
  additionalPotentialOptions: string[];
  totalOptions: EquipmentOption[];
  baseOptions: EquipmentOption[];
  addOptions: EquipmentOption[];
  exceptionalOptions: EquipmentOption[];
  etcOptions: EquipmentOption[];
  soulName: string | null;
  soulOption: string | null;
}

/** Current symbol equipment returned by NEXON's optional symbol endpoint. */
export interface SymbolEquipment {
  name: string;
  iconUrl: string | null;
  level: string | null;
  force: string | null;
  stats: EquipmentOption[];
}

/** Cosmetic equipment is shown separately so it is never confused with combat gear. */
export interface CashEquipment {
  slot: string | null;
  part: string | null;
  name: string;
  iconUrl: string | null;
  expiresAt: string | null;
}

/** Applied set effects from NEXON's optional set-effect endpoint. */
export interface SetEffect {
  name: string;
  equippedCount: string | null;
  effects: Array<{ setCount: string | null; options: string[] }>;
}

/** Stable, provider-neutral character data used by pages and resume versions. */
export interface NormalizedCharacterProfile {
  ocid: string;
  characterName: string;
  worldName: string | null;
  className: string | null;
  level: number | null;
  imageUrl: string | null;
  currentGuild: string | null;
  fetchedAt: string;
  sourceDate: string | null;
  provider: "mock" | "live";
  fields: ProfileField[];
  /** All final stats as published by NEXON; includes combat power when available. */
  stats: CharacterStat[];
  /** NEXON's active equipment preset number, when the endpoint provides it. */
  equipmentPresetNo: number | null;
  /** All currently equipped non-cash combat items published by the API. */
  equipment: EquippedItem[];
  /** Optional supplement endpoints. They remain empty when not returned. */
  symbols: SymbolEquipment[];
  cashEquipment: CashEquipment[];
  setEffects: SetEffect[];
  rawAvailability: Record<string, ProfileAvailability>;
  notice?: string;
}
