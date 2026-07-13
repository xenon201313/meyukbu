import type { Metadata } from "next";

import { MyResumeList } from "@/components/my-resume-list";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: "나의 이력서",
  description: "이 브라우저에서 관리할 수 있는 메력서를 보스별로 확인합니다.",
};

export default function MyResumesPage() {
  return (
    <main className="resume-shell min-h-screen pb-14">
      <SiteHeader currentLabel="나의 이력서" />
      <div className="mx-auto max-w-6xl px-5 pt-8 sm:px-8 sm:pt-12">
        <MyResumeList />
      </div>
    </main>
  );
}
