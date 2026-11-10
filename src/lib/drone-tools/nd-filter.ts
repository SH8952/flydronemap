/**
 * ND 필터 계산 (순수 함수 — 브라우저·서버 어디서든 동일하게 동작).
 *
 * 핵심 관계: ND 필터가 N스톱이면 빛이 2^N 배 줄어들고, 같은 밝기를 얻으려면
 * 셔터 시간이 2^N 배 길어져야 한다. 영상은 "180도 셔터 규칙"(셔터 시간 = 1 / (2 × fps))을
 * 기준으로 목표 셔터를 정한다.
 */

export type NdFilter = {
  /** 필터 이름(예: "ND16") */
  name: string;
  /** 줄여 주는 빛의 양(스톱) */
  stops: number;
};

/** 드론용 ND 필터로 흔히 쓰는 단계. ND1000 은 실제로 약 10스톱(2^10 = 1024). */
export const ND_FILTERS: readonly NdFilter[] = [
  { name: "ND4", stops: 2 },
  { name: "ND8", stops: 3 },
  { name: "ND16", stops: 4 },
  { name: "ND32", stops: 5 },
  { name: "ND64", stops: 6 },
  { name: "ND128", stops: 7 },
  { name: "ND256", stops: 8 },
  { name: "ND512", stops: 9 },
  { name: "ND1000", stops: 10 },
];

/** 셔터 각도(도)와 프레임레이트로 목표 셔터 시간(초)을 구한다. 180도 = 1/(2×fps). */
export function shutterFromFps(fps: number, angleDeg = 180): number {
  return angleDeg / (360 * fps);
}

/** 기준(필터 없음) 셔터에서 목표 셔터까지 필요한 스톱 수. 목표가 더 빠르면 0. */
export function stopsNeeded(baseSeconds: number, targetSeconds: number): number {
  if (!(baseSeconds > 0) || !(targetSeconds > 0)) return 0;
  return Math.max(0, Math.log2(targetSeconds / baseSeconds));
}

/** 필터를 끼웠을 때 같은 노출을 유지하는 셔터 시간(초). */
export function shutterWithStops(baseSeconds: number, stops: number): number {
  return baseSeconds * 2 ** stops;
}

/** 빛이 통과하는 비율(%). 예: 3스톱 → 12.5%. */
export function transmissionPercent(stops: number): number {
  return (1 / 2 ** stops) * 100;
}

export type NdSuggestion = {
  filter: NdFilter;
  /** 이 필터를 썼을 때의 셔터(초) */
  resultSeconds: number;
  /** 목표 셔터 대비 차이(스톱, +면 목표보다 느림 / -면 목표보다 빠름) */
  offsetStops: number;
};

export type NdRecommendation = {
  stops: number;
  /** 0.5스톱 미만이면 필터가 필요 없다고 본다. */
  needsFilter: boolean;
  /** 목표에 가장 가까운 단계 */
  best: NdSuggestion | null;
  /** 한 단계 약한 필터(없을 수 있음) */
  lighter: NdSuggestion | null;
  /** 한 단계 강한 필터(없을 수 있음) */
  stronger: NdSuggestion | null;
  /** 가장 강한 필터(ND1000)로도 모자랄 때 true */
  exceedsRange: boolean;
};

function suggest(filter: NdFilter, base: number, target: number): NdSuggestion {
  const resultSeconds = shutterWithStops(base, filter.stops);
  return { filter, resultSeconds, offsetStops: Math.log2(resultSeconds / target) };
}

export function recommendNd(baseSeconds: number, targetSeconds: number): NdRecommendation {
  const stops = stopsNeeded(baseSeconds, targetSeconds);
  if (stops < 0.5) {
    return { stops, needsFilter: false, best: null, lighter: null, stronger: null, exceedsRange: false };
  }
  let bestIdx = 0;
  let bestDiff = Infinity;
  ND_FILTERS.forEach((f, i) => {
    const diff = Math.abs(f.stops - stops);
    if (diff < bestDiff) {
      bestDiff = diff;
      bestIdx = i;
    }
  });
  const top = ND_FILTERS[ND_FILTERS.length - 1];
  return {
    stops,
    needsFilter: true,
    best: suggest(ND_FILTERS[bestIdx], baseSeconds, targetSeconds),
    lighter: bestIdx > 0 ? suggest(ND_FILTERS[bestIdx - 1], baseSeconds, targetSeconds) : null,
    stronger:
      bestIdx < ND_FILTERS.length - 1
        ? suggest(ND_FILTERS[bestIdx + 1], baseSeconds, targetSeconds)
        : null,
    exceedsRange: stops > top.stops + 0.5,
  };
}

/** 셔터 시간을 사람이 읽는 문자열로. 1초 미만은 "1/N", 이상은 "N s" / "M m S s". */
export function formatShutter(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return "–";
  if (seconds < 0.95) {
    const denom = Math.round(1 / seconds);
    return `1/${denom}`;
  }
  if (seconds < 60) {
    const rounded = seconds < 10 ? Math.round(seconds * 10) / 10 : Math.round(seconds);
    return `${rounded}s`;
  }
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds - m * 60);
  return s === 0 ? `${m}m` : `${m}m ${s}s`;
}
