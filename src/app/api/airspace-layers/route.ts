import { NextRequest, NextResponse } from "next/server";
import { getAirspaceLayer, type AirspaceLayerFeature } from "@/lib/airspace-layers";

/** A single ring of [lat, lon] points making up part of a polygon. */
type LatLngRing = [number, number][];

const VWORLD_DATA_URL = "https://api.vworld.kr/req/data";

/** Bounding box covering South Korea (including Jeju and Ulleungdo) —
 * matches isInSouthKorea() in src/lib/airspace.ts. VWorld's geomFilter=BOX
 * format is "BOX(minx,miny,maxx,maxy)" (lon,lat order, comma-separated). */
const KOREA_BBOX = "124.5,33.0,131.0,38.7";

function toLatLngRing(ring: number[][]): LatLngRing {
  return ring.map(([lon, lat]) => [lat, lon] as [number, number]);
}

/** Normalizes one GeoJSON-ish geometry from a VWorld feature into our flat
 * feature list, exploding Multi* geometries into individual entries. */
function explodeGeometry(geom: {
  type?: string;
  coordinates?: unknown;
}): AirspaceLayerFeature[] {
  const type = geom.type;
  const coords = geom.coordinates;
  if (!type || !coords) return [];

  switch (type) {
    case "Polygon":
      return [{ kind: "polygon", rings: (coords as number[][][]).map(toLatLngRing) }];
    case "MultiPolygon":
      return (coords as number[][][][]).map((polygon) => ({
        kind: "polygon" as const,
        rings: polygon.map(toLatLngRing),
      }));
    case "LineString":
      return [
        {
          kind: "line",
          positions: (coords as number[][]).map(
            ([lon, lat]) => [lat, lon] as [number, number],
          ),
        },
      ];
    case "MultiLineString":
      return (coords as number[][][]).map((line) => ({
        kind: "line" as const,
        positions: line.map(([lon, lat]) => [lat, lon] as [number, number]),
      }));
    case "Point": {
      const [lon, lat] = coords as number[];
      return [{ kind: "point", position: [lat, lon] }];
    }
    case "MultiPoint":
      return (coords as number[][]).map(([lon, lat]) => ({
        kind: "point" as const,
        position: [lat, lon] as [number, number],
      }));
    default:
      return [];
  }
}

async function fetchLayerFeatures(dataCode: string): Promise<AirspaceLayerFeature[]> {
  const apiKey = process.env.VWORLD_API_KEY;
  if (!apiKey) return [];
  const domain = process.env.VWORLD_DOMAIN ?? "https://flydronemap.com";

  const url = new URL(VWORLD_DATA_URL);
  url.searchParams.set("service", "data");
  url.searchParams.set("version", "2.0");
  url.searchParams.set("request", "GetFeature");
  url.searchParams.set("format", "json");
  url.searchParams.set("errorFormat", "json");
  url.searchParams.set("size", "1000");
  url.searchParams.set("data", dataCode);
  url.searchParams.set("geomFilter", `BOX(${KOREA_BBOX})`);
  url.searchParams.set("crs", "EPSG:4326");
  url.searchParams.set("geometry", "true");
  // We only render a category-level legend/tooltip client-side, so skip
  // attribute payload entirely — smaller response, and avoids depending on
  // each layer's own (differing) attribute schema.
  url.searchParams.set("attribute", "false");
  url.searchParams.set("key", apiKey);
  url.searchParams.set("domain", domain);

  try {
    const res = await fetch(url.toString(), { next: { revalidate: 21600 } });
    if (!res.ok) return [];

    const data = (await res.json()) as {
      response?: {
        status?: string;
        result?: {
          featureCollection?: {
            features?: Array<{
              geometry?: { type?: string; coordinates?: unknown };
            }>;
          };
        };
      };
    };

    if (data.response?.status !== "OK") return [];

    const features = data.response?.result?.featureCollection?.features ?? [];
    return features.flatMap((f) => (f.geometry ? explodeGeometry(f.geometry) : []));
  } catch {
    return [];
  }
}

/**
 * Returns the national footprint of one airspace layer (see
 * src/lib/airspace-layers.ts for the catalog), for the "show all zones on
 * the map" overlay feature. Informational only — same disclaimer as
 * src/lib/airspace.ts: always confirm via 드론원스톱 or the relevant
 * authority before flying.
 */
export async function GET(request: NextRequest) {
  const layerId = request.nextUrl.searchParams.get("layer");
  const layer = layerId ? getAirspaceLayer(layerId) : undefined;
  if (!layer) {
    return NextResponse.json({ features: [] }, { status: 400 });
  }

  const results = await Promise.all(layer.dataCodes.map(fetchLayerFeatures));
  const features = results.flat();

  return NextResponse.json({ features });
}
