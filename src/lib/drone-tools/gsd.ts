/**
 * 촬영 해상도(GSD, Ground Sample Distance) 계산 (순수 함수).
 *
 * GSD = (촬영 고도 × 센서 가로 크기) / (초점거리 × 이미지 가로 픽셀)
 * 단위: 고도[m] × 센서[mm] / (초점거리[mm] × 픽셀) = m/픽셀 → ×100 = cm/픽셀.
 * 이미지의 세로 방향이 비행 방향이라고 가정하고(가로 방향이 진행 방향의 직각),
 * 촬영 간격과 비행 라인 간격을 겹침 비율에서 구한다.
 */

export type SensorPreset = { id: string; widthMm: number; heightMm: number };

/** 흔한 센서 규격의 대표 크기(mm). 제조사마다 조금씩 다를 수 있다. */
export const SENSOR_PRESETS: readonly SensorPreset[] = [
  { id: "1/2.3", widthMm: 6.17, heightMm: 4.55 },
  { id: "1", widthMm: 13.2, heightMm: 8.8 },
  { id: "4/3", widthMm: 17.3, heightMm: 13 },
  { id: "aps-c", widthMm: 23.5, heightMm: 15.6 },
  { id: "full", widthMm: 36, heightMm: 24 },
];

export const FEET_PER_METER = 3.280839895;
export const INCHES_PER_CM = 1 / 2.54;

export type GsdInput = {
  altitudeM: number;
  sensorWidthMm: number;
  focalMm: number;
  imageWidthPx: number;
};

/** 고도 → GSD(cm/px) */
export function gsdCmPerPx(i: GsdInput): number {
  return ((i.altitudeM * i.sensorWidthMm) / (i.focalMm * i.imageWidthPx)) * 100;
}

/** 목표 GSD(cm/px) → 필요한 고도(m) */
export function altitudeForGsd(gsdCm: number, i: Omit<GsdInput, "altitudeM">): number {
  return ((gsdCm / 100) * i.focalMm * i.imageWidthPx) / i.sensorWidthMm;
}

export type Footprint = { widthM: number; heightM: number; areaM2: number };

export function footprint(gsdCm: number, imageWidthPx: number, imageHeightPx: number): Footprint {
  const widthM = (gsdCm / 100) * imageWidthPx;
  const heightM = (gsdCm / 100) * imageHeightPx;
  return { widthM, heightM, areaM2: widthM * heightM };
}

export type Spacing = {
  /** 연속 사진 사이 거리(m) — 진행 방향 겹침 기준 */
  photoDistanceM: number;
  /** 인접 비행 라인 사이 거리(m) — 옆 겹침 기준 */
  lineSpacingM: number;
  /** 속도가 주어졌을 때 촬영 간격(초) */
  intervalSeconds: number | null;
};

export function spacing(fp: Footprint, frontOverlapPct: number, sideOverlapPct: number, speedMps?: number): Spacing {
  const photoDistanceM = fp.heightM * (1 - frontOverlapPct / 100);
  const lineSpacingM = fp.widthM * (1 - sideOverlapPct / 100);
  return {
    photoDistanceM,
    lineSpacingM,
    intervalSeconds: speedMps && speedMps > 0 ? photoDistanceM / speedMps : null,
  };
}
