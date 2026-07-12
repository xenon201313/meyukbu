import Link from "next/link";

import { ResumeEditor } from "@/components/resume-editor";

export default function CreatePage() {
  return (
    <main className="min-h-screen">
      <header className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8">
        <Link href="/" className="flex items-center gap-2 text-lg font-black">
          <span className="h-3 w-3 rounded-full bg-[#e26d2f]" aria-hidden />
          메력부
        </Link>
        <p className="text-sm text-stone-600">메력서 작성</p>
      </header>
      <ResumeEditor />
    </main>
  );
}
