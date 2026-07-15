"use client";

/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { useEffect, useId, useMemo, useState } from "react";

import {
  partyTypeLabels,
  roleLabels,
  targetBossCadenceLabels,
  type PartyType,
  type ResumeBossTarget,
  type ResumeRole,
  type TargetBossCadence,
} from "@/domain/resume";

type ResumeVisibility = "PUBLIC" | "UNLISTED" | "ARCHIVED";

interface MyResumeSummary {
  slug: string;
  characterName: string;
  worldName: string;
  className: string;
  characterImageUrl: string | null;
  targetBoss: string;
  targetBossCadence: TargetBossCadence | null;
  bossTargets: ResumeBossTarget[];
  role: ResumeRole;
  partyType: PartyType;
  partySize: number | null;
  visibility: ResumeVisibility;
  versionNumber: number;
  publishedAt: string;
  fetchedAt: string;
  createdAt: string;
  updatedAt: string;
  isOwner: true;
}

interface MyResumesResponse {
  resumes?: MyResumeSummary[];
  message?: string;
}

function formatUpdatedAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "날짜 정보 없음";
  }

  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Seoul",
  }).format(date);
}

function visibilityLabel(visibility: ResumeVisibility): string {
  switch (visibility) {
    case "PUBLIC":
      return "공개 중";
    case "UNLISTED":
      return "링크 공개";
    case "ARCHIVED":
      return "공개 중단";
  }
}

function characterGroups(resumes: MyResumeSummary[]): Array<[string, MyResumeSummary[]]> {
  const groups = new Map<string, MyResumeSummary[]>();
  for (const resume of resumes) {
    const key = `${resume.characterName}\u0000${resume.worldName}\u0000${resume.className}`;
    const group = groups.get(key) ?? [];
    group.push(resume);
    groups.set(key, group);
  }
  return Array.from(groups.entries());
}

