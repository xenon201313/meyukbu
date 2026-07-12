/* eslint-disable @next/next/no-img-element */
import type { NormalizedCharacterProfile, ProfileField } from "@/domain/character";
import { getFreshnessStatus } from "@/domain/freshness";
import {
  partyTypeLabels,
  prioritizedFields,
  roleLabels,
  targetBossCadenceLabels,
  type ResumeDraft,
  voiceChatLabels,
} from "@/domain/resume";

import { FreshnessBadge } from "@/components/freshness-badge";
import { ProvenanceBadge } from "@/components/provenance-badge";

interface ResumePreviewProps {
  profile: NormalizedCharacterProfile | null;
  draft: ResumeDraft;
  mode?: "mock" | "live";
  versionNumber?: number;
  className?: string;
}

function displayValue(field: ProfileField) {
  if (field.value === null || field.value === "") {
    return "조회 불가";
  }

  return `${field.value}${field.unit ?? ""}`;
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

function CharacterAvatar({ profile }: { profile: NormalizedCharacterProfile }) {
  if (profile.imageUrl) {
    return (
      <img
        src={profile.imageUrl}
        alt={`${profile.characterName} 캐릭터 이미지`}
        className="h-20 w-20 rounded-2xl border border-stone-200 bg-stone-100 object-cover"
      />
    );
  }

  return (
    <div
      aria-label={`${profile.characterName} 캐릭터 이미지 없음`}
      className="flex h-20 w-20 items-center justify-center rounded-2xl border border-dashed border-stone-300 bg-stone-100 text-2xl font-bold text-stone-500"
      role="img"
    >
      메
    </div>
  );
}

/** A read-only, mobile-first representation of the resume currently being edited. */
export function ResumePreview({ profile, draft, mode, versionNumber, className = "" }: ResumePreviewProps) {
  if (!profile) {
    return (
      <section
        aria-label="메력서 미리보기"
        className={`rounded-3xl border border-dashed border-stone-300 bg-stone-50 p-6 text-sm leading-6 text-stone-600 ${className}`}
      >
        캐릭터 정보를 불러오면 작성 중인 메력서를 여기에서 바로 확인할 수 있어요.
      </section>
    );
  }

  const fields = prioritizedFields(profile, draft.role);
  const freshness = getFreshnessStatus(profile.fetchedAt);
  const availability = draft.availability[0];
  const isMock = mode === "mock" || profile.provider === "mock";

  return (
    <article
      aria-labelledby="resume-preview-title"
      className={`overflow-hidden rounded-3xl border border-stone-300 bg-[#fffdf8] text-stone-900 shadow-sm ${className}`}
    >
      <div className="border-b border-stone-200 bg-stone-950 px-5 py-3 text-stone-50">
        <p className="text-xs font-semibold tracking-[0.2em] text-stone-300">메력부 · 메력서</p>
        <p className="mt-1 text-sm text-stone-200">파티 구직용 캐릭터 이력서</p>
      </div>

      <div className="space-y-6 p-5">
        {isMock ? (
          <p className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-xs leading-5 text-sky-900">
            데모 데이터로 표시 중입니다. 실제 게임 데이터와 다를 수 있습니다.
          </p>
        ) : null}

        <header className="flex items-start gap-4">
          <CharacterAvatar profile={profile} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 id="resume-preview-title" className="truncate text-2xl font-bold tracking-tight">
                {profile.characterName}
              </h2>
              <ProvenanceBadge provenance="NEXON_API" />
            </div>
            <p className="mt-1 text-sm text-stone-700">
              {[profile.worldName, profile.className, profile.level ? `Lv.${profile.level}` : null]
                .filter(Boolean)
                .join(" · ") || "기본 정보 조회 불가"}
            </p>
            <p className="mt-1 text-sm text-stone-600">현재 길드: {profile.currentGuild ?? "조회 불가"}</p>
          </div>
        </header>

        <section aria-labelledby="preview-application-heading">
          <p id="preview-application-heading" className="text-xs font-bold tracking-[0.16em] text-stone-500">
            지원 분야
          </p>
          <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
            <PreviewItem
              label="희망 보스"
              value={
                draft.targetBossCadence
                  ? `${targetBossCadenceLabels[draft.targetBossCadence]} · ${draft.targetBoss}`
                  : draft.targetBoss
              }
              provenance="USER_PROVIDED"
            />
            <PreviewItem label="난이도" value={draft.difficulty} provenance="USER_PROVIDED" />
            <PreviewItem label="역할" value={roleLabels[draft.role]} provenance="USER_PROVIDED" />
            <PreviewItem
              label="파티 유형"
              value={partyTypeLabels[draft.partyType]}
              provenance="USER_PROVIDED"
            />
          </div>
        </section>

        <section aria-labelledby="preview-metrics-heading">
          <p id="preview-metrics-heading" className="text-xs font-bold tracking-[0.16em] text-stone-500">
            핵심 역량
          </p>
          {fields.length ? (
            <dl className="mt-2 grid grid-cols-2 gap-2">
              {fields.map((field) => (
                <div key={field.key} className="rounded-xl border border-stone-200 bg-white p-3">
                  <dt className="flex items-center justify-between gap-2 text-xs text-stone-600">
                    <span>{field.label}</span>
                    <ProvenanceBadge provenance={field.provenance} />
                  </dt>
                  <dd className="mt-2 break-words text-base font-bold text-stone-950">
                    {displayValue(field)}
                  </dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="mt-2 text-sm text-stone-600">표시할 API 조회 항목이 없습니다.</p>
          )}
        </section>

        <section aria-labelledby="preview-experience-heading" className="space-y-3">
          <p id="preview-experience-heading" className="text-xs font-bold tracking-[0.16em] text-stone-500">
            파티 경험 및 가능 시간
          </p>
          {draft.experienceSummary ? <PreviewText label="보스 경험" value={draft.experienceSummary} /> : null}
          {draft.roleSummary ? <PreviewText label="담당 역할" value={draft.roleSummary} /> : null}
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold">가능 시간</span>
              <ProvenanceBadge provenance="USER_PROVIDED" />
            </div>
            <p className="mt-1 leading-6">
              {availability
                ? `${availability.days.join(" · ")} ${availability.startTime}–${availability.endTime} (한국 표준시)`
                : "입력 필요"}
            </p>
          </div>
        </section>

        <section aria-label="희망 조건" className="grid grid-cols-2 gap-2 text-sm">
          <PreviewItem
            label="음성 채팅"
            value={voiceChatLabels[draft.voiceChat]}
            provenance="USER_PROVIDED"
          />
          <PreviewItem label="분배 방식" value={draft.lootPolicy || "협의"} provenance="USER_PROVIDED" />
        </section>

        {draft.contact?.isPublic && draft.contact.value ? (
          <section className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold">연락 방법</span>
              <ProvenanceBadge provenance="USER_PROVIDED" />
            </div>
            <p className="mt-1 break-all">{draft.contact.value}</p>
          </section>
        ) : null}
      </div>

      <footer className="space-y-2 border-t border-stone-200 bg-stone-50 px-5 py-4 text-xs leading-5 text-stone-600">
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
        <p className="font-medium text-stone-700">Data based on NEXON Open API</p>
        <p>본 서비스는 NEXON의 공식 제휴 또는 인증 서비스가 아닙니다.</p>
      </footer>
    </article>
  );
}

function PreviewItem({
  label,
  value,
  provenance,
}: {
  label: string;
  value: string;
  provenance: "USER_PROVIDED" | "NEXON_API";
}) {
  return (
    <div className="rounded-xl border border-stone-200 bg-white p-3">
      <div className="flex flex-wrap items-center justify-between gap-1">
        <p className="text-xs text-stone-600">{label}</p>
        <ProvenanceBadge provenance={provenance} />
      </div>
      <p className="mt-2 break-words font-semibold text-stone-950">{value || "입력 필요"}</p>
    </div>
  );
}

function PreviewText({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
      <div className="flex items-center justify-between gap-2">
        <span className="font-semibold">{label}</span>
        <ProvenanceBadge provenance="USER_PROVIDED" />
      </div>
      <p className="mt-1 whitespace-pre-wrap break-words leading-6">{value}</p>
    </div>
  );
}
