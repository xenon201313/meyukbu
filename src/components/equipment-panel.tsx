/* eslint-disable @next/next/no-img-element */

import type { NormalizedCharacterProfile } from "@/domain/character";
import { formatNumericDisplay, parseNumericValue } from "@/lib/format";

import { EquippedItemDetails } from "@/components/equipped-item-details";
import { ProvenanceBadge } from "@/components/provenance-badge";

interface EquipmentPanelProps {
  profile: NormalizedCharacterProfile;
}

function CombatStats({ profile }: { profile: NormalizedCharacterProfile }) {
  const combatPowerRaw = profile.stats.find((stat) => stat.label === "전투력")?.value ?? null;
  const currentValue = parseNumericValue(combatPowerRaw);
  const peak = profile.peakCombatPower ?? null;
  const usesPeak = Boolean(peak && (currentValue === null || peak.value > currentValue));
  const shownValue = usesPeak && peak ? String(peak.value) : combatPowerRaw;

  return (
    <section className="rounded-2xl border border-stone-300 bg-stone-950 p-5 text-stone-50">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs font-bold tracking-[0.15em] text-stone-300">
            {usesPeak ? "최고 전투력 (서비스 관측)" : "인게임 전투력"}
          </p>
          <p className="mt-2 text-3xl font-black tracking-tight">
            {shownValue === null ? "조회 불가" : formatNumericDisplay(shownValue)}
          </p>
        </div>
        <ProvenanceBadge provenance={usesPeak ? "SERVICE_OBSERVED" : "NEXON_API"} />
      </div>
      <p className="mt-3 text-xs leading-5 text-stone-300">
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
          <p className="mt-2 text-xs text-stone-300">능력치 API 조회 결과가 없습니다.</p>
        )}
      </details>
    </section>
  );
}

/** Public verification detail: API-published current gear, combat power, and supplements. */
export function EquipmentPanel({ profile }: EquipmentPanelProps) {
  return (
    <section aria-labelledby="equipment-heading" className="mt-7 space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold tracking-[0.16em] text-stone-500">API 검증 상세</p>
          <h2 id="equipment-heading" className="mt-1 text-2xl font-black tracking-tight text-stone-950">
            장착 장비와 전투력
          </h2>
        </div>
        <ProvenanceBadge provenance="NEXON_API" />
      </div>

      <CombatStats profile={profile} />

      <section className="rounded-2xl border border-stone-300 bg-[#fffdf8] p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="font-bold text-stone-950">현재 장착 전투 장비</h3>
            <p className="mt-1 text-xs leading-5 text-stone-600">
              현재 프리셋{profile.equipmentPresetNo ? ` ${profile.equipmentPresetNo}` : ""} 기준입니다. 캐시
              장비는 아래에서 별도로 표시합니다.
            </p>
          </div>
          <span className="rounded-full bg-stone-100 px-2.5 py-1 text-xs font-bold text-stone-700">
            {profile.equipment.length}개
          </span>
        </div>
        {profile.equipment.length ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {profile.equipment.map((item, index) => (
              <EquippedItemDetails key={`${item.slot ?? "item"}:${item.name}:${index}`} item={item} />
            ))}
          </div>
        ) : (
          <p className="mt-4 rounded-xl bg-stone-50 p-3 text-sm leading-6 text-stone-600">
            장착 장비 API 조회 결과가 없습니다. 조회 범위는 인벤토리 전체가 아닌 API가 공개하는 현재 장착 전투
            장비입니다.
          </p>
        )}
      </section>

      {profile.symbols.length ? (
        <details className="rounded-2xl border border-stone-300 bg-white p-4">
          <summary className="cursor-pointer font-bold text-stone-950">
            장착 심볼 ({profile.symbols.length})
          </summary>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {profile.symbols.map((symbol) => (
              <div key={symbol.name} className="flex gap-3 rounded-xl bg-stone-50 p-3 text-sm">
                {symbol.iconUrl ? (
                  <img src={symbol.iconUrl} alt="" className="h-10 w-10 rounded-lg object-contain" />
                ) : null}
                <div>
                  <p className="font-bold text-stone-950">{symbol.name}</p>
                  <p className="mt-1 text-xs text-stone-600">
                    {symbol.level ? `Lv.${symbol.level}` : "레벨 조회 불가"}
                    {symbol.force ? ` · 심볼 포스 ${symbol.force}` : ""}
                  </p>
                  {symbol.stats.length ? (
                    <p className="mt-1 text-xs text-stone-700">
                      {symbol.stats.map((stat) => `${stat.label} ${stat.value}`).join(" · ")}
                    </p>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </details>
      ) : null}

      {profile.setEffects.length ? (
        <details className="rounded-2xl border border-stone-300 bg-white p-4">
          <summary className="cursor-pointer font-bold text-stone-950">
            적용 세트 효과 ({profile.setEffects.length})
          </summary>
          <div className="mt-4 space-y-3 text-sm">
            {profile.setEffects.map((setEffect) => (
              <div key={setEffect.name} className="rounded-xl bg-stone-50 p-3">
                <p className="font-bold text-stone-950">
                  {setEffect.name}
                  {setEffect.equippedCount ? ` · ${setEffect.equippedCount}세트` : ""}
                </p>
                {setEffect.effects.map((effect, index) => (
                  <p key={`${effect.setCount}:${index}`} className="mt-1 text-xs leading-5 text-stone-700">
                    {effect.setCount ? `${effect.setCount}세트: ` : ""}
                    {effect.options.join(" · ")}
                  </p>
                ))}
              </div>
            ))}
          </div>
        </details>
      ) : null}

      {profile.cashEquipment.length ? (
        <details className="rounded-2xl border border-stone-300 bg-white p-4">
          <summary className="cursor-pointer font-bold text-stone-950">
            현재 캐시 장비 ({profile.cashEquipment.length})
          </summary>
          <p className="mt-2 text-xs leading-5 text-stone-600">
            코디 장비이며 전투 장비와 구분해 표시합니다.
          </p>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {profile.cashEquipment.map((item, index) => (
              <li
                key={`${item.slot ?? "cash"}:${item.name}:${index}`}
                className="flex items-center gap-2 rounded-xl bg-stone-50 p-2 text-sm"
              >
                {item.iconUrl ? (
                  <img src={item.iconUrl} alt="" className="h-9 w-9 rounded-lg object-contain" />
                ) : null}
                <span className="min-w-0">
                  <span className="block text-xs text-stone-500">
                    {item.slot ?? item.part ?? "캐시 장비"}
                  </span>
                  <span className="block truncate font-semibold text-stone-950">{item.name}</span>
                </span>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </section>
  );
}
