/**
 * 지평선·전파 수평선 거리 계산 (순수 함수, 평탄한 지형·장애물 없음 가정).
 *
 * 기하학적 수평선 d = √(2·R·h),  전파 수평선은 표준 대기 굴절을 반영한 유효 지구 반경 k·R (k = 4/3).
 * 지평선까지 거리를 높이 h(m)로 쓰면 d[km] ≈ 3.57·√h (기하) / 4.12·√h (전파).
 * 조종자 높이 h1 과 드론 높이 h2 가 서로 보이는 최대 거리는 두 수평선 거리의 합이다.
 * 지형 기복, 건물, 나무, 시력과 기체 크기에 따른 육안 식별 한계는 반영하지 않는다.
 */

export const EARTH_RADIUS_M = 6371000;
export const STANDARD_K = 4 / 3;
export const FT_PER_M = 3.280839895;
export const KM_PER_MILE = 1.609344;

/** 높이 h(m)에서 보이는 수평선까지 거리(km). k=1 이면 기하학적, 4/3 이면 전파 수평선. */
export function horizonKm(heightM: number, k = 1): number {
  if (!(heightM > 0)) return 0;
  return Math.sqrt(2 * k * EARTH_RADIUS_M * heightM) / 1000;
}

/** 두 지점(높이 h1, h2)이 직선으로 이어지는 최대 거리(km) */
export function maxLinkKm(h1M: number, h2M: number, k = 1): number {
  return horizonKm(h1M, k) + horizonKm(h2M, k);
}

/** 조종자 높이가 주어졌을 때 목표 거리(km)에 닿기 위해 필요한 드론 높이(m) */
export function requiredAltitudeM(distanceKm: number, pilotHeightM: number, k = 1): number {
  const remaining = distanceKm - horizonKm(pilotHeightM, k);
  if (remaining <= 0) return 0;
  const perSqrtM = Math.sqrt(2 * k * EARTH_RADIUS_M) / 1000;
  return Math.pow(remaining / perSqrtM, 2);
}
