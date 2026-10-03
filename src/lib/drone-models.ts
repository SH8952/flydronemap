/**
 * 기종별 제조사 공식 "최대 풍속 저항" 스펙과, 이를 기준으로 한 바람 판정.
 *
 * 2026-10-03 신규 — 경쟁 사이트 분석에서 나온 "내 기종 기준 비행 가능 판정" 기능.
 * 값은 모두 제조사 공식 스펙 페이지(dji.com, autelrobotics.com, skydio.com)에서
 * 2026-10-03에 직접 확인한 것만 넣었다. 확인하지 못한 기종은 넣지 않는다 —
 * 스펙이 바뀌거나 기종을 추가할 때는 반드시 공식 페이지를 다시 확인할 것.
 *
 * `maxWindMs`는 단일 기준값이다. 이륙/착륙과 비행 중 값이 다른 기종은 더 낮은
 * (보수적인) 값을 쓰고 `conservative: true`로 표시한다.
 */
import type { FlightVerdict } from "@/lib/weather";

export type DroneModel = {
  id: string;
  brand: "DJI" | "Autel" | "Skydio";
  name: string;
  /** 제조사 공식 최대 풍속 저항(m/s). 값이 둘이면 낮은 쪽. */
  maxWindMs: number;
  /** 이륙·착륙/비행 중 값이 달라 낮은 값을 쓴 경우 true. */
  conservative?: boolean;
};

export const DRONE_MODELS: readonly DroneModel[] = [
  { id: "dji-neo", brand: "DJI", name: "DJI Neo", maxWindMs: 8 },
  { id: "dji-mini-4k", brand: "DJI", name: "DJI Mini 4K", maxWindMs: 10.7 },
  { id: "dji-mini-3", brand: "DJI", name: "DJI Mini 3", maxWindMs: 10.7 },
  { id: "dji-mini-3-pro", brand: "DJI", name: "DJI Mini 3 Pro", maxWindMs: 10.7 },
  { id: "dji-mini-4-pro", brand: "DJI", name: "DJI Mini 4 Pro", maxWindMs: 10.7 },
  { id: "dji-mini-5-pro", brand: "DJI", name: "DJI Mini 5 Pro", maxWindMs: 12 },
  { id: "dji-air-2s", brand: "DJI", name: "DJI Air 2S", maxWindMs: 10.7 },
  { id: "dji-air-3", brand: "DJI", name: "DJI Air 3", maxWindMs: 12 },
  { id: "dji-air-3s", brand: "DJI", name: "DJI Air 3S", maxWindMs: 12 },
  { id: "dji-avata-2", brand: "DJI", name: "DJI Avata 2", maxWindMs: 10.7 },
  { id: "dji-mavic-3-classic", brand: "DJI", name: "DJI Mavic 3 Classic", maxWindMs: 12 },
  { id: "dji-mavic-3-pro", brand: "DJI", name: "DJI Mavic 3 Pro", maxWindMs: 12 },
  // 공식: 이륙/착륙 12 m/s, 비행 중 14 m/s → 보수적으로 12.
  { id: "dji-inspire-3", brand: "DJI", name: "DJI Inspire 3", maxWindMs: 12, conservative: true },
  // 공식: 이륙/착륙 10.7 m/s, 순항 12 m/s → 보수적으로 10.7.
  { id: "autel-evo-ii-pro-v3", brand: "Autel", name: "Autel EVO II Pro V3", maxWindMs: 10.7, conservative: true },
  { id: "autel-evo-iii", brand: "Autel", name: "Autel EVO III", maxWindMs: 12 },
  // 공식 표기는 "Max gust handling 12.8 m/s".
  { id: "skydio-x10", brand: "Skydio", name: "Skydio X10", maxWindMs: 12.8 },
];

export function getDroneModel(id: string | null | undefined): DroneModel | null {
  if (!id) return null;
  return DRONE_MODELS.find((m) => m.id === id) ?? null;
}

/** 공식 최대 풍속 대비 돌풍 비율에 따른 판정 경계. */
export const MODEL_CAUTION_RATIO = 0.5;
export const MODEL_NO_FLY_RATIO = 0.7;

export function msToKmh(ms: number): number {
  return ms * 3.6;
}

export function modelMaxWindKmh(model: DroneModel): number {
  return msToKmh(model.maxWindMs);
}

/** 공식 최대 풍속 대비 돌풍 비율(0~). */
export function modelWindRatio(model: DroneModel, windKmh: number): number {
  return windKmh / modelMaxWindKmh(model);
}

/**
 * 돌풍이 기종의 공식 최대 풍속에서 얼마나 되는지로 판정한다.
 * 50% 이상 주의, 70% 이상 비권장(사용자 결정, 2026-10-03). 기존 가이드가
 * 숙련자 상한을 60~70%로 안내하는 것보다 보수적이다.
 */
export function modelWindVerdict(
  model: DroneModel,
  windKmh: number,
): FlightVerdict {
  const ratio = modelWindRatio(model, windKmh);
  if (ratio >= MODEL_NO_FLY_RATIO) return "no-fly";
  if (ratio >= MODEL_CAUTION_RATIO) return "caution";
  return "good";
}
