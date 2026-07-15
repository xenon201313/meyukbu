"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import type { PublicPartyPostTarget } from "@/domain/party";
import type { ResumeBossTarget } from "@/domain/resume";
import { parseOwnedResumesPayload, partyResponseMessage, type PartyOwnedResume } from "@/lib/party/client";
import { formatPartyBossLabel } from "@/lib/party/presentation";

interface PartyApplicationFormProps {
  postSlug: string;
  ownerResumeSlug: string;
  targets: readonly PublicPartyPostTarget[];
}

function targetsFor(resume: PartyOwnedResume): ResumeBossTarget[] {
  return resume.bossTargets.length
    ? resume.bossTargets
    : [
        {
          bossName: resume.targetBoss,
          cadence: resume.targetBossCadence ?? undefined,
        },
      ];
}

function hasMatchingTarget(resume: PartyOwnedResume, postTargets: readonly PublicPartyPostTarget[]): boolean {
  return targetsFor(resume).some((candidate) =>
    postTargets.some(
      (target) => candidate.bossName === target.bossName && (candidate.cadence ?? null) === target.cadence,
    ),
  );
}

function eligibleApplicants(
  resumes: PartyOwnedResume[],
  ownerResumeSlug: string,
  postTargets: readonly PublicPartyPostTarget[],
): PartyOwnedResume[] {
  return resumes.filter(
    (resume) =>
      resume.slug !== ownerResumeSlug && resume.partyEligible && hasMatchingTarget(resume, postTargets),
  );
}

