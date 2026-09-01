import { NextRequest, NextResponse } from "next/server";

/**
 * Vercel의 엣지 네트워크가 모든 요청에 자동으로 붙여주는 IP 기반 위치 헤더를 읽어
 * 사용자의 대략적인 위치(도시 단위)를 반환합니다. 브라우저 위치 권한 팝업 없이
 * 접속 즉시 첫 화면에 기본 위치를 보여주기 위한 용도입니다.
 *
 * 로컬 개발 환경(npm run dev)이나 Vercel이 아닌 환경에서는 이 헤더들이 존재하지
 * 않으므로 available: false를 반환하며, 이 경우 클라이언트는 기존처럼 검색창만
 * 보여주는 기본 화면을 유지합니다.
 */
export async function GET(request: NextRequest) {
  const latHeader = request.headers.get("x-vercel-ip-latitude");
  const lonHeader = request.headers.get("x-vercel-ip-longitude");
  const city = request.headers.get("x-vercel-ip-city");
  const country = request.headers.get("x-vercel-ip-country");

  const latitude = latHeader ? Number(latHeader) : NaN;
  const longitude = lonHeader ? Number(lonHeader) : NaN;

  if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
    return NextResponse.json({ available: false });
  }

  return NextResponse.json({
    available: true,
    latitude,
    longitude,
    city: city ? decodeURIComponent(city) : null,
    country: country ?? null,
  });
}
