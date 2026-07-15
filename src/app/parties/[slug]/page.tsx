/* eslint-disable @next/next/no-img-element */

import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";

import { PartyApplicationForm } from "@/components/party-application-form";
import { PartyOwnerQueue } from "@/components/party-owner-queue";
import { SiteHeader } from "@/components/site-header";
import { editTokenCookieName } from "@/lib/auth/edit-token";
import { getPartyRepository } from "@/lib/db/party-repository";
import { partyPostKindLabels } from "@/domain/party";
import { partySizeLabel, roleLabels, voiceChatLabels } from "@/domain/resume";
import {
  formatPartyAvailability,
  formatPartyBossLabel,
  formatPartyDateTime,
  formatPartyExpiry,
} from "@/lib/party/presentation";
import { getPartyPostForOwner, getPublicPartyPost } from "@/server/services/party-service";

export const dynamic = "force-dynamic";

interface PartyPostPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PartyPostPageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPublicPartyPost(slug).catch(() => null);
  return {
    title: post
      ? `${post.owner.characterName} · ${post.targets.map((target) => target.bossName).join(" / ")}`
      : "파티 게시글",
  };
}

/** Public detail plus private owner/application actions that remain cookie-authorized. */
export default async function PartyPostPage({ params }: PartyPostPageProps) {
  const { slug } = await params;
  let post = await getPublicPartyPost(slug).catch(() => null);
  let isOwnerManagementView = false;

  // A current-resume update deliberately removes a pinned post from public
  // discovery. The owner still needs a private route to inspect applications
  // and close that auditable post, so recover it only with the matching
  // HttpOnly edit-token cookie.
  if (!post) {
    const ownerPost = await (async () => {
      try {
        const stored = await getPartyRepository().findPostBySlug(slug);
        if (!stored) {
          return null;
        }
        const token = (await cookies()).get(editTokenCookieName(stored.ownerResumeSlug))?.value;
        if (!token) {
          return null;
        }
        return await getPartyPostForOwner(slug, token);
      } catch {
        return null;
      }
    })();
    if (ownerPost) {
      post = ownerPost;
      isOwnerManagementView = true;
    }
  }

  if (!post) {
    notFound();
  }

  const owner = post.owner;

  return (
    <main className="resume-shell min-h-screen pb-14">
      <SiteHeader currentLabel="파티 게시글" />
      <div className="mx-auto max-w-6xl px-5 pt-7 sm:px-8 sm:pt-10">
        <Link href="/parties" className="text-sm font-bold text-[#7c2f2c] underline underline-offset-4">
          ← 파티 게시판으로
        </Link>

        <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <section className="space-y-5">
            {isOwnerManagementView ? (
              <p
                role="status"
                className="rounded-2xl border border-[#bfae99] bg-[#f6f2ea] px-4 py-3 text-sm leading-6 text-[#52606d]"
              >
                이 게시글은 메력서 갱신, 공개 중단 또는 마감으로 공개 목록에서는 숨겨졌습니다. 작성자만 지원
                현황을 확인하고 마감 처리할 수 있습니다.
              </p>
            ) : null}
            <article className="resume-paper rounded-2xl border p-5 sm:p-8">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="rounded-full border border-[#a44640]/45 bg-[#f8e6e1] px-2.5 py-1 text-xs font-bold text-[#7c2f2c]">
                  {partyPostKindLabels[post.kind]}
                </span>
                <span className="text-xs font-bold text-[#687380]">{formatPartyExpiry(post.expiresAt)}</span>
              </div>

              <div className="mt-5 flex items-start gap-4 border-b border-[#d9cdbd] pb-5">
                {owner.imageUrl ? (
                  <img
                    src={owner.imageUrl}
                    alt={`${owner.characterName} 캐릭터 이미지`}
                    width={112}
                    height={112}
                    className="h-24 w-24 shrink-0 rounded-2xl border border-[#d9cdbd] bg-[#f6f2ea] object-contain p-1 sm:h-28 sm:w-28"
                  />
                ) : (
                  <span
                    aria-hidden
                    className="flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl border border-[#d9cdbd] bg-[#f6f2ea] text-3xl font-bold text-[#7c2f2c] sm:h-28 sm:w-28"
                  >
                    {owner.characterName.slice(0, 1)}
                  </span>
                )}
                <div className="min-w-0">
                  <h1 className="resume-heading text-3xl font-bold">{owner.characterName}</h1>
                  <p className="mt-2 text-sm leading-6 text-[#52606d]">
                    {[owner.worldName, owner.className, owner.level ? `Lv.${owner.level}` : null]
                      .filter(Boolean)
                      .join(" · ") || "기본 정보 조회 불가"}
                  </p>
                  <dl className="mt-3 grid gap-x-5 gap-y-1 text-sm sm:grid-cols-2">
                    <div>
                      <dt className="sr-only">역할</dt>
                      <dd className="font-bold text-[#202a36]">{roleLabels[owner.role]}</dd>
                    </div>
                    <div>
                      <dt className="sr-only">희망 인원</dt>
                      <dd className="font-bold text-[#202a36]">
                        {partySizeLabel(owner.partySize ?? undefined)}
                      </dd>
                    </div>
                    <div>
                      <dt className="sr-only">디스코드</dt>
                      <dd className="text-[#52606d]">디스코드 {voiceChatLabels[owner.voiceChat]}</dd>
                    </div>
                    <div>
                      <dt className="sr-only">가능 시간</dt>
                      <dd className="text-[#52606d]">
                        {formatPartyAvailability(owner.availabilityMode, owner.availability)}
                      </dd>
                    </div>
                  </dl>
                </div>
              </div>

              <section className="mt-6" aria-labelledby="party-targets-heading">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="resume-kicker">BOSS BUNDLE</p>
                    <h2 id="party-targets-heading" className="mt-1 text-xl font-bold text-[#202a36]">
                      함께 가려는 보스
                    </h2>
                  </div>
                  <Link
                    href={`/r/${encodeURIComponent(owner.resumeSlug)}`}
                    className="text-sm font-bold text-[#7c2f2c] underline underline-offset-4"
                  >
                    메력서 확인
                  </Link>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {post.targets.map((target) => (
                    <article
                      key={`${target.sortOrder}-${target.bossName}`}
                      className="rounded-xl border border-[#d9cdbd] bg-[#fffefa] p-4"
                    >
                      <p className="font-bold text-[#202a36]">
                        {formatPartyBossLabel(target.bossName, target.cadence)}
                      </p>
                      <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <dt className="text-xs font-bold text-[#687380]">보스 배율</dt>
                          <dd className="mt-1 text-xl font-bold text-[#202a36]">
                            {target.bossMultiplierPercent ? `${target.bossMultiplierPercent}%` : "미입력"}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-xs font-bold text-[#687380]">입장 인원</dt>
                          <dd className="mt-1 font-bold text-[#202a36]">최대 {target.maxPartySize}인</dd>
                        </div>
                      </dl>
                    </article>
                  ))}
                </div>
              </section>

              <footer className="mt-6 border-t border-[#d9cdbd] pt-4 text-xs leading-6 text-[#687380]">
                <p>게시 시각: {formatPartyDateTime(post.createdAt)}</p>
                <p>마감 시각: {formatPartyDateTime(post.expiresAt)}</p>
                <p className="mt-2">이 게시글은 공개·최근 조회 메력서의 현재 버전에 연결됩니다.</p>
              </footer>
            </article>

            <PartyOwnerQueue postSlug={post.slug} />
          </section>

          <aside className="space-y-4 lg:sticky lg:top-6 lg:h-fit">
            <PartyApplicationForm
              postSlug={post.slug}
              ownerResumeSlug={owner.resumeSlug}
              targets={post.targets}
            />
            <section className="ui-panel rounded-2xl p-5 text-sm leading-6 text-[#52606d]">
              <h2 className="font-bold text-[#202a36]">이 게시판의 원칙</h2>
              <p className="mt-2">
                보스 배율은 메력서 작성자가 입력한 참고 정보입니다. 서비스가 계산한 점수나 합격 여부로
                사용하지 않으며, 메붕이 온도는 노출·정렬·지원 판단에 사용하지 않습니다.
              </p>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}
