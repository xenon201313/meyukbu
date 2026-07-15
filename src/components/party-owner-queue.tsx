"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { partyResponseMessage, parsePartyOwnerQueuePayload, type PartyOwnerQueue } from "@/lib/party/client";
import { formatPartyDateTime } from "@/lib/party/presentation";
import { partyWorldGroupLabels } from "@/domain/party-world";
import { worldTransferAvailabilityLabel } from "@/domain/resume";

interface PartyOwnerQueueProps {
  postSlug: string;
}

const applicationStatusLabel = {
  PENDING: "지원 대기",
  ACCEPTED: "수락함",
  DECLINED: "거절함",
} as const;

/** Owner-only application queue; a visitor without the edit-token cookie sees nothing. */
export function PartyOwnerQueue({ postSlug }: PartyOwnerQueueProps) {
  const [mode, setMode] = useState<"checking" | "owner" | "unavailable" | "error">("checking");
  const [queue, setQueue] = useState<PartyOwnerQueue | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      try {
        const response = await fetch(`/api/party-posts/${encodeURIComponent(postSlug)}/applications`, {
          credentials: "same-origin",
          headers: { Accept: "application/json" },
          cache: "no-store",
          signal: controller.signal,
        });
        const payload: unknown = await response.json().catch(() => null);
        if (controller.signal.aborted) {
          return;
        }
        if (response.status === 403 || response.status === 404) {
          setMode("unavailable");
          return;
        }
        if (!response.ok) {
          throw new Error(partyResponseMessage(payload, "지원 목록을 불러오지 못했습니다."));
        }
        const parsed = parsePartyOwnerQueuePayload(payload);
        if (!parsed) {
          throw new Error("지원 목록의 형식을 확인할 수 없습니다.");
        }
        setQueue(parsed);
        setMode("owner");
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }
        setNotice(error instanceof Error ? error.message : "지원 목록을 불러오지 못했습니다.");
        setMode("error");
      }
    }

    void load();
    return () => controller.abort();
  }, [postSlug]);

  async function decide(applicationId: string, decision: "ACCEPT" | "DECLINE") {
    setBusyAction(applicationId);
    setNotice(null);
    try {
      const response = await fetch(
        `/api/party-posts/${encodeURIComponent(postSlug)}/applications/${encodeURIComponent(applicationId)}`,
        {
          method: "PATCH",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({ decision }),
        },
      );
      const payload: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(partyResponseMessage(payload, "지원 상태를 변경하지 못했습니다."));
      }
      setQueue((current) =>
        current
          ? {
              ...current,
              applications: current.applications.map((application) =>
                application.id === applicationId
                  ? { ...application, status: decision === "ACCEPT" ? "ACCEPTED" : "DECLINED" }
                  : application,
              ),
            }
          : current,
      );
      setNotice(decision === "ACCEPT" ? "지원을 수락했습니다." : "지원을 거절했습니다.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "지원 상태를 변경하지 못했습니다.");
    } finally {
      setBusyAction(null);
    }
  }

  async function closePost() {
    setBusyAction("close");
    setNotice(null);
    try {
      const response = await fetch(`/api/party-posts/${encodeURIComponent(postSlug)}`, {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ action: "close" }),
      });
      const payload: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(partyResponseMessage(payload, "게시글을 마감하지 못했습니다."));
      }
      setQueue((current) => (current ? { ...current, status: "CLOSED" } : current));
      setNotice("게시글을 마감했습니다. 공개 목록에서는 더 이상 보이지 않습니다.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "게시글을 마감하지 못했습니다.");
    } finally {
      setBusyAction(null);
    }
  }

  if (mode === "checking" || mode === "unavailable") {
    return null;
  }

  if (mode === "error") {
    return (
      <section className="ui-panel rounded-2xl p-5" role="alert">
        <h2 className="text-lg font-bold text-[#202a36]">게시글 관리</h2>
        <p className="mt-2 text-sm leading-6 text-[#7c2f2c]">{notice}</p>
      </section>
    );
  }

  if (!queue) {
    return null;
  }

  return (
    <section className="ui-panel rounded-2xl p-5" aria-labelledby="party-owner-queue-heading">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="resume-kicker">OWNER ONLY</p>
          <h2 id="party-owner-queue-heading" className="mt-1 text-lg font-bold text-[#202a36]">
            게시글 관리
          </h2>
          <p className="mt-1 text-sm leading-6 text-[#52606d]">
            지원 메시지는 이 게시글의 작성자에게만 보입니다. 수락·거절 기록은 공개 목록에 표시되지 않습니다.
          </p>
        </div>
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-bold ${
            queue.status === "OPEN" ? "bg-emerald-100 text-emerald-900" : "bg-[#e9e4dc] text-[#52606d]"
          }`}
        >
          {queue.status === "OPEN" ? "모집 중" : "마감"}
        </span>
      </div>

      {notice ? (
        <p
          role="status"
          className="mt-4 rounded-xl border border-[#d9cdbd] bg-[#fffefa] p-3 text-sm leading-6 text-[#52606d]"
        >
          {notice}
        </p>
      ) : null}

      <div className="mt-5 space-y-3">
        {queue.applications.length ? (
          queue.applications.map((application) => (
            <article key={application.id} className="rounded-xl border border-[#d9cdbd] bg-[#fffefa] p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  {application.applicant ? (
                    <Link
                      href={`/r/${encodeURIComponent(application.applicant.resumeSlug)}?v=${application.applicant.versionNumber}`}
                      className="font-bold text-[#202a36] underline decoration-[#bfae99] underline-offset-4 hover:text-[#7c2f2c]"
                    >
                      {application.applicant.characterName}
                    </Link>
                  ) : (
                    <p className="font-bold text-[#202a36]">현재 공개되지 않은 이력서</p>
                  )}
                  {application.applicant ? (
                    <p className="mt-1 text-sm text-[#52606d]">
                      {[
                        application.applicant.worldName,
                        application.applicant.className,
                        application.applicant.level ? `Lv.${application.applicant.level}` : null,
                      ]
                        .filter(Boolean)
                        .concat(`v${application.applicant.versionNumber}`)
                        .join(" · ") || "기본 정보 조회 불가"}
                    </p>
                  ) : null}
                  {application.applicant ? (
                    <p className="mt-1 text-xs text-[#687380]">
                      {application.applicant.worldGroup
                        ? `파티 그룹 ${partyWorldGroupLabels[application.applicant.worldGroup]}`
                        : "파티 그룹 확인 불가"}
                      {" · "}월드 통합{" "}
                      {worldTransferAvailabilityLabel(
                        application.applicant.worldTransferAvailability ?? undefined,
                      )}
                    </p>
                  ) : null}
                  <p className="mt-1 text-xs text-[#687380]">
                    지원 시각: {formatPartyDateTime(application.createdAt)}
                  </p>
                </div>
                <span className="rounded-full border border-[#d9cdbd] px-2.5 py-1 text-xs font-bold text-[#52606d]">
                  {applicationStatusLabel[application.status]}
                </span>
              </div>

              {application.message ? (
                <p className="mt-3 rounded-lg bg-[#f6f2ea] p-3 text-sm leading-6 text-[#202a36]">
                  {application.message}
                </p>
              ) : null}

              {queue.status === "OPEN" && application.status === "PENDING" ? (
                <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    disabled={busyAction === application.id}
                    onClick={() => void decide(application.id, "DECLINE")}
                    className="rounded-xl border border-[#bfae99] bg-[#fffefa] px-3 py-2 text-sm font-bold text-[#202a36] disabled:opacity-60"
                  >
                    거절
                  </button>
                  <button
                    type="button"
                    disabled={busyAction === application.id}
                    onClick={() => void decide(application.id, "ACCEPT")}
                    className="ui-action rounded-xl px-3 py-2 text-sm font-bold disabled:opacity-60"
                  >
                    수락
                  </button>
                </div>
              ) : null}
            </article>
          ))
        ) : (
          <p className="rounded-xl border border-dashed border-[#d9cdbd] bg-[#fffefa] p-4 text-sm leading-6 text-[#52606d]">
            아직 접수된 지원이 없습니다.
          </p>
        )}
      </div>

      {queue.status === "OPEN" ? (
        <button
          type="button"
          disabled={busyAction === "close"}
          onClick={() => void closePost()}
          className="mt-5 w-full rounded-xl border border-[#a44640]/60 bg-[#fff7f2] px-4 py-3 text-sm font-bold text-[#7c2f2c] disabled:opacity-60"
        >
          {busyAction === "close" ? "마감 처리 중…" : "게시글 마감하기"}
        </button>
      ) : null}
    </section>
  );
}
