/** A polygon boundary as an array of rings, each ring an array of [lat, lon]
 * points (first ring is the outer boundary, any further rings are holes) —
 * ready to pass to a Leaflet <Polygon positions={...}> for a single polygon,
 * or grouped one level deeper for a multi-polygon. */
export type LatLngRing = [number, number][];

/** One matched Korea airspace zone from /api/airspace-lookup — see that
 * route for how layerId/labels are derived. `labels` holds whatever
 * human-readable attribute values VWorld returned for this zone (zone code,
 * altitude range, etc. — the exact fields differ per layer), already
 * deduplicated; it may be empty when a layer doesn't expose usable labels,
 * in which case callers should fall back to the layer's catalog name
 * (src/lib/airspace-layers.ts) alone. */
export type KoreaAirspaceMatch = {
  layerId: string;
  labels: string[];
  boundary?: LatLngRing[][];
};

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
      /** All matched zones at this point, across every layer in the
       * catalog — sorted by severity (prohibited > restricted > controlZone
       * first). Usually one entry, but a point can fall inside more than one
       * zone (e.g. concentric zones around the same facility). */
      matches: KoreaAirspaceMatch[];
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
 * 한 번도 성공한 적이 없다. 지점별 공역 조회는 이제 /api/airspace-lookup이
 * 대신한다 — 같은 서버지만 다른 엔드포인트(req/wms의 GetFeatureInfo)를 써서
 * 그 차단을 우회한다(2026-09-03 실제 프로덕션에서 검증 완료. 지도 오버레이
 * WMS 타일과 원리가 비슷하지만 그쪽은 브라우저가 직접 요청하는 것과 달리
 * 이건 서버가 대신 요청해준다). 예전 구현은 git 히스토리에 남아있다.
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
    // 한국 지점의 지점별 공역 조회는 /api/airspace-lookup이 별도로 수행한다
    // (src/components/drone-dashboard.tsx 참고) — 여기서는 항상 null.
    return null;
  }
  return fetchFaaAirspaceCeiling(latitude, longitude);
}
