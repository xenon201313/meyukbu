/* eslint-disable @next/next/no-img-element */

import { bossArtworkUrl, findBossOption, findBossOptionById } from "@/content/bosses";
import type { NormalizedCharacterProfile } from "@/domain/character";
import { getFreshnessStatus } from "@/domain/freshness";
import {
  partyTypeLabels,
  partySizeLabel,
  roleLabels,
  targetBossCadenceLabels,
  getResumeBossTargets,
  type ResumeBossTarget,
  type ResumeDraft,
  voiceChatLabels,
  worldTransferAvailabilityLabel,
} from "@/domain/resume";
import { formatNumericDisplay } from "@/lib/format";
import { formatResumeAvailability } from "@/lib/resume-presentation";

import { FreshnessBadge } from "@/components/freshness-badge";
import { MesoongiTemperatureResumeBlock } from "@/components/mesoongi-temperature-resume-block";
import type { MesoongiTemperatureSummary } from "@/components/mesoongi-temperature-panel";
import { ProvenanceBadge } from "@/components/provenance-badge";

interface ResumePreviewProps {
  profile: NormalizedCharacterProfile | null;
  draft: ResumeDraft;
  mode?: "mock" | "live";
  versionNumber?: number;
  temperatureSummary?: MesoongiTemperatureSummary;
  className?: string;
}

function formatKoreanDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "확인 불가";
  }

  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Seoul",
  }).format(date);
}

function formatBossMultiplierPercent(value: string | undefined): string {
  return value ? `${formatNumericDisplay(value)}%` : "미입력";
}

function formatAvailability(draft: ResumeDraft): string {
  return formatResumeAvailability(draft.availability, draft.availabilityMode);
}

function displayOrEmpty(value: string | undefined): string {
  return value?.trim() || "미입력";
}

function targetLabel(target: ResumeBossTarget): string {
  return target.cadence ? `${targetBossCadenceLabels[target.cadence]} · ${target.bossName}` : target.bossName;
}

function CharacterAvatar({ profile }: { profile: NormalizedCharacterProfile }) {
  if (profile.imageUrl) {
    return (
      <span className="h-40 w-40 shrink-0 overflow-hidden border border-[#cec5b7] bg-[#f6f2ea] sm:h-44 sm:w-44">
        <span className="flex h-full w-full items-center justify-center overflow-hidden">
          <img
            src={profile.imageUrl}
            alt={`${profile.characterName} 캐릭터 이미지`}
            className="h-full w-full max-w-none scale-[1.55] object-contain object-center [image-rendering:auto]"
          />
        </span>
      </span>
    );
  }

  return (
    <div
      aria-label={`${profile.characterName} 캐릭터 이미지 없음`}
      className="flex h-40 w-40 shrink-0 items-center justify-center border border-dashed border-[#cec5b7] bg-[#f6f2ea] text-2xl font-bold text-[#687380] sm:h-44 sm:w-44"
      role="img"
    >
      메
    </div>
  );
}

