/** 입력 문자열 파싱 도우미. 빈 값·잘못된 값은 NaN. */

/** "12", "12.5", "12,5" → 숫자 */
export function parseNumber(value: string): number {
  const trimmed = value.trim().replace(",", ".");
  if (trimmed === "") return NaN;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : NaN;
}

/** 셔터 스피드 입력: "1/250", "0.004", "2", "2s" → 초 */
export function parseShutter(value: string): number {
  const v = value.trim().toLowerCase().replace(/s$/, "").replace(",", ".");
  if (v === "") return NaN;
  if (v.includes("/")) {
    const [a, b] = v.split("/");
    const num = Number(a);
    const den = Number(b);
    if (!Number.isFinite(num) || !Number.isFinite(den) || den === 0) return NaN;
    return num / den;
  }
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
}
