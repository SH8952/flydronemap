/**
 * 한국 지점의 공역(비행금지/제한/관제권 등 14개 레이어) 조회 — 브라우저에서
 * 같은 출처(same-origin)의 /api/airspace-lookup을 호출한다.
 *
 * 이 API 라우트가 서버에서 브이월드 WMS GetFeatureInfo를 대신 호출해준다
 * (src/app/api/airspace-lookup/route.ts 참고) — 브라우저가 직접 브이월드에
 * GetFeatureInfo를 요청하면 Referer 유무와 무관하게 항상 503이 발생하기
 * 때문에, 반드시 이 경유 경로를 써야 한다.
 */
import type { AirspaceCeiling } from "@/lib/airspace";

export async function fetchKoreaAirspaceZones(
  latitude: number,
  longitude: number,
): Promise<AirspaceCeiling> {
  try {
    const res = await fetch(
      `/api/airspace-lookup?lat=${latitude}&lon=${longitude}`,
    );
    if (!res.ok) return null;

    const data = (await res.json()) as {
      matches?: Array<{
        layerId: string;
        labels: string[];
        boundary?: [number, number][][][];
      }>;
    };

    const matches = data.matches ?? [];
    if (matches.length === 0) return { source: "kr", restricted: false };

    return { source: "kr", restricted: true, matches };
  } catch {
    return null;
  }
}
