import type { MesoongiTemperatureSummary } from "@/components/mesoongi-temperature-panel";

/** Default shown before a character receives any anonymous temperature survey. */
export const defaultMesoongiTemperatureSummary: MesoongiTemperatureSummary = {
  temperatureCelsius: 36.5,
  responseCount: 0,
  baselineCelsius: 36.5,
  minCelsius: 0,
  maxCelsius: 100,
};

interface MesoongiTemperatureResumeBlockProps {
  summary?: MesoongiTemperatureSummary;
}

function finiteOr(value: number | null | undefined, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function formatTemperature(value: number): string {
  return `${value.toFixed(1)}℃`;
}

/**
 * Compact, read-only temperature block intended to live inside the resume
 * document itself. It only exposes the anonymous aggregate, never a response.
 */
export function MesoongiTemperatureResumeBlock({
  summary = defaultMesoongiTemperatureSummary,
}: MesoongiTemperatureResumeBlockProps) {
  const minimum = finiteOr(summary.minCelsius, defaultMesoongiTemperatureSummary.minCelsius);
  const candidateMaximum = finiteOr(summary.maxCelsius, defaultMesoongiTemperatureSummary.maxCelsius);
  const maximum = candidateMaximum > minimum ? candidateMaximum : minimum + 1;
  const baseline = clamp(
    finiteOr(summary.baselineCelsius, defaultMesoongiTemperatureSummary.baselineCelsius),
    minimum,
    maximum,
  );
  const displayedTemperature = clamp(finiteOr(summary.temperatureCelsius, baseline), minimum, maximum);
  const hasResponses = summary.responseCount > 0;
  const temperaturePosition = ((displayedTemperature - minimum) / (maximum - minimum)) * 100;
  const baselinePosition = ((baseline - minimum) / (maximum - minimum)) * 100;
  const markerColor = displayedTemperature >= baseline ? "#a44640" : "#4b728d";
  const responseCopy = hasResponses ? `익명 설문 ${summary.responseCount}건 반영` : "익명 설문 응답 대기 중";

  return (
    <div data-testid="resume-temperature-gauge" className="border border-[#cec5b7] bg-[#fffefa] p-4 sm:p-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold text-[#5e6b78]">
            {hasResponses ? "현재 메붕이 온도" : "기본 메붕이 온도"}
          </p>
          <p className="mt-1 text-3xl font-black tracking-tight text-[#202a36]">
            {formatTemperature(displayedTemperature)}
          </p>
        </div>
        <p className="rounded-full border border-[#d9cdbd] bg-[#f6f2ea] px-3 py-1.5 text-xs font-bold text-[#52606d]">
          {responseCopy}
        </p>
      </div>

      <div
        className="relative mt-5 h-5"
        role="img"
        aria-label={`메붕이 온도 ${formatTemperature(displayedTemperature)}. 기본 온도 ${formatTemperature(baseline)}.`}
      >
        <div className="absolute inset-x-0 top-2 h-2 rounded-full bg-gradient-to-r from-[#91b8cc] via-[#f3d4a0] to-[#c85a52]" />
        <span
          aria-hidden="true"
          className="absolute top-0 h-5 w-0.5 -translate-x-1/2 rounded-full bg-[#202a36]"
          style={{ left: `${baselinePosition}%` }}
        />
        <span
          aria-hidden="true"
          className="absolute top-0 h-5 w-5 -translate-x-1/2 rounded-full border-2 border-[#fffefa] shadow-[0_2px_8px_rgba(32,42,54,0.35)]"
          style={{ left: `${temperaturePosition}%`, backgroundColor: markerColor }}
        />
      </div>

      <div className="mt-2 grid grid-cols-3 text-xs font-semibold text-[#687380]">
        <span>{formatTemperature(minimum)}</span>
        <span className="text-center">기본 {formatTemperature(baseline)}</span>
        <span className="text-right">{formatTemperature(maximum)}</span>
      </div>
      <p className="mt-3 text-xs leading-5 text-[#52606d]">
        파티원이 남긴 익명 설문의 누적값입니다. 개별 응답과 설문자 정보는 공개하지 않습니다.
      </p>
    </div>
  );
}
