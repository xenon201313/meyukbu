/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";

import { CombatStatsPanel } from "@/components/combat-stats-panel";
import { OwnerResumeActions } from "@/components/owner-resume-actions";
import { ProvenanceBadge } from "@/components/provenance-badge";
import { SiteHeader } from "@/components/site-header";
import { FreshnessBadge } from "@/components/freshness-badge";
import { toPublicResumeView } from "@/server/services/public-view";
import { getPublicResume } from "@/server/services/resume-service";
import { editTokenCookieName, verifyEditToken } from "@/lib/auth/edit-token";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ v?: string }>;
}

export default async function PublicResumePage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const { v } = await searchParams;
  const requestedVersion = v ? Number.parseInt(v, 10) : undefined;
  const result = await getPublicResume(
    slug,
    Number.isFinite(requestedVersion) ? requestedVersion : undefined,
  );
  if (!result) {
    notFound();
  }
  const resume = toPublicResumeView(result);
  const imageUrl = `/r/${slug}/image?v=${resume.version.versionNumber}`;
  const cookieStore = await cookies();
  const canEdit = verifyEditToken(
    cookieStore.get(editTokenCookieName(slug))?.value,
    result.resume.editTokenHash,
  );

  return (
    <main className="resume-shell pb-14">
      <SiteHeader currentLabel="메력서 검증" />

      <div className="mx-auto grid max-w-5xl gap-7 px-5 pt-7 sm:px-8 lg:grid-cols-[minmax(0,1fr)_280px]">
        <section className="space-y-4">
          {!resume.isLatestVersion ? (
            <div
              role="status"
              className="mb-4 rounded-xl border border-amber-800/35 bg-amber-50 p-4 text-sm leading-6 text-amber-950"
            >
              최신 버전(v{resume.latestVersionNumber})이 있습니다. 이 페이지는 v{resume.version.versionNumber}
              의 원본을 보여 줍니다.
              <Link className="ml-2 font-bold underline" href={`/r/${slug}`}>
                최신 버전 보기
              </Link>
            </div>
          ) : null}
          {resume.freshness === "expired" ? (
            <div
              role="status"
              className="mb-4 rounded-xl border border-rose-800/35 bg-rose-50 p-4 text-sm leading-6 text-rose-950"
            >
              API 데이터가 오래되어 공개가 제한되었습니다. 작성자가 갱신하면 다시 확인할 수 있습니다.
            </div>
          ) : null}
          <img
            src={imageUrl}
            alt={`${resume.version.snapshot.profile.characterName} 메력서 v${resume.version.versionNumber}`}
            width={1080}
            height={1350}
            data-resume-share-image
            className="block w-full rounded-2xl border border-[#d9cdbd] bg-[#fffefa] shadow-[0_20px_50px_rgba(74,53,35,0.14)]"
          />
          <CombatStatsPanel profile={resume.version.snapshot.profile} />
        </section>

        <aside className="space-y-4 lg:sticky lg:top-6 lg:h-fit">
          <section className="ui-panel rounded-xl p-4">
            <div className="flex items-center justify-between gap-2">
              <h1 className="font-bold text-white">검증 정보</h1>
              <FreshnessBadge fetchedAt={resume.version.snapshot.fetchedAt} status={resume.freshness} />
            </div>
            <dl className="mt-3 space-y-3 text-sm text-slate-200">
              <div>
                <dt className="text-slate-500">데이터 기준 시각</dt>
                <dd className="mt-1 font-medium">
                  {new Intl.DateTimeFormat("ko-KR", {
                    dateStyle: "medium",
                    timeStyle: "short",
                    timeZone: "Asia/Seoul",
                  }).format(new Date(resume.version.snapshot.fetchedAt))}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">source date</dt>
                <dd className="mt-1 font-medium">{resume.version.snapshot.sourceDate ?? "조회 불가"}</dd>
              </div>
              <div>
                <dt className="text-slate-500">버전 / content hash</dt>
                <dd className="mt-1 break-all font-medium">
                  v{resume.version.versionNumber} · {resume.version.contentHash.slice(0, 12)}
                </dd>
              </div>
            </dl>
            <a
              href={imageUrl}
              download={`메력서-${slug}-v${resume.version.versionNumber}.png`}
              className="ui-action mt-4 block rounded-xl px-4 py-3 text-center text-sm font-bold transition"
            >
              이미지 저장 (1080×1350 PNG)
            </a>
            <p className="mt-3 text-xs leading-5 text-slate-400">
              Data based on NEXON Open API
              <br />본 서비스는 NEXON의 공식 제휴 또는 인증 서비스가 아닙니다.
            </p>
          </section>
          <section className="ui-panel rounded-xl p-4">
            <h2 className="text-sm font-bold text-white">출처 범례</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              <ProvenanceBadge provenance="NEXON_API" />
              <ProvenanceBadge provenance="SERVICE_CALCULATED" />
              <ProvenanceBadge provenance="USER_PROVIDED" />
              <ProvenanceBadge provenance="SERVICE_OBSERVED" />
            </div>
          </section>
          {resume.guildObservations.length ? (
            <section className="ui-panel rounded-xl p-4">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-bold text-white">길드 관측</h2>
                <ProvenanceBadge provenance="SERVICE_OBSERVED" />
              </div>
              <ul className="mt-3 space-y-3 text-xs leading-5 text-slate-300">
                {resume.guildObservations.map((observation) => (
                  <li
                    key={observation.id}
                    className="border-t border-slate-700 pt-3 first:border-t-0 first:pt-0"
                  >
                    <p className="font-semibold text-slate-100">
                      {observation.guildName ?? "길드 정보 없음"}
                    </p>
                    <p>
                      관측 시작:{" "}
                      {new Intl.DateTimeFormat("ko-KR", {
                        dateStyle: "short",
                        timeZone: "Asia/Seoul",
                      }).format(new Date(observation.observedFrom))}
                    </p>
                    <p>
                      마지막 관측:{" "}
                      {new Intl.DateTimeFormat("ko-KR", {
                        dateStyle: "short",
                        timeZone: "Asia/Seoul",
                      }).format(new Date(observation.lastObservedAt))}
                    </p>
                    {observation.observedTo ? (
                      <p>
                        관측 종료:{" "}
                        {new Intl.DateTimeFormat("ko-KR", {
                          dateStyle: "short",
                          timeZone: "Asia/Seoul",
                        }).format(new Date(observation.observedTo))}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-xs leading-5 text-slate-400">
                서비스 관측 이력은 실제 가입·탈퇴 시점과 다를 수 있습니다.
              </p>
            </section>
          ) : null}
          {canEdit ? <OwnerResumeActions slug={slug} /> : null}
        </aside>
      </div>
    </main>
  );
}
