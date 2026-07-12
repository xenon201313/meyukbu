import Link from "next/link";

import { ResumeEditor } from "@/components/resume-editor";

export default function CreatePage() {
  return (
    <main className="min-h-screen">
      <header className="mx-auto flex max-w-7xl items-center justify-between border-b border-slate-700/50 px-5 py-5 sm:px-8">
        <Link href="/" className="flex items-center gap-2 text-lg font-black text-white">
          <span
            className="h-3 w-3 rounded-full bg-teal-300 shadow-[0_0_14px_rgba(94,234,212,0.9)]"
            aria-hidden
          />
          메력부
        </Link>
        <p className="text-sm font-semibold text-slate-300">메력서 작성</p>
      </header>
      <ResumeEditor />
    </main>
  );
}
