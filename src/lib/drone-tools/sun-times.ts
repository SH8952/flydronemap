/**
 * 일출·일몰·골든아워·블루아워 계산 (순수 함수, 네트워크 호출 없음).
 *
 * NOAA 태양 위치 알고리즘(Jean Meeus 단순화판)으로 분 단위 태양 고도를 구하고,
 * 하루를 1분 간격으로 훑어 기준 고도를 지나는 시각을 선형 보간으로 찾는다.
 * 계산에는 대기 굴절을 따로 넣지 않고, 일출·일몰은 관례대로 -0.833°를 기준으로 한다.
 *
 * 구간 정의(촬영 업계에서 흔히 쓰는 값이며 자료마다 조금씩 다르다):
 *  - 골든아워: 태양 고도 -4° ~ +6°
 *  - 블루아워: 태양 고도 -8° ~ -4°
 */

const RAD = Math.PI / 180;
const DEG = 180 / Math.PI;

export const SUN_ANGLES = {
  sunrise: -0.833,
  civil: -6,
  goldenTop: 6,
  goldenBottom: -4,
  blueBottom: -8,
} as const;

type SunPos = { elevation: number; azimuth: number };

/** 주어진 UTC 시각(ms)의 태양 고도·방위각(북=0°, 시계 방향). 경도는 동쪽이 +. */
export function sunPosition(utcMs: number, lat: number, lon: number): SunPos {
  const jd = utcMs / 86400000 + 2440587.5;
  const jc = (jd - 2451545) / 36525;

  const l0 = (280.46646 + jc * (36000.76983 + jc * 0.0003032)) % 360;
  const m = 357.52911 + jc * (35999.05029 - 0.0001537 * jc);
  const e = 0.016708634 - jc * (0.000042037 + 0.0000001267 * jc);
  const mr = m * RAD;
  const eqCtr =
    Math.sin(mr) * (1.914602 - jc * (0.004817 + 0.000014 * jc)) +
    Math.sin(2 * mr) * (0.019993 - 0.000101 * jc) +
    Math.sin(3 * mr) * 0.000289;
  const trueLong = l0 + eqCtr;
  const omega = 125.04 - 1934.136 * jc;
  const appLong = trueLong - 0.00569 - 0.00478 * Math.sin(omega * RAD);
  const meanObliq =
    23 + (26 + (21.448 - jc * (46.815 + jc * (0.00059 - jc * 0.001813))) / 60) / 60;
  const obliq = meanObliq + 0.00256 * Math.cos(omega * RAD);
  const decl = Math.asin(Math.sin(obliq * RAD) * Math.sin(appLong * RAD));

  const y = Math.tan((obliq * RAD) / 2) ** 2;
  const l0r = l0 * RAD;
  const eqTime =
    4 *
    DEG *
    (y * Math.sin(2 * l0r) -
      2 * e * Math.sin(mr) +
      4 * e * y * Math.sin(mr) * Math.cos(2 * l0r) -
      0.5 * y * y * Math.sin(4 * l0r) -
      1.25 * e * e * Math.sin(2 * mr));

  const utcMinutes = (((utcMs / 60000) % 1440) + 1440) % 1440;
  const trueSolarTime = (((utcMinutes + eqTime + 4 * lon) % 1440) + 1440) % 1440;
  let ha = trueSolarTime / 4 - 180;
  if (ha < -180) ha += 360;

  const latr = lat * RAD;
  const cosZ = Math.sin(latr) * Math.sin(decl) + Math.cos(latr) * Math.cos(decl) * Math.cos(ha * RAD);
  const zenith = Math.acos(Math.min(1, Math.max(-1, cosZ))) * DEG;
  const elevation = 90 - zenith;

  const sinZ = Math.sin(zenith * RAD);
  let azimuth = 0;
  if (sinZ > 1e-9 && Math.cos(latr) > 1e-9) {
    const cosAz = (Math.sin(latr) * cosZ - Math.sin(decl)) / (Math.cos(latr) * sinZ);
    const az = Math.acos(Math.min(1, Math.max(-1, cosAz))) * DEG;
    azimuth = ha > 0 ? (az + 180) % 360 : (540 - az) % 360;
  }
  return { elevation, azimuth };
}

/** IANA 시간대의 UTC 오프셋(분). 해당 시각의 서머타임을 반영. */
export function tzOffsetMinutes(timeZone: string, utcMs: number): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
  });
  const p: Record<string, number> = {};
  for (const part of dtf.formatToParts(new Date(utcMs))) {
    if (part.type !== "literal") p[part.type] = Number(part.value);
  }
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour % 24, p.minute, p.second);
  const truncated = Math.floor(utcMs / 1000) * 1000;
  return Math.round((asUtc - truncated) / 60000);
}

/** 해당 시간대의 (연, 월, 일) 자정(현지)에 해당하는 UTC ms. */
export function localMidnightUtc(timeZone: string, y: number, m: number, d: number): number {
  const guess = Date.UTC(y, m - 1, d);
  const off1 = tzOffsetMinutes(timeZone, guess);
  let t = guess - off1 * 60000;
  const off2 = tzOffsetMinutes(timeZone, t);
  if (off2 !== off1) t = guess - off2 * 60000;
  return t;
}