function PreviewSectionHeading({
  id,
  number,
  title,
  provenance,
}: {
  id: string;
  number: string;
  title: string;
  provenance: "NEXON_API" | "USER_PROVIDED";
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-[#ddd5c8] pb-2">
      <div className="flex items-center gap-2.5">
        <span className="text-xs font-bold tracking-[0.16em] text-[#a44640]">{number}</span>
        <h3 id={id} className="text-base font-bold text-[#202a36]">
          {title}
        </h3>
      </div>
      <ProvenanceBadge provenance={provenance} />
    </div>
  );
}

function PreviewRow({ label, value, last = false }: { label: string; value: string; last?: boolean }) {
  return (
    <div className={`flex min-h-12 items-stretch ${last ? "" : "border-b border-[#ddd5c8]"}`}>
      <div className="flex w-28 shrink-0 items-center bg-[#f6f2ea] px-3 text-xs font-bold text-[#5e6b78] sm:w-32">
        {label}
      </div>
      <p className="flex min-w-0 flex-1 items-center break-words px-3 py-2 text-sm leading-6 text-[#202a36]">
        {value}
      </p>
    </div>
  );
}

function PreviewMetric({ label, value, last = false }: { label: string; value: string; last?: boolean }) {
  return (
    <div
      className={`min-w-0 flex-1 p-4 ${last ? "" : "border-b border-[#ddd5c8] sm:border-b-0 sm:border-r"}`}
    >
      <p className="text-xs font-bold text-[#5e6b78]">{label}</p>
      <p className="mt-2 text-2xl font-bold text-[#202a36]">{value}</p>
    </div>
  );
}

function PreviewBossMultiplier({ target }: { target: ResumeBossTarget }) {
  const boss = target.bossId
    ? findBossOptionById(target.bossId)
    : target.cadence
      ? findBossOption(target.cadence, target.bossName)
      : undefined;

  return (
    <div className="flex min-w-0 items-center gap-3 border border-[#cec5b7] bg-[#fffefa] p-3">
      <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden border border-[#ddd5c8] bg-[#f6f2ea] p-1">
        {boss ? (
          <img
            src={bossArtworkUrl(boss.artworkKey)}
            alt={`${target.bossName} 보스 일러스트`}
            data-boss-art-key={boss.artworkKey}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-contain object-center"
          />
        ) : (
          <span className="text-[10px] font-bold text-[#687380]">보스</span>
        )}
      </div>
      <div className="min-w-0">
        <p className="truncate text-xs font-bold text-[#5e6b78]">{targetLabel(target)}</p>
        <p className="mt-1 text-xl font-bold text-[#202a36]">
          {formatBossMultiplierPercent(target.bossMultiplierPercent)}
        </p>
      </div>
    </div>
  );
}

/** A read-only, mobile-first paper-form representation of the resume being edited. */
export function ResumePreview({
  profile,
  draft,
  mode,
  versionNumber,
  temperatureSummary,
  className = "",
}: ResumePreviewProps) {
  if (!profile) {
    return (
      <section
        aria-label="메력서 미리보기"
        className={`resume-paper rounded-2xl border border-dashed p-6 text-sm leading-6 text-[#687380] ${className}`}
      >
        캐릭터 정보를 불러오면 작성 중인 메력서를 여기에서 바로 확인할 수 있어요.
      </section>
    );
  }

  const freshness = getFreshnessStatus(profile.fetchedAt);
  const isMock = mode === "mock" || profile.provider === "mock";
  const bossTargets = getResumeBossTargets(draft);
  const targetBoss = bossTargets.map(targetLabel).join(" / ");

  return (
    <article
      aria-labelledby="resume-preview-title"
      className={`resume-paper overflow-hidden rounded-2xl border ${className}`}
    >
      <div className="flex items-center justify-between gap-3 border-b-2 border-[#283a48] px-5 py-4">
        <div className="flex items-center gap-3">
          <span className="h-10 w-1.5 shrink-0 bg-[#a44640]" />
          <div>
            <p className="text-sm font-bold tracking-[0.08em] text-[#202a36]">메력서 · RESUMAE</p>
            <p className="mt-1 text-xs text-[#5e6b78]">파티 구직용 캐릭터 이력서</p>
          </div>
        </div>
        <span className="text-[10px] font-bold tracking-[0.14em] text-[#a44640]">RESUME DOCUMENT</span>
      </div>

      <div className="space-y-5 p-5 text-[#202a36]">
        {isMock ? (
          <p className="border border-sky-700/30 bg-sky-50 px-3 py-2 text-xs leading-5 text-sky-950">
            현재 데모 데이터로 표시 중입니다. 실제 게임 데이터와 다를 수 있습니다.
          </p>
        ) : null}

        <header className="flex items-start gap-4 border-b border-[#ddd5c8] pb-4">
          <CharacterAvatar profile={profile} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 id="resume-preview-title" className="truncate text-2xl font-bold text-[#202a36]">
                {profile.characterName}
              </h2>
              <ProvenanceBadge provenance="NEXON_API" />
            </div>
            <p className="mt-2 text-sm text-[#52606d]">
              {[profile.worldName, profile.className, profile.level ? `Lv.${profile.level}` : null]
                .filter(Boolean)
                .join(" · ") || "기본 정보 조회 불가"}
            </p>
            <p className="mt-2 text-sm text-[#687380]">현재 길드: {profile.currentGuild ?? "조회 불가"}</p>
          </div>
        </header>

        <section aria-labelledby="preview-application-heading" className="space-y-2">
          <PreviewSectionHeading
            id="preview-application-heading"
            number="01"
            title="지원 분야"
            provenance="USER_PROVIDED"
          />
          <div className="overflow-hidden border border-[#cec5b7]">
            <PreviewRow label="희망 보스" value={displayOrEmpty(targetBoss)} />
            <div className="grid grid-cols-2">
              <div className="border-r border-[#ddd5c8]">
                <PreviewRow label="역할" value={roleLabels[draft.role]} last />
              </div>
              <PreviewRow label="파티 유형" value={partyTypeLabels[draft.partyType]} last />
            </div>
            <PreviewRow label="희망 인원" value={partySizeLabel(draft.partySize)} last />
          </div>
        </section>

        <section aria-labelledby="preview-reference-metrics-heading" className="space-y-2">
          <PreviewSectionHeading
            id="preview-reference-metrics-heading"
            number="02"
            title="환산 · 보스 배율"
            provenance="USER_PROVIDED"
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="overflow-hidden border border-[#cec5b7] sm:flex">
              <PreviewMetric
                label="환산"
                value={draft.convertedStat ? formatNumericDisplay(draft.convertedStat) : "미입력"}
                last
              />
            </div>
            {bossTargets.map((target, index) => (
              <PreviewBossMultiplier key={`${target.bossId ?? target.bossName}-${index}`} target={target} />
            ))}
          </div>
        </section>

        <section aria-labelledby="preview-temperature-heading" className="space-y-2">
          <PreviewSectionHeading
            id="preview-temperature-heading"
            number="03"
            title="메붕이 온도"
            provenance="USER_PROVIDED"
          />
          <MesoongiTemperatureResumeBlock summary={temperatureSummary} />
        </section>

        <section aria-labelledby="preview-experience-heading" className="space-y-2">
          <PreviewSectionHeading
            id="preview-experience-heading"
            number="04"
            title="파티 경험 및 조건"
            provenance="USER_PROVIDED"
          />
          <div className="overflow-hidden border border-[#cec5b7]">
            <PreviewRow label="보스 경험" value={displayOrEmpty(draft.experienceSummary)} />
            <PreviewRow label="어필 포인트" value={displayOrEmpty(draft.roleSummary)} />
            <PreviewRow label="가능 시간" value={formatAvailability(draft)} />
            <PreviewRow label="디스코드" value={voiceChatLabels[draft.voiceChat]} />
            <PreviewRow
              label="월드 통합"
              value={worldTransferAvailabilityLabel(draft.worldTransferAvailability)}
            />
            <PreviewRow label="분배 방식" value={displayOrEmpty(draft.lootPolicy)} last />
          </div>
        </section>

        {draft.contact?.isPublic && draft.contact.value ? (
          <section className="border border-[#cec5b7] bg-[#f8f5ef] p-3 text-sm text-[#5e4030]">
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold">연락 방법</span>
              <ProvenanceBadge provenance="USER_PROVIDED" />
            </div>
            <p className="mt-1 break-all">{draft.contact.value}</p>
          </section>
        ) : null}
      </div>

      <footer className="space-y-2 border-t-2 border-[#283a48] bg-[#f8f5ef] px-5 py-4 text-xs leading-5 text-[#5e6b78]">
        <div className="flex flex-wrap items-center gap-2">
          <FreshnessBadge fetchedAt={profile.fetchedAt} status={freshness} />
          {versionNumber ? <span>v{versionNumber}</span> : null}
          <span>기준 시각: {formatKoreanDateTime(profile.fetchedAt)}</span>
        </div>
        {profile.sourceDate ? <p>데이터 기준일: {profile.sourceDate}</p> : null}
        {freshness === "stale" ? (
          <p>이 메력서의 API 데이터는 최근 24시간 이내 값이 아닙니다. 최신 정보를 확인하려면 갱신하세요.</p>
        ) : null}
        {freshness === "expired" ? (
          <p>API 데이터가 오래되어 공개가 제한되었습니다. 작성자가 갱신하면 다시 확인할 수 있습니다.</p>
        ) : null}
        <p className="font-medium text-[#314355]">Data based on NEXON Open API</p>
        <p>본 서비스는 NEXON의 공식 제휴 또는 인증 서비스가 아닙니다.</p>
      </footer>
    </article>
  );
}
