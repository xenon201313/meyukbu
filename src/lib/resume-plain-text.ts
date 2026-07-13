import {
  partySizeLabel,
  partyTypeLabels,
  roleLabels,
  targetBossCadenceLabels,
  voiceChatLabels,
  type ResumeContact,
} from "@/domain/resume";
import { formatNumericDisplay } from "@/lib/format";
import { formatResumeAvailability } from "@/lib/resume-presentation";
import type { PublicResumeView } from "@/server/services/public-view";

const notProvided = "미입력";

function oneLine(value: string | null | undefined, fallback = notProvided): string {
  const normalized = value?.replace(/\s+/gu, " ").trim();
  return normalized || fallback;
}

function formatBossMultiplier(value: string | undefined): string {
  const normalized = oneLine(value);
  if (normalized === notProvided) {
    return notProvided;
  }

  return `${formatNumericDisplay(normalized.replace(/%$/u, ""))}%`;
}

function formatAvailability(resume: PublicResumeView): string {
  return formatResumeAvailability(resume.version.draft.availability, resume.version.draft.availabilityMode);
}

function formatContact(contact: ResumeContact | undefined): string | null {
  if (!contact?.isPublic) {
    return null;
  }

  const contactTypeLabel =
    contact.type === "DISCORD" ? "디스코드" : contact.type === "OPEN_CHAT" ? "오픈채팅" : "커뮤니티";
  return `${contactTypeLabel}: ${oneLine(contact.value)}`;
}

function formatKoreanDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "확인 불가";
  }

  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Seoul",
  }).format(date);
}

/**
 * Builds a stable, plain-text recruiting post from public resume data.
 * Private contacts and non-public author fields are deliberately excluded.
 */
export function formatResumePlainText(resume: PublicResumeView, canonicalUrl: string): string {
  const { draft, snapshot } = resume.version;
  const profile = snapshot.profile;
  const bossCadence = draft.targetBossCadence ? `${targetBossCadenceLabels[draft.targetBossCadence]} · ` : "";
  const publicContact = formatContact(draft.contact);

  const lines = [
    "[메력서 · RESUMAE]",
    `캐릭터: ${oneLine(profile.characterName, "조회 불가")}`,
    `월드 / 직업 / 레벨: ${oneLine(profile.worldName, "조회 불가")} · ${oneLine(profile.className, "조회 불가")} · ${
      profile.level === null ? "조회 불가" : `Lv.${profile.level}`
    }`,
    `현재 길드: ${oneLine(profile.currentGuild, "길드 없음")}`,
    "",
    "[지원 분야]",
    `희망 보스: ${bossCadence}${oneLine(draft.targetBoss)}`,
    `역할: ${roleLabels[draft.role]}`,
    `파티 유형: ${partyTypeLabels[draft.partyType]}`,
    `희망 인원: ${partySizeLabel(draft.partySize)}`,
    "",
    "[파티 조건]",
    `환산: ${oneLine(draft.convertedStat) === notProvided ? notProvided : formatNumericDisplay(oneLine(draft.convertedStat))}`,
    `보스 배율: ${formatBossMultiplier(draft.bossMultiplierPercent)}`,
    `가능 시간: ${formatAvailability(resume)}`,
    `디스코드: ${voiceChatLabels[draft.voiceChat]}`,
    `분배 방식: ${oneLine(draft.lootPolicy)}`,
    "",
    "[파티 경험]",
    `보스 경험: ${oneLine(draft.experienceSummary)}`,
    `어필 포인트: ${oneLine(draft.roleSummary)}`,
  ];

  if (publicContact) {
    lines.push("", "[공개 연락처]", publicContact);
  }

  lines.push(
    "",
    "[검증 정보]",
    `데이터 기준 시각: ${formatKoreanDateTime(snapshot.fetchedAt)} (Asia/Seoul)`,
    `검증 URL: ${canonicalUrl.trim()}`,
    "Data based on NEXON Open API",
  );

  return lines.join("\n");
}
