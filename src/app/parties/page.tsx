import type { Metadata } from "next";
import Link from "next/link";

import { PartyPostCard } from "@/components/party-post-card";
import { SiteHeader } from "@/components/site-header";
import { getPublicPartyPosts } from "@/server/services/party-service";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "파티 게시판",
  description: "공개·최신 메력서를 바탕으로 파티원을 모집하거나 참여할 파티를 찾습니다.",
};

/** Public, non-ranked board of currently eligible resume-backed party posts. */
export default async function PartiesPage() {
  let posts: Awaited<ReturnType<typeof getPublicPartyPosts>> = [];
  let loadFailed = false;
  try {
    posts = await getPublicPartyPosts();
  } catch {
    loadFailed = true;
  }

  return (
    <main className="resume-shell min-h-screen pb-14">
      <SiteHeader currentLabel="파티 게시판" />
      <div className="mx-auto max-w-6xl px-5 pt-8 sm:px-8 sm:pt-12">
        <section className="flex flex-col gap-5 border-b border-[#d9cdbd] pb-7 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-3xl">
            <p className="resume-kicker">PARTY BOARD</p>
            <h1 className="resume-heading mt-2 text-3xl font-bold sm:text-4xl">파티 구인 · 구직</h1>
            <p className="mt-3 text-sm leading-7 text-[#52606d]">
              메력서에 등록한 여러 보스와 보스 배율을 한 게시글에서 확인하고, 같은 보스를 포함한 내 메력서로
              바로 지원할 수 있습니다. 최신 상태인 공개 메력서만 표시하며, 이 목록은 순위나 합격 판단을
              제공하지 않습니다.
            </p>
          </div>
          <Link
            href="/parties/new"
            className="ui-action inline-flex shrink-0 justify-center rounded-xl px-4 py-3 text-sm font-bold"
          >
            파티 글 작성
          </Link>
        </section>

        {loadFailed ? (
          <section className="ui-panel mt-6 rounded-2xl p-6" role="alert">
            <h2 className="text-lg font-bold text-[#202a36]">게시글을 불러오지 못했습니다.</h2>
            <p className="mt-2 text-sm leading-6 text-[#52606d]">잠시 후 다시 시도해 주세요.</p>
          </section>
        ) : posts.length ? (
          <section className="mt-7" aria-label="현재 파티 게시글">
            <p className="mb-4 text-sm font-bold text-[#52606d]">현재 게시글 {posts.length}개</p>
            <div className="grid gap-4 lg:grid-cols-2">
              {posts.map((post) => (
                <PartyPostCard key={post.slug} post={post} />
              ))}
            </div>
          </section>
        ) : (
          <section className="ui-panel mt-7 rounded-2xl p-6 sm:p-8">
            <h2 className="text-xl font-bold text-[#202a36]">현재 열린 파티 글이 없습니다.</h2>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-[#52606d]">
              첫 게시글을 작성해 보세요. 공개 중이며 최근 조회된 메력서의 보스, 배율, 역할과 가능한 시간이
              안전하게 요약되어 표시됩니다.
            </p>
            <Link
              href="/parties/new"
              className="ui-action mt-5 inline-flex rounded-xl px-4 py-3 text-sm font-bold"
            >
              파티 글 작성하기
            </Link>
          </section>
        )}
      </div>
    </main>
  );
}
