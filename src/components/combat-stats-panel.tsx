import type { NormalizedCharacterProfile } from "@/domain/character";
import { formatNumericDisplay, parseNumericValue } from "@/lib/format";

import { ProvenanceBadge } from "@/components/provenance-badge";

interface CombatStatsPanelProps {
  profile: NormalizedCharacterProfile;
}

/** Displays only NEXON-published combat power and final stats on the public profile. */
export function CombatStatsPanel({ profile }: CombatStatsPanelProps) {
  const combatPowerRaw = profile.stats.find((stat) => stat.label === "전투력")?.value ?? null;
  const currentValue = parseNumericValue(combatPowerRaw);
  const peak = profile.peakCombatPower ?? null;
  const usesPeak = Boolean(peak && (currentValue === null || peak.value > currentValue));
  const shownValue = usesPeak && peak ? String(peak.value) : combatPowerRaw;

  return (
    <section aria-labelledby="combat-stats-heading" className="mt-7 space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="ui-kicker">API 검증 상세</p>
          <h2 id="combat-stats-heading" className="mt-1 text-2xl font-black tracking-tight text-white">
            전투력과 최종 능력치
          </h2>
        </div>
        <ProvenanceBadge provenance="NEXON_API" />
      </div>

      <section className="rounded-2xl border border-teal-300/25 bg-[#071118] p-5 text-stone-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs font-bold tracking-[0.15em] text-teal-200">
              {usesPeak ? "최고 전투력 (서비스 관측)" : "인게임 전투력"}
            </p>
            <p className="mt-2 text-3xl font-black tracking-tight text-white">
              {shownValue === null ? "조회 불가" : formatNumericDisplay(shownValue)}
            </p>
          </div>
          <ProvenanceBadge provenance={usesPeak ? "SERVICE_OBSERVED" : "NEXON_API"} />
        </div>
        <p className="mt-3 text-xs leading-5 text-slate-300">
          {usesPeak && currentValue !== null
            ? `현재 장착 세팅 기준 ${formatNumericDisplay(currentValue)} · 이 서비스가 조회한 API 원값 중 최고값을 표시합니다.`
            : "NEXON Open API가 반환한 원값이며, 서비스에서 환산하거나 계산하지 않습니다."}
        </p>
        <details className="mt-4 border-t border-stone-700 pt-3">
          <summary className="cursor-pointer text-sm font-semibold">
            전체 최종 능력치 보기 ({profile.stats.length})
          </summary>
          {profile.stats.length ? (
            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-xs sm:grid-cols-3">
              {profile.stats.map((stat) => (
                <div key={`${stat.label}:${stat.value}`} className="border-b border-stone-800 pb-1">
                  <dt className="text-stone-400">{stat.label}</dt>
                  <dd className="mt-0.5 font-semibold text-stone-100">{formatNumericDisplay(stat.value)}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="mt-2 text-xs text-slate-400">능력치 API 조회 결과가 없습니다.</p>
          )}
        </details>
      </section>
    </section>
  );
}
