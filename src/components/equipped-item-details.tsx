/* eslint-disable @next/next/no-img-element */

import type { EquippedItem, EquipmentOption } from "@/domain/character";
import { formatNumericDisplay } from "@/lib/format";

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
            <dd className="text-right font-medium text-stone-800">{formatNumericDisplay(option.value)}</dd>
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

/**
 * One equipped item that expands on click/tap to reveal every API-published
 * option: starforce, scrolls, potential lines, soul, and option tables.
 */
export function EquippedItemDetails({ item }: { item: EquippedItem }) {
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
