/* eslint-disable @next/next/no-img-element */

import type { PublicResumeView } from "@/server/services/public-view";
import { roleLabels, targetBossCadenceLabels } from "@/domain/resume";
import { provenanceLabels } from "@/domain/provenance";
import { formatNumericDisplay } from "@/lib/format";

interface ResumeShareImageProps {
  resume: PublicResumeView;
  qrDataUri: string;
  canonicalUrl: string;
  avatarDataUri: string | null;
}

function initials(name: string): string {
  return name.slice(0, 2).toUpperCase();
}

function compactText(value: string, limit = 96): string {
  return value.length > limit ? `${value.slice(0, limit)}…` : value;
}

function formatBossMultiplierPercent(value: string): string {
  return `${formatNumericDisplay(value)}%`;
}

/** The 1080×1350 immutable card; it deliberately excludes edit tokens and private contact. */
export function ResumeShareImage({ resume, qrDataUri, canonicalUrl, avatarDataUri }: ResumeShareImageProps) {
  const { profile } = resume.version.snapshot;
  const { draft } = resume.version;
  const availability = draft.availability
    .map((slot) => `${slot.days.join("·")} ${slot.startTime}–${slot.endTime}`)
    .join(" / ");

  return (
    <div
      style={{
        width: "1080px",
        height: "1350px",
        display: "flex",
        flexDirection: "column",
        position: "relative",
        background: "#fffdf7",
        color: "#14213d",
        fontFamily: "Noto Sans KR",
        padding: "68px",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "38px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "16px", fontSize: 30, fontWeight: 700 }}>
          <div style={{ width: 18, height: 18, borderRadius: 999, background: "#f69b42" }} />
          메력서 · RESUMAE
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 24,
            color: resume.freshness === "fresh" ? "#157f5b" : "#aa5a0c",
          }}
        >
          {resume.freshness === "fresh"
            ? "최근 조회"
            : resume.freshness === "stale"
              ? "업데이트 확인 권장"
              : "갱신 필요"}
        </div>
      </div>

      <div style={{ display: "flex", gap: "30px", paddingBottom: "36px", borderBottom: "2px solid #e6dfd2" }}>
        {avatarDataUri ? (
          <div
            style={{
              display: "flex",
              width: 260,
              height: 260,
              overflow: "hidden",
              borderRadius: 32,
            }}
          >
            <img
              src={avatarDataUri}
              alt={`${profile.characterName} 캐릭터 이미지`}
              style={{
                width: "100%",
                height: "100%",
                maxWidth: "none",
                objectFit: "cover",
                objectPosition: "center",
                transform: "scale(1.9)",
                transformOrigin: "center",
              }}
            />
          </div>
        ) : (
          <div
            style={{
              display: "flex",
              width: 260,
              height: 260,
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 32,
              color: "#fffdf7",
              background: "linear-gradient(135deg, #183153, #5b7db1)",
              fontSize: 48,
              fontWeight: 800,
            }}
          >
            {initials(profile.characterName)}
          </div>
        )}
        <div style={{ display: "flex", flexDirection: "column", flex: 1, gap: 8 }}>
          <div style={{ display: "flex", fontSize: 56, fontWeight: 800, lineHeight: 1.1 }}>
            {profile.characterName}
          </div>
          <div style={{ display: "flex", fontSize: 28, color: "#52637a" }}>
            {[
              profile.worldName,
              profile.className,
              profile.level ? `Lv.${profile.level}` : null,
              profile.currentGuild ? `길드 ${profile.currentGuild}` : null,
            ]
              .filter(Boolean)
              .join(" · ") || "조회 불가"}
          </div>
          <div
            style={{ display: "flex", alignItems: "center", marginTop: 8, fontSize: 23, color: "#385a83" }}
          >
            API 조회
          </div>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "36px" }}>
        <div style={{ display: "flex", fontSize: 24, color: "#68788b", fontWeight: 700 }}>
          지원 분야 · 작성 내용
        </div>
        <div style={{ display: "flex", fontSize: 42, fontWeight: 800 }}>
          {draft.targetBossCadence ? `${targetBossCadenceLabels[draft.targetBossCadence]} · ` : ""}
          {draft.targetBoss} · {draft.difficulty}
        </div>
        <div style={{ display: "flex", fontSize: 30, color: "#385a83" }}>
          {roleLabels[draft.role]} ·{" "}
          {draft.partyType === "PROGRESSION"
            ? "트라이"
            : draft.partyType === "FIXED"
              ? "고정"
              : draft.partyType === "SEMI_FIXED"
                ? "반고정"
                : "용병"}
        </div>
      </div>

      {draft.convertedStat || draft.bossMultiplierPercent ? (
        <div
          style={{
            display: "flex",
            gap: 20,
            marginTop: "36px",
          }}
        >
          {draft.convertedStat ? (
            <div
              style={{
                display: "flex",
                flex: 1,
                flexDirection: "column",
                gap: 10,
                padding: "24px",
                borderRadius: 18,
                background: "#edf2f7",
              }}
            >
              <div style={{ display: "flex", fontSize: 24, color: "#68788b", fontWeight: 700 }}>
                환산 · 작성 내용
              </div>
              <div style={{ display: "flex", fontSize: 42, fontWeight: 800 }}>
                {formatNumericDisplay(draft.convertedStat)}
              </div>
            </div>
          ) : null}
          {draft.bossMultiplierPercent ? (
            <div
              style={{
                display: "flex",
                flex: 1,
                flexDirection: "column",
                gap: 10,
                padding: "24px",
                borderRadius: 18,
                background: "#edf2f7",
              }}
            >
              <div style={{ display: "flex", fontSize: 24, color: "#68788b", fontWeight: 700 }}>
                보스 배율 · 작성 내용
              </div>
              <div style={{ display: "flex", fontSize: 42, fontWeight: 800 }}>
                {formatBossMultiplierPercent(draft.bossMultiplierPercent)}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 10,
          marginTop: "34px",
          padding: "24px",
          background: "#fff4df",
          borderRadius: 18,
        }}
      >
        <div style={{ display: "flex", fontSize: 23, color: "#8a5a13", fontWeight: 700 }}>
          파티 경험 · 작성 내용
        </div>
        <div style={{ display: "flex", fontSize: 26 }}>
          {draft.experienceSummary || "작성자가 입력한 경험 요약이 없습니다."}
        </div>
        {draft.roleSummary ? (
          <div style={{ display: "flex", fontSize: 24, color: "#42536a" }}>
            어필 포인트: {compactText(draft.roleSummary)}
          </div>
        ) : null}
        <div style={{ display: "flex", fontSize: 24, color: "#42536a" }}>가능 시간: {availability}</div>
      </div>

      <div
        style={{
          display: "flex",
          marginTop: "auto",
          paddingTop: "30px",
          borderTop: "2px solid #e6dfd2",
          gap: "28px",
          alignItems: "center",
        }}
      >
        <img src={qrDataUri} alt="검증 페이지 QR" style={{ width: 164, height: 164 }} />
        <div style={{ display: "flex", flex: 1, flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", fontSize: 22, color: "#516278" }}>
            기준 시각:{" "}
            {new Intl.DateTimeFormat("ko-KR", {
              dateStyle: "medium",
              timeStyle: "short",
              timeZone: "Asia/Seoul",
            }).format(new Date(resume.version.snapshot.fetchedAt))}
          </div>
          <div style={{ display: "flex", fontSize: 22 }}>
            버전 v{resume.version.versionNumber} · {resume.version.contentHash.slice(0, 10)}
          </div>
          <div style={{ display: "flex", fontSize: 20, color: "#516278" }}>
            출처: {Object.values(provenanceLabels).join(" · ")}
          </div>
          <div style={{ display: "flex", fontSize: 19, color: "#516278" }}>
            {canonicalUrl.replace(/^https?:\/\//, "")}
          </div>
          <div style={{ display: "flex", fontSize: 19, color: "#516278" }}>Data based on NEXON Open API</div>
          <div style={{ display: "flex", fontSize: 17, color: "#69798d" }}>
            본 서비스는 NEXON의 공식 제휴 또는 인증 서비스가 아닙니다.
          </div>
        </div>
      </div>
      <div
        style={{
          display: "flex",
          position: "absolute",
          right: "68px",
          bottom: "30px",
          fontSize: 18,
          fontWeight: 700,
          color: "#385a83",
        }}
      >
        크로아/얀보 제작
      </div>
    </div>
  );
}
