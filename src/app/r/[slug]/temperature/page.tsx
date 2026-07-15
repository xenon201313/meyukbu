import Link from "next/link";
import { notFound } from "next/navigation";

import { MesoongiTemperatureForm } from "@/components/mesoongi-temperature-form";
import { SiteHeader } from "@/components/site-header";
import { getPublicResume } from "@/server/services/resume-service";

interface TemperaturePageProps {
  params: Promise<{ slug: string }>;
}

/** Dedicated, fragment-token based entry point for an anonymous temperature survey. */
export default async function MesoongiTemperaturePage({ params }: TemperaturePageProps) {
  const { slug } = await params;
  const resume = await getPublicResume(slug);
  if (!resume) {
    notFound();
  }

  return (
    <main className="resume-shell pb-14">
      <SiteHeader currentLabel="메붕이 온도 설문" />
      <div className="mx-auto max-w-2xl px-5 pt-7 sm:px-8">
        <div className="resume-paper rounded-2xl p-4 sm:p-7">
          <div className="mb-5 border-b border-[#d9cdbd] pb-5">
            <p className="resume-kicker">ANONYMOUS SURVEY</p>
            <h1 className="resume-heading mt-2 text-2xl font-bold text-[#202a36]">
              메붕이 온도 설문에 참여해 주세요.
            </h1>
            <p className="resume-lead mt-2 text-sm leading-6">
              세 가지 질문의 답변은 익명으로 집계되며, 개별 답변이나 응답자 정보는 공개되지 않습니다.
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
