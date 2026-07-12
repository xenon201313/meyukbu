/* eslint-disable @next/next/no-img-element */

import type { EquippedItem, EquipmentOption, NormalizedCharacterProfile } from "@/domain/character";

import { ProvenanceBadge } from "@/components/provenance-badge";

interface EquipmentPanelProps {
  profile: NormalizedCharacterProfile;
}

function OptionList({ title, options }: { title: string; options: EquipmentOption[] }) {
  if (!options.length) {
    return null;
  }

  return (
    <section>
      <h4 className="text-xs font-bold text-stone-700">{title}</h4>
      <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs leading-5 text-stone-700 sm:grid-cols-3">
        {options.map((option) => (
          <div
            key={`${option.label}:${option.value}`}
            className="flex justify-between gap-2 border-b border-stone-100 py-1"
          >
            <dt className="truncate text-stone-500">{option.label}</dt>
            <dd className="text-right font-medium text-stone-800">{option.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function ItemIcon({ item }: { item: EquippedItem }) {
  if (item.iconUrl) {
    return (
      <img
        src={item.iconUrl}
        alt=""
        className="h-12 w-12 shrink-0 rounded-xl border border-stone-200 bg-stone-50 object-contain p-1"
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-dashed border-stone-300 bg-stone-50 text-xs font-bold text-stone-500"
    >
      장비
    </span>
  );
}

function ItemDetails({ item }: { item: EquippedItem }) {
  const hasPotential = item.potentialGrade || item.potentialOptions.length;
  const hasAdditionalPotential = item.additionalPotentialGrade || item.additionalPotentialOptions.length;

  return (
    <details className="group rounded-2xl border border-stone-200 bg-white shadow-sm">
      <summary className="flex cursor-pointer list-none items-center gap-3 p-3 outline-none focus-visible:ring-2 focus-visible:ring-stone-950/30 [&::-webkit-details-marker]:hidden">
        <ItemIcon item={item} />
        <span className="min-w-0 flex-1">
          <span className="block text-xs text-stone-500">{item.slot ?? item.part ?? "장착 장비"}</span>
          <span className="mt-0.5 block truncate text-sm font-bold text-stone-950">{item.name}</span>
          <span className="mt-1 flex flex-wrap gap-x-2 text-xs text-stone-600">
            {item.starforce ? <span>스타포스 {item.starforce}</span> : null}
            {item.potentialGrade ? <span>잠재 {item.potentialGrade}</span> : null}
          </span>
        </span>
        <span className="text-sm text-stone-500 transition group-open:rotate-45" aria-hidden="true">
          +
        </span>
      </summary>
      <div className="space-y-4 border-t border-stone-100 p-4 text-sm">
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs sm:grid-cols-3">
          <Detail label="부위" value={item.part} />
          <Detail label="슬롯" value={item.slot} />
          <Detail label="스타포스" value={item.starforce} />
          <Detail label="작 횟수" value={item.scrollUpgrade} />
          <Detail label="소울" value={item.soulName} />
          <Detail label="소울 옵션" value={item.soulOption} />
        </dl>
        {hasPotential ? (
          <OptionLines
            title={`잠재능력${item.potentialGrade ? ` · ${item.potentialGrade}` : ""}`}
            lines={item.potentialOptions}
          />
        ) : null}
        {hasAdditionalPotential ? (
          <OptionLines
            title={`에디셔널 잠재능력${item.additionalPotentialGrade ? ` · ${item.additionalPotentialGrade}` : ""}`}
            lines={item.additionalPotentialOptions}
          />
        ) : null}
        <OptionList title="최종 옵션" options={item.totalOptions} />
        <OptionList title="기본 옵션" options={item.baseOptions} />
        <OptionList title="추가 옵션" options={item.addOptions} />
        <OptionList title="익셉셔널 옵션" options={item.exceptionalOptions} />
        <OptionList title="기타 옵션" options={item.etcOptions} />
        {item.description ? (
          <p className="whitespace-pre-wrap text-xs leading-5 text-stone-600">{item.description}</p>
        ) : null}
      </div>
    </details>
  );
}

function Detail({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <dt className="text-stone-500">{label}</dt>
      <dd className="mt-0.5 break-words font-medium text-stone-900">{value ?? "조회 불가"}</dd>
    </div>
  );
}

function OptionLines({ title, lines }: { title: string; lines: string[] }) {
  if (!lines.length) {
    return null;
  }

  return (
    <section>
      <h4 className="text-xs font-bold text-stone-700">{title}</h4>
      <ul className="mt-2 space-y-1 text-xs leading-5 text-stone-700">
        {lines.map((line, index) => (
          <li key={`${line}:${index}`} className="rounded-lg bg-stone-50 px-2 py-1">
            {line}
          </li>
        ))}
      </ul>
    </section>
  );
}

function CombatStats({ profile }: { profile: NormalizedCharacterProfile }) {
  const combatPower = profile.stats.find((stat) => stat.label === "전투력")?.value ?? null;

  return (
    <section className="rounded-2xl border border-stone-300 bg-stone-950 p-5 text-stone-50">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs font-bold tracking-[0.15em] text-stone-300">인게임 전투력</p>
          <p className="mt-2 text-3xl font-black tracking-tight">{combatPower ?? "조회 불가"}</p>
        </div>
        <ProvenanceBadge provenance="NEXON_API" />
      </div>
      <p className="mt-3 text-xs leading-5 text-stone-300">
        NEXON Open API가 반환한 원값이며, 서비스에서 환산하거나 계산하지 않습니다.
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
                <dd className="mt-0.5 font-semibold text-stone-100">{stat.value}</dd>
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
              <ItemDetails key={`${item.slot ?? "item"}:${item.name}:${index}`} item={item} />
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
