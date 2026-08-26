import { NextRequest, NextResponse } from "next/server";
import { fetchCurrentWeather } from "@/lib/weather";
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

  const [weather, kp, airspace] = await Promise.all([
    fetchCurrentWeather(lat, lon),
    fetchLatestKpIndex(),
    fetchAirspaceCeiling(lat, lon),
  ]);

  return NextResponse.json({ weather, kp, airspace });
}
