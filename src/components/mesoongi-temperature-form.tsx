"use client";

import { useEffect, useId, useState, type FormEvent } from "react";

import {
  mesoongiTemperatureTagLabels,
  mesoongiTemperatureTagValues,
  type MesoongiTemperatureTag,
} from "@/domain/mesoongi-temperature";

interface MesoongiTemperatureFormProps {
  resumeSlug: string;
  onSubmitted?: () => void;
}

function readInvitationToken(): string {
  if (typeof window === "undefined") {
    return "";
  }

  return new URLSearchParams(window.location.hash.slice(1)).get("invite")?.trim() ?? "";
}

/** Accepts a public `/r/[slug]` URL or a raw public resume slug. */
function normalizeReviewerSlug(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const rawSlugMatch = trimmed.match(/^(m-[a-z0-9_-]+)$/i);
  if (rawSlugMatch) {
    return rawSlugMatch[1].toLowerCase();
  }

  try {
    const url = new URL(trimmed);
    const pathMatch = url.pathname.match(/^\/r\/(m-[a-z0-9_-]+)\/?$/i);
    return pathMatch?.[1].toLowerCase() ?? null;
  } catch {
    const pathMatch = trimmed.match(/^\/?r\/(m-[a-z0-9_-]+)\/?$/i);
    return pathMatch?.[1].toLowerCase() ?? null;
  }
}

function messageFromResponse(value: unknown, fallback: string): string {
  if (typeof value === "object" && value !== null && "message" in value) {
    const message = value.message;
    if (typeof message === "string" && message.trim()) {
      return message;
    }
  }

  return fallback;
}

async function responseJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch (error) {
    if (error instanceof SyntaxError) {
      return null;
    }

    throw error;
  }
}

/**
 * A tag-only submission form that reads its single-use invitation from
 * `#invite=`. The fragment is intentionally never sent to the server in a URL.
 */
