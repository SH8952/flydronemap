/**
 * 대한민국 좌표에 대한 공역(비행금지/제한/관제권 등) 지점별 조회 — 서버(Vercel
 * 함수)에서 브이월드 WMS GetFeatureInfo를 호출한다.
 *
 * 배경: 브이월드는 api.vworld.kr/req/data(2D데이터 JSON API) 호출을 Vercel
 * 서버 IP 대역에서 차단하지만, 같은 서버에서 /req/wms의 GetFeatureInfo를
 * 호출하는 것은 차단하지 않는다 — 2026-09-03 실제 프로덕션 서버(Vercel,
 * icn1)에서 반복 검증 완료(서로 다른 두 지점·레이어, 빈 결과·복수 레이어
 * 동시 조회 모두 정상). 클라이언트(브라우저)에서 같은 요청을 하면 Referer
 * 유무와 무관하게 항상 503이 발생해 이 방식이 유일한 실동작 경로다.
 *
 * 조회 지점이 여러 zone에 걸쳐 매칭될 수 있다는 것도 별도 검증했다: bbox
 * 크기를 20배 줄여도 결과가 동일했고(고리원전 중심점은 실제로 내부/외부
 * 두 개의 동심원 zone에 모두 포함됨), 두 zone 중 하나의 경계 밖·다른
 * 하나의 경계 안에 있는 지점에서는 정확히 그 하나만 반환됨을 확인했다 —
 * bbox 전체와 교차하는 모든 feature를 무차별 반환하는 것이 아니라, 실제
 * 지점 기반으로 정확히 매칭된 결과라는 뜻이다.
 *
 * 레이어별 속성 스키마는 서로 다르다(예: 비행금지구역은 prh_lbl_1~4,
 * 관제권은 ctr_lbl_1) — 14개 레이어 전부의 스키마를 사전에 확인하는 대신,
 * "라벨/이름류로 보이는 속성값"을 범용적으로 추출하는 방식을 쓴다(아래
 * extractLabels 참고). 카테고리명은 항상 src/lib/airspace-layers.ts 카탈로그의
 * 검증된 nameKo를 쓰므로, 이 범용 추출이 실패하더라도(라벨을 하나도 못
 * 찾더라도) 최소한 "이 위치는 XX구역입니다"라는 정확한 정보는 항상 보장된다.
 */
import { NextRequest, NextResponse } from "next/server";
import { AIRSPACE_LAYERS } from "@/lib/airspace-layers";
import type { LatLngRing } from "@/lib/airspace";

const VWORLD_KEY = process.env.NEXT_PUBLIC_VWORLD_API_KEY;
const VWORLD_DOMAIN = process.env.NEXT_PUBLIC_VWORLD_DOMAIN;

const LOOKUP_DELTA_DEG = 0.01;
const LOOKUP_SIZE_PX = 256;
const MAX_LABELS_PER_ZONE = 4;

// dataCode(소문자) → 카탈로그 항목, GetFeatureInfo 응답의 feature id 접두사
// (예: "lt_c_aisprhc.1"의 "lt_c_aisprhc")를 이 레이어 카탈로그로 되돌리기 위함.
const LAYER_BY_DATA_CODE = new Map(
  AIRSPACE_LAYERS.flatMap((layer) =>
    layer.dataCodes.map((code) => [code.toLowerCase(), layer] as const),
  ),
);

// 대표 zone(카드 최상단에 크게 보여줄 것) 선정 우선순위 — required 레이어를
// 우선하고, 그중에서도 비행금지 > 비행제한 > 관제권 순으로 심각도가 높다고
// 본다. 나머지는 카탈로그 순서를 그대로 따른다.
const PRIORITY_ORDER = ["prohibited", "restricted", "controlZone"];
function layerPriority(layerId: string): number {
  const idx = PRIORITY_ORDER.indexOf(layerId);
  if (idx !== -1) return idx;
  const catalogIdx = AIRSPACE_LAYERS.findIndex((l) => l.id === layerId);
  return PRIORITY_ORDER.length + (catalogIdx === -1 ? 999 : catalogIdx);
}

type VWorldFeature = {
  id?: string;
  properties?: Record<string, unknown>;
  geometry?: {
    type?: string;
    coordinates?: number[][][] | number[][][][];
  };
};

function toBoundary(geom?: VWorldFeature["geometry"]): LatLngRing[][] | undefined {
  if (!geom?.coordinates) return undefined;
  const toLatLngRing = (ring: number[][]): LatLngRing =>
    ring.map(([lon, lat]) => [lat, lon] as [number, number]);

  if (geom.type === "MultiPolygon") {
    return (geom.coordinates as number[][][][]).map((polygon) =>
      polygon.map(toLatLngRing),
    );
  }
  if (geom.type === "Polygon") {
    return [(geom.coordinates as number[][][]).map(toLatLngRing)];
  }
  return undefined;
}

