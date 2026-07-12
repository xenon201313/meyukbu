/* eslint-disable @next/next/no-img-element */

import type { EquippedItem, EquipmentOption } from "@/domain/character";
import { formatNumericDisplay } from "@/lib/format";

type OptionTone = "cyan" | "sky" | "amber" | "violet";

const optionToneClassNames: Record<OptionTone, { heading: string; value: string }> = {
  cyan: { heading: "text-cyan-300", value: "text-cyan-100" },
  sky: { heading: "text-sky-300", value: "text-sky-100" },
  amber: { heading: "text-amber-300", value: "text-amber-100" },
  violet: { heading: "text-violet-300", value: "text-violet-100" },
};

/** Renders raw API option groups without calculating or supplementing item data. */
function DenseOptionList({
  title,
  options,
  tone,
}: {
  title: string;
  options: EquipmentOption[];
  tone: OptionTone;
}) {
  if (!options.length) {
    return null;
  }

  const color = optionToneClassNames[tone];

  return (
    <section aria-label={title} className="border-t border-[#3a3b32] pt-3">
      <h4 className={`text-xs font-black tracking-[0.08em] ${color.heading}`}>{title}</h4>
      <dl className="mt-2 space-y-1 text-sm leading-5">
        {options.map((option, index) => (
          <div
            key={`${option.label}:${option.value}:${index}`}
            className="flex items-baseline justify-between gap-3 border-b border-dashed border-[#35362d] py-1"
          >
            <dt className="min-w-0 text-stone-300">{option.label}</dt>
            <dd className={`shrink-0 text-right font-bold tabular-nums ${color.value}`}>
              {formatNumericDisplay(option.value)}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function PotentialOptionList({
  title,
  grade,
  options,
  additional = false,
}: {
  title: string;
  grade: string | null;
  options: string[];
  additional?: boolean;
}) {
  if (!grade && !options.length) {
    return null;
  }

  return (
    <section className="border-t border-[#3a3b32] pt-3" aria-label={title}>
      <div className="flex flex-wrap items-center gap-2">
        <h4
          className={`text-xs font-black tracking-[0.08em] ${additional ? "text-lime-300" : "text-lime-200"}`}
        >
          {title}
        </h4>
        {grade ? (
          <span className="rounded-full border border-lime-300/35 bg-lime-300/10 px-2 py-0.5 text-[11px] font-bold text-lime-100">
            {grade}
          </span>
        ) : null}
      </div>
      {options.length ? (
        <ul className="mt-2 space-y-1 text-sm leading-5 text-stone-100">
          {options.map((option, index) => (
            <li
              key={`${option}:${index}`}
              className="border-b border-dashed border-[#35362d] py-1 font-semibold text-lime-50"
            >
              {option}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-xs leading-5 text-stone-400">
          등급만 API에서 제공되며 상세 옵션은 조회되지 않았습니다.
        </p>
      )}
    </section>
  );
}

function ItemIcon({ item }: { item: EquippedItem }) {
  if (item.iconUrl) {
    return (
      <span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl border-2 border-lime-300 bg-stone-100 p-1 shadow-[0_0_0_3px_rgba(163,230,53,0.12)] sm:h-24 sm:w-24">
        <img src={item.iconUrl} alt="" className="h-full w-full object-contain" />
      </span>
    );
  }

  return (
    <span
      aria-hidden="true"
      className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl border-2 border-dashed border-[#777b61] bg-[#202118] text-center text-[11px] font-bold leading-4 text-stone-400 sm:h-24 sm:w-24"
    >
      이미지
      <br />
      없음
    </span>
  );
}

function Starforce({ value }: { value: string | null }) {
  if (!value) {
    return null;
  }

  const numericValue = Number(value);
  const starCount = Number.isInteger(numericValue) && numericValue > 0 ? Math.min(numericValue, 25) : null;
  const stars = starCount ? `${"★".repeat(starCount)}${"☆".repeat(25 - starCount)}` : null;

  return (
    <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5" aria-label={`스타포스 ${value}`}>
      {stars ? (
        <span
          aria-hidden="true"
          className="max-w-full break-all text-sm leading-4 tracking-tight text-amber-300"
        >
          {stars}
        </span>
      ) : null}
      <span className="text-xs font-black text-amber-100">스타포스 {value}</span>
    </span>
  );
}

function ItemMetadata({ item }: { item: EquippedItem }) {
  const metadata = [
    item.part ? { label: "장비 분류", value: item.part } : null,
    item.slot && item.slot !== item.part ? { label: "장착 위치", value: item.slot } : null,
    item.starforce ? { label: "스타포스", value: item.starforce } : null,
    item.scrollUpgrade ? { label: "주문서 업그레이드", value: item.scrollUpgrade } : null,
    item.soulName ? { label: "소울", value: item.soulName } : null,
    item.soulOption ? { label: "소울 옵션", value: item.soulOption } : null,
  ].filter((entry): entry is { label: string; value: string } => entry !== null);

  if (!metadata.length) {
    return null;
  }

  return (
    <dl className="grid gap-x-4 gap-y-2 text-xs leading-5 sm:grid-cols-2">
      {metadata.map((entry) => (
        <div key={entry.label} className="border-b border-dashed border-[#35362d] pb-1">
          <dt className="text-stone-500">{entry.label}</dt>
          <dd className="mt-0.5 break-words font-semibold text-stone-100">{entry.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Shows one current equipment item with only the detailed options published by the API. */
export function EquippedItemDetails({
  item,
  defaultOpen = false,
}: {
  item: EquippedItem;
  defaultOpen?: boolean;
}) {
  const itemCategory = item.part ?? item.slot ?? "장착 장비";

  return (
    <details
      open={defaultOpen}
      className="group overflow-hidden rounded-2xl border border-[#4b4d3a] bg-[#12130f] text-stone-50 shadow-[0_12px_28px_rgba(20,21,14,0.15)]"
    >
      <summary className="flex cursor-pointer list-none items-center gap-3 p-3.5 outline-none transition hover:bg-[#191a14] focus-visible:ring-2 focus-visible:ring-lime-300 focus-visible:ring-inset [&::-webkit-details-marker]:hidden">
        <ItemIcon item={item} />
        <span className="min-w-0 flex-1">
          <span className="block text-xs font-semibold text-stone-400">장비분류 · {itemCategory}</span>
          <Starforce value={item.starforce} />
          <span className="mt-1 block truncate text-lg font-black tracking-tight text-stone-50">
            {item.name}
          </span>
          <span className="mt-1 flex flex-wrap gap-1.5 text-[11px] font-bold">
            {item.potentialGrade ? (
              <span className="rounded-full border border-lime-300/30 bg-lime-300/10 px-2 py-0.5 text-lime-100">
                잠재 {item.potentialGrade}
              </span>
            ) : null}
            {item.additionalPotentialGrade ? (
              <span className="rounded-full border border-cyan-300/30 bg-cyan-300/10 px-2 py-0.5 text-cyan-100">
                에디 {item.additionalPotentialGrade}
              </span>
            ) : null}
            {item.scrollUpgrade ? (
              <span className="rounded-full border border-stone-500/50 bg-stone-800 px-2 py-0.5 text-stone-200">
                업그레이드 {item.scrollUpgrade}
              </span>
            ) : null}
          </span>
        </span>
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-stone-600 text-lg text-stone-300 transition group-open:rotate-45 group-open:border-lime-300 group-open:text-lime-200"
          aria-hidden="true"
        >
          +
        </span>
      </summary>

      <div className="space-y-4 border-t border-[#4b4d3a] p-4">
        <ItemMetadata item={item} />
        <DenseOptionList title="최종 옵션" options={item.totalOptions} tone="cyan" />
        <DenseOptionList title="기본 옵션" options={item.baseOptions} tone="sky" />
        <DenseOptionList title="추가 옵션" options={item.addOptions} tone="amber" />
        <DenseOptionList title="특수 옵션" options={item.exceptionalOptions} tone="violet" />
        <DenseOptionList title="기타 옵션" options={item.etcOptions} tone="sky" />
        <PotentialOptionList title="잠재능력" grade={item.potentialGrade} options={item.potentialOptions} />
        <PotentialOptionList
          title="에디셔널 잠재능력"
          grade={item.additionalPotentialGrade}
          options={item.additionalPotentialOptions}
          additional
        />
        {item.description ? (
          <section className="border-t border-[#3a3b32] pt-3" aria-label="아이템 설명">
            <h4 className="text-xs font-black tracking-[0.08em] text-stone-400">아이템 설명</h4>
            <p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-stone-300">{item.description}</p>
          </section>
        ) : null}
      </div>
    </details>
  );
}
