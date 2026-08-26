export type AirspaceCeiling =
  | {
      source: "faa";
      /** Maximum altitude, in feet AGL, the FAA UAS Facility Map allows for
       * Part 107 operations without additional authorization at this location. */
      ceilingFeet: number;
      nearestFacility?: string;
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
    }
  | {
      source: "kr";
      restricted: false;
    }
  | null;

const FAA_UASFM_QUERY_URL =
  "https://services6.arcgis.com/ssFJjBXIUyZDrSYZ/arcgis/rest/services/FAA_UAS_FacilityMap_Data/FeatureServer/0/query";

const VWORLD_DATA_URL = "https://api.vworld.kr/req/data";

/** Rough bounding box for South Korea (including Jeju and Ulleungdo). */
function isInSouthKorea(latitude: number, longitude: number): boolean {
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
  url.searchParams.set("returnGeometry", "false");
  url.searchParams.set("f", "json");

  try {
    const res = await fetch(url.toString(), { next: { revalidate: 3600 } });
    if (!res.ok) return null;

    const data = (await res.json()) as {
      features?: Array<{ attributes: Record<string, unknown> }>;
    };

    const first = data.features?.[0]?.attributes;
    if (!first) return null;

    const ceiling = Number(first.CEILING);
    if (Number.isNaN(ceiling)) return null;

    return {
      source: "faa",
      ceilingFeet: ceiling,
      nearestFacility:
        typeof first.APT1_NAME === "string" ? first.APT1_NAME : undefined,
    };
  } catch {
    return null;
  }
}

/**
 * Queries South Korea's national no-fly zone layer (국토교통부_비행금지구역,
 * VWorld data code LT_C_AISPRHC) for the given point. Requires the
 * VWORLD_API_KEY (and matching VWORLD_DOMAIN) environment variables, issued
 * via VWorld's "인증키 발급" flow. Returns `{ restricted: false }` when the
 * point is outside any mapped no-fly zone (a genuine "clear" result, distinct
 * from `null`, which means the lookup itself couldn't be completed).
 *
 * IMPORTANT: this is informational only, same as the FAA data — always
 * confirm via the official 드론원스톱 민원서비스 (drone.onestop.go.kr) or the
 * relevant authority before flying.
 */
async function fetchKoreaAirspaceCeiling(
  latitude: number,
  longitude: number,
): Promise<AirspaceCeiling> {
  const apiKey = process.env.VWORLD_API_KEY;
  if (!apiKey) return null;
  const domain = process.env.VWORLD_DOMAIN ?? "https://flydronemap.com";

  const url = new URL(VWORLD_DATA_URL);
  url.searchParams.set("service", "data");
  url.searchParams.set("version", "2.0");
  url.searchParams.set("request", "GetFeature");
  url.searchParams.set("format", "json");
  url.searchParams.set("errorFormat", "json");
  url.searchParams.set("size", "1");
  url.searchParams.set("data", "LT_C_AISPRHC");
  url.searchParams.set("geomFilter", `POINT(${longitude} ${latitude})`);
  url.searchParams.set("crs", "EPSG:4326");
  url.searchParams.set("geometry", "false");
  url.searchParams.set("attribute", "true");
  url.searchParams.set(
    "columns",
    "prh_lbl_1,prh_lbl_2,prh_lbl_3,prh_lbl_4",
  );
  url.searchParams.set("key", apiKey);
  url.searchParams.set("domain", domain);

  try {
    const res = await fetch(url.toString(), { next: { revalidate: 3600 } });
    if (!res.ok) return null;

    const data = (await res.json()) as {
      response?: {
        status?: string;
        result?: {
          featureCollection?: {
            features?: Array<{ properties?: Record<string, unknown> }>;
          };
        };
      };
    };

    const status = data.response?.status;
    if (status === "NOT_FOUND") {
      return { source: "kr", restricted: false };
    }
    if (status !== "OK") return null;

    const props =
      data.response?.result?.featureCollection?.features?.[0]?.properties;
    if (!props) return { source: "kr", restricted: false };

    return {
      source: "kr",
      restricted: true,
      zoneLabel: typeof props.prh_lbl_1 === "string" ? props.prh_lbl_1 : "",
      categoryName:
        typeof props.prh_lbl_4 === "string" ? props.prh_lbl_4 : "",
      lowerAltitude:
        typeof props.prh_lbl_3 === "string" ? props.prh_lbl_3 : "",
      upperAltitude:
        typeof props.prh_lbl_2 === "string" ? props.prh_lbl_2 : "",
    };
  } catch {
    return null;
  }
}

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
    return fetchKoreaAirspaceCeiling(latitude, longitude);
  }
  return fetchFaaAirspaceCeiling(latitude, longitude);
}
