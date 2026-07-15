"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { partyPostKindLabels, type PartyPostKind } from "@/domain/party";
import { partyWorldGroupLabels } from "@/domain/party-world";
import type { ResumeBossTarget } from "@/domain/resume";
import {
  parseOwnedResumesPayload,
  partyCreatedSlug,
  partyResponseMessage,
  type PartyOwnedResume,
} from "@/lib/party/client";
import { formatPartyBossLabel } from "@/lib/party/presentation";

interface PartyPostFormProps {
  initialResumeSlug?: string;
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

function availableResumes(resumes: PartyOwnedResume[]): PartyOwnedResume[] {
  return resumes.filter((resume) => resume.partyEligible && resume.worldGroup !== null);
}

/** Lets an owner turn a current, fresh resume into a one-week structured party post. */
export function PartyPostForm({ initialResumeSlug }: PartyPostFormProps) {
  const router = useRouter();
  const [resumes, setResumes] = useState<PartyOwnedResume[]>([]);
  const [selectedResumeSlug, setSelectedResumeSlug] = useState<string | null>(null);
  const [selectedBossIds, setSelectedBossIds] = useState<string[]>([]);
  const [kind, setKind] = useState<PartyPostKind>("RECRUITING");
  const [state, setState] = useState<"loading" | "ready" | "submitting" | "error">("loading");
  const [message, setMessage] = useState<string | null>(null);

  const eligibleResumes = useMemo(() => availableResumes(resumes), [resumes]);
  const selectedResume = useMemo(
    () => eligibleResumes.find((resume) => resume.slug === selectedResumeSlug) ?? null,
    [eligibleResumes, selectedResumeSlug],
  );
  const targets = selectedResume ? targetsFor(selectedResume) : [];
  const selectableTargets = targets.length > 0 && targets.every((target) => Boolean(target.bossId));

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

        const eligible = availableResumes(parsed);
        const initial = eligible.find((resume) => resume.slug === initialResumeSlug) ?? eligible[0] ?? null;
        setResumes(parsed);
        setSelectedResumeSlug(initial?.slug ?? null);
        setSelectedBossIds(
          initial
            ? targetsFor(initial)
                .map((target) => target.bossId)
                .filter((id): id is string => Boolean(id))
            : [],
        );
        setState("ready");
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }
        setMessage(error instanceof Error ? error.message : "내 이력서 목록을 불러오지 못했습니다.");
        setState("error");
      }
    }

    void load();
    return () => controller.abort();
  }, [initialResumeSlug]);

  function selectResume(slug: string) {
    const next = eligibleResumes.find((resume) => resume.slug === slug) ?? null;
    setSelectedResumeSlug(next?.slug ?? null);
    setSelectedBossIds(
      next
        ? targetsFor(next)
            .map((target) => target.bossId)
            .filter((id): id is string => Boolean(id))
        : [],
    );
    setMessage(null);
  }

  function toggleTarget(id: string) {
    setSelectedBossIds((current) =>
      current.includes(id) ? current.filter((candidate) => candidate !== id) : [...current, id],
    );
    setMessage(null);
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedResume) {
      setMessage("게시할 공개 이력서를 선택해 주세요.");
      return;
    }
    if (selectableTargets && selectedBossIds.length === 0) {
      setMessage("게시할 보스를 하나 이상 선택해 주세요.");
      return;
    }

    setState("submitting");
    setMessage(null);
    try {
      const response = await fetch("/api/party-posts", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          ownerResumeSlug: selectedResume.slug,
          kind,
          ...(selectableTargets ? { targetBossIds: selectedBossIds } : {}),
        }),
      });
      const payload: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(partyResponseMessage(payload, "파티 게시글을 만들지 못했습니다."));
      }
      const slug = partyCreatedSlug(payload);
      if (!slug) {
        throw new Error("게시글 주소를 확인할 수 없습니다.");
      }
      router.push(`/parties/${encodeURIComponent(slug)}`);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "파티 게시글을 만들지 못했습니다.");
      setState("ready");
    }
  }

  if (state === "loading") {
    return (
      <section className="ui-panel rounded-2xl p-6 sm:p-8" aria-busy="true" aria-live="polite">
        <p className="resume-kicker">PARTY BOARD</p>
        <h1 className="resume-heading mt-2 text-3xl font-bold">파티 글 작성</h1>
        <p className="mt-4 text-sm text-[#52606d]">게시 가능한 내 이력서를 불러오는 중입니다.</p>
      </section>
    );
  }

  if (state === "error") {
    return (
      <section className="ui-panel rounded-2xl p-6 sm:p-8" role="alert">
        <p className="resume-kicker">PARTY BOARD</p>
        <h1 className="resume-heading mt-2 text-3xl font-bold">파티 글 작성</h1>
        <p className="mt-4 text-sm leading-6 text-[#7c2f2c]">{message}</p>
        <Link
          href="/my-resumes"
          className="ui-action mt-5 inline-flex rounded-xl px-4 py-3 text-sm font-bold"
        >
          내 이력서 확인하기
        </Link>
      </section>
    );
  }

  if (!eligibleResumes.length) {
    return (
      <section className="ui-panel rounded-2xl p-6 sm:p-8">
        <p className="resume-kicker">PARTY BOARD</p>
        <h1 className="resume-heading mt-2 text-3xl font-bold">파티 글 작성</h1>
        <p className="mt-5 text-lg font-bold text-[#202a36]">게시 가능한 이력서가 없습니다.</p>
        <p className="mt-2 max-w-2xl text-sm leading-7 text-[#52606d]">
          파티 글은 공개 중이며 최신 상태인 메력서에서만 만들 수 있습니다. 이력서를 새로 작성하거나 최신
          데이터로 갱신한 뒤 다시 시도해 주세요.
        </p>
        <Link
          href="/my-resumes"
          className="ui-action mt-5 inline-flex rounded-xl px-4 py-3 text-sm font-bold"
        >
          내 이력서로 이동
        </Link>
      </section>
    );
  }

  return (
    <section className="ui-panel rounded-2xl p-5 sm:p-8" aria-labelledby="party-post-form-heading">
      <div className="border-b border-[#d9cdbd] pb-5">
        <p className="resume-kicker">PARTY BOARD</p>
        <h1 id="party-post-form-heading" className="resume-heading mt-2 text-3xl font-bold sm:text-4xl">
          파티 글 작성
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-[#52606d]">
          선택한 메력서의 현재 버전과 보스 배율을 기준으로 7일 동안 게시됩니다. 이력서를 수정하거나 갱신하면
          기존 게시글은 더 이상 공개되지 않습니다.
        </p>
      </div>

      <form className="mt-6 space-y-7" onSubmit={submit} noValidate>
        <fieldset>
          <legend className="text-base font-bold text-[#202a36]">게시 방식</legend>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {(["RECRUITING", "LOOKING"] as const).map((value) => (
              <label
                key={value}
                className={`cursor-pointer rounded-xl border p-4 transition ${
                  kind === value
                    ? "border-[#a44640] bg-[#f8e6e1]"
                    : "border-[#d9cdbd] bg-[#fffefa] hover:border-[#a44640]/70"
                }`}
              >
                <input
                  type="radio"
                  name="party-kind"
                  value={value}
                  checked={kind === value}
                  onChange={() => setKind(value)}
                  className="sr-only"
                />
                <span className="block font-bold text-[#202a36]">{partyPostKindLabels[value]}</span>
                <span className="mt-1 block text-sm leading-6 text-[#52606d]">
                  {value === "RECRUITING"
                    ? "내 파티에 함께할 캐릭터를 모집합니다."
                    : "내 캐릭터가 참여할 파티를 찾습니다."}
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <div>
          <label htmlFor="party-owner-resume" className="text-base font-bold text-[#202a36]">
            게시할 메력서
          </label>
          <select
            id="party-owner-resume"
            value={selectedResume?.slug ?? ""}
            onChange={(event) => selectResume(event.target.value)}
            className="ui-input mt-3 min-h-12 w-full rounded-xl border px-3 text-sm"
          >
            {eligibleResumes.map((resume) => (
              <option key={resume.slug} value={resume.slug}>
                {resume.characterName} ·{" "}
                {resume.worldGroup ? partyWorldGroupLabels[resume.worldGroup] : "월드 확인 불가"} ·{" "}
                {targetsFor(resume)
                  .map((target) => target.bossName)
                  .join(" / ")}
              </option>
            ))}
          </select>
          <p className="mt-2 text-xs leading-5 text-[#687380]">
            공개 중이고 최신 상태이며 월드 정보를 확인할 수 있는 내 메력서만 선택할 수 있습니다. 본서버,
            에오스·헬리오스, 챌린저스는 서로 다른 파티 그룹입니다.
          </p>
          {selectedResume?.worldGroup ? (
            <p className="mt-2 rounded-xl border border-[#d9cdbd] bg-[#f6f2ea] px-3 py-2 text-xs font-bold text-[#52606d]">
              이 게시글의 파티 그룹: {partyWorldGroupLabels[selectedResume.worldGroup]}
            </p>
          ) : null}
        </div>

        <fieldset>
          <legend className="text-base font-bold text-[#202a36]">게시할 보스</legend>
          <p className="mt-2 text-sm leading-6 text-[#52606d]">
            여러 보스를 한 게시글에 묶을 수 있으며, 각 보스에 입력한 배율이 함께 표시됩니다.
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {targets.map((target, index) => {
              const id = target.bossId;
              const isSelected = id ? selectedBossIds.includes(id) : true;
              return (
                <label
                  key={`${target.bossId ?? target.bossName}-${index}`}
                  className={`rounded-xl border p-4 ${
                    isSelected ? "border-[#a44640]/70 bg-[#fff7f2]" : "border-[#d9cdbd] bg-[#fffefa]"
                  } ${id ? "cursor-pointer" : ""}`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      disabled={!id}
                      onChange={() => id && toggleTarget(id)}
                      className="mt-1 h-4 w-4 accent-[#a44640]"
                    />
                    <span>
                      <span className="block font-bold text-[#202a36]">
                        {formatPartyBossLabel(target.bossName, target.cadence)}
                      </span>
                      <span className="mt-1 block text-sm text-[#52606d]">
                        {target.bossMultiplierPercent
                          ? `보스 배율 ${target.bossMultiplierPercent}%`
                          : "보스 배율 미입력"}
                      </span>
                    </span>
                  </div>
                </label>
              );
            })}
          </div>
          {!selectableTargets ? (
            <p className="mt-3 rounded-xl border border-[#d9cdbd] bg-[#f6f2ea] p-3 text-xs leading-5 text-[#52606d]">
              이전 형식으로 만든 이력서는 포함된 보스 전체로 게시됩니다.
            </p>
          ) : null}
        </fieldset>

        {message ? (
          <p
            role="alert"
            className="rounded-xl border border-[#a44640]/40 bg-[#f8e6e1] p-3 text-sm leading-6 text-[#7c2f2c]"
          >
            {message}
          </p>
        ) : null}

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Link
            href="/parties"
            className="rounded-xl border border-[#bfae99] bg-[#fffefa] px-5 py-3 text-center text-sm font-bold text-[#202a36]"
          >
            취소
          </Link>
          <button
            type="submit"
            disabled={state === "submitting"}
            className="ui-action rounded-xl px-5 py-3 text-sm font-bold disabled:cursor-wait disabled:opacity-65"
          >
            {state === "submitting" ? "게시글 만드는 중…" : "파티 글 게시하기"}
          </button>
        </div>
      </form>
    </section>
  );
}
