/**
 * 배터리 용량(Wh) 환산과 항공기 반입 구분 (순수 함수).
 *
 * Wh = 전압(V) × 용량(Ah) = 전압(V) × 용량(mAh) / 1000  (FAA·IATA 공통 공식)
 * 구분 기준(승객용 안내, 2026년 확인):
 *  - 100 Wh 이하: 기내 반입 가능(예비 배터리는 기내 휴대만, 위탁 수하물 불가)
 *  - 100 Wh 초과 160 Wh 이하: 항공사 승인 필요, 예비 배터리는 1인당 2개까지
 *  - 160 Wh 초과: 여객기 반입 불가(화물 규정 대상)
 */

export type WhClass = "standard" | "approval" | "forbidden";

export const WH_LIMIT_STANDARD = 100;
export const WH_LIMIT_APPROVAL = 160;
/** 100~160Wh 예비 배터리의 1인당 최대 개수 */
export const APPROVAL_MAX_SPARES = 2;

/** mAh + 전압 → Wh */
export function whFromMah(mAh: number, volts: number): number {
  return (mAh / 1000) * volts;
}

/** 소수 둘째 자리까지 반올림 */
export function roundWh(wh: number): number {
  return Math.round(wh * 100) / 100;
}

export function classifyWh(wh: number): WhClass {
  // 표기값(예: 99.9Wh)을 그대로 비교하되 부동소수점 오차는 소수 셋째 자리에서 정리한다.
  const v = Math.round(wh * 1000) / 1000;
  if (v <= WH_LIMIT_STANDARD) return "standard";
  if (v <= WH_LIMIT_APPROVAL) return "approval";
  return "forbidden";
}

export type BatteryRow = {
  /** 개당 Wh */
  wh: number;
  qty: number;
};

export type BatterySummary = {
  rows: Array<BatteryRow & { cls: WhClass }>;
  totalWh: number;
  totalQty: number;
  /** 승인 필요 구간 배터리의 총 개수 */
  approvalQty: number;
  hasForbidden: boolean;
  /** 승인 필요 구간 배터리가 1인당 2개를 넘는가 */
  approvalOverLimit: boolean;
};

export function summarizeBatteries(rows: BatteryRow[]): BatterySummary {
  const classified = rows.map((r) => ({ ...r, cls: classifyWh(r.wh) }));
  const approvalQty = classified.filter((r) => r.cls === "approval").reduce((a, r) => a + r.qty, 0);
  return {
    rows: classified,
    totalWh: roundWh(classified.reduce((a, r) => a + r.wh * r.qty, 0)),
    totalQty: classified.reduce((a, r) => a + r.qty, 0),
    approvalQty,
    hasForbidden: classified.some((r) => r.cls === "forbidden"),
    approvalOverLimit: approvalQty > APPROVAL_MAX_SPARES,
  };
}
