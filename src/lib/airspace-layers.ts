/**
 * Catalog of Korea's national airspace/no-fly-zone layers, rendered on the
 * map as VWorld WMS raster tiles (loaded as <img> tiles via Leaflet's
 * L.tileLayer.wms, see https://www.vworld.kr/dev/v4dv_wmsguide2_s001.do).
 *
 * This used to call VWorld's 2D데이터 API server-side with VWORLD_API_KEY
 * (see git history), but VWorld's server rejects requests originating from
 * Vercel's IP ranges — confirmed blocked from both the US (iad1) and Seoul
 * (icn1) function regions — so that approach cannot work in production.
 * A client-side fetch() to the same JSON API is also not viable: VWorld's
 * `api.vworld.kr/req/data` endpoint does not support cross-origin browser
 * fetch (CORS-blocked, confirmed by direct testing). WMS tiles sidestep
 * both problems because they're requested as <img> elements directly from
 * the user's browser, which isn't subject to either restriction — the
 * tradeoff is that VWORLD_API_KEY is now visible in tile request URLs (see
 * NEXT_PUBLIC_VWORLD_API_KEY / NEXT_PUBLIC_VWORLD_DOMAIN), and tiles use
 * VWorld's own default styling rather than this catalog's `color` values.
 *
 * Each entry's `dataCodes` double as VWorld WMS layer ids: VWorld's WMS
 * layer name is simply the lowercase of the matching 2D데이터 API code
 * (verified empirically against several of these codes) — see
 * `getWmsLayerParam` below. The point-click zone lookup and the Korean
 * address search features share the same VWorld-IP-blocking root cause and
 * remain broken; only this map overlay has been recovered so far.
 *
 * Mirrors the categories shown on Korea's official 드론원스톱
 * (drone.onestop.go.kr) airspace map. Each entry's `dataCodes` are VWorld
 * service IDs (see https://www.vworld.kr/dev/v4dv_2ddataguide2_s001.do) —
 * most layers are a single polygon dataset, but a few (수색비행장비행구역,
 * 시계비행로, 한강회랑) are published as separate line + point datasets that
 * are shown together under one toggle.
 */

export type AirspaceLayerGeometryKind = "polygon" | "line" | "point";

/** A single ring of [lat, lon] points making up part of a polygon. */
type LatLngRing = [number, number][];

/** One normalized feature returned by /api/airspace-layers — Multi* GeoJSON
 * geometries are exploded server-side into individual entries of this shape. */
export type AirspaceLayerFeature =
  | { kind: "polygon"; rings: LatLngRing[] }
  | { kind: "line"; positions: [number, number][] }
  | { kind: "point"; position: [number, number] };

export type AirspaceLayerDef = {
  id: string;
  nameKo: string;
  dataCodes: string[];
  kind: AirspaceLayerGeometryKind;
  /** Hex color used for both the map overlay and the panel's legend swatch. */
  color: string;
  /** Required layers are always shown and can't be turned off by the user. */
  required: boolean;
};

