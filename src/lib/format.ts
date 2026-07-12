/**
 * Parses a plain or comma-separated numeric value ("275095920", "178,420,000", 92.58)
 * into a number. Returns null for anything that is not purely numeric, such as "412%".
 */
export function parseNumericValue(value: string | number | null | undefined): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value !== "string") {
    return null;
  }
  const compact = value.replaceAll(",", "").trim();
  if (!/^-?\d+(\.\d+)?$/.test(compact)) {
    return null;
  }
  const parsed = Number(compact);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Adds thousands separators to purely numeric display values while leaving any
 * decimal digits exactly as the provider published them ("341.00" stays "341.00").
 * Non-numeric values such as "412%" or "레전드리" pass through unchanged.
 */
export function formatNumericDisplay(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") {
    return "조회 불가";
  }
  const text = String(value);
  const compact = text.replaceAll(",", "").trim();
  const match = /^(-?)(\d+)(\.\d+)?$/.exec(compact);
  if (!match) {
    return text;
  }
  const [, sign, integerPart, decimalPart] = match;
  const grouped = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${sign}${grouped}${decimalPart ?? ""}`;
}
