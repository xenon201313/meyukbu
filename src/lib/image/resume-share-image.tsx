/* eslint-disable @next/next/no-img-element */

import {
  partySizeLabel,
  partyTypeLabels,
  roleLabels,
  targetBossCadenceLabels,
  voiceChatLabels,
} from "@/domain/resume";
import type { PublicMesoongiTemperatureSummary } from "@/domain/mesoongi-temperature-survey";
import { formatNumericDisplay } from "@/lib/format";
import { formatResumeAvailability } from "@/lib/resume-presentation";
import type { PublicResumeView } from "@/server/services/public-view";

interface ResumeShareImageProps {
  resume: PublicResumeView;
  temperatureSummary: PublicMesoongiTemperatureSummary;
  qrDataUri: string;
  canonicalUrl: string;
  avatarDataUri: string | null;
  bossArtworkDataUri: string | null;
}

const paper = "#fffefa";
const paperShade = "#f6f2ea";
const paperBorder = "#cec5b7";
const rule = "#ddd5c8";
const documentInk = "#202a36";
const mutedInk = "#5e6b78";
const accent = "#a44640";

function initials(name: string): string {
  return name.slice(0, 2).toUpperCase();
}

/** Keeps one fixed PNG row readable even when a user-entered description is long. */
function compactText(value: string | undefined, limit: number): string {
  const normalized = value?.replace(/\s+/gu, " ").trim() ?? "";
  if (!normalized) {
    return "미입력";
  }
  return normalized.length > limit ? `${normalized.slice(0, limit - 1)}…` : normalized;
}

function formatBossMultiplierPercent(value: string | undefined): string {
  return value ? `${formatNumericDisplay(value)}%` : "미입력";
}

function formatAvailability(resume: PublicResumeView): string {
  return formatResumeAvailability(resume.version.draft.availability, resume.version.draft.availabilityMode);
}

function SourceBadge({ label }: { label: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        flexShrink: 0,
        boxSizing: "border-box",
        border: "1px solid #dac99f",
        borderRadius: 999,
        background: "#fff7df",
        color: "#78541b",
        fontSize: 13,
        fontWeight: 700,
        lineHeight: 1,
        padding: "6px 9px",
      }}
    >
      {label}
    </div>
  );
}

function SectionHeading({ number, title, source }: { number: string; title: string; source: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexShrink: 0,
        height: 28,
        boxSizing: "border-box",
        borderBottom: `1px solid ${rule}`,
        paddingBottom: 7,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ display: "flex", color: accent, fontSize: 15, fontWeight: 700, letterSpacing: 1.2 }}>
          {number}
        </div>
        <div style={{ display: "flex", color: documentInk, fontSize: 19, fontWeight: 700 }}>{title}</div>
      </div>
      <SourceBadge label={source} />
    </div>
  );
}

function TableRow({
  label,
  value,
  height = 50,
  last = false,
  valueLimit = 76,
}: {
  label: string;
  value: string | undefined;
  height?: number;
  last?: boolean;
  valueLimit?: number;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "stretch",
        flexShrink: 0,
        height,
        boxSizing: "border-box",
        borderBottom: last ? "0" : `1px solid ${rule}`,
      }}
    >
      <div
        style={{
          width: 134,
          display: "flex",
          alignItems: "center",
          flexShrink: 0,
          boxSizing: "border-box",
          background: paperShade,
          color: mutedInk,
          fontSize: 16,
          fontWeight: 700,
          padding: "0 14px",
        }}
      >
        {label}
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          minWidth: 0,
          flex: 1,
          boxSizing: "border-box",
          color: documentInk,
          fontSize: 18,
          lineHeight: 1.25,
          padding: "0 16px",
        }}
      >
        {compactText(value, valueLimit)}
      </div>
    </div>
  );
}

