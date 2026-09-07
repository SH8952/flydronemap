import type { LatLngRing } from "@/lib/airspace";

export type EsAirspaceMatch = {
  layerId: string;
  labels: string[];
  boundary?: LatLngRing[][];
};

// 미국(us-airspace-lookup-client.ts)과 동일하게, 공유 AirspaceCeiling
// 유니언(src/lib/airspace.ts)에 합치지 않고 이 나라만의 결과 타입을 따로
// 둔다 — 이 저장소의 기존 관례(나라마다 자기 타입)를 그대로 따른 것.
export type EsAirspaceZones =
  | { restricted: true; matches: EsAirspaceMatch[] }
  | { restricted: false }
  | null;

/** /api/es-airspace-lookup을 호출해 스페인 ZGUAS 매칭 결과를 가져온다.
 * 조회 자체가 실패하면(네트워크 오류, 서버 502 등) null을 반환한다 — 호출부는
 * 이를 "이 위치는 제한 없음"이 아니라 "아직 데이터 없음"으로 처리해야 한다. */
export async function fetchEsAirspaceZones(
  latitude: number,
  longitude: number,
): Promise<EsAirspaceZones> {
  try {
    const res = await fetch(
      `/api/es-airspace-lookup?lat=${latitude}&lon=${longitude}`,
      { cache: "no-store" },
    );
    if (!res.ok) return null;
    const json = (await res.json()) as { matches: EsAirspaceMatch[] };
    return json.matches.length > 0
      ? { restricted: true, matches: json.matches }
      : { restricted: false };
  } catch {
    return null;
  }
}
