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
}> = [
  {
    value: "WEEKLY",
    title: "주간 보스",
    description: "매주 함께 도전할 보스를 선택하거나 직접 입력하세요.",
    fallbackImage: "/images/bosses/weekly-raid.png",
  },
  {
    value: "MONTHLY",
    title: "월간 보스",
    description: "월간 일정에 맞춘 도전 목표를 선택하거나 직접 입력하세요.",
    fallbackImage: "/images/bosses/monthly-raid.png",
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
      <legend className="text-sm font-semibold text-stone-900">희망 보스 주기</legend>
      <p className="mt-1 text-xs leading-5 text-stone-600">
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
              className={`group relative min-h-40 overflow-hidden rounded-2xl border text-left shadow-sm transition focus:outline-none focus:ring-2 focus:ring-stone-950/30 disabled:cursor-wait disabled:opacity-80 ${
                selected
                  ? "border-stone-950 ring-2 ring-stone-950/20"
                  : "border-stone-300 hover:border-stone-700"
              }`}
            >
              <img
                src={bossArtworkUrl(artworkKey)}
                alt={imageAlt}
                onError={(event) => {
                  event.currentTarget.onerror = null;
                  event.currentTarget.src = card.fallbackImage;
                }}
                className="absolute inset-0 h-full w-full object-cover object-center transition duration-300 group-hover:scale-105"
              />
              <span className="absolute inset-0 bg-gradient-to-r from-stone-950/90 via-stone-950/58 to-stone-950/15" />
              <span className="relative flex min-h-40 flex-col justify-end p-4 text-white">
                <span className="text-base font-bold">{card.title}</span>
                <span className="mt-1 text-xs leading-5 text-stone-100">{card.description}</span>
                <span className="mt-2 text-[11px] text-stone-200">
                  {bossForCard ? bossForCard.name : "Maple Trackers 제공 일러스트"}
                </span>
                {selected ? (
                  <span className="mt-2 inline-flex w-fit rounded-full bg-white px-2 py-1 text-[11px] font-bold text-stone-950">
                    선택됨
                  </span>
                ) : null}
              </span>
            </button>
          );
        })}
      </div>
      {value ? (
        <label className="mt-4 block text-sm font-semibold text-stone-900" htmlFor="boss-quick-select">
          보스 빠른 선택
          <select
            id="boss-quick-select"
            disabled={!isHydrated}
            className="mt-2 block w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm text-stone-950 outline-none transition focus:border-stone-950 focus:ring-2 focus:ring-stone-950/15 disabled:cursor-wait disabled:bg-stone-100"
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
