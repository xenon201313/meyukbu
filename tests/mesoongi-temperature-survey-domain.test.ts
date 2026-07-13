import { describe, expect, it } from "vitest";

import {
  isMesoongiExperienceScore,
  isMesoongiPunctualityScore,
  mesoongiTemperatureBaselineCelsius,
  mesoongiTemperatureMaxCelsius,
  mesoongiTemperatureMinCelsius,
  surveyTemperatureDelta,
  toMesoongiTemperatureCelsius,
} from "@/domain/mesoongi-temperature-survey";

describe("메숭이 체온 설문 점수 규칙", () => {
  it("starts every character at 36.5°C and maps the three answers to a -5..+5 delta", () => {
    expect(mesoongiTemperatureBaselineCelsius).toBe(36.5);
    expect(surveyTemperatureDelta(-2, -2, -1)).toBe(-5);
    expect(surveyTemperatureDelta(0, 0, 1)).toBe(1);
    expect(surveyTemperatureDelta(2, 2, 1)).toBe(5);
  });

  it("accepts only the exposed five-point and punctuality score values", () => {
    expect([-2, -1, 0, 1, 2].every(isMesoongiExperienceScore)).toBe(true);
    expect([-3, 2.5, 3].some(isMesoongiExperienceScore)).toBe(false);
    expect(isMesoongiPunctualityScore(-1)).toBe(true);
    expect(isMesoongiPunctualityScore(1)).toBe(true);
    expect([0, -2, 2].some(isMesoongiPunctualityScore)).toBe(false);
  });

  it("converts aggregate deltas into a bounded public Celsius reading", () => {
    expect(toMesoongiTemperatureCelsius(0)).toBe(36.5);
    expect(toMesoongiTemperatureCelsius(5)).toBe(41.5);
    expect(toMesoongiTemperatureCelsius(-5)).toBe(31.5);
    expect(toMesoongiTemperatureCelsius(-10_000)).toBe(mesoongiTemperatureMinCelsius);
    expect(mesoongiTemperatureMaxCelsius).toBe(100);
    expect(toMesoongiTemperatureCelsius(10_000)).toBe(mesoongiTemperatureMaxCelsius);
  });
});
