/**
 * 대시보드 풍속 표시 단위(m/s) 변환·서식.
 *
 * 내부 계산·판정 기준(돌풍 20/35 km/h, 기종 공식 최대 풍속 대비 50%/70%)은
 * 모두 km/h 기준 그대로 유지하고, 화면에 보여 줄 때만 m/s로 바꾼다.
 * (2026-10-23 신규 — 사용자 요청: 대시보드 표시 단위를 m/s로 통일)
 */

export function kmhToMs(kmh: number): number {
  return kmh / 3.6;
}

/** km/h 값을 m/s로 바꿔 소수 첫째 자리까지(항상 1자리) 현지 표기로 돌려준다. 예: 20 → "5.6" */
export function formatWindMs(kmh: number, locale: string): string {
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(kmhToMs(kmh));
}

/** m/s 값을 소수 첫째 자리까지, 정수면 소수점 없이 돌려준다. 예: 12 → "12", 10.7 → "10.7" */
export function formatMs(ms: number, locale: string): string {
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  }).format(ms);
}
