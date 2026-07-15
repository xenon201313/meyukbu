/* eslint-disable @next/next/no-img-element */
"use client";

import { useState, useSyncExternalStore } from "react";

import {
  bossArtworkUrl,
  bossOptions,
  defaultBossOption,
  findBossOption,
  findBossOptionById,
  type BossOption,
} from "@/content/bosses";
import type { ResumeBossTarget, TargetBossCadence } from "@/domain/resume";

const cadenceOptions: ReadonlyArray<{ value: TargetBossCadence; label: string }> = [
  { value: "WEEKLY", label: "주간 보스" },
  { value: "MONTHLY", label: "월간 보스" },
];

const subscribeToHydration = () => () => undefined;
const getHydratedSnapshot = () => true;
const getServerHydrationSnapshot = () => false;

interface BossTargetPickerProps {
  targets: readonly ResumeBossTarget[];
  error?: string;
  onAdd: (boss: BossOption) => void;
  onReplace: (index: number, boss: BossOption) => void;
  onRemove: (index: number) => void;
  onMultiplierChange: (index: number, value: string) => void;
}

function optionForTarget(target: ResumeBossTarget): BossOption | undefined {
  if (target.bossId) {
    return findBossOptionById(target.bossId);
  }
  return target.cadence ? findBossOption(target.cadence, target.bossName) : undefined;
}

/**
 * Edits a small, ordered set of bosses that a party intends to clear together.
 * Each target keeps its own user-provided multiplier and maps back to the
 * catalogued entry rules before the draft can be published.
 */
