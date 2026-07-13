"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface ApiMessage {
  message?: string;
  url?: string;
}

async function readApiMessage(response: Response): Promise<ApiMessage | null> {
  try {
    return (await response.json()) as ApiMessage;
  } catch (error) {
    if (error instanceof SyntaxError) {
      return null;
    }
    throw error;
  }
}

export function OwnerResumeActions({ slug }: { slug: string }) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [isIssuingInvitation, setIsIssuingInvitation] = useState(false);
  const [invitationUrl, setInvitationUrl] = useState<string | null>(null);

  async function refresh() {
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/resumes/${slug}/refresh`, { method: "POST" });
      const body = await readApiMessage(response);
      if (!response.ok) {
        setMessage(body?.message ?? "갱신에 실패했습니다.");
        return;
      }
      router.refresh();
      setMessage("최신 데이터로 새 버전을 만들었습니다.");
    } catch {
      setMessage("네트워크 연결을 확인한 뒤 다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  }

  async function archive() {
    if (!window.confirm("이 메력서의 공개를 중단할까요?")) {
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/resumes/${slug}`, { method: "DELETE" });
      const body = await readApiMessage(response);
      if (!response.ok) {
        setMessage(body?.message ?? "공개 중단에 실패했습니다.");
        return;
      }
      router.push("/");
    } catch {
      setMessage("네트워크 연결을 확인한 뒤 다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  }

  async function issueTemperatureInvitation() {
    setIsIssuingInvitation(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/resumes/${slug}/temperature/invitations`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({}),
      });
      const body = await readApiMessage(response);
      if (!response.ok || !body?.url) {
        setMessage(body?.message ?? "동행 확인 링크를 만들지 못했습니다.");
        return;
      }
      setInvitationUrl(body.url);
      setMessage("동행 확인 링크를 만들었습니다. 실제 함께한 파티원에게만 전달해 주세요.");
    } catch {
      setMessage("네트워크 연결을 확인한 뒤 다시 시도해 주세요.");
    } finally {
      setIsIssuingInvitation(false);
    }
  }

  async function copyInvitationUrl() {
    if (!invitationUrl) {
      return;
    }
    try {
      await navigator.clipboard.writeText(invitationUrl);
      setMessage("동행 확인 링크를 클립보드에 복사했습니다.");
    } catch {
      setMessage("링크를 선택해서 복사해 주세요.");
    }
  }

  return (
    <section aria-label="작성자 관리" className="ui-panel rounded-xl p-4">
      <p className="text-sm font-bold text-[#202a36]">작성자 관리</p>
      <p className="mt-1 text-xs leading-5 text-[#687380]">
        이 브라우저에만 저장된 편집 권한으로 수정하거나, 기존 이력서를 채운 새 메력서를 만들 수 있습니다.
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

      <div className="mt-5 border-t border-[#d9cdbd] pt-4">
        <p className="text-sm font-bold text-[#202a36]">메숭이 체온 · 동행 기록</p>
        <p className="mt-1 text-xs leading-5 text-[#687380]">
          실제 함께한 파티원에게만 1회용 확인 링크를 전달하세요. 링크는 7일 안에 한 번만 사용할 수 있으며,
          점수나 자유 코멘트가 아닌 긍정 동행 태그만 남길 수 있습니다.
        </p>
        <button
          type="button"
          disabled={busy || isIssuingInvitation}
          onClick={issueTemperatureInvitation}
          className="mt-3 rounded-lg border border-[#a44640]/45 bg-[#f8e6e1] px-3 py-2 text-sm font-semibold text-[#7c2f2c] transition hover:bg-[#f3d9d2] disabled:opacity-50"
        >
          {isIssuingInvitation ? "동행 확인 링크 만드는 중…" : "동행 확인 링크 만들기"}
        </button>
        {invitationUrl ? (
          <div className="mt-3 rounded-xl border border-[#d9cdbd] bg-[#fffefa] p-3">
            <label htmlFor="temperature-invite-url" className="text-xs font-semibold text-[#52606d]">
              동행 확인 링크
            </label>
            <input
              id="temperature-invite-url"
              value={invitationUrl}
              readOnly
              onFocus={(event) => event.currentTarget.select()}
              className="ui-input mt-2 block w-full rounded-lg border px-2.5 py-2 text-xs outline-none"
              aria-describedby="temperature-invite-help"
            />
            <p id="temperature-invite-help" className="mt-2 text-xs leading-5 text-[#687380]">
              링크의 확인 코드는 주소의 `#invite` 뒤에만 들어 있으며 서비스에 원문으로 저장되지 않습니다.
            </p>
            <button
              type="button"
              onClick={copyInvitationUrl}
              className="mt-2 rounded-lg border border-[#bfae99] bg-[#f6f2ea] px-3 py-1.5 text-xs font-bold text-[#202a36] transition hover:border-[#a44640]/70"
            >
              링크 복사
            </button>
          </div>
        ) : null}
      </div>
      {message ? (
        <p role="status" className="mt-3 text-sm text-[#52606d]">
          {message}
        </p>
      ) : null}
    </section>
  );
}
