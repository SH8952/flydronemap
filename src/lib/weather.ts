import { kpRiskLevel } from "@/lib/kp-index";

export type FlightWeather = {
  time: string;
  temperatureC: number;
  windSpeedKmh: number;
  windGustKmh: number;
  windDirectionDeg: number;
  visibilityM: number;
  precipitationMm: number;
  weatherCode: number;
};

/**
 * Open-Meteo's free forecast API. No API key required for non-commercial use.
 * https://open-meteo.com/en/docs
 */
export async function fetchCurrentWeather(
  latitude: number,
  longitude: number,
): Promise<FlightWeather | null> {
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", String(latitude));
  url.searchParams.set("longitude", String(longitude));
  url.searchParams.set(
    "current",
    [
      "temperature_2m",
      "wind_speed_10m",
      "wind_gusts_10m",
      "wind_direction_10m",
      "visibility",
      "precipitation",
      "weather_code",
    ].join(","),
  );
  url.searchParams.set("wind_speed_unit", "kmh");
  url.searchParams.set("timezone", "auto");

  const res = await fetch(url.toString(), { next: { revalidate: 300 } });
  if (!res.ok) return null;

  const data = (await res.json()) as {
    current?: {
      time: string;
      temperature_2m: number;
      wind_speed_10m: number;
      wind_gusts_10m: number;
      wind_direction_10m: number;
      visibility: number;
      precipitation: number;
      weather_code: number;
    };
  };

  if (!data.current) return null;

  return {
    time: data.current.time,
    temperatureC: data.current.temperature_2m,
    windSpeedKmh: data.current.wind_speed_10m,
    windGustKmh: data.current.wind_gusts_10m,
    windDirectionDeg: data.current.wind_direction_10m,
    visibilityM: data.current.visibility,
    precipitationMm: data.current.precipitation,
    weatherCode: data.current.weather_code,
  };
}

/**
 * A conservative, general-purpose "is this safe-ish to fly a small
 * consumer/prosumer drone in" read on the wind figures alone. This is a
 * rule-of-thumb derived from common manufacturer max-wind-resistance specs
 * (~29-38 km/h for many consumer drones) — not a substitute for checking
 * your specific aircraft's spec sheet.
 */
export function windRiskLevel(windGustKmh: number): "low" | "moderate" | "high" {
  if (windGustKmh < 20) return "low";
  if (windGustKmh < 35) return "moderate";
  return "high";
}

export type AltitudeWindLevel = {
  altitudeM: number;
  windSpeedKmh: number;
  windDirectionDeg: number;
};

export type AltitudeWindProfile = {
  time: string;
  levels: AltitudeWindLevel[];
};

const ALTITUDE_LEVELS_M = [10, 80, 120] as const;

/**
 * Wind speed/direction at three heights above ground (10m/80m/120m), pulled
 * from Open-Meteo's `hourly` forecast (not `current`, which only exposes the
 * 10m level). Added 2026-09-28 — SEO 콘텐츠 갭 분석의 "가벼운 코드 변경 1군"
 * 중 하나로, 고고도 촬영/매핑 비행자에게 지표면(10m) 풍속만으로는 보이지 않는
 * 고도별 바람 차이를 보여주기 위함. fetchCurrentWeather()와 별도 호출인 이유는
 * Open-Meteo가 80m/120m 데이터를 `hourly` 엔드포인트에서만 제공하기 때문.
 */
export async function fetchAltitudeWindProfile(
  latitude: number,
  longitude: number,
): Promise<AltitudeWindProfile | null> {
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", String(latitude));
  url.searchParams.set("longitude", String(longitude));
  url.searchParams.set(
    "hourly",
    [
      "wind_speed_10m",
      "wind_speed_80m",
      "wind_speed_120m",
      "wind_direction_10m",
      "wind_direction_80m",
      "wind_direction_120m",
    ].join(","),
  );
  url.searchParams.set("wind_speed_unit", "kmh");
  url.searchParams.set("timezone", "auto");
  url.searchParams.set("forecast_days", "1");

  const res = await fetch(url.toString(), { next: { revalidate: 300 } });
  if (!res.ok) return null;

  const data = (await res.json()) as {
    hourly?: {
      time: string[];
      wind_speed_10m: number[];
      wind_speed_80m: number[];
      wind_speed_120m: number[];
      wind_direction_10m: number[];
      wind_direction_80m: number[];
      wind_direction_120m: number[];
    };
  };

  const hourly = data.hourly;
  if (!hourly || hourly.time.length === 0) return null;

  // 현재 시각 이후(또는 같은) 첫 시간대를 찾는다. 전부 과거면(엣지 케이스)
  // 마지막 인덱스로 대체.
  const now = Date.now();
  let index = hourly.time.findIndex((t) => new Date(t).getTime() >= now);
  if (index === -1) index = hourly.time.length - 1;

  const speeds = [
    hourly.wind_speed_10m[index],
    hourly.wind_speed_80m[index],
    hourly.wind_speed_120m[index],
  ];
  const directions = [
    hourly.wind_direction_10m[index],
    hourly.wind_direction_80m[index],
    hourly.wind_direction_120m[index],
  ];

  if (
    speeds.some((v) => v === undefined) ||
    directions.some((v) => v === undefined)
  ) {
    return null;
  }

  return {
    time: hourly.time[index],
    levels: ALTITUDE_LEVELS_M.map((altitudeM, i) => ({
      altitudeM,
      windSpeedKmh: speeds[i] as number,
      windDirectionDeg: directions[i] as number,
    })),
  };
}

export type FlightVerdict = "good" | "caution" | "no-fly";

/**
 * 바람(돌풍)과 Kp 지수, 두 지표만 종합한 "오늘 비행 가능?" 판정. 2026-09-28
 * 신규 추가 — SEO 콘텐츠 갭 분석 1군 ②(Good-to-Fly 배지, 사용자 선택: 바람+Kp만
 * 반영, 공역 제한 여부는 이번 범위에서 제외). 기존 windRiskLevel()/kpRiskLevel()
 * 은 그동안 각 카드의 개별 색상 표시에만 쓰이던 로직을 그대로 재사용하고, 이
 * 함수는 그 둘을 조합하기만 한다 — 기존 로직은 변경하지 않음.
 */
export function flightVerdict(windGustKmh: number, kp: number): FlightVerdict {
  const wind = windRiskLevel(windGustKmh);
  const kpLevel = kpRiskLevel(kp);

  if (wind === "high" || kpLevel === "storm") return "no-fly";
  if (wind === "moderate" || kpLevel === "unsettled") return "caution";
  return "good";
}
