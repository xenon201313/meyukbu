import { ProvenanceBadge } from "@/components/provenance-badge";

export interface MesoongiTemperatureSummary {
  temperatureCelsius: number | null;
  responseCount: number;
  baselineCelsius: number;
  minCelsius: number;
  maxCelsius: number;
}

interface MesoongiTemperaturePanelProps {
  summary: MesoongiTemperatureSummary;
  className?: string;
}

function finiteOr(value: number | null, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function formatTemperature(value: number): string {
  return `${value.toFixed(1)}℃`;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

/**
 * Shows an anonymous, aggregated temperature indicator on the public resume
 * page. It never renders an individual respondent or individual answer.
 */
export function MesoongiTemperaturePanel({ summary, className = "" }: MesoongiTemperaturePanelProps) {
  const minimum = finiteOr(summary.minCelsius, 30);
  const rawMaximum = finiteOr(summary.maxCelsius, 40);
  const maximum = rawMaximum > minimum ? rawMaximum : minimum + 10;
  const baseline = clamp(finiteOr(summary.baselineCelsius, 36.5), minimum, maximum);
  const hasResponses =
    summary.responseCount > 0 &&
    typeof summary.temperatureCelsius === "number" &&
    Number.isFinite(summary.temperatureCelsius);
  const displayedTemperature = clamp(finiteOr(summary.temperatureCelsius, baseline), minimum, maximum);
  const temperaturePosition = ((displayedTemperature - minimum) / (maximum - minimum)) * 100;
  const baselinePosition = ((baseline - minimum) / (maximum - minimum)) * 100;
  const temperatureTone = displayedTemperature >= baseline ? "#a44640" : "#4b728d";

  return (
    <section
      aria-labelledby="mesoongi-temperature-heading"
      className={`ui-panel rounded-xl p-5 sm:p-6 ${className}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="ui-kicker">ANONYMOUS SURVEY</p>
          <h2 id="mesoongi-temperature-heading" className="mt-1 text-lg font-bold text-[#202a36]">
            메붕이 온도
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-[#52606d]">
            초대 링크로 제출한 익명 설문을 집계한 참고 지표입니다. 개별 답변과 응답자 정보는 공개하지
            않습니다.
          </p>
        </div>
        <ProvenanceBadge provenance="USER_PROVIDED" />
      </div>

      <div
        data-testid="mesoongi-temperature-gauge"
        className="mt-5 rounded-2xl border border-[#d9cdbd] bg-[#fffefa] p-4 sm:p-5"
      >
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-bold text-[#687380]">
              {hasResponses ? "현재 메붕이 온도" : "기준 메붕이 온도"}
            </p>
            <p className="mt-1 text-3xl font-black tracking-tight text-[#202a36]">
              {formatTemperature(displayedTemperature)}
            </p>
          </div>
          <p className="rounded-full border border-[#d9cdbd] bg-[#f6f2ea] px-3 py-1.5 text-xs font-bold text-[#52606d]">
            {hasResponses ? `익명 설문 ${summary.responseCount}건` : "응답 대기 중"}
          </p>
        </div>

        <div
          className="relative mt-6 h-5"
          role="img"
          aria-label={`메붕이 온도 ${formatTemperature(displayedTemperature)}. 기준 온도 ${formatTemperature(baseline)}.`}
        >
          <div className="absolute inset-x-0 top-2 h-2 rounded-full bg-gradient-to-r from-[#91b8cc] via-[#f3d4a0] to-[#c85a52]" />
          <span
            aria-hidden
            className="absolute top-0 h-5 w-0.5 -translate-x-1/2 rounded-full bg-[#202a36]"
            style={{ left: `${baselinePosition}%` }}
          />
          <span
            aria-hidden
            className="absolute top-0 h-5 w-5 -translate-x-1/2 rounded-full border-2 border-[#fffefa] shadow-[0_2px_8px_rgba(32,42,54,0.35)]"
            style={{ left: `${temperaturePosition}%`, backgroundColor: temperatureTone }}
          />
        </div>

        <div className="mt-2 grid grid-cols-3 text-xs font-semibold text-[#687380]">
          <span>{formatTemperature(minimum)}</span>
          <span className="text-center">기준 {formatTemperature(baseline)}</span>
          <span className="text-right">{formatTemperature(maximum)}</span>
        </div>
      </div>

      <aside className="mt-5 rounded-xl border border-[#d9cdbd] bg-[#f6f2ea] px-4 py-3" role="note">
        <p className="text-sm font-semibold text-[#202a36]">메붕이 온도 안내</p>
        <p className="mt-1 text-xs leading-5 text-[#52606d]">
          36.5℃를 기준으로 보여 주며, 설문 응답이 쌓이면 집계값이 갱신됩니다. 이 지표는 공유 PNG와 공개
          이력서에 함께 표시됩니다.
        </p>
      </aside>
    </section>
  );
}
