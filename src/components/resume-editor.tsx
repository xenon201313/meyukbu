"use client";

import { Suspense, useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import type { NormalizedCharacterProfile } from "@/domain/character";
import {
  partyTypeLabels,
  type ContactType,
  type ResumeDraft,
  type ResumeRole,
  type PartyType,
  type VoiceChat,
  roleLabels,
  voiceChatLabels,
} from "@/domain/resume";

import { BossCadencePicker } from "@/components/boss-cadence-picker";
import { CharacterDataPanel } from "@/components/character-data-panel";
import { ResumePreview } from "@/components/resume-preview";

type ResolveMode = "mock" | "live";
type ResolveState = "idle" | "loading" | "success" | "error";
type FormErrorKey =
  | "targetBoss"
  | "convertedStat"
  | "bossMultiplierPercent"
  | "availability"
  | "lootPolicy"
  | "experienceSummary"
  | "roleSummary"
  | "contact"
  | "form";
type FormErrors = Partial<Record<FormErrorKey, string>>;

interface ResolveCharacterPayload {
  profile: NormalizedCharacterProfile;
  mode: ResolveMode;
}

interface CreateResumePayload {
  slug: string;
  versionNumber: number;
}

interface EditableResumePayload {
  resume: {
    slug: string;
    version: {
      snapshot: { profile: NormalizedCharacterProfile };
      draft: ResumeDraft;
    };
  };
}

const dayOptions = ["월", "화", "수", "목", "금", "토", "일"];

const roleOptions: ReadonlyArray<{ value: ResumeRole; label: string }> = [
  { value: "DAMAGE", label: roleLabels.DAMAGE },
  { value: "UTILITY", label: roleLabels.UTILITY },
];

const partyTypeOptions: ReadonlyArray<{ value: PartyType; label: string }> = [
  { value: "FIXED", label: partyTypeLabels.FIXED },
  { value: "TEMPORARY", label: partyTypeLabels.TEMPORARY },
  { value: "PROGRESSION", label: partyTypeLabels.PROGRESSION },
];

const voiceChatOptions: ReadonlyArray<{ value: VoiceChat; label: string }> = [
  { value: "AVAILABLE", label: voiceChatLabels.AVAILABLE },
  { value: "OPTIONAL", label: voiceChatLabels.OPTIONAL },
  { value: "UNAVAILABLE", label: voiceChatLabels.UNAVAILABLE },
];

const contactTypeOptions: ReadonlyArray<{ value: ContactType; label: string }> = [
  { value: "DISCORD", label: "Discord" },
  { value: "OPEN_CHAT", label: "오픈채팅 설명" },
  { value: "COMMUNITY", label: "커뮤니티 닉네임" },
];

const inputClassName =
  "ui-input mt-2 block w-full rounded-xl border px-3 py-2.5 text-sm outline-none transition disabled:cursor-not-allowed disabled:opacity-60";

const formSectionNumbers: Record<string, string> = {
  "캐릭터 정보": "01",
  "환산·보스 배율 참고": "02",
  "지원 분야": "03",
  "가능 시간": "04",
  "파티 경험": "05",
  "희망 조건": "06",
  "공개 범위": "07",
};

function createDefaultDraft(): ResumeDraft {
  return {
    targetBoss: "검은 마법사 (하드)",
    targetBossCadence: "MONTHLY",
    role: "DAMAGE",
    partyType: "FIXED",
    availability: [
      {
        days: ["화", "목", "일"],
        startTime: "20:00",
        endTime: "23:00",
        timezone: "Asia/Seoul",
      },
    ],
    voiceChat: "OPTIONAL",
    lootPolicy: "상호 협의",
    experienceSummary: "동일 보스 격수 경험이 있습니다.",
    roleSummary: "패턴 대응과 생존을 강점으로, 약속한 시간에 안정적으로 참여합니다.",
    theme: "RESUME",
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isStringOrNull(value: unknown): value is string | null {
  return typeof value === "string" || value === null;
}

function isProfileField(value: unknown) {
  if (!isRecord(value)) {
    return false;
  }

  const validProvenance =
    value.provenance === "NEXON_API" ||
    value.provenance === "SERVICE_CALCULATED" ||
    value.provenance === "USER_PROVIDED" ||
    value.provenance === "SERVICE_OBSERVED";
  const validCategory =
    value.category === "combat" ||
    value.category === "growth" ||
    value.category === "record" ||
    value.category === "equipment" ||
    value.category === "identity";
  const validPriority =
    value.priorityByRole === undefined ||
    (isRecord(value.priorityByRole) &&
      Object.values(value.priorityByRole).every((priority) => typeof priority === "number"));

  return (
    typeof value.key === "string" &&
    typeof value.label === "string" &&
    (typeof value.value === "string" || typeof value.value === "number" || value.value === null) &&
    (value.unit === undefined || typeof value.unit === "string") &&
    validProvenance &&
    validCategory &&
    validPriority
  );
}

function isNormalizedProfile(value: unknown): value is NormalizedCharacterProfile {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.ocid === "string" &&
    typeof value.characterName === "string" &&
    isStringOrNull(value.worldName) &&
    isStringOrNull(value.className) &&
    (typeof value.level === "number" || value.level === null) &&
    isStringOrNull(value.imageUrl) &&
    isStringOrNull(value.currentGuild) &&
    typeof value.fetchedAt === "string" &&
    isStringOrNull(value.sourceDate) &&
    (value.provider === "mock" || value.provider === "live") &&
    Array.isArray(value.fields) &&
    value.fields.every(isProfileField) &&
    isRecord(value.rawAvailability) &&
    Object.values(value.rawAvailability).every(
      (availability) =>
        availability === "available" || availability === "missing" || availability === "unsupported",
    ) &&
    (value.notice === undefined || typeof value.notice === "string")
  );
}

function isResumeDraft(value: unknown): value is ResumeDraft {
  if (!isRecord(value) || !Array.isArray(value.availability)) {
    return false;
  }

  const validAvailability = value.availability.every((slot) => {
    if (!isRecord(slot) || !Array.isArray(slot.days)) {
      return false;
    }
    return (
      slot.days.every((day) => typeof day === "string") &&
      typeof slot.startTime === "string" &&
      typeof slot.endTime === "string" &&
      slot.timezone === "Asia/Seoul"
    );
  });
  const validContact =
    value.contact === undefined ||
    (isRecord(value.contact) &&
      (value.contact.type === "DISCORD" ||
        value.contact.type === "OPEN_CHAT" ||
        value.contact.type === "COMMUNITY") &&
      typeof value.contact.value === "string" &&
      typeof value.contact.isPublic === "boolean");

  return (
    typeof value.targetBoss === "string" &&
    (value.targetBossCadence === undefined ||
      value.targetBossCadence === "WEEKLY" ||
      value.targetBossCadence === "MONTHLY") &&
    (value.role === "DAMAGE" ||
      value.role === "SUPPORT" ||
      value.role === "UTILITY" ||
      value.role === "OTHER") &&
    (value.partyType === "FIXED" ||
      value.partyType === "SEMI_FIXED" ||
      value.partyType === "TEMPORARY" ||
      value.partyType === "PROGRESSION") &&
    validAvailability &&
    (value.voiceChat === "AVAILABLE" ||
      value.voiceChat === "OPTIONAL" ||
      value.voiceChat === "UNAVAILABLE") &&
    (value.convertedStat === undefined || typeof value.convertedStat === "string") &&
    (value.bossMultiplierPercent === undefined || typeof value.bossMultiplierPercent === "string") &&
    (value.lootPolicy === undefined || typeof value.lootPolicy === "string") &&
    (value.experienceSummary === undefined || typeof value.experienceSummary === "string") &&
    (value.roleSummary === undefined || typeof value.roleSummary === "string") &&
    validContact &&
    (value.theme === "RESUME" || value.theme === "MINIMAL")
  );
}

function isResolveCharacterPayload(value: unknown): value is ResolveCharacterPayload {
  return (
    isRecord(value) && isNormalizedProfile(value.profile) && (value.mode === "mock" || value.mode === "live")
  );
}

function isCreateResumePayload(value: unknown): value is CreateResumePayload {
  return (
    isRecord(value) &&
    typeof value.slug === "string" &&
    value.slug.length > 0 &&
    typeof value.versionNumber === "number"
  );
}

function isEditableResumePayload(value: unknown): value is EditableResumePayload {
  if (!isRecord(value) || !isRecord(value.resume) || !isRecord(value.resume.version)) {
    return false;
  }
  const snapshot = value.resume.version.snapshot;

  return (
    typeof value.resume.slug === "string" &&
    value.resume.slug.length > 0 &&
    isRecord(snapshot) &&
    isNormalizedProfile(snapshot.profile) &&
    isResumeDraft(value.resume.version.draft)
  );
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

function messageFromPayload(payload: unknown, fallback: string) {
  if (isRecord(payload) && typeof payload.message === "string" && payload.message.trim()) {
    return payload.message;
  }

  return fallback;
}

function normalizeDraft(draft: ResumeDraft): ResumeDraft {
  const contactValue = draft.contact?.value.trim() ?? "";

  return {
    ...draft,
    targetBoss: draft.targetBoss.trim(),
    convertedStat: draft.convertedStat?.trim() || undefined,
    bossMultiplierPercent: draft.bossMultiplierPercent?.trim() || undefined,
    availability: draft.availability.map((slot) => ({
      ...slot,
      days: [...slot.days],
    })),
    lootPolicy: draft.lootPolicy?.trim() || undefined,
    experienceSummary: draft.experienceSummary?.trim() || undefined,
    roleSummary: draft.roleSummary?.trim() || undefined,
    contact: contactValue && draft.contact ? { ...draft.contact, value: contactValue } : undefined,
  };
}

function validateDraft(draft: ResumeDraft): FormErrors {
  const errors: FormErrors = {};
  const slot = draft.availability[0];

  if (!draft.targetBoss.trim()) {
    errors.targetBoss = "목표 보스를 목록에서 선택해 주세요.";
  } else if (draft.targetBoss.trim().length > 60) {
    errors.targetBoss = "목표 보스는 60자 이하로 입력해 주세요.";
  }

  if ((draft.convertedStat?.trim().length ?? 0) > 40) {
    errors.convertedStat = "환산은 40자 이하로 입력해 주세요.";
  }

  const bossMultiplierPercent = draft.bossMultiplierPercent?.trim() ?? "";
  if (bossMultiplierPercent.length > 40) {
    errors.bossMultiplierPercent = "보스 배율은 40자 이하로 입력해 주세요.";
  } else if (bossMultiplierPercent && !/^\d[\d,]*(?:\.\d+)?$/.test(bossMultiplierPercent)) {
    errors.bossMultiplierPercent = "보스 배율은 % 기호 없이 숫자로 입력해 주세요.";
  }

  if (!slot?.days.length) {
    errors.availability = "가능한 요일을 하나 이상 선택해 주세요.";
  } else if (!slot.startTime || !slot.endTime || slot.startTime >= slot.endTime) {
    errors.availability = "종료 시간은 시작 시간보다 뒤여야 합니다.";
  }

  if ((draft.lootPolicy?.trim().length ?? 0) > 80) {
    errors.lootPolicy = "분배 방식은 80자 이하로 입력해 주세요.";
  }
  if ((draft.experienceSummary?.trim().length ?? 0) > 280) {
    errors.experienceSummary = "보스 경험은 280자 이하로 입력해 주세요.";
  }
  if ((draft.roleSummary?.trim().length ?? 0) > 220) {
    errors.roleSummary = "어필 포인트는 220자 이하로 입력해 주세요.";
  }
  if (draft.contact) {
    const contactLength = draft.contact.value.trim().length;
    if (contactLength < 2 || contactLength > 80) {
      errors.contact = "연락 방법은 2자 이상 80자 이하로 입력해 주세요.";
    }
  }

  return errors;
}

function findOption<T extends string>(options: ReadonlyArray<{ value: T; label: string }>, value: string) {
  return options.find((option) => option.value === value);
}

/**
 * Suspense boundary keeps `useSearchParams` compatible with statically rendered
 * parent routes while the editor itself remains a browser-only interaction.
 */
export function ResumeEditor() {
  return (
    <Suspense
      fallback={
        <p
          className="rounded-2xl border border-stone-200 bg-stone-50 p-4 text-sm text-stone-700"
          role="status"
        >
          편집기를 준비하고 있어요.
        </p>
      }
    >
      <ResumeEditorContent />
    </Suspense>
  );
}

function ResumeEditorContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryName = (searchParams.get("name") ?? "").trim();
  const editSlug = (searchParams.get("edit") ?? "").trim();
  const [draft, setDraft] = useState<ResumeDraft>(createDefaultDraft);
  const [profile, setProfile] = useState<NormalizedCharacterProfile | null>(null);
  const [mode, setMode] = useState<ResolveMode | null>(null);
  const [resolveState, setResolveState] = useState<ResolveState>("idle");
  const [resolveError, setResolveError] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const hadResolveRequest = useRef(Boolean(editSlug || queryName));

  useEffect(() => {
    if (!editSlug && !queryName) {
      if (!hadResolveRequest.current) {
        return;
      }
      hadResolveRequest.current = false;
      const resetTimer = window.setTimeout(() => {
        setProfile(null);
        setMode(null);
        setResolveError(null);
        setResolveState("idle");
        setDraft(createDefaultDraft());
        setFormErrors({});
      }, 0);
      return () => window.clearTimeout(resetTimer);
    }

    hadResolveRequest.current = true;

    const controller = new AbortController();

    void (async () => {
      await Promise.resolve();
      if (controller.signal.aborted) {
        return;
      }
      setProfile(null);
      setMode(null);
      setResolveError(null);
      setResolveState("loading");
      setFormErrors({});

      try {
        if (editSlug) {
          const response = await fetch(`/api/resumes/${encodeURIComponent(editSlug)}`, {
            credentials: "same-origin",
            headers: { Accept: "application/json" },
            signal: controller.signal,
          });
          const payload = await responseJson(response);

          if (!response.ok) {
            throw new Error(messageFromPayload(payload, "기존 메력서를 불러오지 못했습니다."));
          }
          if (!isEditableResumePayload(payload)) {
            throw new Error("기존 메력서 응답 형식을 확인할 수 없습니다.");
          }
          if (controller.signal.aborted) {
            return;
          }

          setProfile(payload.resume.version.snapshot.profile);
          setDraft(payload.resume.version.draft);
          setMode(payload.resume.version.snapshot.profile.provider);
          setResolveState("success");
          return;
        }

        const response = await fetch(`/api/characters/resolve?name=${encodeURIComponent(queryName)}`, {
          headers: { Accept: "application/json" },
          signal: controller.signal,
        });
        const payload = await responseJson(response);

        if (!response.ok) {
          throw new Error(
            messageFromPayload(payload, "캐릭터 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요."),
          );
        }
        if (!isResolveCharacterPayload(payload)) {
          throw new Error("캐릭터 정보 응답 형식을 확인할 수 없습니다.");
        }
        if (controller.signal.aborted) {
          return;
        }

        setProfile(payload.profile);
        setMode(payload.mode);
        setResolveState("success");
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        setResolveError(
          error instanceof Error
            ? error.message
            : "캐릭터 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.",
        );
        setResolveState("error");
      }
    })();

    return () => controller.abort();
  }, [editSlug, queryName]);

  function clearError(key: FormErrorKey) {
    setFormErrors((current) => {
      if (!current[key]) {
        return current;
      }

      const next = { ...current };
      delete next[key];
      return next;
    });
  }

  function updateDraft(update: Partial<ResumeDraft>) {
    setDraft((current) => ({ ...current, ...update }));
  }

  function updateAvailability(update: Partial<ResumeDraft["availability"][number]>) {
    setDraft((current) => {
      const currentSlot = current.availability[0] ?? {
        days: [],
        startTime: "20:00",
        endTime: "23:00",
        timezone: "Asia/Seoul" as const,
      };
      return {
        ...current,
        availability: [{ ...currentSlot, ...update }],
      };
    });
  }

  function toggleDay(day: string) {
    setDraft((current) => {
      const currentSlot = current.availability[0] ?? {
        days: [],
        startTime: "20:00",
        endTime: "23:00",
        timezone: "Asia/Seoul" as const,
      };
      const selected = currentSlot.days.includes(day)
        ? currentSlot.days.filter((selectedDay) => selectedDay !== day)
        : [...currentSlot.days, day];

      return {
        ...current,
        availability: [{ ...currentSlot, days: selected }],
      };
    });
    clearError("availability");
  }

  function handleContactEnabled(event: ChangeEvent<HTMLInputElement>) {
    const isEnabled = event.target.checked;
    setDraft((current) => ({
      ...current,
      contact: isEnabled ? (current.contact ?? { type: "DISCORD", value: "", isPublic: false }) : undefined,
    }));
    clearError("contact");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedDraft = normalizeDraft(draft);
    const errors = validateDraft(normalizedDraft);
    const profileForPublish = profile;
    if (!profileForPublish) {
      errors.form = "캐릭터 정보를 불러온 뒤 게시할 수 있습니다.";
      setDraft(normalizedDraft);
      setFormErrors(errors);
      return;
    }
    setDraft(normalizedDraft);
    setFormErrors(errors);

    if (Object.keys(errors).length) {
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(
        editSlug ? `/api/resumes/${encodeURIComponent(editSlug)}` : "/api/resumes",
        {
          method: editSlug ? "PATCH" : "POST",
          credentials: "same-origin",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify(
            editSlug
              ? { draft: normalizedDraft }
              : { characterName: profileForPublish.characterName, draft: normalizedDraft },
          ),
        },
      );
      const payload = await responseJson(response);

      if (!response.ok) {
        throw new Error(
          messageFromPayload(
            payload,
            editSlug
              ? "메력서를 수정하지 못했습니다. 잠시 후 다시 시도해 주세요."
              : "메력서를 게시하지 못했습니다. 잠시 후 다시 시도해 주세요.",
          ),
        );
      }
      if (editSlug) {
        if (!isEditableResumePayload(payload)) {
          throw new Error("수정 응답 형식을 확인할 수 없습니다.");
        }
        router.push(`/r/${encodeURIComponent(payload.resume.slug)}`);
        return;
      }
      if (!isCreateResumePayload(payload)) {
        throw new Error("게시 응답 형식을 확인할 수 없습니다.");
      }

      router.push(`/r/${encodeURIComponent(payload.slug)}`);
    } catch (error) {
      setFormErrors({
        form:
          error instanceof Error
            ? error.message
            : editSlug
              ? "메력서를 수정하지 못했습니다. 잠시 후 다시 시도해 주세요."
              : "메력서를 게시하지 못했습니다. 잠시 후 다시 시도해 주세요.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  const availability = draft.availability[0];

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 sm:py-12">
      <div className="mb-6 max-w-2xl">
        <p className="ui-kicker">메력서 · 메이플 파티 구직용 캐릭터 이력서</p>
        <h1 className="resume-heading mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
          {editSlug ? "메력서 수정" : "메력서 작성"}
        </h1>
        <p className="mt-2 leading-7 text-[#52606d]">
          API 조회 정보와 작성자 입력을 구분해 한 장의 메력서로 정리합니다.
        </p>
      </div>

      {!queryName && !editSlug ? (
        <section
          className="rounded-xl border border-amber-800/35 bg-amber-50 p-4 text-sm leading-6 text-amber-950"
          role="alert"
        >
          캐릭터명을 입력해 주세요. 검색 화면에서 캐릭터를 선택하면 메력서를 작성할 수 있습니다.
        </section>
      ) : null}

      {resolveState === "loading" ? (
        <p className="ui-panel mb-5 rounded-xl p-4 text-sm text-[#52606d]" role="status">
          {queryName} 캐릭터 정보를 불러오는 중이에요.
        </p>
      ) : null}
      {resolveError ? (
        <p
          className="mb-5 rounded-xl border border-rose-700/35 bg-rose-50 p-4 text-sm leading-6 text-rose-950"
          role="alert"
        >
          {resolveError}
        </p>
      ) : null}
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(360px,0.8fr)]">
        <form noValidate className="space-y-5" onSubmit={handleSubmit}>
          <FormSection title="캐릭터 정보">
            <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              <CharacterDetail
                label="캐릭터명"
                value={(profile?.characterName ?? queryName) || "입력 필요"}
              />
              <CharacterDetail label="월드" value={profile?.worldName ?? "조회 불가"} />
              <CharacterDetail label="직업" value={profile?.className ?? "조회 불가"} />
              <CharacterDetail label="레벨" value={profile?.level ? `Lv.${profile.level}` : "조회 불가"} />
            </dl>
          </FormSection>

          {profile ? <CharacterDataPanel profile={profile} mode={mode ?? profile.provider} /> : null}

          <FormSection title="환산·보스 배율 참고">
            <p className="text-sm leading-7 text-slate-300">
              메력서는 환산과 보스 배율을 자동으로 가져오거나 임의로 계산하지 않습니다. 확인한 값은 아래에
              기록할 수 있으며, 메력서에는 작성 내용으로 표시됩니다.
            </p>
            {profile ? (
              <a
                className="ui-action mt-4 inline-flex rounded-xl px-4 py-2.5 text-sm font-bold transition"
                href={`https://maplescouter.com/ko/result?name=${encodeURIComponent(profile.characterName)}&preset=00000`}
                rel="noopener noreferrer"
                target="_blank"
              >
                MapleScouter에서 환산·보스 배율 확인
              </a>
            ) : null}
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label="환산" htmlFor="converted-stat" error={formErrors.convertedStat}>
                <input
                  id="converted-stat"
                  name="convertedStat"
                  autoComplete="off"
                  className={inputClassName}
                  inputMode="decimal"
                  maxLength={40}
                  placeholder="예: 110,650"
                  value={draft.convertedStat ?? ""}
                  onChange={(event) => {
                    updateDraft({ convertedStat: event.target.value });
                    clearError("convertedStat");
                  }}
                  aria-describedby={formErrors.convertedStat ? "converted-stat-error" : undefined}
                  aria-invalid={Boolean(formErrors.convertedStat)}
                />
              </Field>
              <Field
                label="보스 배율"
                htmlFor="boss-multiplier-percent"
                error={formErrors.bossMultiplierPercent}
              >
                <div className="relative">
                  <input
                    id="boss-multiplier-percent"
                    name="bossMultiplierPercent"
                    autoComplete="off"
                    className={`${inputClassName} pr-9`}
                    inputMode="decimal"
                    maxLength={40}
                    placeholder="예: 412.5"
                    value={draft.bossMultiplierPercent ?? ""}
                    onChange={(event) => {
                      updateDraft({ bossMultiplierPercent: event.target.value });
                      clearError("bossMultiplierPercent");
                    }}
                    aria-describedby={
                      formErrors.bossMultiplierPercent ? "boss-multiplier-percent-error" : undefined
                    }
                    aria-invalid={Boolean(formErrors.bossMultiplierPercent)}
                  />
                  <span
                    aria-hidden
                    className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm font-bold text-slate-400"
                  >
                    %
                  </span>
                </div>
              </Field>
            </div>
            <p className="mt-2 text-xs leading-5 text-slate-400">
              보스 배율에는 % 기호를 제외한 숫자만 입력해 주세요.
            </p>
          </FormSection>

          <FormSection title="지원 분야">
            <div className="space-y-4">
              <BossCadencePicker
                value={draft.targetBossCadence}
                targetBoss={draft.targetBoss}
                error={formErrors.targetBoss}
                onBossSelect={(boss) => {
                  updateDraft({ targetBossCadence: boss.cadence, targetBoss: boss.name });
                  clearError("targetBoss");
                }}
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="역할" htmlFor="role">
                  <select
                    id="role"
                    name="role"
                    className={inputClassName}
                    onChange={(event) => {
                      const option = findOption(roleOptions, event.target.value);
                      if (option) {
                        updateDraft({ role: option.value });
                      }
                    }}
                    value={draft.role}
                  >
                    {roleOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="파티 유형" htmlFor="party-type">
                  <select
                    id="party-type"
                    name="partyType"
                    className={inputClassName}
                    onChange={(event) => {
                      const option = findOption(partyTypeOptions, event.target.value);
                      if (option) {
                        updateDraft({ partyType: option.value });
                      }
                    }}
                    value={draft.partyType}
                  >
                    {partyTypeOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
            </div>
          </FormSection>

          <FormSection title="가능 시간">
            <fieldset>
              <legend className="text-sm font-semibold text-slate-100">가능한 요일</legend>
              <div
                className="mt-2 flex flex-wrap gap-2"
                aria-describedby={formErrors.availability ? "availability-error" : undefined}
              >
                {dayOptions.map((day) => {
                  const isChecked = availability?.days.includes(day) ?? false;
                  return (
                    <label
                      key={day}
                      className={`cursor-pointer rounded-full border px-3 py-2 text-sm font-medium transition ${
                        isChecked
                          ? "border-[#a44640] bg-[#f8e6e1] text-[#7c2f2c] shadow-[0_0_0_1px_rgba(164,70,64,0.14)_inset]"
                          : "border-[#d9cdbd] bg-[#fffefa] text-[#52606d] hover:border-[#a44640]/60 hover:text-[#7c2f2c]"
                      }`}
                    >
                      <input
                        className="sr-only"
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleDay(day)}
                      />
                      {day}
                    </label>
                  );
                })}
              </div>
            </fieldset>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label="시작 가능 시간" htmlFor="start-time">
                <input
                  id="start-time"
                  name="startTime"
                  type="time"
                  className={inputClassName}
                  value={availability?.startTime ?? ""}
                  onChange={(event) => {
                    updateAvailability({ startTime: event.target.value });
                    clearError("availability");
                  }}
                  required
                />
              </Field>
              <Field label="종료 가능 시간" htmlFor="end-time">
                <input
                  id="end-time"
                  name="endTime"
                  type="time"
                  className={inputClassName}
                  value={availability?.endTime ?? ""}
                  onChange={(event) => {
                    updateAvailability({ endTime: event.target.value });
                    clearError("availability");
                  }}
                  required
                />
              </Field>
            </div>
            <FieldError id="availability-error" message={formErrors.availability} />
            <p className="mt-3 text-xs leading-5 text-slate-400">
              모든 시간은 한국 표준시(Asia/Seoul) 기준입니다.
            </p>
          </FormSection>

          <FormSection title="파티 경험">
            <div className="grid gap-4">
              <Field label="보스 경험 요약" htmlFor="experience-summary" error={formErrors.experienceSummary}>
                <textarea
                  id="experience-summary"
                  name="experienceSummary"
                  className={inputClassName}
                  maxLength={280}
                  rows={4}
                  value={draft.experienceSummary ?? ""}
                  onChange={(event) => {
                    updateDraft({ experienceSummary: event.target.value });
                    clearError("experienceSummary");
                  }}
                  aria-describedby={formErrors.experienceSummary ? "experience-summary-error" : undefined}
                  aria-invalid={Boolean(formErrors.experienceSummary)}
                />
              </Field>
              <Field label="어필 포인트" htmlFor="role-summary" error={formErrors.roleSummary}>
                <textarea
                  id="role-summary"
                  name="roleSummary"
                  className={inputClassName}
                  maxLength={220}
                  rows={3}
                  value={draft.roleSummary ?? ""}
                  onChange={(event) => {
                    updateDraft({ roleSummary: event.target.value });
                    clearError("roleSummary");
                  }}
                  aria-describedby={formErrors.roleSummary ? "role-summary-error" : undefined}
                  aria-invalid={Boolean(formErrors.roleSummary)}
                />
              </Field>
            </div>
          </FormSection>

          <FormSection title="희망 조건">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="음성 채팅" htmlFor="voice-chat">
                <select
                  id="voice-chat"
                  name="voiceChat"
                  className={inputClassName}
                  value={draft.voiceChat}
                  onChange={(event) => {
                    const option = findOption(voiceChatOptions, event.target.value);
                    if (option) {
                      updateDraft({ voiceChat: option.value });
                    }
                  }}
                >
                  {voiceChatOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="분배 방식" htmlFor="loot-policy" error={formErrors.lootPolicy}>
                <input
                  id="loot-policy"
                  name="lootPolicy"
                  autoComplete="off"
                  className={inputClassName}
                  maxLength={80}
                  value={draft.lootPolicy ?? ""}
                  onChange={(event) => {
                    updateDraft({ lootPolicy: event.target.value });
                    clearError("lootPolicy");
                  }}
                  aria-describedby={formErrors.lootPolicy ? "loot-policy-error" : undefined}
                  aria-invalid={Boolean(formErrors.lootPolicy)}
                />
              </Field>
            </div>
          </FormSection>

          <FormSection title="공개 범위">
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[#d9cdbd] bg-[#fffefa] p-3 text-sm text-[#52606d]">
              <input
                className="mt-0.5 h-4 w-4 rounded border-[#bfae99] bg-white text-[#a44640] focus:ring-[#a44640]"
                type="checkbox"
                checked={Boolean(draft.contact)}
                onChange={handleContactEnabled}
              />
              <span>
                <span className="block font-semibold">연락 방법 추가</span>
                <span className="mt-1 block leading-5 text-slate-400">
                  전화번호, 실명, 주소는 입력하지 마세요.
                </span>
              </span>
            </label>

            {draft.contact ? (
              <div className="mt-4 grid gap-4 sm:grid-cols-[180px_1fr]">
                <Field label="연락 방법 종류" htmlFor="contact-type">
                  <select
                    id="contact-type"
                    name="contactType"
                    className={inputClassName}
                    value={draft.contact.type}
                    onChange={(event) => {
                      const option = findOption(contactTypeOptions, event.target.value);
                      if (option && draft.contact) {
                        updateDraft({ contact: { ...draft.contact, type: option.value } });
                      }
                    }}
                  >
                    {contactTypeOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="연락 방법(선택)" htmlFor="contact-value" error={formErrors.contact}>
                  <input
                    id="contact-value"
                    name="contactValue"
                    autoComplete="off"
                    className={inputClassName}
                    maxLength={80}
                    value={draft.contact.value}
                    onChange={(event) => {
                      if (draft.contact) {
                        updateDraft({ contact: { ...draft.contact, value: event.target.value } });
                        clearError("contact");
                      }
                    }}
                    aria-describedby={formErrors.contact ? "contact-value-error" : undefined}
                    aria-invalid={Boolean(formErrors.contact)}
                  />
                </Field>
              </div>
            ) : null}

            {draft.contact ? (
              <label className="mt-4 flex cursor-pointer items-start gap-3 text-sm text-[#52606d]">
                <input
                  className="mt-0.5 h-4 w-4 rounded border-[#bfae99] bg-white text-[#a44640] focus:ring-[#a44640]"
                  type="checkbox"
                  checked={draft.contact.isPublic}
                  onChange={(event) => {
                    if (draft.contact) {
                      updateDraft({ contact: { ...draft.contact, isPublic: event.target.checked } });
                    }
                  }}
                />
                <span>
                  <span className="block font-semibold">연락 방법을 공개 페이지에 표시합니다.</span>
                  <span className="mt-1 block leading-5 text-slate-400">
                    선택하지 않으면 연락 방법은 게시되지 않습니다.
                  </span>
                </span>
              </label>
            ) : null}
          </FormSection>

          {formErrors.form ? (
            <p
              className="rounded-xl border border-rose-800/35 bg-rose-50 px-3 py-2 text-sm leading-6 text-rose-950"
              role="alert"
            >
              {formErrors.form}
            </p>
          ) : null}
          <button
            className="ui-action flex min-h-12 w-full items-center justify-center rounded-xl px-5 py-3 text-base font-bold transition focus:outline-none disabled:cursor-not-allowed disabled:opacity-45"
            type="submit"
            disabled={!profile || resolveState === "loading" || submitting}
          >
            {submitting
              ? editSlug
                ? "수정하는 중…"
                : "게시하는 중…"
              : editSlug
                ? "메력서 수정하기"
                : "메력서 게시하기"}
          </button>
        </form>

        <aside className="lg:sticky lg:top-6" aria-label="메력서 미리보기">
          <p className="mb-3 text-sm font-bold text-[#202a36]">메력서 미리보기</p>
          <ResumePreview profile={profile} draft={draft} mode={mode ?? undefined} />
        </aside>
      </div>
    </div>
  );
}

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  const number = formSectionNumbers[title];

  return (
    <section className="resume-section-rule ui-panel rounded-xl p-5 sm:p-6">
      <div className="flex items-center gap-3 pl-3">
        {number ? (
          <span className="text-xs font-black tracking-[0.14em] text-[#a44640]">{number}</span>
        ) : null}
        <h2 className="text-lg font-bold tracking-tight text-[#202a36]">{title}</h2>
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Field({
  label,
  htmlFor,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="text-sm font-semibold text-[#202a36]" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
      <FieldError id={`${htmlFor}-error`} message={error} />
    </div>
  );
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) {
    return null;
  }

  return (
    <p id={id} className="mt-2 text-sm leading-5 text-rose-800" role="alert">
      {message}
    </p>
  );
}

function CharacterDetail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[#d9cdbd] bg-[#fffefa] p-3">
      <dt className="text-xs text-[#687380]">{label}</dt>
      <dd className="mt-1 break-words font-semibold text-[#202a36]">{value}</dd>
    </div>
  );
}
