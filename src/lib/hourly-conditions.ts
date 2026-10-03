/**
 * 24시간 비행 조건 타임라인용 순수 계산 함수 모음(서버·클라이언트 공용).
 *
 * 2026-10-03 신규. 돌풍·강수·가시거리만으로 시간대별 판정을 만든다. Kp 지수는
 * 시간별 예보가 아니라 현재값만 있으므로 여기에는 반영하지 않는다(화면에 따로
 * 안내). 공역·법규는 이 판정과 무관하다.
 */
import { windRiskLevel, type FlightVerdict } from "@/lib/weather";
import {
  modelWindVerdict,
  type DroneModel,
} from "@/lib/drone-models";

export type HourlyCondition = {
  /** 지역 현지 시각 ISO(타임존 표기 없음), 예: "2026-10-03T14:00" */
  time: string;
  windGustKmh: number;
  windSpeedKmh: number;
  precipitationMm: number;
  visibilityM: number;
  isDay: boolean;
};

const PRECIP_CAUTION_MM = 0.1;
const PRECIP_NO_FLY_MM = 0.5;
const VISIBILITY_CAUTION_M = 5000;
const VISIBILITY_NO_FLY_M = 1000;

const SEVERITY: Record<FlightVerdict, number> = {
  good: 0,
  caution: 1,
  "no-fly": 2,
};

export function worseVerdict(a: FlightVerdict, b: FlightVerdict): FlightVerdict {
  return SEVERITY[a] >= SEVERITY[b] ? a : b;
}

/** 돌풍·강수·가시거리 기준의 일반 판정(기종 무관). */
export function hourlyBaseVerdict(h: HourlyCondition): FlightVerdict {
  const wind = windRiskLevel(h.windGustKmh);
  let verdict: FlightVerdict =
    wind === "high" ? "no-fly" : wind === "moderate" ? "caution" : "good";

  if (h.precipitationMm >= PRECIP_NO_FLY_MM) {
    verdict = worseVerdict(verdict, "no-fly");
  } else if (h.precipitationMm >= PRECIP_CAUTION_MM) {
    verdict = worseVerdict(verdict, "caution");
  }

  if (h.visibilityM < VISIBILITY_NO_FLY_M) {
    verdict = worseVerdict(verdict, "no-fly");
  } else if (h.visibilityM < VISIBILITY_CAUTION_M) {
    verdict = worseVerdict(verdict, "caution");
  }

  return verdict;
}

/** 기종을 고르면 기종 기준 돌풍 판정과 일반 판정 중 더 나쁜 쪽을 쓴다. */
export function hourlyVerdict(
  h: HourlyCondition,
  model: DroneModel | null,
): FlightVerdict {
  const base = hourlyBaseVerdict(h);
  if (!model) return base;
  return worseVerdict(base, modelWindVerdict(model, h.windGustKmh));
}

export type BestWindow = {
  /** "good"면 양호 시간대, "caution"이면 양호가 없어 주의 수준 중 가장 긴 구간 */
  level: "good" | "caution";
  startIndex: number;
  /** 마지막 시간대 인덱스(포함) */
  endIndex: number;
  minGustKmh: number;
  maxGustKmh: number;
};

function longestRun(
  verdicts: FlightVerdict[],
  accept: (v: FlightVerdict) => boolean,
): { start: number; end: number } | null {
  let best: { start: number; end: number } | null = null;
  let start = -1;
  for (let i = 0; i <= verdicts.length; i++) {
    const ok = i < verdicts.length && accept(verdicts[i]);
    if (ok && start === -1) start = i;
    if (!ok && start !== -1) {
      const run = { start, end: i - 1 };
      if (!best || run.end - run.start > best.end - best.start) best = run;
      start = -1;
    }
  }
  return best;
}

/**
 * 가장 긴 "양호" 연속 구간(동률이면 이른 쪽)을 찾는다. 양호가 하나도 없으면
 * "주의" 이하(비권장 제외) 중 가장 긴 구간을 대신 돌려주고, 그것도 없으면 null.
 */
export function findBestWindow(
  hours: HourlyCondition[],
  model: DroneModel | null,
): BestWindow | null {
  const verdicts = hours.map((h) => hourlyVerdict(h, model));

  const goodRun = longestRun(verdicts, (v) => v === "good");
  const run = goodRun ?? longestRun(verdicts, (v) => v === "caution");
  if (!run) return null;

  const slice = hours.slice(run.start, run.end + 1);
  return {
    level: goodRun ? "good" : "caution",
    startIndex: run.start,
    endIndex: run.end,
    minGustKmh: Math.min(...slice.map((h) => h.windGustKmh)),
    maxGustKmh: Math.max(...slice.map((h) => h.windGustKmh)),
  };
}
