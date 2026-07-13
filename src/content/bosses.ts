import type { TargetBossCadence } from "@/domain/resume";

export interface BossOption {
  id: string;
  name: string;
  cadence: TargetBossCadence;
  artworkKey: string;
}

/** Current weekly/monthly boss names and user-authorized Maple Trackers artwork keys. */
export const bossOptions: BossOption[] = [
  { id: "czak", name: "자쿰 (카오스)", cadence: "WEEKLY", artworkKey: "zakum" },
  { id: "cbq", name: "블러디퀸 (카오스)", cadence: "WEEKLY", artworkKey: "bloodyqueen" },
  { id: "cban", name: "반반 (카오스)", cadence: "WEEKLY", artworkKey: "vonbon" },
  { id: "cpier", name: "피에르 (카오스)", cadence: "WEEKLY", artworkKey: "pierre" },
  { id: "hmag", name: "매그너스 (하드)", cadence: "WEEKLY", artworkKey: "magnus" },
  { id: "cvel", name: "벨룸 (카오스)", cadence: "WEEKLY", artworkKey: "vellum" },
  { id: "cpap", name: "파풀라투스 (카오스)", cadence: "WEEKLY", artworkKey: "papulatus" },
  { id: "nsu", name: "스우 (노멀)", cadence: "WEEKLY", artworkKey: "suwu" },
  { id: "ndam", name: "데미안 (노멀)", cadence: "WEEKLY", artworkKey: "damien" },
  { id: "ngas", name: "가디언 엔젤 슬라임 (노멀)", cadence: "WEEKLY", artworkKey: "gas" },
  { id: "eluc", name: "루시드 (이지)", cadence: "WEEKLY", artworkKey: "lucid" },
  { id: "ewill", name: "윌 (이지)", cadence: "WEEKLY", artworkKey: "will" },
  { id: "nluc", name: "루시드 (노멀)", cadence: "WEEKLY", artworkKey: "lucid" },
  { id: "nwill", name: "윌 (노멀)", cadence: "WEEKLY", artworkKey: "will" },
  { id: "ndusk", name: "더스크 (노멀)", cadence: "WEEKLY", artworkKey: "dusk" },
  { id: "ndun", name: "듄켈 (노멀)", cadence: "WEEKLY", artworkKey: "dunkel" },
  { id: "hdam", name: "데미안 (하드)", cadence: "WEEKLY", artworkKey: "damien" },
  { id: "hsu", name: "스우 (하드)", cadence: "WEEKLY", artworkKey: "suwu" },
  { id: "hluc", name: "루시드 (하드)", cadence: "WEEKLY", artworkKey: "lucid" },
  { id: "cdusk", name: "더스크 (카오스)", cadence: "WEEKLY", artworkKey: "dusk" },
  { id: "njhil", name: "진 힐라 (노멀)", cadence: "WEEKLY", artworkKey: "jinhilla" },
  { id: "cgas", name: "가디언 엔젤 슬라임 (카오스)", cadence: "WEEKLY", artworkKey: "gas" },
  { id: "hwill", name: "윌 (하드)", cadence: "WEEKLY", artworkKey: "will" },
  { id: "hdun", name: "듄켈 (하드)", cadence: "WEEKLY", artworkKey: "dunkel" },
  { id: "hjhil", name: "진 힐라 (하드)", cadence: "WEEKLY", artworkKey: "jinhilla" },
  { id: "nser", name: "선택받은 세렌 (노멀)", cadence: "WEEKLY", artworkKey: "seren" },
  { id: "ekal", name: "감시자 칼로스 (이지)", cadence: "WEEKLY", artworkKey: "kalos" },
  { id: "eadv", name: "최초의 대적자 (이지)", cadence: "WEEKLY", artworkKey: "adversary" },
  { id: "hser", name: "선택받은 세렌 (하드)", cadence: "WEEKLY", artworkKey: "seren" },
  { id: "ekali", name: "카링 (이지)", cadence: "WEEKLY", artworkKey: "kaling" },
  { id: "nkal", name: "감시자 칼로스 (노멀)", cadence: "WEEKLY", artworkKey: "kalos" },
  { id: "nadv", name: "최초의 대적자 (노멀)", cadence: "WEEKLY", artworkKey: "adversary" },
  { id: "xsu", name: "스우 (익스트림)", cadence: "WEEKLY", artworkKey: "suwu" },
  { id: "nstar", name: "찬란한 흉성 (노멀)", cadence: "WEEKLY", artworkKey: "star" },
  { id: "nkali", name: "카링 (노멀)", cadence: "WEEKLY", artworkKey: "kaling" },
  { id: "nlimbo", name: "림보 (노멀)", cadence: "WEEKLY", artworkKey: "limbo" },
  { id: "ckal", name: "감시자 칼로스 (카오스)", cadence: "WEEKLY", artworkKey: "kalos" },
  { id: "nbal", name: "발드릭스 (노멀)", cadence: "WEEKLY", artworkKey: "baldrix" },
  { id: "hadv", name: "최초의 대적자 (하드)", cadence: "WEEKLY", artworkKey: "adversary" },
  { id: "njup", name: "유피테르 (노멀)", cadence: "WEEKLY", artworkKey: "jupiter" },
  { id: "hkali", name: "카링 (하드)", cadence: "WEEKLY", artworkKey: "kaling" },
  { id: "hlimbo", name: "림보 (하드)", cadence: "WEEKLY", artworkKey: "limbo" },
  { id: "hstar", name: "찬란한 흉성 (하드)", cadence: "WEEKLY", artworkKey: "star" },
  { id: "xser", name: "선택받은 세렌 (익스트림)", cadence: "WEEKLY", artworkKey: "seren" },
  { id: "hbal", name: "발드릭스 (하드)", cadence: "WEEKLY", artworkKey: "baldrix" },
  { id: "xkal", name: "감시자 칼로스 (익스트림)", cadence: "WEEKLY", artworkKey: "kalos" },
  { id: "xadv", name: "최초의 대적자 (익스트림)", cadence: "WEEKLY", artworkKey: "adversary" },
  { id: "hjup", name: "유피테르 (하드)", cadence: "WEEKLY", artworkKey: "jupiter" },
  { id: "xkali", name: "카링 (익스트림)", cadence: "WEEKLY", artworkKey: "kaling" },
  { id: "hblack", name: "검은 마법사 (하드)", cadence: "MONTHLY", artworkKey: "blackmage" },
  { id: "xblack", name: "검은 마법사 (익스트림)", cadence: "MONTHLY", artworkKey: "blackmage" },
];

export const bossArtworkKeys = new Set(bossOptions.map((boss) => boss.artworkKey));

export const defaultBossArtworkKeys: Record<TargetBossCadence, string> = {
  WEEKLY: "jupiter",
  MONTHLY: "blackmage",
};

const defaultBossOptionIds: Record<TargetBossCadence, string> = {
  WEEKLY: "njup",
  MONTHLY: "hblack",
};

export function bossArtworkUrl(artworkKey: string): string {
  return `/images/bosses/${encodeURIComponent(artworkKey)}.png`;
}

export function findBossOption(cadence: TargetBossCadence, name: string): BossOption | undefined {
  const normalized = name.trim();
  return bossOptions.find((boss) => boss.cadence === cadence && boss.name === normalized);
}

/** Finds a catalogued boss by its stable select value. */
export function findBossOptionById(id: string): BossOption | undefined {
  return bossOptions.find((boss) => boss.id === id);
}

/** Returns the catalogued default whenever a player changes the weekly/monthly cadence. */
export function defaultBossOption(cadence: TargetBossCadence): BossOption {
  const option = findBossOptionById(defaultBossOptionIds[cadence]);
  if (!option) {
    throw new Error(`Default boss option is unavailable for ${cadence}.`);
  }
  return option;
}