export function MesoongiTemperatureForm({ resumeSlug, onSubmitted }: MesoongiTemperatureFormProps) {
  const tagHelpId = useId();
  const formStatusId = useId();
  const [invitationToken, setInvitationToken] = useState("");
  const [reviewerInput, setReviewerInput] = useState("");
  const [tags, setTags] = useState<MesoongiTemperatureTag[]>([]);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    function syncInvitationToken() {
      setInvitationToken(readInvitationToken());
    }

    syncInvitationToken();
    window.addEventListener("hashchange", syncInvitationToken);
    return () => window.removeEventListener("hashchange", syncInvitationToken);
  }, []);

  function toggleTag(tag: MesoongiTemperatureTag) {
    setTags((current) => {
      if (current.includes(tag)) {
        return current.filter((value) => value !== tag);
      }
      if (current.length >= 3) {
        return current;
      }
      return [...current, tag];
    });
    setError("");
    setStatus("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setStatus("");

    const reviewerSlug = normalizeReviewerSlug(reviewerInput);
    if (!invitationToken) {
      setError("동행 기록 초대 링크가 확인되지 않습니다. 받은 링크를 그대로 열어 주세요.");
      return;
    }
    if (!reviewerSlug) {
      setError("본인의 공개 메력서 주소 또는 슬러그를 입력해 주세요.");
      return;
    }
    if (!tags.length) {
      setError("동행 태그를 하나 이상 선택해 주세요.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/resumes/${encodeURIComponent(resumeSlug)}/temperature`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ invitationToken, reviewerSlug, tags }),
      });
      const body = await responseJson(response);

      if (!response.ok) {
        setError(messageFromResponse(body, "동행 기록을 남기지 못했습니다. 잠시 후 다시 시도해 주세요."));
        return;
      }

      setStatus("동행 기록을 남겼습니다. 메력서에 작성 내용으로 표시됩니다.");
      onSubmitted?.();
    } catch {
      setError("네트워크 연결을 확인한 뒤 다시 시도해 주세요.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const selectedTagCount = tags.length;

  return (
    <form className="ui-panel rounded-xl p-5 sm:p-6" onSubmit={handleSubmit} noValidate>
      <div>
        <p className="ui-kicker">작성 내용 · 동행 기록</p>
        <h2 className="mt-1 text-xl font-bold text-[#202a36]">메숭이 체온 · 동행 기록 남기기</h2>
        <p className="mt-2 text-sm leading-6 text-[#52606d]">
          함께 플레이한 모험가의 메력서를 확인한 뒤, 긍정적인 동행 태그만 선택해 남겨 주세요.
        </p>
      </div>

      <div className="mt-5 rounded-xl border border-[#d9cdbd] bg-[#f6f2ea] px-4 py-3" role="status">
        {invitationToken ? (
          <p className="text-sm font-semibold text-[#202a36]">동행 기록 초대 링크를 확인했습니다.</p>
        ) : (
          <p className="text-sm font-semibold text-[#7c2f2c]">
            초대 링크가 필요합니다. 전달받은 링크를 그대로 열어 주세요.
          </p>
        )}
      </div>

      <div className="mt-5">
        <label htmlFor="temperature-reviewer-slug" className="text-sm font-semibold text-[#202a36]">
          내 공개 메력서
        </label>
        <input
          id="temperature-reviewer-slug"
          name="reviewerResume"
          type="text"
          autoComplete="url"
          className="ui-input mt-2 block w-full rounded-xl border px-3 py-2.5 text-sm outline-none transition"
          placeholder="https://maple-resume.com/r/m-... 또는 m-..."
          value={reviewerInput}
          onChange={(event) => {
            setReviewerInput(event.target.value);
            setError("");
          }}
          aria-describedby="temperature-reviewer-help"
          required
        />
        <p id="temperature-reviewer-help" className="mt-2 text-xs leading-5 text-[#687380]">
          공개 메력서 주소 또는 슬러그를 입력하면, 작성자 정보가 동행 기록에 연결됩니다.
        </p>
      </div>

      <fieldset className="mt-6" aria-describedby={tagHelpId}>
        <legend className="text-sm font-semibold text-[#202a36]">동행 태그</legend>
        <p id={tagHelpId} className="mt-2 text-xs leading-5 text-[#687380]">
          함께한 경험에 해당하는 태그를 골라 주세요. 태그는 최대 세 개까지 선택할 수 있습니다.
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {mesoongiTemperatureTagValues.map((tag) => {
            const isChecked = tags.includes(tag);
            const isUnavailable = !isChecked && selectedTagCount >= 3;

            return (
              <label
                key={tag}
                className={`flex min-h-11 items-center gap-3 rounded-xl border px-3 py-2.5 text-sm font-semibold transition ${
                  isChecked
                    ? "border-[#a44640] bg-[#f8e6e1] text-[#7c2f2c]"
                    : "border-[#d9cdbd] bg-[#fffefa] text-[#52606d] hover:border-[#a44640]/60 hover:text-[#7c2f2c]"
                } ${isUnavailable ? "cursor-not-allowed opacity-55" : "cursor-pointer"}`}
              >
                <input
                  type="checkbox"
                  name="temperatureTags"
                  value={tag}
                  checked={isChecked}
                  disabled={isUnavailable}
                  onChange={() => toggleTag(tag)}
                  className="h-4 w-4 rounded border-[#bfae99] text-[#a44640] focus:ring-[#a44640]"
                />
                <span>{mesoongiTemperatureTagLabels[tag]}</span>
              </label>
            );
          })}
        </div>
      </fieldset>

      {error ? (
        <p
          className="mt-5 rounded-xl border border-rose-800/35 bg-rose-50 px-3 py-2 text-sm leading-6 text-rose-950"
          role="alert"
        >
          {error}
        </p>
      ) : null}
      <p id={formStatusId} className="mt-3 text-sm leading-6 text-[#52606d]" role="status" aria-live="polite">
        {status}
      </p>

      <aside className="mt-5 rounded-xl border border-[#d9cdbd] bg-[#f6f2ea] px-4 py-3" role="note">
        <p className="text-sm font-semibold text-[#202a36]">작성 내용 안내</p>
        <p className="mt-1 text-xs leading-5 text-[#52606d]">
          동행 기록은 직접 선택한 태그로만 남습니다. 점수, 순위, 자유 의견은 작성하지 않으며 서비스 또는
          NEXON의 보증과 인증이 아닙니다.
        </p>
      </aside>

      <button
        type="submit"
        disabled={isSubmitting || !invitationToken}
        aria-describedby={formStatusId}
        className="ui-action mt-5 flex min-h-12 w-full items-center justify-center rounded-xl px-5 py-3 text-base font-bold transition disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isSubmitting ? "동행 기록을 남기는 중…" : "동행 기록 남기기"}
      </button>
    </form>
  );
}
