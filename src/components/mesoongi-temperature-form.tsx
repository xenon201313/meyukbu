"use client";

import { useEffect, useId, useState, type FormEvent } from "react";

interface MesoongiTemperatureFormProps {
  resumeSlug: string;
  onSubmitted?: () => void;
}

interface SurveyChoice {
  label: string;
  description: string;
  value: number;
}

const fivePointChoices: readonly SurveyChoice[] = [
  { value: -2, label: "매우 불만족", description: "기대와 차이가 컸어요" },
  { value: -1, label: "불만족", description: "개선할 점이 있었어요" },
  { value: 0, label: "보통", description: "무난하게 함께했어요" },
  { value: 1, label: "만족", description: "전반적으로 만족했어요" },
  { value: 2, label: "매우 만족", description: "다시 함께하고 싶어요" },
];

const punctualityChoices: readonly SurveyChoice[] = [
  { value: -1, label: "아니다", description: "시간 조율이 필요했어요" },
  { value: 1, label: "그렇다", description: "예정한 시간에 준비됐어요" },
];

function readInvitationToken(): string {
  if (typeof window === "undefined") {
    return "";
  }

  return new URLSearchParams(window.location.hash.slice(1)).get("invite")?.trim() ?? "";
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

interface ScoreQuestionProps {
  id: string;
  label: string;
  help: string;
  choices: readonly SurveyChoice[];
  selectedValue: number | null;
  onChange: (value: number) => void;
  testId: string;
}

function ScoreQuestion({ id, label, help, choices, selectedValue, onChange, testId }: ScoreQuestionProps) {
  const helpId = `${id}-help`;

  return (
    <fieldset data-testid={testId} aria-describedby={helpId}>
      <legend className="text-sm font-bold text-[#202a36]">{label}</legend>
      <p id={helpId} className="mt-1.5 text-xs leading-5 text-[#687380]">
        {help}
      </p>
      <div className="mt-3 grid gap-2">
        {choices.map((choice) => {
          const inputId = `${id}-${choice.value}`;
          const isSelected = selectedValue === choice.value;
          return (
            <label
              key={choice.value}
              htmlFor={inputId}
              className={`flex min-h-13 cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 transition ${
                isSelected
                  ? "border-[#a44640] bg-[#f8e6e1] text-[#7c2f2c]"
                  : "border-[#d9cdbd] bg-[#fffefa] text-[#52606d] hover:border-[#a44640]/60 hover:text-[#7c2f2c]"
              }`}
            >
              <input
                id={inputId}
                type="radio"
                name={id}
                value={choice.value}
                checked={isSelected}
                onChange={() => onChange(choice.value)}
                className="h-4 w-4 border-[#bfae99] text-[#a44640] focus:ring-[#a44640]"
              />
              <span className="min-w-0">
                <span className="block text-sm font-bold">{choice.label}</span>
                <span className="mt-0.5 block text-xs text-[#687380]">{choice.description}</span>
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

/**
 * Reads a delivery-only invitation from `#invite=` and submits an anonymous
 * three-question survey. The token fragment is never transmitted in the URL.
 */
export function MesoongiTemperatureForm({ resumeSlug, onSubmitted }: MesoongiTemperatureFormProps) {
  const formStatusId = useId();
  const [invitationToken, setInvitationToken] = useState("");
  const [experienceScore, setExperienceScore] = useState<number | null>(null);
  const [proficiencyScore, setProficiencyScore] = useState<number | null>(null);
  const [punctualityScore, setPunctualityScore] = useState<number | null>(null);
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

  function selectExperience(value: number) {
    setExperienceScore(value);
    setError("");
    setStatus("");
  }

  function selectProficiency(value: number) {
    setProficiencyScore(value);
    setError("");
    setStatus("");
  }

  function selectPunctuality(value: number) {
    setPunctualityScore(value);
    setError("");
    setStatus("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setStatus("");

    if (!invitationToken) {
      setError("메숭이 체온 설문 링크가 확인되지 않습니다. 받은 링크를 그대로 열어 주세요.");
      return;
    }
    if (experienceScore === null || proficiencyScore === null || punctualityScore === null) {
      setError("세 가지 질문에 모두 답해 주세요.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/resumes/${encodeURIComponent(resumeSlug)}/temperature`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ invitationToken, experienceScore, proficiencyScore, punctualityScore }),
      });
      const body = await responseJson(response);

      if (!response.ok) {
        setError(
          messageFromResponse(body, "메숭이 체온 설문을 제출하지 못했습니다. 잠시 후 다시 시도해 주세요."),
        );
        return;
      }

      setStatus("메숭이 체온 설문이 익명으로 집계되었습니다. 참여해 주셔서 감사합니다.");
      onSubmitted?.();
    } catch {
      setError("네트워크 연결을 확인한 뒤 다시 시도해 주세요.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="ui-panel rounded-xl p-5 sm:p-6" onSubmit={handleSubmit} noValidate>
      <div>
        <p className="ui-kicker">ANONYMOUS SURVEY</p>
        <h2 className="mt-1 text-xl font-bold text-[#202a36]">메숭이 체온 설문</h2>
        <p className="mt-2 text-sm leading-6 text-[#52606d]">
          함께한 파티 경험을 익명으로 남겨 주세요. 닉네임, 메력서 링크, 자유 입력은 수집하지 않습니다.
        </p>
      </div>

      <div className="mt-5 rounded-xl border border-[#d9cdbd] bg-[#f6f2ea] px-4 py-3" role="status">
        {invitationToken ? (
          <p className="text-sm font-semibold text-[#202a36]">
            설문 링크를 확인했습니다. 세 가지 질문에 답해 주세요.
          </p>
        ) : (
          <p className="text-sm font-semibold text-[#7c2f2c]">
            설문 링크가 필요합니다. 전달받은 링크를 그대로 열어 주세요.
          </p>
        )}
      </div>

      <div className="mt-6 space-y-7">
        <ScoreQuestion
          id="temperature-experience"
          testId="temperature-experience-score"
          label="1. 해당 파티원과의 보스 경험은 어땠습니까?"
          help="함께한 과정 전반에 대한 느낌을 골라 주세요."
          choices={fivePointChoices}
          selectedValue={experienceScore}
          onChange={selectExperience}
        />
        <ScoreQuestion
          id="temperature-proficiency"
          testId="temperature-proficiency-score"
          label="2. 해당 파티원의 숙련도는 만족스러웠습니까?"
          help="보스 공략에 필요한 준비와 대응을 기준으로 골라 주세요."
          choices={fivePointChoices}
          selectedValue={proficiencyScore}
          onChange={selectProficiency}
        />
        <ScoreQuestion
          id="temperature-punctuality"
          testId="temperature-punctuality-score"
          label="3. 시간 약속을 잘 지켰습니까?"
          help="예정한 시간에 맞춰 준비했는지 골라 주세요."
          choices={punctualityChoices}
          selectedValue={punctualityScore}
          onChange={selectPunctuality}
        />
      </div>

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
        <p className="text-sm font-semibold text-[#202a36]">익명 설문 안내</p>
        <p className="mt-1 text-xs leading-5 text-[#52606d]">
          설문은 한 번만 제출할 수 있으며, 공개 이력서에는 개별 답변이나 작성자 정보 없이 메숭이 체온의
          집계값만 표시됩니다.
        </p>
      </aside>

      <button
        data-testid="temperature-survey-submit"
        type="submit"
        disabled={isSubmitting || !invitationToken}
        aria-describedby={formStatusId}
        className="ui-action mt-5 flex min-h-12 w-full items-center justify-center rounded-xl px-5 py-3 text-base font-bold transition disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isSubmitting ? "설문 제출 중…" : "메숭이 체온 설문 제출"}
      </button>
    </form>
  );
}