function SplitTableRow({
  leftLabel,
  leftValue,
  rightLabel,
  rightValue,
}: {
  leftLabel: string;
  leftValue: string;
  rightLabel: string;
  rightValue: string;
}) {
  return (
    <div style={{ display: "flex", flexShrink: 0, height: 56, boxSizing: "border-box" }}>
      <div
        style={{
          display: "flex",
          flex: 1,
          minWidth: 0,
          boxSizing: "border-box",
          borderRight: `1px solid ${rule}`,
        }}
      >
        <div
          style={{
            width: 90,
            display: "flex",
            alignItems: "center",
            flexShrink: 0,
            boxSizing: "border-box",
            background: paperShade,
            color: mutedInk,
            fontSize: 15,
            fontWeight: 700,
            padding: "0 12px",
          }}
        >
          {leftLabel}
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            minWidth: 0,
            flex: 1,
            boxSizing: "border-box",
            color: documentInk,
            fontSize: 18,
            fontWeight: 700,
            padding: "0 14px",
          }}
        >
          {compactText(leftValue, 24)}
        </div>
      </div>
      <div style={{ display: "flex", flex: 1, minWidth: 0, boxSizing: "border-box" }}>
        <div
          style={{
            width: 104,
            display: "flex",
            alignItems: "center",
            flexShrink: 0,
            boxSizing: "border-box",
            background: paperShade,
            color: mutedInk,
            fontSize: 15,
            fontWeight: 700,
            padding: "0 12px",
          }}
        >
          {rightLabel}
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            minWidth: 0,
            flex: 1,
            boxSizing: "border-box",
            color: documentInk,
            fontSize: 18,
            fontWeight: 700,
            padding: "0 14px",
          }}
        >
          {compactText(rightValue, 24)}
        </div>
      </div>
    </div>
  );
}

function MetricCell({ label, value, last = false }: { label: string; value: string; last?: boolean }) {
  return (
    <div
      style={{
        display: "flex",
        flex: 1,
        minWidth: 0,
        flexDirection: "column",
        justifyContent: "center",
        boxSizing: "border-box",
        borderRight: last ? "0" : `1px solid ${rule}`,
        padding: "0 20px",
      }}
    >
      <div style={{ display: "flex", color: mutedInk, fontSize: 16, fontWeight: 700 }}>{label}</div>
      <div
        style={{
          display: "flex",
          color: documentInk,
          fontSize: 30,
          fontWeight: 700,
          lineHeight: 1.15,
          marginTop: 6,
        }}
      >
        {value}
      </div>
    </div>
  );
}

/**
 * Compact, aggregate-only temperature indicator for the share PNG. It never
 * renders a respondent or any individual survey answer.
 */
function TemperatureMetricCell({
  summary,
  last = false,
}: {
  summary: PublicMesoongiTemperatureSummary;
  last?: boolean;
}) {
  const minimum = summary.minCelsius;
  const maximum = summary.maxCelsius > minimum ? summary.maxCelsius : minimum + 1;
  const baseline = Math.min(maximum, Math.max(minimum, summary.baselineCelsius));
  const temperature = Math.min(maximum, Math.max(minimum, summary.temperatureCelsius));
  const position = ((temperature - minimum) / (maximum - minimum)) * 100;
  const baselinePosition = ((baseline - minimum) / (maximum - minimum)) * 100;
  const tone = temperature >= baseline ? accent : "#4b728d";

  return (
    <div
      style={{
        display: "flex",
        flex: 1,
        minWidth: 0,
        flexDirection: "column",
        justifyContent: "center",
        boxSizing: "border-box",
        borderRight: last ? "0" : `1px solid ${rule}`,
        padding: "0 20px",
      }}
    >
      <div style={{ display: "flex", color: mutedInk, fontSize: 16, fontWeight: 700 }}>메숭이 체온</div>
      <div
        style={{
          display: "flex",
          color: documentInk,
          fontSize: 30,
          fontWeight: 700,
          lineHeight: 1.15,
          marginTop: 4,
        }}
      >
        {temperature.toFixed(1)}℃
      </div>
      <div style={{ display: "flex", color: mutedInk, fontSize: 12, marginTop: 3 }}>
        익명 설문 {summary.responseCount}건
      </div>
      <div
        style={{
          position: "relative",
          display: "flex",
          height: 8,
          flexShrink: 0,
          marginTop: 8,
          borderRadius: 999,
          background: "linear-gradient(90deg, #91b8cc 0%, #f3d4a0 50%, #c85a52 100%)",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: -2,
            left: `${baselinePosition}%`,
            display: "flex",
            width: 2,
            height: 12,
            marginLeft: -1,
            background: documentInk,
          }}
        />
        <div
          style={{
            position: "absolute",
            top: -3,
            left: `${position}%`,
            display: "flex",
            width: 14,
            height: 14,
            marginLeft: -7,
            border: `2px solid ${paper}`,
            borderRadius: 999,
            background: tone,
          }}
        />
      </div>
    </div>
  );
}

/**
 * The canonical 1080×1350 resume sheet. Resume fields come from one immutable
 * version; the aggregate-only temperature is intentionally read live per render.
 */
