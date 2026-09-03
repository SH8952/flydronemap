/**
 * 미국 지점의 공역(Class B/C/D/E, 금지·제한·경고·주의구역, MOA, FRIA) 조회 —
 * 브라우저에서 같은 출처(same-origin)의 /api/us-airspace-lookup을 호출한다.
 *
 * 한국의 fetchKoreaAirspaceZones(src/lib/airspace-lookup-client.ts)와 동일한
 * 패턴: 실제 FAA ArcGIS 조회는 서버(/api/us-airspace-lookup)에서 대신
 * 수행한다 — CORS 문제는 없지만(FAA 서비스는 브라우저 직접 호출도 허용),
 * 서버를 경유하면 조회 로직(레이어 매핑, 우선순위 정렬)을 한 곳에 유지할
 * 수 있고 향후 캐싱을 추가하기도 쉽다.
 */
export type UsAirspaceLookupMatch = {
  layerId: string;
  labels: string[];
  boundary?: [number, number][][][];
};

export type UsAirspaceZones =
  | { restricted: true; matches: UsAirspaceLookupMatch[] }
  | { restricted: false }
  | null;

export async function fetchUsAirspaceZones(
  latitude: number,
  longitude: number,
): Promise<UsAirspaceZones> {
  try {
    const res = await fetch(
      `/api/us-airspace-lookup?lat=${latitude}&lon=${longitude}`,
    );
    if (!res.ok) return null;

    const data = (await res.json()) as { matches?: UsAirspaceLookupMatch[] };
    const matches = data.matches ?? [];
    if (matches.length === 0) return { restricted: false };

    return { restricted: true, matches };
  } catch {
    return null;
  }
}
