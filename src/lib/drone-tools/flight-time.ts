/**
 * 드론 실비행 시간 추정 (순수 함수).
 *
 * 기준 시간(제조사 공칭 비행시간 또는 배터리 사양으로 계산한 호버링 시간)에
 * 비행 방식·바람·기온·배터리 상태 보정 계수를 곱한 뒤, 착륙 여유분을 뺀다.
 * 보정 계수는 제조사가 공표한 값이 아니라 계획용 가정치다(화면에 표로 공개).
 */

/** 구간별 선형 보간. points 는 x 오름차순. 범위 밖은 양 끝 값. */
export function interpolate(points: ReadonlyArray<readonly [number, number]>, x: number): number {
  if (x <= points[0][0]) return points[0][1];
  const last = points[points.length - 1];
  if (x >= last[0]) return last[1];
  for (let i = 1; i < points.length; i++) {
    const [x1, y1] = points[i];
    if (x <= x1) {
      const [x0, y0] = points[i - 1];
      return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
    }
  }
  return last[1];
}

/** 풍속(m/s) → 비행시간 계수. 3m/s 이하는 영향 미미로 본다. */
export const WIND_POINTS: ReadonlyArray<readonly [number, number]> = [
  [0, 1],
  [3, 1],
  [6, 0.9],
  [9, 0.8],
  [12, 0.65],
  [15, 0.5],
];

/** 기온(°C) → 비행시간 계수. 20°C 이상은 영향 없음으로 본다(고온 보정은 별도). */
export const TEMP_POINTS: ReadonlyArray<readonly [number, number]> = [
  [-10, 0.55],
  [-5, 0.65],
  [0, 0.75],
  [5, 0.85],
  [10, 0.92],
  [15, 0.97],
  [20, 1],
];

export type FlightStyle = "smooth" | "normal" | "sporty";

/** 공칭 시간 대비 실사용 비율. 일반 촬영 비행은 공칭 시간의 약 75% 안팎이라는 경험칙을 따른다. */
export const STYLE_FACTOR: Record<FlightStyle, number> = {
  smooth: 0.85,
  normal: 0.75,
  sporty: 0.6,
};

export function windFactor(windMps: number): number {
  return interpolate(WIND_POINTS, Math.max(0, windMps));
}

export function tempFactor(tempC: number): number {
  const cold = interpolate(TEMP_POINTS, tempC);
  // 35°C 초과는 완만하게 5% 감산(고온은 비행시간보다 안전 이슈가 크다).
  const hot = tempC > 35 ? 0.95 : 1;
  return cold * hot;
}

/** 배터리 사양으로 구하는 호버링 시간(분). 이상적인 값이라 보정 계수를 더 곱해야 한다. */
export function hoverMinutesFromSpec(opts: {
  capacityMah: number;
  volts: number;
  weightGrams: number;
  /** 무게 1kg당 소비 전력(W/kg) */
  wattsPerKg: number;
  /** 사용 가능한 방전 비율(0~1). 기본 0.8 */
  usableFraction?: number;
}): number {
  const energyWh = (opts.capacityMah / 1000) * opts.volts;
  const usable = opts.usableFraction ?? 0.8;
  const powerW = (opts.weightGrams / 1000) * opts.wattsPerKg;
  if (powerW <= 0) return 0;
  return ((energyWh * usable) / powerW) * 60;
}

export type FlightEstimateInput = {
  /** 기준 시간(분): 공칭 비행시간 또는 사양 기반 호버링 시간 */
  baseMinutes: number;
  windMps: number;
  tempC: number;
  style: FlightStyle;
  /** 배터리 상태(%) — 100이 새 배터리 */
  healthPercent: number;
  /** 착륙 여유 배터리(%) */
  reservePercent: number;
  /** 순항 속도(km/h) — 있으면 왕복 가능 반경도 계산 */
  cruiseKmh?: number;
};

export type FlightEstimate = {
  factors: { style: number; wind: number; temp: number; health: number };
  /** 보정 후 총 비행시간(분) */
  totalMinutes: number;
  /** 착륙 여유분을 뺀 사용 가능 시간(분) */
  usableMinutes: number;
  /** 왕복 비행이라면 반환 시작까지 나가도 되는 시간(분) */
  turnaroundMinutes: number;
  /** 순항 속도가 주어졌을 때 편도 반경(km) */
  outAndBackRadiusKm: number | null;
};

export function estimateFlight(input: FlightEstimateInput): FlightEstimate {
  const factors = {
    style: STYLE_FACTOR[input.style],
    wind: windFactor(input.windMps),
    temp: tempFactor(input.tempC),
    health: Math.min(1, Math.max(0.1, input.healthPercent / 100)),
  };
  const total = input.baseMinutes * factors.style * factors.wind * factors.temp * factors.health;
  const reserve = Math.min(0.9, Math.max(0, input.reservePercent / 100));
  const usable = total * (1 - reserve);
  const turnaround = usable / 2;
  const radius =
    input.cruiseKmh && input.cruiseKmh > 0 ? (turnaround / 60) * input.cruiseKmh : null;
  return {
    factors,
    totalMinutes: total,
    usableMinutes: usable,
    turnaroundMinutes: turnaround,
    outAndBackRadiusKm: radius,
  };
}
