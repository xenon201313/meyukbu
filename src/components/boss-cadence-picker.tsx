/* eslint-disable @next/next/no-img-element */
"use client";

import { useSyncExternalStore } from "react";

import { bossArtworkUrl, bossOptions, defaultBossArtworkKeys, findBossOption } from "@/content/bosses";
import type { TargetBossCadence } from "@/domain/resume";

const cadenceCards: Array<{
  value: TargetBossCadence;
  title: string;
  description: string;
  fallbackImage: string;
  accentClass: string;
  activeClass: string;
}> = [
  {
    value: "WEEKLY",
    title: "주간 보스",
    description: "매주 함께 도전할 보스를 선택하거나 직접 입력하세요.",
    fallbackImage: "/images/bosses/weekly-raid.png",
    accentClass: "from-violet-500/35 via-indigo-950/15 to-transparent",
    activeClass: "border-violet-200 ring-violet-200/35",
  },
  {
    value: "MONTHLY",
    title: "월간 보스",
    description: "월간 일정에 맞춘 도전 목표를 선택하거나 직접 입력하세요.",
    fallbackImage: "/images/bosses/monthly-raid.png",
    accentClass: "from-orange-500/35 via-rose-950/15 to-transparent",
    activeClass: "border-orange-200 ring-orange-200/35",
  },
];

const subscribeToHydration = () => () => undefined;
const getHydratedSnapshot = () => true;
const getServerHydrationSnapshot = () => false;

interface BossCadencePickerProps {
  value: TargetBossCadence | undefined;
  targetBoss: string;
  onChange: (value: TargetBossCadence) => void;
  onBossSelect: (name: string) => void;
}

/**
 * Shows the user-authorized Maple Trackers boss artwork without copying image files
 * into the project. A text fallback remains available if the external source is down.
 */
export function BossCadencePicker({ value, targetBoss, onChange, onBossSelect }: BossCadencePickerProps) {
  const isHydrated = useSyncExternalStore(
    subscribeToHydration,
    getHydratedSnapshot,
    getServerHydrationSnapshot,
  );
  const selectedBoss = value ? findBossOption(value, targetBoss) : undefined;
  const selectableBosses = value ? bossOptions.filter((boss) => boss.cadence === value) : [];

  return (
    <fieldset>
      <legend className="text-sm font-semibold text-slate-100">희망 보스 주기</legend>
      <p className="mt-1 text-xs leading-5 text-slate-400">
        주간 또는 월간을 고른 뒤 빠른 선택 또는 직접 입력으로 희망 보스를 정하세요.
      </p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {cadenceCards.map((card) => {
          const selected = card.value === value;
          const bossForCard = selectedBoss?.cadence === card.value ? selectedBoss : undefined;
          const artworkKey = bossForCard?.artworkKey ?? defaultBossArtworkKeys[card.value];
          const imageAlt = bossForCard
            ? `${bossForCard.name} 보스 일러스트`
            : `${card.title} 대표 보스 일러스트`;

          return (
            <button
              key={card.value}
              type="button"
              disabled={!isHydrated}
              aria-pressed={selected}
              onClick={() => onChange(card.value)}
              className={`group relative isolate min-h-48 overflow-hidden rounded-2xl border bg-slate-950 text-left shadow-[0_12px_30px_rgba(15,23,42,0.16)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_36px_rgba(15,23,42,0.24)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[#070b11] disabled:cursor-wait disabled:opacity-80 ${
                selected ? `ring-2 ${card.activeClass}` : "border-slate-800 hover:border-slate-500"
              }`}
            >
              <span className="absolute inset-y-0 right-0 w-[59%] overflow-hidden" aria-hidden="true">
                <span className={`absolute inset-0 bg-gradient-to-br ${card.accentClass}`} />
                <img
                  src={bossArtworkUrl(artworkKey)}
                  alt={imageAlt}
                  loading="lazy"
                  decoding="async"
                  onError={(event) => {
                    event.currentTarget.onerror = null;
                    event.currentTarget.src = card.fallbackImage;
                  }}
                  className="absolute inset-0 h-full w-full object-contain object-right transition duration-300 ease-out group-hover:scale-[1.035]"
                />
                <span className="absolute inset-y-0 left-0 w-2/3 bg-gradient-to-r from-slate-950 via-slate-950/85 to-transparent" />
                <span className="absolute inset-0 bg-gradient-to-t from-slate-950/45 via-transparent to-white/10" />
              </span>
              <span
                className="absolute inset-y-0 left-0 w-[64%] bg-gradient-to-r from-slate-950 via-slate-950/95 to-slate-950/40"
                aria-hidden="true"
              />
              <span className="relative flex min-h-48 max-w-[68%] flex-col justify-end p-4 text-white sm:p-5">
                <span className="text-lg font-extrabold tracking-tight">{card.title}</span>
                <span className="mt-1 text-xs leading-5 text-slate-100">{card.description}</span>
                {bossForCard ? (
                  <span className="mt-2 line-clamp-1 text-[11px] font-semibold text-white/90">
                    {bossForCard.name}
                  </span>
                ) : null}
                {selected ? (
                  <span className="mt-3 inline-flex w-fit items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[11px] font-extrabold text-slate-950 shadow-sm">
                    <span aria-hidden="true">✓</span>
                    선택됨
                  </span>
                ) : null}
              </span>
            </button>
          );
        })}
      </div>
      {value ? (
        <label className="mt-4 block text-sm font-semibold text-slate-100" htmlFor="boss-quick-select">
          보스 빠른 선택
          <select
            id="boss-quick-select"
            disabled={!isHydrated}
            className="ui-input mt-2 block w-full rounded-xl border px-3 py-2.5 text-sm outline-none transition disabled:cursor-wait disabled:opacity-60"
            value={selectedBoss?.id ?? ""}
            onChange={(event) => {
              const selectedOption = event.currentTarget.selectedOptions[0];
              if (selectedOption?.value) {
                onBossSelect(selectedOption.text);
              }
            }}
          >
            <option value="">직접 입력</option>
            {selectableBosses.map((boss) => (
              <option key={boss.id} value={boss.id}>
                {boss.name}
              </option>
            ))}
          </select>
        </label>
      ) : null}
    </fieldset>
  );
}
