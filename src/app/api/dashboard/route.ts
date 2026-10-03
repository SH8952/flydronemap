import { NextRequest, NextResponse } from "next/server";
import {
  fetchCurrentWeather,
  fetchAltitudeWindProfile,
  fetchHourlyForecast,
} from "@/lib/weather";
import { fetchLatestKpIndex } from "@/lib/kp-index";
import { fetchAirspaceCeiling } from "@/lib/airspace";

export async function GET(request: NextRequest) {
  const lat = Number(request.nextUrl.searchParams.get("lat"));
  const lon = Number(request.nextUrl.searchParams.get("lon"));

  if (Number.isNaN(lat) || Number.isNaN(lon)) {
    return NextResponse.json(
      { error: "lat and lon query params are required" },
      { status: 400 },
    );
  }

  const [weather, kp, airspace, altitudeWind, hourly] = await Promise.all([
    fetchCurrentWeather(lat, lon),
    fetchLatestKpIndex(),
    fetchAirspaceCeiling(lat, lon),
    fetchAltitudeWindProfile(lat, lon),
    // 24시간 비행 조건 타임라인용(2026-10-03). 실패해도 다른 카드에는 영향 없음.
    fetchHourlyForecast(lat, lon),
  ]);

  return NextResponse.json({ weather, kp, airspace, altitudeWind, hourly });
}