export const AIRSPACE_LAYERS: AirspaceLayerDef[] = [
  {
    id: "prohibited",
    nameKo: "비행금지구역",
    dataCodes: ["LT_C_AISPRHC"],
    kind: "polygon",
    color: "#ef4444",
    required: true,
  },
  {
    id: "controlZone",
    nameKo: "관제권",
    dataCodes: ["LT_C_AISCTRC"],
    kind: "polygon",
    color: "#3b82f6",
    required: true,
  },
  {
    id: "restricted",
    nameKo: "비행제한구역",
    dataCodes: ["LT_C_AISRESC"],
    kind: "polygon",
    color: "#f97316",
    required: true,
  },
  {
    id: "danger",
    nameKo: "위험구역",
    dataCodes: ["LT_C_AISDNGC"],
    kind: "polygon",
    color: "#eab308",
    required: false,
  },
  {
    id: "approachControl",
    nameKo: "접근관제구역",
    dataCodes: ["LT_C_AISTMAC"],
    kind: "polygon",
    color: "#06b6d4",
    required: false,
  },
  {
    id: "training",
    nameKo: "훈련구역",
    dataCodes: ["LT_C_AISCATC"],
    kind: "polygon",
    color: "#8b5cf6",
    required: false,
  },
  {
    id: "adiz",
    nameKo: "방공식별구역",
    dataCodes: ["LT_C_AISADZC"],
    kind: "polygon",
    color: "#64748b",
    required: false,
  },
  {
    id: "fir",
    nameKo: "비행정보구역",
    dataCodes: ["LT_C_AISFIRC"],
    kind: "polygon",
    color: "#0ea5e9",
    required: false,
  },
  {
    id: "militaryOperations",
    nameKo: "군작전구역",
    dataCodes: ["LT_C_AISMOAC"],
    kind: "polygon",
    color: "#b91c1c",
    required: false,
  },
  {
    id: "airportTraffic",
    nameKo: "비행장교통구역",
    dataCodes: ["LT_C_AISATZC"],
    kind: "polygon",
    color: "#14b8a6",
    required: false,
  },
  {
    id: "airRefueling",
    nameKo: "공중급유구역",
    dataCodes: ["LT_C_AISRFLC"],
    kind: "polygon",
    color: "#a855f7",
    required: false,
  },
  {
    id: "acm",
    nameKo: "공중전투기동훈련장",
    dataCodes: ["LT_C_AISACMC"],
    kind: "polygon",
    color: "#dc2626",
    required: false,
  },
  {
    id: "boundary",
    nameKo: "경계구역",
    dataCodes: ["LT_C_AISALTC"],
    kind: "polygon",
    color: "#737373",
    required: false,
  },
  {
    id: "uas",
    nameKo: "(UA)초경량비행장치공역",
    dataCodes: ["LT_C_AISUAC"],
    kind: "polygon",
    color: "#22c55e",
    required: false,
  },
  {
    id: "lightAircraftAirfield",
    nameKo: "경량항공기이착륙장",
    dataCodes: ["LT_C_AISFLDC"],
    kind: "polygon",
    color: "#84cc16",
    required: false,
  },
  {
    id: "droneZone",
    nameKo: "드론시범사업구역",
    dataCodes: ["LT_C_AISDRONEZONE"],
    kind: "polygon",
    color: "#16a34a",
    required: false,
  },
  {
    id: "searchFlightArea",
    nameKo: "수색비행장비행구역",
    dataCodes: ["LT_L_AISSEARCHL", "LT_P_AISSEARCHP"],
    kind: "line",
    color: "#0369a1",
    required: false,
  },
  {
    id: "vfrPath",
    nameKo: "시계비행로",
    dataCodes: ["LT_L_AISVFRPATH", "LT_P_AISVFRPATH"],
    kind: "line",
    color: "#7c3aed",
    required: false,
  },
  {
    id: "altitudeLimit",
    nameKo: "제한고도",
    dataCodes: ["LT_L_AISROUTEU"],
    kind: "line",
    color: "#ea580c",
    required: false,
  },
  {
    id: "hangangCorridor",
    nameKo: "한강회랑",
    dataCodes: [
      "LT_L_AISCORRID_YS",
      "LT_L_AISCORRID_GJ",
      "LT_P_AISCORRID_YS",
      "LT_P_AISCORRID_GJ",
    ],
    kind: "line",
    color: "#2563eb",
    required: false,
  },
  {
    id: "airRoute",
    nameKo: "항공로",
    dataCodes: ["LT_L_AISPATH"],
    kind: "line",
    color: "#525252",
    required: false,
  },
  {
    id: "heliport",
    nameKo: "헬기장",
    dataCodes: ["LT_P_AISHCSTRIP"],
    kind: "point",
    color: "#059669",
    required: false,
  },
];

export function getAirspaceLayer(id: string): AirspaceLayerDef | undefined {
  return AIRSPACE_LAYERS.find((layer) => layer.id === id);
}

/** Comma-separated VWorld WMS layer ids for a layer's `dataCodes` (max 4,
 * matching VWorld's per-request WMS layer limit — every entry in this
 * catalog stays at or under that). Pass directly as WMSTileLayer's
 * `layers` prop. */
export function getWmsLayerParam(layer: AirspaceLayerDef): string {
  return layer.dataCodes.map((code) => code.toLowerCase()).join(",");
}
