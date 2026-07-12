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
    <section
      aria-labelledby="character-data-heading"
      className="resume-section-rule ui-panel rounded-xl p-5 sm:p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="ui-kicker">검색 결과 · API 원문</p>
          <h2
            id="character-data-heading"
            className="mt-1 pl-3 text-xl font-black tracking-tight text-[#202a36]"
          >
            전투력과 최종 능력치
          </h2>
        </div>
        <ProvenanceBadge provenance="NEXON_API" />
      </div>

      <p
        className={`mt-3 rounded-xl border px-3 py-2 text-xs font-semibold leading-5 shadow-sm ${
          provider === "live"
            ? "border-emerald-700/40 bg-emerald-100 text-emerald-950"
            : "border-sky-700/40 bg-sky-100 text-sky-950"
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
              className="rounded-xl border border-amber-800/30 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-950"
            >
              {notice}
            </li>
          ))}
        </ul>
      ) : null}

      <section
        className="mt-4 rounded-xl border border-[#d7b98a] bg-[#fbf2e3] p-4 text-[#202a36]"
        aria-label="인게임 전투력"
      >
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="text-xs font-bold tracking-[0.14em] text-[#7c2f2c]">
              {usesPeak ? "최고 전투력 (서비스 관측)" : "인게임 전투력"}
            </p>
            <p className="mt-1 text-2xl font-black tracking-tight text-[#202a36]">
              {shownCombatPower === null ? "조회 불가" : formatNumericDisplay(shownCombatPower)}
            </p>
          </div>
          <ProvenanceBadge provenance={usesPeak ? "SERVICE_OBSERVED" : "NEXON_API"} />
        </div>
        <p className="mt-2 text-xs leading-5 text-[#5e4030]">
          {usesPeak && currentCombatValue !== null
            ? `현재 장착 세팅 기준 ${formatNumericDisplay(currentCombatValue)} · 조회된 API 원값 중 최고값을 표시합니다.`
            : "NEXON API의 종합 능력치 원값입니다."}
        </p>
      </section>

      <details className="mt-3 rounded-xl border border-[#d9cdbd] bg-[#fffefa] p-3">
        <summary className="cursor-pointer text-sm font-bold text-[#202a36]">
          전체 최종 능력치 ({profile.stats.length})
        </summary>
        {profile.stats.length ? (
          <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-xs sm:grid-cols-3">
            {profile.stats.map((stat) => (
              <div key={`${stat.label}:${stat.value}`} className="border-b border-[#eadfce] pb-1">
                <dt className="truncate text-[#687380]">{stat.label}</dt>
                <dd className="mt-0.5 break-words font-semibold text-[#202a36]">
                  {formatNumericDisplay(stat.value)}
                </dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="mt-2 text-xs leading-5 text-[#687380]">능력치 API 조회 결과가 없습니다.</p>
        )}
      </details>
    </section>
  );
}