export function ResumeShareImage({
  resume,
  temperatureSummary,
  qrDataUri,
  canonicalUrl,
  avatarDataUri,
  bossArtworkDataUri,
}: ResumeShareImageProps) {
  const { profile } = resume.version.snapshot;
  const { draft } = resume.version;
  const targetBoss = draft.targetBossCadence
    ? `${targetBossCadenceLabels[draft.targetBossCadence]} · ${draft.targetBoss}`
    : draft.targetBoss;
  const referenceStat = draft.convertedStat ? formatNumericDisplay(draft.convertedStat) : "미입력";
  const bossMultiplier = formatBossMultiplierPercent(draft.bossMultiplierPercent);

  return (
    <div
      style={{
        width: "1080px",
        height: "1350px",
        display: "flex",
        boxSizing: "border-box",
        padding: "24px",
        background: "#e8e2d8",
        color: documentInk,
        fontFamily: "Nanum Barun Gothic",
      }}
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          boxSizing: "border-box",
          overflow: "hidden",
          border: `1px solid ${paperBorder}`,
          borderRadius: 10,
          background: paper,
        }}
      >
        <div
          style={{
            height: 94,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexShrink: 0,
            boxSizing: "border-box",
            borderBottom: "2px solid #283a48",
            padding: "18px 30px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 13 }}>
            <div style={{ width: 6, height: 44, display: "flex", flexShrink: 0, background: accent }} />
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <div
                style={{
                  display: "flex",
                  color: documentInk,
                  fontSize: 26,
                  fontWeight: 700,
                  letterSpacing: 0.6,
                }}
              >
                메력서 · RESUMAE
              </div>
              <div style={{ display: "flex", color: mutedInk, fontSize: 16 }}>파티 구직용 캐릭터 이력서</div>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 5 }}>
            <div
              style={{ display: "flex", color: accent, fontSize: 13, fontWeight: 700, letterSpacing: 1.6 }}
            >
              RESUME DOCUMENT
            </div>
            <div style={{ display: "flex", color: mutedInk, fontSize: 14 }}>
              v{resume.version.versionNumber}
            </div>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flex: 1,
            minHeight: 0,
            flexDirection: "column",
            boxSizing: "border-box",
            gap: 14,
            padding: "22px 30px 18px",
          }}
        >
          <div
            style={{
              height: 160,
              display: "flex",
              alignItems: "center",
              flexShrink: 0,
              boxSizing: "border-box",
              borderBottom: `1px solid ${rule}`,
              paddingBottom: 16,
              gap: 22,
            }}
          >
            {avatarDataUri ? (
              <div
                style={{
                  width: 142,
                  height: 142,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  overflow: "hidden",
                  boxSizing: "border-box",
                  border: `1px solid ${paperBorder}`,
                  background: paperShade,
                }}
              >
                <img
                  src={avatarDataUri}
                  alt={`${profile.characterName} 캐릭터 이미지`}
                  style={{
                    width: "100%",
                    height: "100%",
                    maxWidth: "none",
                    objectFit: "contain",
                    objectPosition: "center",
                    transform: "scale(1.55)",
                    transformOrigin: "center",
                  }}
                />
              </div>
            ) : (
              <div
                style={{
                  width: 142,
                  height: 142,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  boxSizing: "border-box",
                  border: `1px dashed ${paperBorder}`,
                  background: paperShade,
                  color: mutedInk,
                  fontSize: 30,
                  fontWeight: 700,
                }}
              >
                {initials(profile.characterName)}
              </div>
            )}
            <div style={{ display: "flex", minWidth: 0, flex: 1, flexDirection: "column", gap: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div
                  style={{
                    display: "flex",
                    color: documentInk,
                    fontSize: 40,
                    fontWeight: 700,
                    lineHeight: 1,
                  }}
                >
                  {compactText(profile.characterName, 24)}
                </div>
                <SourceBadge label="API 조회" />
              </div>
              <div style={{ display: "flex", color: mutedInk, fontSize: 22 }}>
                {[profile.worldName, profile.className, profile.level ? `Lv.${profile.level}` : null]
                  .filter(Boolean)
                  .join(" · ") || "기본 정보 조회 불가"}
              </div>
              <div style={{ display: "flex", color: mutedInk, fontSize: 20 }}>
                현재 길드: {compactText(profile.currentGuild ?? undefined, 40)}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", flexShrink: 0, gap: 8 }}>
            <SectionHeading number="01" title="지원 분야" source="작성 내용" />
            <div style={{ display: "flex", height: 170, gap: 14 }}>
              <div
                style={{
                  display: "flex",
                  flex: 1,
                  minWidth: 0,
                  flexDirection: "column",
                  boxSizing: "border-box",
                  border: `1px solid ${paperBorder}`,
                }}
              >
                <TableRow label="희망 보스" value={targetBoss} height={64} valueLimit={58} />
                <SplitTableRow
                  leftLabel="역할"
                  leftValue={roleLabels[draft.role]}
                  rightLabel="파티 유형"
                  rightValue={partyTypeLabels[draft.partyType]}
                />
                <TableRow
                  label="희망 인원"
                  value={partySizeLabel(draft.partySize)}
                  height={48}
                  last
                  valueLimit={20}
                />
              </div>
              <div
                style={{
                  width: 122,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  overflow: "hidden",
                  boxSizing: "border-box",
                  border: `1px solid ${paperBorder}`,
                  background: paperShade,
                  padding: 8,
                }}
              >
                {bossArtworkDataUri ? (
                  <img
                    src={bossArtworkDataUri}
                    alt={`${draft.targetBoss} 보스 일러스트`}
                    style={{ width: "100%", height: "100%", objectFit: "contain", objectPosition: "center" }}
                  />
                ) : (
                  <div style={{ display: "flex", color: mutedInk, fontSize: 13 }}>보스 이미지 없음</div>
                )}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", flexShrink: 0, gap: 8 }}>
            <SectionHeading number="02" title="환산 · 보스 배율" source="작성 내용" />
            <div
              style={{
                height: 116,
                display: "flex",
                flexShrink: 0,
                boxSizing: "border-box",
                border: `1px solid ${paperBorder}`,
              }}
            >
              <MetricCell label="환산" value={referenceStat} />
              <MetricCell label="보스 배율" value={bossMultiplier} />
              <TemperatureMetricCell summary={temperatureSummary} last />
            </div>
          </div>

          <div style={{ display: "flex", minHeight: 0, flexGrow: 1, flexDirection: "column", gap: 8 }}>
            <SectionHeading number="03" title="파티 경험 및 조건" source="작성 내용" />
            <div
              style={{
                display: "flex",
                minHeight: 0,
                flexGrow: 1,
                flexDirection: "column",
                boxSizing: "border-box",
                border: `1px solid ${paperBorder}`,
              }}
            >
              <TableRow label="보스 경험" value={draft.experienceSummary} height={62} valueLimit={82} />
              <TableRow label="어필 포인트" value={draft.roleSummary} height={62} valueLimit={82} />
              <TableRow label="가능 시간" value={formatAvailability(resume)} height={56} valueLimit={82} />
              <TableRow
                label="디스코드"
                value={voiceChatLabels[draft.voiceChat]}
                height={52}
                valueLimit={34}
              />
              <TableRow label="분배 방식" value={draft.lootPolicy} height={52} valueLimit={60} last />
              <div style={{ display: "flex", flexGrow: 1, boxSizing: "border-box", background: "#fffefb" }} />
            </div>
          </div>
        </div>

        <div
          style={{
            height: 144,
            display: "flex",
            alignItems: "center",
            flexShrink: 0,
            boxSizing: "border-box",
            gap: 18,
            borderTop: "2px solid #283a48",
            background: "#f8f5ef",
            color: mutedInk,
            padding: "16px 30px",
          }}
        >
          <img src={qrDataUri} alt="검증 페이지 QR" style={{ width: 92, height: 92, borderRadius: 2 }} />
          <div style={{ display: "flex", minWidth: 0, flex: 1, flexDirection: "column", gap: 5 }}>
            <div style={{ display: "flex", color: documentInk, fontSize: 15, fontWeight: 700 }}>
              기준 시각:{" "}
              {new Intl.DateTimeFormat("ko-KR", {
                dateStyle: "medium",
                timeStyle: "short",
                timeZone: "Asia/Seoul",
              }).format(new Date(resume.version.snapshot.fetchedAt))}
            </div>
            <div style={{ display: "flex", color: documentInk, fontSize: 14 }}>
              버전 v{resume.version.versionNumber} · {resume.version.contentHash.slice(0, 12)}
            </div>
            <div style={{ display: "flex", color: mutedInk, fontSize: 13 }}>
              {canonicalUrl.replace(/^https?:\/\//u, "")}
            </div>
            <div style={{ display: "flex", color: "#485a6a", fontSize: 13 }}>
              Data based on NEXON Open API
            </div>
            <div style={{ display: "flex", color: mutedInk, fontSize: 11 }}>
              본 서비스는 NEXON의 공식 제휴 또는 인증 서비스가 아닙니다.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
