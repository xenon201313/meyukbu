import Link from "next/link";

import { ProvenanceBadge } from "@/components/provenance-badge";
import { mesoongiTemperatureTagLabels, type MesoongiTemperatureTag } from "@/domain/mesoongi-temperature";

export interface MesoongiTemperaturePublicFeedback {
  id: string;
  reviewer: {
    slug: string;
    characterName: string;
    worldName: string | null;
    className: string | null;
  };
  tags: readonly MesoongiTemperatureTag[];
  publishedAt: string;
}

interface MesoongiTemperaturePanelProps {
  feedbacks: readonly MesoongiTemperaturePublicFeedback[];
  className?: string;
}

function reviewerDescription(feedback: MesoongiTemperaturePublicFeedback) {
  return [feedback.reviewer.worldName, feedback.reviewer.className].filter(Boolean).join(" · ");
}

function formatPublishedAt(value: string): string {
  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Seoul",
  }).format(new Date(value));
}

/**
 * Renders tag-only records left by companions. It deliberately avoids a score,
 * average, ranking, or temperature gauge so the section is not a reputation score.
 */
export function MesoongiTemperaturePanel({ feedbacks, className = "" }: MesoongiTemperaturePanelProps) {
  return (
    <section
      aria-labelledby="mesoongi-temperature-heading"
      className={`ui-panel rounded-xl p-5 sm:p-6 ${className}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="ui-kicker">작성 내용 · 동행 기록</p>
          <h2 id="mesoongi-temperature-heading" className="mt-1 text-lg font-bold text-[#202a36]">
            메숭이 체온 · 동행 기록
          </h2>
          <p className="mt-2 text-sm leading-6 text-[#52606d]">
            함께 플레이한 모험가가 남긴 긍정적인 동행 태그입니다.
          </p>
        </div>
        <ProvenanceBadge provenance="USER_PROVIDED" />
      </div>

      {feedbacks.length ? (
        <ul className="mt-5 space-y-3" aria-label="동행 기록 목록">
          {feedbacks.map((feedback) => {
            const identity = reviewerDescription(feedback);

            return (
              <li
                key={feedback.id}
                className="rounded-xl border border-[#d9cdbd] bg-[#fffefa] p-4 shadow-[0_5px_14px_rgba(74,53,35,0.05)]"
              >
                <Link
                  href={`/r/${encodeURIComponent(feedback.reviewer.slug)}`}
                  className="group inline-flex max-w-full items-center gap-2 rounded-md text-left focus-visible:outline-none"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-bold text-[#202a36] group-hover:text-[#7c2f2c]">
                      {feedback.reviewer.characterName}
                    </span>
                    {identity ? (
                      <span className="mt-0.5 block text-sm text-[#687380]">{identity}</span>
                    ) : null}
                  </span>
                  <span aria-hidden className="text-sm font-bold text-[#a44640]">
                    메력서 보기 →
                  </span>
                  <span className="sr-only">{feedback.reviewer.characterName}님의 메력서 보기</span>
                </Link>

                <div
                  className="mt-3 flex flex-wrap gap-2"
                  aria-label={`${feedback.reviewer.characterName}님이 남긴 태그`}
                >
                  {feedback.tags.slice(0, 3).map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-[#a44640]/35 bg-[#f8e6e1] px-2.5 py-1 text-xs font-bold text-[#7c2f2c]"
                    >
                      {mesoongiTemperatureTagLabels[tag]}
                    </span>
                  ))}
                </div>
                <p className="mt-3 text-xs text-[#687380]">
                  기록 시각 · {formatPublishedAt(feedback.publishedAt)}
                </p>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="mt-5 rounded-xl border border-dashed border-[#bfae99] bg-[#fffefa]/70 px-4 py-6 text-center">
          <p className="font-semibold text-[#202a36]">아직 남겨진 동행 기록이 없습니다.</p>
          <p className="mt-2 text-sm leading-6 text-[#687380]">
            함께한 파티원에게 동행 기록 초대 링크를 전달할 수 있습니다.
          </p>
        </div>
      )}

      <aside className="mt-5 rounded-xl border border-[#d9cdbd] bg-[#f6f2ea] px-4 py-3" role="note">
        <p className="text-sm font-semibold text-[#202a36]">작성 내용 안내</p>
        <p className="mt-1 text-xs leading-5 text-[#52606d]">
          이 기록은 함께한 사람이 직접 선택한 태그입니다. 서비스 또는 NEXON의 보증, 인증, 공식 평가는
          아닙니다.
        </p>
      </aside>
    </section>
  );
}
