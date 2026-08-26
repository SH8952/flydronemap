export type AirspaceCeiling = {
  /** Maximum altitude, in feet AGL, the FAA UAS Facility Map allows for Part
   * 107 operations without additional authorization at this location. */
  ceilingFeet: number;
  nearestFacility?: string;
} | null;

const FAA_UASFM_QUERY_URL =
  "https://services6.arcgis.com/ssFJjBXIUyZDrSYZ/arcgis/rest/services/FAA_UAS_FacilityMap_Data/FeatureServer/0/query";

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
export async function fetchAirspaceCeiling(
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
      ceilingFeet: ceiling,
      nearestFacility:
        typeof first.APT1_NAME === "string" ? first.APT1_NAME : undefined,
    };
  } catch {
    return null;
  }
}