/** Submits a short, owner-only application from another current matching resume. */
export function PartyApplicationForm({ postSlug, ownerResumeSlug, targets }: PartyApplicationFormProps) {
  const [resumes, setResumes] = useState<PartyOwnedResume[]>([]);
  const [selectedResumeSlug, setSelectedResumeSlug] = useState("");
  const [message, setMessage] = useState("");
  const [state, setState] = useState<"loading" | "ready" | "submitting" | "success" | "error">("loading");
  const [notice, setNotice] = useState<string | null>(null);

  const candidates = useMemo(
    () => eligibleApplicants(resumes, ownerResumeSlug, targets),
    [ownerResumeSlug, resumes, targets],
  );

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      try {
        const response = await fetch("/api/my-resumes", {
          credentials: "same-origin",
          headers: { Accept: "application/json" },
          cache: "no-store",
          signal: controller.signal,
        });
        const payload: unknown = await response.json().catch(() => null);
        if (!response.ok) {
          throw new Error(partyResponseMessage(payload, "내 이력서 목록을 불러오지 못했습니다."));
        }
        const parsed = parseOwnedResumesPayload(payload);
        if (!parsed) {
          throw new Error("내 이력서 목록의 형식을 확인할 수 없습니다.");
        }
        if (controller.signal.aborted) {
          return;
        }

        const available = eligibleApplicants(parsed, ownerResumeSlug, targets);
        setResumes(parsed);
        setSelectedResumeSlug(available[0]?.slug ?? "");
        setState("ready");
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }
        setNotice(error instanceof Error ? error.message : "내 이력서 목록을 불러오지 못했습니다.");
        setState("error");
      }
    }

    void load();
    return () => controller.abort();
  }, [ownerResumeSlug, targets]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedResumeSlug) {
      setNotice("지원에 사용할 내 메력서를 선택해 주세요.");
      return;
    }

    setState("submitting");
    setNotice(null);
    try {
      const response = await fetch(`/api/party-posts/${encodeURIComponent(postSlug)}/applications`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          applicantResumeSlug: selectedResumeSlug,
          ...(message.trim() ? { message: message.trim() } : {}),
        }),
      });
      const payload: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(partyResponseMessage(payload, "파티 지원을 접수하지 못했습니다."));
      }
      setState("success");
      setNotice("지원이 접수되었습니다. 게시글 작성자의 수락 또는 거절을 기다려 주세요.");
    } catch (error) {
      setState("ready");
      setNotice(error instanceof Error ? error.message : "파티 지원을 접수하지 못했습니다.");
    }
  }

  if (state === "loading") {
    return (
      <section className="ui-panel rounded-2xl p-5" aria-live="polite" aria-busy="true">
        <h2 className="text-lg font-bold text-[#202a36]">이 파티에 지원하기</h2>
        <p className="mt-2 text-sm text-[#52606d]">지원 가능한 내 메력서를 확인하는 중입니다.</p>
      </section>
    );
  }

  if (state === "error") {
    return (
      <section className="ui-panel rounded-2xl p-5" role="alert">
        <h2 className="text-lg font-bold text-[#202a36]">이 파티에 지원하기</h2>
        <p className="mt-2 text-sm leading-6 text-[#7c2f2c]">{notice}</p>
      </section>
    );
  }

  if (!candidates.length) {
    return (
      <section className="ui-panel rounded-2xl p-5">
        <h2 className="text-lg font-bold text-[#202a36]">이 파티에 지원하기</h2>
        <p className="mt-2 text-sm leading-6 text-[#52606d]">
          같은 보스가 포함된 공개·최근 조회 메력서가 있어야 지원할 수 있습니다. 본인이 올린 게시글에는 지원할
          수 없습니다.
        </p>
        <Link
          href="/my-resumes"
          className="mt-4 inline-flex rounded-xl border border-[#bfae99] bg-[#fffefa] px-4 py-2.5 text-sm font-bold text-[#202a36]"
        >
          내 이력서 확인하기
        </Link>
      </section>
    );
  }

  return (
    <section className="ui-panel rounded-2xl p-5" aria-labelledby="party-apply-heading">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="party-apply-heading" className="text-lg font-bold text-[#202a36]">
            이 파티에 지원하기
          </h2>
          <p className="mt-1 text-sm leading-6 text-[#52606d]">
            지원 정보와 메시지는 게시글 작성자에게만 보입니다. 연락처나 메붕이 온도 설문 내용은 전달하지
            않습니다.
          </p>
        </div>
      </div>

      {state === "success" ? (
        <p
          role="status"
          className="mt-4 rounded-xl border border-emerald-700/30 bg-emerald-50 p-3 text-sm leading-6 text-emerald-950"
        >
          {notice}
        </p>
      ) : (
        <form className="mt-5 space-y-4" onSubmit={submit} noValidate>
          <div>
            <label htmlFor="party-applicant-resume" className="text-sm font-bold text-[#202a36]">
              지원에 사용할 메력서
            </label>
            <select
              id="party-applicant-resume"
              value={selectedResumeSlug}
              onChange={(event) => setSelectedResumeSlug(event.target.value)}
              className="ui-input mt-2 min-h-12 w-full rounded-xl border px-3 text-sm"
            >
              {candidates.map((resume) => (
                <option key={resume.slug} value={resume.slug}>
                  {resume.characterName} ·{" "}
                  {targetsFor(resume)
                    .map((target) => formatPartyBossLabel(target.bossName, target.cadence))
                    .join(" / ")}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="party-application-message" className="text-sm font-bold text-[#202a36]">
              짧은 지원 메시지 <span className="font-normal text-[#687380]">(선택)</span>
            </label>
            <textarea
              id="party-application-message"
              value={message}
              maxLength={240}
              rows={3}
              onChange={(event) => setMessage(event.target.value)}
              className="ui-input mt-2 w-full resize-y rounded-xl border px-3 py-3 text-sm leading-6"
              placeholder="예: 해당 보스 경험이 있어 정해진 시간에 참여할 수 있습니다."
              aria-describedby="party-application-message-count"
            />
            <p id="party-application-message-count" className="mt-1 text-right text-xs text-[#687380]">
              {message.length}/240
            </p>
          </div>
          {notice ? (
            <p
              role="alert"
              className="rounded-xl border border-[#a44640]/40 bg-[#f8e6e1] p-3 text-sm leading-6 text-[#7c2f2c]"
            >
              {notice}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={state === "submitting"}
            className="ui-action w-full rounded-xl px-4 py-3 text-sm font-bold disabled:cursor-wait disabled:opacity-65"
          >
            {state === "submitting" ? "지원 접수 중…" : "이 이력서로 지원하기"}
          </button>
        </form>
      )}
    </section>
  );
}
