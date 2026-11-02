import type {
  WmsAirspaceCountryDef,
  WmsAirspaceMatch,
} from "@/lib/wms-airspace-countries";

// 미국/스페인/독일과 동일하게, 공유 AirspaceCeiling 유니언(src/lib/airspace.ts)에
// 합치지 않고 이 나라들만의 결과 타입을 따로 둔다 — 이 저장소의 기존 관례.
export type WmsAirspaceZones =
  | { restricted: true; matches: WmsAirspaceMatch[] }
  | { restricted: false }
  | null;

/** /api/{ch|fr}-airspace-lookup을 호출해 지점에 매칭된 구역을 가져온다.
 * 조회 자체가 실패하면(네트워크 오류, 서버 502 등) null을 반환한다 — 호출부는
 * 이를 "이 위치는 제한 없음"이 아니라 "아직 데이터 없음"으로 처리해야 한다
 * (비행 가능으로 오해하지 않도록, 다른 나라 클라이언트와 같은 원칙). */
export async function fetchWmsAirspaceZones(
  country: WmsAirspaceCountryDef,
  latitude: number,
  longitude: number,
  locale: string,
): Promise<WmsAirspaceZones> {
  try {
    const res = await fetch(
      `/api/${country.id}-airspace-lookup?lat=${latitude}&lon=${longitude}&lang=${encodeURIComponent(locale)}`,
      { cache: "no-store" },
    );
    if (!res.ok) return null;
    const json = (await res.json()) as { matches: WmsAirspaceMatch[] };
    return json.matches.length > 0
      ? { restricted: true, matches: json.matches }
      : { restricted: false };
  } catch {
    return null;
  }
}
