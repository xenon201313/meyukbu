import type { Metadata } from "next";

import { PartyPostForm } from "@/components/party-post-form";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: "파티 글 작성",
  description: "내 메력서의 여러 보스와 배율을 묶어 파티 구인 또는 구직 글을 작성합니다.",
};

interface PartyPostNewPageProps {
  searchParams: Promise<{ resume?: string }>;
}

export default async function PartyPostNewPage({ searchParams }: PartyPostNewPageProps) {
  const { resume } = await searchParams;
  const initialResumeSlug = resume && /^m-[A-Za-z0-9_-]{6,96}$/u.test(resume) ? resume : undefined;

  return (
    <main className="resume-shell min-h-screen pb-14">
      <SiteHeader currentLabel="파티 글 작성" />
      <div className="mx-auto max-w-3xl px-5 pt-8 sm:px-8 sm:pt-12">
        <PartyPostForm initialResumeSlug={initialResumeSlug} />
      </div>
    </main>
  );
}