export function BossTargetPicker({
  targets,
  error,
  onAdd,
  onReplace,
  onRemove,
  onMultiplierChange,
}: BossTargetPickerProps) {
  const isHydrated = useSyncExternalStore(
    subscribeToHydration,
    getHydratedSnapshot,
    getServerHydrationSnapshot,
  );
  const [cadence, setCadence] = useState<TargetBossCadence>("WEEKLY");
  const selectableBosses = bossOptions.filter((boss) => boss.cadence === cadence);
  const selectedIds = new Set(
    targets.map((target) => target.bossId).filter((value): value is string => Boolean(value)),
  );
  const firstAvailable =
    selectableBosses.find((boss) => !selectedIds.has(boss.id)) ?? defaultBossOption(cadence);
  const [selectedBossId, setSelectedBossId] = useState(firstAvailable.id);
  const canAdd = targets.length < 6;

  function updateCadence(nextCadence: TargetBossCadence) {
    setCadence(nextCadence);
    const next = bossOptions.find((boss) => boss.cadence === nextCadence && !selectedIds.has(boss.id));
    setSelectedBossId((next ?? defaultBossOption(nextCadence)).id);
  }

  function addSelectedBoss() {
    const boss = findBossOptionById(selectedBossId);
    if (!boss || boss.cadence !== cadence || selectedIds.has(boss.id) || !canAdd) {
      return;
    }
    onAdd(boss);
    const next = selectableBosses.find(
      (candidate) => candidate.id !== boss.id && !selectedIds.has(candidate.id),
    );
    if (next) {
      setSelectedBossId(next.id);
    }
  }

  return (
    <fieldset>
      <legend className="text-sm font-semibold text-[#202a36]">희망 보스 묶음</legend>
      <p className="mt-1 text-xs leading-5 text-[#52606d]">
        같은 파티로 함께 갈 보스를 최대 6개까지 묶어 적을 수 있어요. 보스 배율은 각 보스마다 따로 작성합니다.
      </p>

      <ol className="mt-4 space-y-3" aria-label="선택한 희망 보스">
        {targets.map((target, index) => {
          const option = optionForTarget(target);
          const selectedId = option?.id ?? "";

          return (
            <li
              key={`${target.bossId ?? target.bossName}-${index}`}
              className="grid gap-3 rounded-xl border border-[#d9cdbd] bg-[#fffefa] p-3 sm:grid-cols-[4.5rem_minmax(0,1fr)_10rem_auto] sm:items-end"
            >
              <div className="flex h-[4.5rem] items-center justify-center overflow-hidden rounded-lg border border-[#e5ddd0] bg-[#f6f2ea] p-1.5 sm:w-[4.5rem]">
                {option ? (
                  <img
                    src={bossArtworkUrl(option.artworkKey)}
                    alt={`${target.bossName} 보스 일러스트`}
                    className="h-full w-full object-contain object-center"
                    loading="lazy"
                    decoding="async"
                  />
                ) : (
                  <span className="text-xs font-semibold text-[#687380]">이미지 없음</span>
                )}
              </div>
              <label className="block text-sm font-semibold text-[#202a36]" htmlFor={`boss-target-${index}`}>
                <span className="flex items-center gap-2">
                  <span className="rounded-sm bg-[#f8e6e1] px-2 py-0.5 text-[11px] font-extrabold text-[#7c2f2c]">
                    {target.cadence === "MONTHLY" ? "월간" : "주간"}
                  </span>
                  보스 {index + 1}
                </span>
                <select
                  id={`boss-target-${index}`}
                  value={selectedId}
                  disabled={!isHydrated}
                  className="ui-input mt-2 block w-full rounded-lg border px-2.5 py-2 text-sm outline-none disabled:cursor-wait disabled:opacity-60"
                  onChange={(event) => {
                    const next = findBossOptionById(event.currentTarget.value);
                    if (next) {
                      onReplace(index, next);
                    }
                  }}
                >
                  {bossOptions.map((boss) => (
                    <option
                      key={boss.id}
                      value={boss.id}
                      disabled={selectedIds.has(boss.id) && boss.id !== selectedId}
                    >
                      {boss.cadence === "WEEKLY" ? "주간" : "월간"} · {boss.name}
                    </option>
                  ))}
                </select>
              </label>
              <label
                className="block text-sm font-semibold text-[#202a36]"
                htmlFor={`boss-multiplier-${index}`}
              >
                보스 배율
                <span className="relative mt-2 block">
                  <input
                    id={`boss-multiplier-${index}`}
                    inputMode="decimal"
                    autoComplete="off"
                    maxLength={40}
                    placeholder="예: 412.5"
                    value={target.bossMultiplierPercent ?? ""}
                    onChange={(event) => onMultiplierChange(index, event.target.value)}
                    className="ui-input block w-full rounded-lg border py-2 pl-2.5 pr-7 text-sm outline-none"
                  />
                  <span className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center text-sm font-bold text-[#687380]">
                    %
                  </span>
                </span>
              </label>
              <button
                type="button"
                disabled={targets.length <= 1}
                onClick={() => onRemove(index)}
                className="rounded-lg border border-[#d9cdbd] bg-[#f6f2ea] px-3 py-2 text-sm font-bold text-[#52606d] transition hover:border-rose-800/45 hover:text-rose-900 disabled:cursor-not-allowed disabled:opacity-45"
              >
                삭제
              </button>
            </li>
          );
        })}
      </ol>

      <div className="mt-4 rounded-xl border border-dashed border-[#bfae99] bg-[#f8f5ef] p-3 sm:p-4">
        <p className="text-sm font-bold text-[#202a36]">보스 추가</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-end">
          <div className="flex gap-2" role="group" aria-label="추가할 보스 주기">
            {cadenceOptions.map((option) => {
              const active = option.value === cadence;
              return (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={active}
                  onClick={() => updateCadence(option.value)}
                  className={`rounded-lg border px-3 py-2 text-sm font-bold transition ${
                    active
                      ? "border-[#a44640] bg-[#f8e6e1] text-[#7c2f2c]"
                      : "border-[#d9cdbd] bg-[#fffefa] text-[#52606d] hover:border-[#a44640]/60"
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
          <label className="block text-sm font-semibold text-[#202a36]" htmlFor="boss-target-add-select">
            <span className="sr-only">추가할 희망 보스</span>
            <select
              id="boss-target-add-select"
              value={selectedBossId}
              disabled={!isHydrated || !canAdd}
              className="ui-input block w-full rounded-lg border px-2.5 py-2 text-sm outline-none disabled:cursor-not-allowed disabled:opacity-60"
              onChange={(event) => setSelectedBossId(event.currentTarget.value)}
            >
              {selectableBosses.map((boss) => (
                <option key={boss.id} value={boss.id} disabled={selectedIds.has(boss.id)}>
                  {boss.name}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            disabled={!isHydrated || !canAdd || selectedIds.has(selectedBossId)}
            onClick={addSelectedBoss}
            className="ui-action rounded-lg px-4 py-2 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-55"
          >
            보스 추가
          </button>
        </div>
        <p className="mt-2 text-xs leading-5 text-[#687380]">{targets.length}/6개 선택됨</p>
      </div>

      {error ? (
        <p id="boss-targets-error" className="mt-2 text-sm leading-5 text-rose-800" role="alert">
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}
