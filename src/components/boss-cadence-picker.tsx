/* eslint-disable @next/next/no-img-element */
"use client";

import { useSyncExternalStore } from "react";

import {
  bossArtworkUrl,
  bossOptions,
  defaultBossArtworkKeys,
  defaultBossOption,
  findBossOption,
  findBossOptionById,
  type BossOption,
} from "@/content/bosses";
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
    description: "매주 함께 도전할 보스를 목록에서 선택하세요.",
    fallbackImage: "/images/bosses/weekly-raid.png",
    accentClass: "from-[#e9e1f4] via-[#f8f2e9] to-transparent",
    activeClass: "border-[#a44640] ring-[#a44640]/25",
  },
  {
    value: "MONTHLY",
    title: "월간 보스",
    description: "월간 일정에 맞춘 도전 목표를 목록에서 선택하세요.",
    fallbackImage: "/images/bosses/monthly-raid.png",
    accentClass: "from-[#f8e3df] via-[#f8f2e9] to-transparent",
    activeClass: "border-[#a44640] ring-[#a44640]/25",
  },
];

const subscribeToHydration = () => () => undefined;
const getHydratedSnapshot = () => true;
const getServerHydrationSnapshot = () => false;

interface BossCadencePickerProps {
  value: TargetBossCadence | undefined;
  targetBoss: string;
  error?: string;
  onBossSelect: (boss: BossOption) => void;
}

/**
 * Shows the user-authorized Maple Trackers boss artwork without copying image files
 * into the project. A text fallback remains available if the external source is down.
 */
export function BossCadencePicker({ value, targetBoss, error, onBossSelect }: BossCadencePickerProps) {
  const isHydrated = useSyncExternalStore(
    subscribeToHydration,
    getHydratedSnapshot,
    getServerHydrationSnapshot,
  );
  const selectedBoss = value ? findBossOption(value, targetBoss) : undefined;
  const selectableBosses = value ? bossOptions.filter((boss) => boss.cadence === value) : [];

  return (
    <fieldset>
      <legend className="text-sm font-semibold text-[#202a36]">희망 보스 주기</legend>
      <p className="mt-1 text-xs leading-5 text-[#687380]">
        주간 또는 월간을 고른 뒤 목록에서 희망 보스를 선택하세요.
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
              onClick={() => onBossSelect(defaultBossOption(card.value))}
              className={`group relative isolate min-h-36 overflow-hidden rounded-xl border bg-[#fffdf8] text-left shadow-[0_8px_18px_rgba(74,53,35,0.08)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_24px_rgba(74,53,35,0.13)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[#f4efe5] disabled:cursor-wait disabled:opacity-80 ${
                selected ? `ring-2 ${card.activeClass}` : "border-[#d9cdbd] hover:border-[#a44640]/60"
              }`}
            >
              <span
                className="absolute inset-y-2 right-2 flex w-[38%] items-center justify-center rounded-lg bg-[#f8f2e9] p-2"
                aria-hidden="true"
              >
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
                  className="relative h-full w-full object-contain object-center"
                />
                <span className="absolute inset-0 rounded-lg bg-gradient-to-t from-white/10 via-transparent to-white/20" />
              </span>
              <span
                className="absolute inset-y-0 left-0 w-[57%] bg-gradient-to-r from-[#fffdf8] via-[#fffdf8]/95 to-[#fffdf8]/60"
                aria-hidden="true"
              />
              <span className="relative flex min-h-36 max-w-[56%] flex-col justify-center p-4 text-[#202a36] sm:p-5">
                <span className="text-lg font-extrabold tracking-tight">{card.title}</span>
                <span className="mt-1 text-xs leading-5 text-[#687380]">{card.description}</span>
                {bossForCard ? (
                  <span className="mt-2 line-clamp-1 text-[11px] font-semibold text-[#7c2f2c]">
                    {bossForCard.name}
                  </span>
                ) : null}
                {selected ? (
                  <span className="mt-3 inline-flex w-fit items-center gap-1 rounded-sm bg-[#a44640] px-2.5 py-1 text-[11px] font-extrabold text-white shadow-sm">
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
        <label className="mt-4 block text-sm font-semibold text-[#202a36]" htmlFor="boss-quick-select">
          희망 보스 선택
          <select
            id="boss-quick-select"
            disabled={!isHydrated}
            className="ui-input mt-2 block w-full rounded-xl border px-3 py-2.5 text-sm outline-none transition disabled:cursor-wait disabled:opacity-60"
            required
            value={selectedBoss?.id ?? ""}
            aria-describedby={error ? "boss-quick-select-error" : undefined}
            aria-invalid={Boolean(error)}
            onChange={(event) => {
              const selectedOption = findBossOptionById(event.currentTarget.value);
              if (selectedOption && selectedOption.cadence === value) {
                onBossSelect(selectedOption);
              }
            }}
          >
            <option value="" disabled>
              희망 보스를 선택해 주세요
            </option>
            {selectableBosses.map((boss) => (
              <option key={boss.id} value={boss.id}>
                {boss.name}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      {error ? (
        <p id="boss-quick-select-error" className="mt-2 text-sm leading-5 text-rose-800" role="alert">
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}