export type Crossings = { rise: number | null; fall: number | null };
export type Segment = {
  kind: "night" | "blue" | "golden" | "day";
  /** 현지 자정 기준 분 */
  startMin: number;
  endMin: number;
};

export type SunDay = {
  /** 현지 자정 UTC ms (분 오프셋 계산용) */
  startUtc: number;
  endUtc: number;
  sunrise: number | null;
  sunset: number | null;
  civilDawn: number | null;
  civilDusk: number | null;
  solarNoon: number;
  maxElevation: number;
  sunriseAzimuth: number | null;
  sunsetAzimuth: number | null;
  windows: {
    morningBlue: [number | null, number | null];
    morningGolden: [number | null, number | null];
    eveningGolden: [number | null, number | null];
    eveningBlue: [number | null, number | null];
  };
  polar: "day" | "night" | null;
  dayLengthMinutes: number | null;
  segments: Segment[];
};

function classify(elev: number): Segment["kind"] {
  if (elev > SUN_ANGLES.goldenTop) return "day";
  if (elev > SUN_ANGLES.goldenBottom) return "golden";
  if (elev > SUN_ANGLES.blueBottom) return "blue";
  return "night";
}

/** 연·월·일(현지 달력)과 시간대, 위치로 하루치 태양 정보를 계산한다. */
export function computeSunDay(opts: {
  year: number;
  month: number; // 1~12
  day: number;
  lat: number;
  lon: number;
  timeZone: string;
}): SunDay {
  const { year, month, day, lat, lon, timeZone } = opts;
  const startUtc = localMidnightUtc(timeZone, year, month, day);
  const endUtc = localMidnightUtc(timeZone, year, month, day + 1);
  const minutes = Math.round((endUtc - startUtc) / 60000);

  const elev: number[] = new Array(minutes + 1);
  let maxElev = -Infinity;
  let maxIdx = 0;
  let minElev = Infinity;
  for (let i = 0; i <= minutes; i++) {
    const e = sunPosition(startUtc + i * 60000, lat, lon).elevation;
    elev[i] = e;
    if (e > maxElev) {
      maxElev = e;
      maxIdx = i;
    }
    if (e < minElev) minElev = e;
  }

  const crossings = (angle: number): Crossings => {
    let rise: number | null = null;
    let fall: number | null = null;
    let lastFall: number | null = null;
    for (let i = 1; i <= minutes; i++) {
      const a = elev[i - 1] - angle;
      const b = elev[i] - angle;
      if ((a < 0 && b >= 0) || (a >= 0 && b < 0)) {
        const frac = a / (a - b);
        const t = startUtc + (i - 1 + frac) * 60000;
        if (a < 0) {
          if (rise === null) rise = t;
        } else {
          lastFall = t;
          if (fall === null && rise !== null) fall = t;
        }
      }
    }
    return { rise, fall: fall ?? lastFall };
  };

  const sr = crossings(SUN_ANGLES.sunrise);
  const civil = crossings(SUN_ANGLES.civil);
  const gTop = crossings(SUN_ANGLES.goldenTop);
  const gBot = crossings(SUN_ANGLES.goldenBottom);
  const bBot = crossings(SUN_ANGLES.blueBottom);

  const polar: SunDay["polar"] =
    minElev > SUN_ANGLES.sunrise ? "day" : maxElev < SUN_ANGLES.sunrise ? "night" : null;

  // 연속 구간(분 단위) 묶기
  const segments: Segment[] = [];
  let curKind = classify(elev[0]);
  let curStart = 0;
  for (let i = 1; i <= minutes; i++) {
    const k = classify(elev[i]);
    if (k !== curKind) {
      segments.push({ kind: curKind, startMin: curStart, endMin: i });
      curKind = k;
      curStart = i;
    }
  }
  segments.push({ kind: curKind, startMin: curStart, endMin: minutes });

  const azAt = (t: number | null) => (t === null ? null : sunPosition(t, lat, lon).azimuth);

  return {
    startUtc,
    endUtc,
    sunrise: sr.rise,
    sunset: sr.fall,
    civilDawn: civil.rise,
    civilDusk: civil.fall,
    solarNoon: startUtc + maxIdx * 60000,
    maxElevation: maxElev,
    sunriseAzimuth: azAt(sr.rise),
    sunsetAzimuth: azAt(sr.fall),
    windows: {
      morningBlue: [bBot.rise, gBot.rise],
      morningGolden: [gBot.rise, gTop.rise],
      eveningGolden: [gTop.fall, gBot.fall],
      eveningBlue: [gBot.fall, bBot.fall],
    },
    polar,
    dayLengthMinutes:
      sr.rise !== null && sr.fall !== null && sr.fall > sr.rise
        ? (sr.fall - sr.rise) / 60000
        : polar === "day"
          ? 1440
          : polar === "night"
            ? 0
            : null,
    segments,
  };
}

/** 방위각(도) → 8방위 약어 인덱스(0=N, 1=NE, …) */
export function compassIndex(azimuth: number): number {
  return Math.round((((azimuth % 360) + 360) % 360) / 45) % 8;
}

/** 위도·경도 범위 검증 */
export function isValidLatLon(lat: number, lon: number): boolean {
  return Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180;
}
