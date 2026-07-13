import Link from "next/link";

import { MesoongiTemperatureForm } from "@/components/mesoongi-temperature-form";
import { SiteHeader } from "@/components/site-header";
import { getPublicResume } from "@/server/services/resume-service";
import { notFound } from "next/navigation";

interface TemperaturePageProps {
  params: Promise<{ slug: string }>;
}

/** Dedicated, fragment-token based entry point for a companion's tag-only record. */
export default async function MesoongiTemperaturePage({ params }: TemperaturePageProps) {
  const { slug } = await params;
  const resume = await getPublicResume(slug);
  if (!resume) {
    notFound();
  }

  return (
    <main className="resume-shell pb-14">
      <SiteHeader currentLabel="동행 기록 남기기" />
      <div className="mx-auto max-w-2xl px-5 pt-7 sm:px-8">
        <div className="resume-paper rounded-2xl p-4 sm:p-7">
          <div className="mb-5 border-b border-[#d9cdbd] pb-5">
            <p className="resume-kicker">COMPANION RECORD</p>
            <h1 className="resume-heading mt-2 text-2xl font-bold text-[#202a36]">
              함께한 기록을 남겨 주세요
            </h1>
            <p className="resume-lead mt-2 text-sm leading-6">
              이 기록은 점수나 순위를 매기지 않고, 함께한 경험을 긍정적인 태그로만 남깁니다.
            </p>
          </div>
          <MesoongiTemperatureForm resumeSlug={slug} />
          <p className="mt-5 text-center text-sm text-[#52606d]">
            <Link
              href={`/r/${encodeURIComponent(slug)}`}
              className="font-semibold text-[#7c2f2c] underline hover:text-[#a44640]"
            >
              대상 메력서로 돌아가기
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
