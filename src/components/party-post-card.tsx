/* eslint-disable @next/next/no-img-element */

import Link from "next/link";

import { partyPostKindLabels, type PublicPartyPost } from "@/domain/party";
import { partyWorldGroupLabels } from "@/domain/party-world";
import { partySizeLabel, roleLabels, voiceChatLabels, worldTransferAvailabilityLabel } from "@/domain/resume";
import { formatPartyAvailability, formatPartyBossLabel, formatPartyExpiry } from "@/lib/party/presentation";

interface PartyPostCardProps {
  post: PublicPartyPost;
}

function targetSummary(post: PublicPartyPost): string {
  return post.targets.map((target) => formatPartyBossLabel(target.bossName, target.cadence)).join(" · ");
}

/** A safe public card: it renders only the whitelisted party-board DTO. */
export function PartyPostCard({ post }: PartyPostCardProps) {
  const owner = post.owner;

  return (
    <article
      data-testid="party-post-card"
      className="ui-panel flex h-full flex-col rounded-2xl p-5"
      aria-label={`${partyPostKindLabels[post.kind]}: ${targetSummary(post)}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="rounded-full border border-[#a44640]/45 bg-[#f8e6e1] px-2.5 py-1 text-xs font-bold text-[#7c2f2c]">
          {partyPostKindLabels[post.kind]}
        </span>
        <span className="text-xs font-bold text-[#687380]">{formatPartyExpiry(post.expiresAt)}</span>
      </div>

      <div className="mt-4 flex items-start gap-4">
        {owner.imageUrl ? (
          <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-[#d9cdbd] bg-[#f6f2ea] sm:h-24 sm:w-24">
            <img
              src={owner.imageUrl}
              alt={`${owner.characterName} 캐릭터 이미지`}
              width={192}
              height={192}
              className="h-full w-full scale-[1.38] object-contain [image-rendering:auto]"
            />
          </div>
        ) : (
          <span
            aria-hidden
            className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl border border-[#d9cdbd] bg-[#f6f2ea] text-2xl font-bold text-[#7c2f2c] sm:h-24 sm:w-24"
          >
            {owner.characterName.slice(0, 1)}
          </span>
        )}
        <div className="min-w-0">
          <h2 className="resume-heading truncate text-xl font-bold">{owner.characterName}</h2>
          <p className="mt-1 text-sm text-[#52606d]">
            {[owner.worldName, owner.className, owner.level ? `Lv.${owner.level}` : null]
              .filter(Boolean)
              .join(" · ") || "기본 정보 조회 불가"}
          </p>
          <p className="mt-1 text-xs font-bold text-[#687380]">
            {roleLabels[owner.role]} · {partySizeLabel(owner.partySize ?? undefined)} · 디스코드{" "}
            {voiceChatLabels[owner.voiceChat]}
          </p>
          <p className="mt-1 text-xs text-[#687380]">
            {owner.worldGroup
              ? `파티 그룹 ${partyWorldGroupLabels[owner.worldGroup]}`
              : "파티 그룹 확인 불가"}
            {" · "}월드 통합 {worldTransferAvailabilityLabel(owner.worldTransferAvailability ?? undefined)}
          </p>
        </div>
      </div>

      <ul className="mt-5 flex flex-wrap gap-2" aria-label="모집 보스와 배율">
        {post.targets.map((target) => (
          <li
            key={`${target.sortOrder}-${target.bossName}`}
            className="rounded-xl border border-[#d9cdbd] bg-[#fffefa] px-3 py-2 text-sm"
          >
            <span className="font-bold text-[#202a36]">
              {formatPartyBossLabel(target.bossName, target.cadence)}
            </span>
            <span className="ml-2 text-xs text-[#687380]">
              {target.bossMultiplierPercent ? `배율 ${target.bossMultiplierPercent}%` : "배율 미입력"}
              {` · 최대 ${target.maxPartySize}인`}
            </span>
          </li>
        ))}
      </ul>

      <dl className="mt-5 grid gap-3 border-t border-[#d9cdbd] pt-4 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-xs font-bold text-[#687380]">가능 시간</dt>
          <dd className="mt-1 font-bold leading-6 text-[#202a36]">
            {formatPartyAvailability(owner.availabilityMode, owner.availability)}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-bold text-[#687380]">게시 이력서</dt>
          <dd className="mt-1 font-bold text-[#202a36]">v{owner.versionNumber}</dd>
        </div>
      </dl>

      <Link
        href={`/parties/${encodeURIComponent(post.slug)}`}
        className="ui-action mt-5 block rounded-xl px-4 py-3 text-center text-sm font-bold transition"
      >
        게시글 열기
      </Link>
    </article>
  );
}
