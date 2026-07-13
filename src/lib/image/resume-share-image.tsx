/* eslint-disable @next/next/no-img-element */

import { partyTypeLabels, roleLabels, targetBossCadenceLabels } from "@/domain/resume";
import type { PublicResumeView } from "@/server/services/public-view";
import { formatNumericDisplay } from "@/lib/format";

interface ResumeShareImageProps {
  resume: PublicResumeView;
  qrDataUri: string;
  canonicalUrl: string;
  avatarDataUri: string | null;
  bossArtworkDataUri: string | null;
}

const cardBorder = "#d9cdbd";
const documentInk = "#202a36";
const mutedInk = "#52606d";
const accent = "#a44640";

function initials(name: string): string {
  return name.slice(0, 2).toUpperCase();
}

function compactText(value: string, limit: number): string {
  return value.length > limit ? `${value.slice(0, limit)}…` : value;
}

function formatBossMultiplierPercent(value: string): string {
  return `${formatNumericDisplay(value)}%`;
}

function formatAvailability(resume: PublicResumeView): string {
  const slots = resume.version.draft.availability;
  if (!slots.length) {
    return "입력 필요";
  }

  return slots
    .map((slot) => `${slot.days.join(" · ")} ${slot.startTime} - ${slot.endTime} (한국 표준시)`)
    .join(" / ");
}

function SourceBadge({ label = "작성 내용" }: { label?: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        border: "1px solid #e7bf65",
        borderRadius: 8,
        background: "#fff3ca",
        color: "#7c3f12",
        fontSize: 17,
        fontWeight: 700,
        lineHeight: 1,
        padding: "8px 12px",
      }}
    >
      {label}
    </div>
  );
}

function FieldCard({ label, value, wide = false }: { label: string; value: string; wide?: boolean }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        flex: wide ? 1 : undefined,
        minWidth: 0,
        gap: 10,
        border: `1px solid ${cardBorder}`,
        borderRadius: 18,
        background: "#fffefa",
        padding: "17px 20px",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <div style={{ display: "flex", color: "#687380", fontSize: 19 }}>{label}</div>
        <SourceBadge />
      </div>
      <div style={{ display: "flex", color: documentInk, fontSize: 26, fontWeight: 700, lineHeight: 1.2 }}>
        {value || "입력 필요"}
      </div>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: "flex",
        flex: 1,
        flexDirection: "column",
        justifyContent: "space-between",
        minWidth: 0,
        border: `1px solid ${cardBorder}`,
        borderRadius: 18,
        background: "#fffefa",
        padding: "18px 20px",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
        <div style={{ display: "flex", color: "#687380", fontSize: 19 }}>{label}</div>
        <SourceBadge />
      </div>
      <div style={{ display: "flex", color: documentInk, fontSize: 34, fontWeight: 700, lineHeight: 1.08 }}>
        {value || "입력 필요"}
      </div>
    </div>
  );
}

function DetailCard({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 8,
        border: "1px solid #d7b98a",
        borderRadius: 18,
        background: "#fbf2e3",
        padding: "14px 18px",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <div style={{ display: "flex", color: "#8a5a13", fontSize: 19, fontWeight: 700 }}>{label}</div>
        <SourceBadge />
      </div>
      <div style={{ display: "flex", color: "#5e4030", fontSize: 22, lineHeight: 1.25 }}>
        {compactText(value || "입력 필요", 78)}
      </div>
    </div>
  );
}

/**
 * The canonical 1080×1350 resume document. The public page displays this same
 * immutable PNG, so the visible card and downloaded file cannot drift apart.
 */
