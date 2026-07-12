"use client";

import type { NormalizedCharacterProfile, ProfileAvailability } from "@/domain/character";
import { formatNumericDisplay, parseNumericValue } from "@/lib/format";

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
 * It deliberately exposes raw API values only and does not derive a score.
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
  const notices = [statNotice].filter((notice): notice is string => Boolean(notice));

  return (
    <section aria-labelledby="character-data-heading" className="ui-panel rounded-2xl p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="ui-kicker">검색 결과 · API 원문</p>
          <h2 id="character-data-heading" className="mt-1 text-xl font-black tracking-tight text-white">
            전투력과 최종 능력치
          </h2>
        </div>
        <ProvenanceBadge provenance="NEXON_API" />
      </div>

      <p
        className={`mt-3 rounded-xl border px-3 py-2 text-xs leading-5 ${
          provider === "live"
            ? "border-emerald-300/30 bg-emerald-300/10 text-emerald-100"
            : "border-sky-300/30 bg-sky-300/10 text-sky-100"
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
              className="rounded-xl border border-amber-300/35 bg-amber-300/10 px-3 py-2 text-xs leading-5 text-amber-100"
            >
              {notice}
            </li>
          ))}
        </ul>
      ) : null}

      <section
        className="mt-4 rounded-xl border border-teal-300/25 bg-[#071118] p-4 text-slate-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
        aria-label="인게임 전투력"
      >
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="text-xs font-bold tracking-[0.14em] text-teal-200">
              {usesPeak ? "최고 전투력 (서비스 관측)" : "인게임 전투력"}
            </p>
            <p className="mt-1 text-2xl font-black tracking-tight text-white">
              {shownCombatPower === null ? "조회 불가" : formatNumericDisplay(shownCombatPower)}
            </p>
          </div>
          <ProvenanceBadge provenance={usesPeak ? "SERVICE_OBSERVED" : "NEXON_API"} />
        </div>
        <p className="mt-2 text-xs leading-5 text-slate-300">
          {usesPeak && currentCombatValue !== null
            ? `현재 장착 세팅 기준 ${formatNumericDisplay(currentCombatValue)} · 조회된 API 원값 중 최고값을 표시합니다.`
            : "NEXON API의 종합 능력치 원값입니다."}
        </p>
      </section>

      <details className="mt-3 rounded-xl border border-slate-700 bg-slate-950/50 p-3">
        <summary className="cursor-pointer text-sm font-bold text-slate-100">
          전체 최종 능력치 ({profile.stats.length})
        </summary>
        {profile.stats.length ? (
          <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-xs sm:grid-cols-3">
            {profile.stats.map((stat) => (
              <div key={`${stat.label}:${stat.value}`} className="border-b border-slate-800 pb-1">
                <dt className="truncate text-slate-500">{stat.label}</dt>
                <dd className="mt-0.5 break-words font-semibold text-slate-100">
                  {formatNumericDisplay(stat.value)}
                </dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="mt-2 text-xs leading-5 text-slate-400">능력치 API 조회 결과가 없습니다.</p>
        )}
      </details>
    </section>
  );
}
