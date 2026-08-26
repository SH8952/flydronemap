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