export function ResumeShareImage({
  resume,
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
  const hasReferenceMetrics = Boolean(draft.convertedStat || draft.bossMultiplierPercent);

  return (
    <div
      style={{
        width: "1080px",
        height: "1350px",
        display: "flex",
        padding: "28px",
        background: "#ece7de",
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
          overflow: "hidden",
          border: `1px solid ${cardBorder}`,
          borderRadius: 28,
          background: "#fffefa",
          boxShadow: "0 18px 42px rgba(74, 53, 35, 0.16)",
        }}
      >
        <div
          style={{
            minHeight: 98,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            gap: 8,
            padding: "18px 30px",
            borderBottom: "1px solid #314355",
            background: "#202d38",
          }}
        >
          <div style={{ display: "flex", color: "#8ff0dc", fontSize: 22, fontWeight: 700, letterSpacing: 3 }}>
            메력서 · RESUMAE
          </div>
          <div style={{ display: "flex", color: "#e5edf7", fontSize: 21 }}>파티 구직용 캐릭터 이력서</div>
        </div>

        <div
          style={{
            display: "flex",
            flex: 1,
            flexDirection: "column",
            gap: 15,
            padding: "24px 30px 18px",
          }}
        >
          <div style={{ display: "flex", minHeight: 158, alignItems: "center", gap: 24 }}>
            {avatarDataUri ? (
              <div
                style={{
                  width: 158,
                  height: 158,
                  display: "flex",
                  flexShrink: 0,
                  alignItems: "center",
                  justifyContent: "center",
                  overflow: "hidden",
                  border: `1px solid ${cardBorder}`,
                  borderRadius: 20,
                  background: "#f4efe5",
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
                  width: 158,
                  height: 158,
                  display: "flex",
                  flexShrink: 0,
                  alignItems: "center",
                  justifyContent: "center",
                  border: `1px dashed #bfae99`,
                  borderRadius: 20,
                  background: "#f4efe5",
                  color: "#687380",
                  fontSize: 32,
                  fontWeight: 700,
                }}
              >
                {initials(profile.characterName)}
              </div>
            )}
            <div style={{ display: "flex", minWidth: 0, flex: 1, flexDirection: "column", gap: 9 }}>
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
                  {profile.characterName}
                </div>
                <div
                  style={{
                    display: "flex",
                    border: "1px solid #92cdf0",
                    borderRadius: 8,
                    background: "#e7f5ff",
                    color: "#005e98",
                    fontSize: 17,
                    fontWeight: 700,
                    padding: "8px 12px",
                  }}
                >
                  API 조회
                </div>
              </div>
              <div style={{ display: "flex", color: mutedInk, fontSize: 23 }}>
                {[profile.worldName, profile.className, profile.level ? `Lv.${profile.level}` : null]
                  .filter(Boolean)
                  .join(" · ") || "기본 정보 조회 불가"}
              </div>
              <div style={{ display: "flex", color: "#687380", fontSize: 22 }}>
                현재 길드: {profile.currentGuild ?? "조회 불가"}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", color: accent, fontSize: 19, fontWeight: 700, letterSpacing: 1.4 }}>
            지원 분야
          </div>
          <FieldCard label="희망 보스" value={targetBoss} wide />
          <div style={{ display: "flex", gap: 14 }}>
            <FieldCard label="역할" value={roleLabels[draft.role]} wide />
            <FieldCard label="파티 유형" value={partyTypeLabels[draft.partyType]} wide />
          </div>

          {hasReferenceMetrics ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 13,
                border: "1px solid #d9867f",
                borderRadius: 20,
                background: "#f8e6e1",
                padding: "16px 18px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  color: "#7c2f2c",
                  fontSize: 19,
                  fontWeight: 700,
                  letterSpacing: 1.4,
                }}
              >
                환산 · 보스 배율
              </div>
              <div style={{ display: "flex", height: 126, gap: 14 }}>
                <MetricCard
                  label="환산"
                  value={draft.convertedStat ? formatNumericDisplay(draft.convertedStat) : "입력 필요"}
                />
                <MetricCard
                  label="보스 배율"
                  value={
                    draft.bossMultiplierPercent
                      ? formatBossMultiplierPercent(draft.bossMultiplierPercent)
                      : "입력 필요"
                  }
                />
                <div
                  style={{
                    width: 150,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    overflow: "hidden",
                    border: `1px solid ${cardBorder}`,
                    borderRadius: 18,
                    background: "#fffefa",
                    padding: 10,
                  }}
                >
                  {bossArtworkDataUri ? (
                    <img
                      src={bossArtworkDataUri}
                      alt={`${draft.targetBoss} 보스 일러스트`}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "contain",
                        objectPosition: "center",
                      }}
                    />
                  ) : (
                    <div style={{ display: "flex", color: "#687380", fontSize: 16 }}>보스 이미지 없음</div>
                  )}
                </div>
              </div>
            </div>
          ) : null}

          <div style={{ display: "flex", color: accent, fontSize: 19, fontWeight: 700, letterSpacing: 1.4 }}>
            파티 경험 및 가능 시간
          </div>
          <DetailCard label="보스 경험" value={draft.experienceSummary ?? "입력 필요"} />
          <DetailCard label="어필 포인트" value={draft.roleSummary ?? "입력 필요"} />
          <DetailCard label="가능 시간" value={formatAvailability(resume)} />
          <div style={{ display: "flex", gap: 14 }}>
            <FieldCard
              label="음성 채팅"
              value={
                draft.voiceChat === "AVAILABLE" ? "가능" : draft.voiceChat === "OPTIONAL" ? "선택" : "불가"
              }
              wide
            />
            <FieldCard label="분배 방식" value={draft.lootPolicy || "협의"} wide />
          </div>
        </div>

        <div
          style={{
            minHeight: 132,
            display: "flex",
            alignItems: "center",
            gap: 20,
            borderTop: "1px solid #314355",
            background: "#202d38",
            color: "#dbe8f4",
            padding: "15px 30px",
          }}
        >
          <img src={qrDataUri} alt="검증 페이지 QR" style={{ width: 94, height: 94, borderRadius: 4 }} />
          <div style={{ display: "flex", minWidth: 0, flex: 1, flexDirection: "column", gap: 5 }}>
            <div style={{ display: "flex", fontSize: 16 }}>
              기준 시각:{" "}
              {new Intl.DateTimeFormat("ko-KR", {
                dateStyle: "medium",
                timeStyle: "short",
                timeZone: "Asia/Seoul",
              }).format(new Date(resume.version.snapshot.fetchedAt))}
            </div>
            <div style={{ display: "flex", fontSize: 16 }}>
              버전 v{resume.version.versionNumber} · {resume.version.contentHash.slice(0, 12)}
            </div>
            <div style={{ display: "flex", color: "#9db0c2", fontSize: 15 }}>
              {canonicalUrl.replace(/^https?:\/\//, "")}
            </div>
            <div style={{ display: "flex", color: "#b7c6d4", fontSize: 15 }}>
              Data based on NEXON Open API
            </div>
            <div style={{ display: "flex", color: "#9db0c2", fontSize: 13 }}>
              본 서비스는 NEXON의 공식 제휴 또는 인증 서비스가 아닙니다.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