/** 속성 객체에서 "사람이 읽을 만한 라벨"로 보이는 값들을 뽑아낸다. 필드명에
 * "lbl"이 들어간 것을 우선 채택(관측된 모든 레이어가 이 명명 규칙을 씀 —
 * prh_lbl_*, ctr_lbl_*), 없으면 null이 아니고 순수 숫자가 아닌 문자열 값을
 * 대신 채택한다. 어느 쪽으로도 못 찾으면 빈 배열을 반환하며, 이 경우에도
 * 호출부는 카탈로그의 nameKo만으로 정상 표시한다. */
function extractLabels(properties: Record<string, unknown>): string[] {
  const isUsableString = (v: unknown): v is string =>
    typeof v === "string" && v.trim().length >= 2 && !/^\d+$/.test(v.trim());

  const entries = Object.entries(properties);
  const labeled = entries
    .filter(([key, v]) => key.toLowerCase().includes("lbl") && isUsableString(v))
    .map(([, v]) => (v as string).trim());

  const source = labeled.length > 0
    ? labeled
    : entries.filter(([, v]) => isUsableString(v)).map(([, v]) => (v as string).trim());

  return Array.from(new Set(source)).slice(0, MAX_LABELS_PER_ZONE);
}

export type AirspaceLookupMatch = {
  layerId: string;
  labels: string[];
  boundary?: LatLngRing[][];
};

export type AirspaceLookupResponse = {
  matches: AirspaceLookupMatch[];
};

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const lat = Number(params.get("lat"));
  const lon = Number(params.get("lon"));

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return NextResponse.json({ error: "lat/lon required" }, { status: 400 });
  }
  if (!VWORLD_KEY) {
    return NextResponse.json({ matches: [] } satisfies AirspaceLookupResponse);
  }

  const allLayerIds = AIRSPACE_LAYERS.flatMap((l) =>
    l.dataCodes.map((c) => c.toLowerCase()),
  ).join(",");

  const center = Math.round(LOOKUP_SIZE_PX / 2);
  const url = new URL("https://api.vworld.kr/req/wms");
  url.searchParams.set("key", VWORLD_KEY);
  if (VWORLD_DOMAIN) url.searchParams.set("domain", VWORLD_DOMAIN);
  url.searchParams.set("SERVICE", "WMS");
  url.searchParams.set("VERSION", "1.3.0");
  url.searchParams.set("REQUEST", "GetFeatureInfo");
  url.searchParams.set("LAYERS", allLayerIds);
  url.searchParams.set("QUERY_LAYERS", allLayerIds);
  url.searchParams.set("STYLES", "");
  url.searchParams.set("FORMAT", "image/png");
  url.searchParams.set("INFO_FORMAT", "application/json");
  url.searchParams.set("TRANSPARENT", "true");
  url.searchParams.set("CRS", "EPSG:4326");
  url.searchParams.set(
    "BBOX",
    `${lat - LOOKUP_DELTA_DEG},${lon - LOOKUP_DELTA_DEG},${lat + LOOKUP_DELTA_DEG},${lon + LOOKUP_DELTA_DEG}`,
  );
  url.searchParams.set("WIDTH", String(LOOKUP_SIZE_PX));
  url.searchParams.set("HEIGHT", String(LOOKUP_SIZE_PX));
  url.searchParams.set("I", String(center));
  url.searchParams.set("J", String(center));

  try {
    const res = await fetch(url.toString(), { cache: "no-store" });
    if (!res.ok) {
      return NextResponse.json({ matches: [] } satisfies AirspaceLookupResponse);
    }

    const data = (await res.json()) as { features?: VWorldFeature[] };
    const features = data.features ?? [];

    // 같은 레이어에 여러 feature가 매칭될 수 있으므로(예: 동심원 형태의
    // 두 zone), 레이어별로 첫 feature만 대표로 쓰고 나머지는 라벨만 병합.
    const byLayer = new Map<string, AirspaceLookupMatch>();
    for (const feature of features) {
      const prefix = feature.id?.split(".")[0]?.toLowerCase();
      const layer = prefix ? LAYER_BY_DATA_CODE.get(prefix) : undefined;
      if (!layer) continue;

      const labels = extractLabels(feature.properties ?? {});
      const existing = byLayer.get(layer.id);
      if (existing) {
        existing.labels = Array.from(new Set([...existing.labels, ...labels])).slice(
          0,
          MAX_LABELS_PER_ZONE,
        );
      } else {
        byLayer.set(layer.id, {
          layerId: layer.id,
          labels,
          boundary: toBoundary(feature.geometry),
        });
      }
    }

    const matches = Array.from(byLayer.values()).sort(
      (a, b) => layerPriority(a.layerId) - layerPriority(b.layerId),
    );

    return NextResponse.json({ matches } satisfies AirspaceLookupResponse);
  } catch {
    return NextResponse.json({ matches: [] } satisfies AirspaceLookupResponse);
  }
}