function ResumeCard({ resume }: { resume: MyResumeSummary }) {
  const primaryTarget = resume.bossTargets[0];
  const bossCadence = primaryTarget?.cadence
    ? targetBossCadenceLabels[primaryTarget.cadence]
    : resume.targetBossCadence
      ? targetBossCadenceLabels[resume.targetBossCadence]
      : "보스";
  const bossNames = resume.bossTargets.length
    ? resume.bossTargets.map((target) => target.bossName).join(" · ")
    : resume.targetBoss;
  const characterInitial = resume.characterName.slice(0, 1);
  const canManage = resume.visibility === "PUBLIC";

  return (
    <article
      data-testid="my-resume-card"
      className="ui-panel rounded-2xl p-4 sm:p-5"
      aria-label={`${bossNames} 메력서`}
    >
      <div className="flex items-start gap-3">
        {resume.characterImageUrl ? (
          <img
            src={resume.characterImageUrl}
            alt={`${resume.characterName} 캐릭터 이미지`}
            width={56}
            height={56}
            className="h-14 w-14 shrink-0 rounded-xl border border-[#d9cdbd] bg-[#f6f2ea] object-contain p-1"
          />
        ) : (
          <span
            aria-hidden
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-[#d9cdbd] bg-[#f6f2ea] text-xl font-black text-[#7c2f2c]"
          >
            {characterInitial}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="resume-kicker">{bossCadence}</span>
            <span className="rounded-full border border-[#bfae99] bg-[#fffefa] px-2 py-0.5 text-xs font-bold text-[#52606d]">
              {visibilityLabel(resume.visibility)}
            </span>
          </div>
          <h3 className="resume-heading mt-1 line-clamp-2 text-xl font-black">{bossNames}</h3>
          <p className="mt-1 text-sm font-semibold text-[#52606d]">
            {resume.characterName} · {resume.worldName} · {resume.className}
          </p>
        </div>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-2 border-y border-[#d9cdbd] py-3 text-sm">
        <div>
          <dt className="text-xs font-bold text-[#687380]">역할</dt>
          <dd className="mt-1 font-bold text-[#202a36]">{roleLabels[resume.role]}</dd>
        </div>
        <div>
          <dt className="text-xs font-bold text-[#687380]">파티 유형</dt>
          <dd className="mt-1 font-bold text-[#202a36]">{partyTypeLabels[resume.partyType]}</dd>
        </div>
      </dl>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs text-[#687380]">
        <span>v{resume.versionNumber}</span>
        <span>마지막 저장 {formatUpdatedAt(resume.updatedAt)}</span>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-2 min-[420px]:grid-cols-3">
        {canManage ? (
          <>
            <Link
              href={`/r/${encodeURIComponent(resume.slug)}`}
              className="ui-action rounded-xl px-3 py-2.5 text-center text-sm font-bold transition"
            >
              메력서 열기
            </Link>
            <Link
              href={`/create?edit=${encodeURIComponent(resume.slug)}`}
              className="rounded-xl border border-[#bfae99] bg-[#fffefa] px-3 py-2.5 text-center text-sm font-bold text-[#202a36] transition hover:border-[#a44640]/70 hover:text-[#7c2f2c]"
            >
              수정
            </Link>
            <Link
              href={`/create?copy=${encodeURIComponent(resume.slug)}`}
              className="rounded-xl border border-[#a44640]/45 bg-[#f8e6e1] px-3 py-2.5 text-center text-sm font-bold text-[#7c2f2c] transition hover:bg-[#f3d9d2]"
            >
              새 메력서로 저장
            </Link>
          </>
        ) : (
          <span className="col-span-full rounded-xl border border-[#d9cdbd] bg-[#f6f2ea] px-3 py-2.5 text-center text-sm font-bold text-[#687380]">
            현재 공개 중이 아닌 메력서입니다.
          </span>
        )}
      </div>
    </article>
  );
}

/** Lists only resumes whose edit-token cookie is present in the current browser. */
export function MyResumeList() {
  const idPrefix = useId();
  const [resumes, setResumes] = useState<MyResumeSummary[]>([]);
  const [selectedBoss, setSelectedBoss] = useState("전체");
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadResumes() {
      try {
        const response = await fetch("/api/my-resumes", {
          credentials: "same-origin",
          headers: { Accept: "application/json" },
          cache: "no-store",
          signal: controller.signal,
        });
        const payload = (await response.json()) as MyResumesResponse;
        if (!response.ok) {
          throw new Error(payload.message ?? "저장된 메력서를 불러오지 못했습니다.");
        }
        if (controller.signal.aborted) {
          return;
        }
        setResumes(Array.isArray(payload.resumes) ? payload.resumes : []);
        setStatus("ready");
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }
        setMessage(error instanceof Error ? error.message : "저장된 메력서를 불러오지 못했습니다.");
        setStatus("error");
      }
    }

    void loadResumes();
    return () => controller.abort();
  }, []);

  const bossTabs = useMemo(() => {
    const counts = new Map<string, number>();
    for (const resume of resumes) {
      const names = new Set(
        (resume.bossTargets.length ? resume.bossTargets : [{ bossName: resume.targetBoss }]).map(
          (target) => target.bossName,
        ),
      );
      for (const name of names) {
        counts.set(name, (counts.get(name) ?? 0) + 1);
      }
    }
    return [
      { label: "전체", count: resumes.length },
      ...Array.from(counts.entries()).map(([label, count]) => ({ label, count })),
    ];
  }, [resumes]);

  const visibleResumes = useMemo(
    () =>
      selectedBoss === "전체"
        ? resumes
        : resumes.filter((resume) =>
            (resume.bossTargets.length ? resume.bossTargets : [{ bossName: resume.targetBoss }]).some(
              (target) => target.bossName === selectedBoss,
            ),
          ),
    [resumes, selectedBoss],
  );
  const selectedBossIndex = Math.max(
    0,
    bossTabs.findIndex((tab) => tab.label === selectedBoss),
  );

  if (status === "loading") {
    return (
      <section className="ui-panel rounded-2xl p-6 sm:p-8" aria-live="polite" aria-busy="true">
        <p className="resume-kicker">MY RESUMES</p>
        <h1 className="resume-heading mt-2 text-3xl font-black">나의 이력서</h1>
        <p className="mt-4 text-sm text-[#52606d]">저장된 메력서를 불러오는 중입니다.</p>
      </section>
    );
  }

  if (status === "error") {
    return (
      <section className="ui-panel rounded-2xl p-6 sm:p-8" role="alert">
        <p className="resume-kicker">MY RESUMES</p>
        <h1 className="resume-heading mt-2 text-3xl font-black">나의 이력서</h1>
        <p className="mt-4 text-sm leading-6 text-[#7c2f2c]">{message}</p>
        <p className="mt-2 text-sm leading-6 text-[#52606d]">
          잠시 후 다시 열어 보거나, 생성했던 브라우저인지 확인해 주세요.
        </p>
      </section>
    );
  }

  if (!resumes.length) {
    return (
      <section className="ui-panel rounded-2xl p-6 sm:p-8">
        <p className="resume-kicker">MY RESUMES</p>
        <h1 className="resume-heading mt-2 text-3xl font-black">나의 이력서</h1>
        <p className="mt-5 text-lg font-bold text-[#202a36]">저장된 메력서가 없어요.</p>
        <p className="mt-2 max-w-2xl text-sm leading-7 text-[#52606d]">
          이 목록은 로그인 대신, 메력서를 만들 때 이 브라우저에 저장한 편집 권한을 기준으로 표시합니다. 다른
          기기, 시크릿 창 또는 쿠키를 지운 브라우저에서는 이전 이력서를 확인할 수 없어요.
        </p>
        <Link
          href="/"
          className="ui-action mt-5 inline-flex rounded-xl px-4 py-3 text-sm font-bold transition"
        >
          메력서 만들기
        </Link>
      </section>
    );
  }

  return (
    <section aria-labelledby="my-resumes-heading">
      <div className="flex flex-col gap-4 border-b border-[#d9cdbd] pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="resume-kicker">MY RESUMES</p>
          <h1 id="my-resumes-heading" className="resume-heading mt-2 text-3xl font-black sm:text-4xl">
            나의 이력서
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#52606d]">
            보스별로 저장한 메력서를 확인하고, 기존 이력서를 유지한 채 새 이력서로 복제할 수 있습니다.
          </p>
        </div>
        <Link
          href="/"
          className="ui-action inline-flex shrink-0 justify-center rounded-xl px-4 py-3 text-sm font-bold transition"
        >
          새로 작성하기
        </Link>
      </div>

      <div className="mt-6" aria-label="보스별 이력서 필터">
        <p className="text-sm font-bold text-[#202a36]">희망 보스</p>
        <div className="mt-3 -mx-5 overflow-x-auto px-5 pb-2 sm:mx-0 sm:px-0">
          <div role="tablist" aria-label="보스별 이력서" className="flex min-w-max gap-2">
            {bossTabs.map((tab, index) => {
              const selected = tab.label === selectedBoss;
              const tabId = `${idPrefix}-tab-${index}`;
              return (
                <button
                  key={tab.label}
                  id={tabId}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  aria-controls={`${idPrefix}-panel`}
                  onClick={() => setSelectedBoss(tab.label)}
                  className={`rounded-full border px-3 py-2 text-sm font-bold whitespace-nowrap transition ${
                    selected
                      ? "border-[#a44640] bg-[#a44640] text-[#fffaf4]"
                      : "border-[#bfae99] bg-[#fffefa] text-[#52606d] hover:border-[#a44640]/70 hover:text-[#7c2f2c]"
                  }`}
                >
                  {tab.label} <span aria-label={`${tab.count}장`}>{tab.count}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div
        id={`${idPrefix}-panel`}
        role="tabpanel"
        aria-labelledby={`${idPrefix}-tab-${selectedBossIndex}`}
        className="mt-6 space-y-8"
      >
        {characterGroups(visibleResumes).map(([characterKey, characterResumes]) => {
          const [characterName, worldName, className] = characterKey.split("\u0000");
          return (
            <section
              key={characterKey}
              aria-labelledby={`${idPrefix}-${characterKey.replaceAll("\u0000", "-")}`}
            >
              <div className="mb-3 flex items-center gap-2">
                <h2
                  id={`${idPrefix}-${characterKey.replaceAll("\u0000", "-")}`}
                  className="text-base font-black text-[#202a36]"
                >
                  {characterName}
                </h2>
                <p className="text-sm text-[#687380]">
                  {worldName} · {className}
                </p>
              </div>
              <div className="grid gap-3 lg:grid-cols-2">
                {characterResumes.map((resume) => (
                  <ResumeCard key={resume.slug} resume={resume} />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </section>
  );
}
