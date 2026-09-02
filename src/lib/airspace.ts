/** A polygon boundary as an array of rings, each ring an array of [lat, lon]
 * points (first ring is the outer boundary, any further rings are holes) —
 * ready to pass to a Leaflet <Polygon positions={...}> for a single polygon,
 * or grouped one level deeper for a multi-polygon. */
export type LatLngRing = [number, number][];

export type AirspaceCeiling =
  | {
      source: "faa";
      /** Maximum altitude, in feet AGL, the FAA UAS Facility Map allows for
       * Part 107 operations without additional authorization at this location. */
      ceilingFeet: number;
      nearestFacility?: string;
      /** Boundary of the grid cell this ceiling applies to, as polygon rings. */
      boundary?: LatLngRing[];
    }
  | {
      source: "kr";
      restricted: true;
      /** Zone code, e.g. "P61A". */
      zoneLabel: string;
      /** Zone category name, e.g. "비행제한구역" (flight-restricted area). */
      categoryName: string;
      /** Lower altitude bound, e.g. "GND" (ground). */
      lowerAltitude: string;
      /** Upper altitude bound, e.g. "UNL" (unlimited). */
      upperAltitude: string;
      /** Boundary of the restricted zone, as one or more polygons (each an
       * array of rings) — a MultiPolygon in GeoJSON terms. */
      boundary?: LatLngRing[][];
    }
  | {
      source: "kr";
      restricted: false;
    }
  | null;

const FAA_UASFM_QUERY_URL =
  "https://services6.arcgis.com/ssFJjBXIUyZDrSYZ/arcgis/rest/services/FAA_UAS_FacilityMap_Data/FeatureServer/0/query";

/** Rough bounding box for South Korea (including Jeju and Ulleungdo). */
export function isInSouthKorea(latitude: number, longitude: number): boolean {
  return (
    latitude >= 33.0 &&
    latitude <= 38.7 &&
    longitude >= 124.5 &&
    longitude <= 131.0
  );
}

/**
 * Queries the FAA's public UAS Facility Map polygon layer for the grid cell
 * containing the given point, returning its ceiling altitude if one exists.
 * Returns null outside the US (or wherever this layer has no coverage) —
 * callers should treat that as "no data," not "0 ft allowed."
 *
 * IMPORTANT: this is informational only. The FAA UAS Facility Map indicates
 * where Part 107 operations *may* be authorized without further review — it
 * is not itself a flight authorization. Always confirm via LAANC or
 * FAADroneZone before flying.
 */
async function fetchFaaAirspaceCeiling(
  latitude: number,
  longitude: number,
): Promise<AirspaceCeiling> {
  const url = new URL(FAA_UASFM_QUERY_URL);
  url.searchParams.set("geometry", `${longitude},${latitude}`);
  url.searchParams.set("geometryType", "esriGeometryPoint");
  url.searchParams.set("inSR", "4326");
  url.searchParams.set("spatialRel", "esriSpatialRelIntersects");
  url.searchParams.set("outFields", "CEILING,APT1_NAME");
  url.searchParams.set("returnGeometry", "true");
  url.searchParams.set("outSR", "4326");
  url.searchParams.set("f", "json");

  try {
    const res = await fetch(url.toString(), { next: { revalidate: 3600 } });
    if (!res.ok) return null;

    const data = (await res.json()) as {
      features?: Array<{
        attributes: Record<string, unknown>;
        geometry?: { rings?: number[][][] };
      }>;
    };

    const first = data.features?.[0];
    if (!first) return null;

    const ceiling = Number(first.attributes.CEILING);
    if (Number.isNaN(ceiling)) return null;

    // Esri rings are [x, y] (lon, lat) — Leaflet wants [lat, lon].
    const boundary: LatLngRing[] | undefined = first.geometry?.rings?.map(
      (ring) => ring.map(([x, y]) => [y, x] as [number, number]),
    );

    return {
      source: "faa",
      ceilingFeet: ceiling,
      nearestFacility:
        typeof first.attributes.APT1_NAME === "string"
          ? first.attributes.APT1_NAME
          : undefined,
      boundary,
    };
  } catch {
    return null;
  }
}

/**
 * 2026-09까지 이 자리에는 fetchKoreaAirspaceCeiling()이 있었다 — 브이월드
 * 2D데이터 JSON API(api.vworld.kr/req/data)를 서버에서 직접 호출하는
 * 방식이었으나, 브이월드가 Vercel 서버 IP 대역을 차단하고 있어 production에서
 * 한 번도 성공한 적이 없다. 지점별 비행금지구역 조회는 이제
 * src/lib/airspace-wms-lookup.ts의 fetchKoreaRestrictedZoneClientSide()가
 * 대신한다 — 서버가 아니라 브라우저에서 직접 브이월드 WMS의 GetFeatureInfo를
 * 호출해 같은 차단을 우회한다(지도 오버레이 WMS 타일과 동일한 원리). 예전
 * 구현은 git 히스토리에 남아있다.
 */

/**
 * Dispatches to the appropriate national airspace data source based on the
 * point's location. Currently covers the United States (FAA UAS Facility
 * Map) and South Korea (국토교통부 비행금지구역). Returns null for any other
 * location — callers should treat that as "no data available here," not "no
 * restrictions."
 */
export async function fetchAirspaceCeiling(
  latitude: number,
  longitude: number,
): Promise<AirspaceCeiling> {
  if (isInSouthKorea(latitude, longitude)) {
    // 실패가 뻔한 서버사이드 브이월드 호출을 매 요청마다 시도하지 않는다 —
    // 지점별 조회는 클라이언트(브라우저)에서 별도로 수행된다. 바로 위 주석
    // 참고.
    return null;
  }
  return fetchFaaAirspaceCeiling(latitude, longitude);
}
