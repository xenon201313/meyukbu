"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function OwnerResumeActions({ slug }: { slug: string }) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function refresh() {
    setBusy(true);
    setMessage(null);
    const response = await fetch(`/api/resumes/${slug}/refresh`, { method: "POST" });
    const body = (await response.json().catch(() => null)) as { message?: string } | null;
    setBusy(false);
    if (!response.ok) {
      setMessage(body?.message ?? "갱신에 실패했습니다.");
      return;
    }
    router.refresh();
    setMessage("최신 데이터로 새 버전을 만들었습니다.");
  }

  async function archive() {
    if (!window.confirm("이 메력서의 공개를 중단할까요?")) {
      return;
    }
    setBusy(true);
    const response = await fetch(`/api/resumes/${slug}`, { method: "DELETE" });
    setBusy(false);
    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { message?: string } | null;
      setMessage(body?.message ?? "공개 중단에 실패했습니다.");
      return;
    }
    router.push("/");
  }

  return (
    <section aria-label="작성자 관리" className="ui-panel rounded-xl p-4">
      <p className="text-sm font-bold text-[#202a36]">작성자 관리</p>
      <p className="mt-1 text-xs leading-5 text-[#687380]">
        이 브라우저에만 저장된 편집 권한으로 수정하거나, 기존 이력서를 남긴 채 새 메력서를 저장할 수 있습니다.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <a
          href={`/create?edit=${encodeURIComponent(slug)}`}
          className="rounded-lg border border-[#bfae99] bg-[#fffefa] px-3 py-2 text-sm font-semibold text-[#202a36] transition hover:border-[#a44640]/70 hover:text-[#7c2f2c]"
        >
          수정
        </a>
        <a
          href={`/create?copy=${encodeURIComponent(slug)}`}
          className="rounded-lg border border-[#a44640]/45 bg-[#f8e6e1] px-3 py-2 text-sm font-semibold text-[#7c2f2c] transition hover:bg-[#f3d9d2]"
        >
          새 메력서로 저장
        </a>
        <button
          type="button"
          disabled={busy}
          onClick={refresh}
          className="ui-action rounded-lg px-3 py-2 text-sm font-semibold disabled:opacity-50"
        >
          최신 데이터로 갱신
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={archive}
          className="rounded-lg border border-rose-800/35 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-950 transition hover:bg-rose-100 disabled:opacity-50"
        >
          공개 중단
        </button>
      </div>
      {message ? (
        <p role="status" className="mt-3 text-sm text-[#52606d]">
          {message}
        </p>
      ) : null}
    </section>
  );
}
