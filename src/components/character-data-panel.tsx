"use client";

import type { NormalizedCharacterProfile, ProfileAvailability } from "@/domain/character";
import { formatNumericDisplay, parseNumericValue } from "@/lib/format";

import { EquippedItemDetails } from "@/components/equipped-item-details";
import { ProvenanceBadge } from "@/components/provenance-badge";

interface CharacterDataPanelProps {
  profile: NormalizedCharacterProfile;
  mode?: "mock" | "live";
}

function availabilityMessage(label: string, availability: ProfileAvailability | undefined) {
  if (availability === "available") {
    return null;
  }
  if (availability === "unsupported") {
    return `${label} API는 현재 지원하지 않습니다.`;
  }
  return `${label} API 응답을 받지 못했습니다. 기본 정보는 계속 사용할 수 있습니다.`;
}

/**
 * Shows NEXON-published character data while a user is editing a resume.
 * It deliberately exposes raw API values only and does not derive a gear score.
 */
export function CharacterDataPanel({ profile, mode }: CharacterDataPanelProps) {
  const provider = mode ?? profile.provider;
  const combatPower =
    profile.stats.find((stat) => stat.label === "전투력")?.value ??
    profile.fields.find((field) => field.key === "combatPower")?.value ??
    null;
  const currentCombatValue = parseNumericValue(combatPower);
  const peak = profile.peakCombatPower ?? null;
  const usesPeak = Boolean(peak && (currentCombatValue === null || peak.value > currentCombatValue));
  const shownCombatPower = usesPeak && peak ? String(peak.value) : combatPower;
  const statNotice = availabilityMessage("전투력·능력치", profile.rawAvailability.stat);
  const equipmentNotice = availabilityMessage("장착 장비", profile.rawAvailability.equipment);
  const notices = [profile.notice, statNotice, equipmentNotice].filter(
    (notice, index, values): notice is string => Boolean(notice) && values.indexOf(notice) === index,
  );

  return (
    <section
      aria-labelledby="character-data-heading"
      className="rounded-2xl border border-stone-300 bg-[#fffdf8] p-4 sm:p-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold tracking-[0.16em] text-stone-500">검색 결과 · API 원문</p>
          <h2 id="character-data-heading" className="mt-1 text-xl font-black tracking-tight text-stone-950">
            전투력과 현재 장착 장비
          </h2>
        </div>
        <ProvenanceBadge provenance="NEXON_API" />
      </div>

      <p
        className={`mt-3 rounded-xl px-3 py-2 text-xs leading-5 ${
          provider === "live" ? "bg-emerald-50 text-emerald-900" : "bg-sky-50 text-sky-900"
        }`}
        data-provider={provider}
      >
        {provider === "live"
          ? "실시간 NEXON Open API 조회 결과입니다. 값은 서비스에서 계산하지 않습니다."
          : "현재 데모 데이터입니다. 실제 닉네임 조회는 NEXON Open API 키를 설정한 live 모드에서 사용할 수 있습니다."}
      </p>

      {notices.length ? (
        <ul className="mt-3 space-y-2" aria-live="polite">
          {notices.map((notice) => (
            <li
              key={notice}
              className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-950"
            >
              {notice}
            </li>
          ))}
        </ul>
      ) : null}

      <section className="mt-4 rounded-xl bg-stone-950 p-4 text-stone-50" aria-label="인게임 전투력">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="text-xs font-bold tracking-[0.14em] text-stone-300">
              {usesPeak ? "최고 전투력 (서비스 관측)" : "인게임 전투력"}
            </p>
            <p className="mt-1 text-2xl font-black tracking-tight">
              {shownCombatPower === null ? "조회 불가" : formatNumericDisplay(shownCombatPower)}
            </p>
          </div>
          <ProvenanceBadge provenance={usesPeak ? "SERVICE_OBSERVED" : "NEXON_API"} />
        </div>
        <p className="mt-2 text-xs leading-5 text-stone-300">
          {usesPeak && currentCombatValue !== null
            ? `현재 장착 세팅 기준 ${formatNumericDisplay(currentCombatValue)} · 조회된 API 원값 중 최고값을 표시합니다.`
            : "NEXON API의 종합 능력치 원값입니다."}
        </p>
      </section>

      <details className="mt-3 rounded-xl border border-stone-200 bg-white p-3">
        <summary className="cursor-pointer text-sm font-bold text-stone-950">
          전체 최종 능력치 ({profile.stats.length})
        </summary>
        {profile.stats.length ? (
          <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-xs sm:grid-cols-3">
            {profile.stats.map((stat) => (
              <div key={`${stat.label}:${stat.value}`} className="border-b border-stone-100 pb-1">
                <dt className="truncate text-stone-500">{stat.label}</dt>
                <dd className="mt-0.5 break-words font-semibold text-stone-900">
                  {formatNumericDisplay(stat.value)}
                </dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="mt-2 text-xs leading-5 text-stone-600">능력치 API 조회 결과가 없습니다.</p>
        )}
      </details>

      <section className="mt-4" aria-labelledby="current-equipment-heading">
        <div className="flex items-center justify-between gap-3">
          <h3 id="current-equipment-heading" className="text-sm font-bold text-stone-950">
            현재 장착 전투 장비
          </h3>
          <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs font-bold text-stone-700">
            {profile.equipment.length}개
          </span>
        </div>
        <p className="mt-1 text-xs leading-5 text-stone-600">
          인벤토리 전체가 아닌, API가 공개한 캐시 장비 제외 현재 장착 장비입니다. 장비를 누르면 잠재능력
          등 세부 옵션을 확인할 수 있습니다.
        </p>
        {profile.equipment.length ? (
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {profile.equipment.map((item, index) => (
              <EquippedItemDetails key={`${item.slot ?? "equipment"}:${item.name}:${index}`} item={item} />
            ))}
          </div>
        ) : (
          <p className="mt-3 rounded-xl bg-stone-50 p-3 text-xs leading-5 text-stone-600">
            현재 장착 장비 API 결과가 없습니다. 캐릭터의 공개 데이터 상태 또는 API 응답을 확인해 주세요.
          </p>
        )}
      </section>
    </section>
  );
}
