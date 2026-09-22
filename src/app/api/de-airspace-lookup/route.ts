/**
 * 독일 좌표에 대한 DIPUL 지리적 구역(비행제한구역/관제구역 등) 지점별 조회 —
 * 서버(Vercel 함수)에서 DIPUL 공식 GeoServer WMS의 GetFeatureInfo를 호출한다.
 *
 * 대한민국(/api/airspace-lookup, VWorld WMS 경유) 라우트와 동일한 "WMS
 * GetFeatureInfo로 지점 조회" 구조를 그대로 따른다 — DIPUL도 표준 OGC WMS이고
 * (VWorld와 달리) 공식 문서상 인증키/등록이 전혀 필요 없다고 명시돼 있어
 * 한국처럼 서버 IP 차단을 우회할 필요 자체가 없을 것으로 예상된다.
 *
 * **중요(2026-09-22, 미검증 부분)**: 클라우드 세션의 아웃바운드 네트워크
 * 정책(독일 정부 도메인 차단) + WebFetch의 robots.txt 준수 정책 두 가지
 * 모두에 막혀, 이 라우트를 작성하는 시점에는 실제 좌표로 GetFeatureInfo
 * 응답을 사전 실측하지 못했다. 아래 구현은 (1) 공식 문서가 명시한 OGC WMS
 * 1.3.0 표준 동작, (2) GeoServer(DIPUL의 실제 서버 소프트웨어로 확인됨)의
 * 표준 GetFeatureInfo `INFO_FORMAT=application/json` 응답이 대한민국
 * 라우트가 실측 검증한 VWorld 응답과 구조적으로 동일한 GeoJSON
 * FeatureCollection(feature.id="레이어명.번호", properties, geometry)이라는
 * 점에 근거해 작성했다. 실제 속성 필드명(독일어 키)은 알 수 없어 한국
 * 라우트의 "usable string 값을 범용으로 추출" 폴백 로직을 그대로 사용한다.
 * **배포 후 반드시 Vercel 실서버에서 실제 좌표(예: 프랑크푸르트 공항 인근)로
 * 최종 검증이 필요하다** — 카테고리명(레이어 nameKo/라벨)은 카탈로그
 * (de-airspace-layers.ts)의 고정값을 쓰므로 속성 추출이 실패해도 "이 위치는
 * XX구역입니다"라는 최소한의 정확한 정보는 항상 보장된다(한국/스페인과
 * 동일한 안전 원칙).
 */
import { NextRequest, NextResponse } from "next/server";
import {
  DE_AIRSPACE_LAYERS,
  DE_WMS_URL,
  getDeQualifiedLayerName,
} from "@/lib/de-airspace-layers";
import type { LatLngRing } from "@/lib/airspace";

const LOOKUP_DELTA_DEG = 0.01;
const LOOKUP_SIZE_PX = 256;
const MAX_LABELS_PER_ZONE = 4;
const FEATURE_COUNT = 50;

// wmsName(소문자, 네임스페이스 제외) → 카탈로그 항목. GeoServer GetFeatureInfo
// JSON 응답의 feature.id는 보통 "레이어명.번호"(네임스페이스 접두사 없음)
// 형태이므로, 한국 라우트와 동일하게 이 값으로 되돌린다.
const LAYER_BY_WMS_NAME = new Map(
  DE_AIRSPACE_LAYERS.map((layer) => [layer.wmsName.toLowerCase(), layer] as const),
);

// 대표 zone 선정 우선순위 — required 레이어(실제 비행 제한과 직결)를 먼저,
// 그중에서도 비행제한구역 > 관제구역 순으로 심각도가 높다고 본다.
const PRIORITY_ORDER = ["flugbeschraenkungsgebiete", "kontrollzonen"];
function layerPriority(layerId: string): number {
  const idx = PRIORITY_ORDER.indexOf(layerId);
  if (idx !== -1) return idx;
  const catalogIdx = DE_AIRSPACE_LAYERS.findIndex((l) => l.id === layerId);
  return PRIORITY_ORDER.length + (catalogIdx === -1 ? 999 : catalogIdx);
}

type GeoJsonFeature = {
  id?: string;
  properties?: Record<string, unknown>;
  geometry?: {
    type?: string;
    coordinates?: number[][][] | number[][][][];
  };
};

function toBoundary(geom?: GeoJsonFeature["geometry"]): LatLngRing[][] | undefined {
  if (!geom?.coordinates) return undefined;
  // 표준 GeoJSON은 CRS와 무관하게 항상 [lon, lat] 순서를 쓴다 — Leaflet은
  // [lat, lon]을 기대하므로 여기서 뒤집는다(한국 라우트와 동일).
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

/** 속성 객체에서 "사람이 읽을 만한 라벨"로 보이는 값을 범용으로 뽑아낸다.
 * 독일 레이어의 실제 필드명을 사전에 확인하지 못했으므로(위 파일 상단 주석
 * 참고), 한국 라우트와 동일하게 이름/라벨류 필드를 우선하고, 없으면
 * 숫자가 아닌 문자열 값을 대신 채택한다. 어느 쪽도 못 찾아도 호출부는
 * 카탈로그의 고정 레이어명만으로 정상 표시된다. */
function extractLabels(properties: Record<string, unknown>): string[] {
  const isUsableString = (v: unknown): v is string =>
    typeof v === "string" && v.trim().length >= 2 && !/^\d+$/.test(v.trim());

  const LABEL_KEY_HINTS = ["name", "bezeichnung", "bez", "art", "beschreibung", "lbl"];
  const entries = Object.entries(properties);
  const labeled = entries
    .filter(
      ([key, v]) =>
        LABEL_KEY_HINTS.some((hint) => key.toLowerCase().includes(hint)) &&
        isUsableString(v),
    )
    .map(([, v]) => (v as string).trim());

  const source =
    labeled.length > 0
      ? labeled
      : entries.filter(([, v]) => isUsableString(v)).map(([, v]) => (v as string).trim());

  return Array.from(new Set(source)).slice(0, MAX_LABELS_PER_ZONE);
}

export type DeAirspaceLookupMatch = {
  layerId: string;
  labels: string[];
  boundary?: LatLngRing[][];
};

export type DeAirspaceLookupResponse = {
  matches: DeAirspaceLookupMatch[];
};

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const lat = Number(params.get("lat"));
  const lon = Number(params.get("lon"));

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return NextResponse.json({ error: "lat/lon required" }, { status: 400 });
  }

  const qualifiedLayers = DE_AIRSPACE_LAYERS.map((l) =>
    getDeQualifiedLayerName(l),
  ).join(",");

  const center = Math.round(LOOKUP_SIZE_PX / 2);
  const url = new URL(DE_WMS_URL);
  url.searchParams.set("SERVICE", "WMS");
  url.searchParams.set("VERSION", "1.3.0");
  url.searchParams.set("REQUEST", "GetFeatureInfo");
  url.searchParams.set("LAYERS", qualifiedLayers);
  url.searchParams.set("QUERY_LAYERS", qualifiedLayers);
  url.searchParams.set("STYLES", "");
  url.searchParams.set("FORMAT", "image/png");
  url.searchParams.set("INFO_FORMAT", "application/json");
  url.searchParams.set("TRANSPARENT", "true");
  url.searchParams.set("CRS", "EPSG:4326");
  url.searchParams.set("FEATURE_COUNT", String(FEATURE_COUNT));
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
      console.error(`de-airspace-lookup failed: HTTP ${res.status}`);
      return NextResponse.json({ error: "lookup failed" }, { status: 502 });
    }

    const data = (await res.json()) as { features?: GeoJsonFeature[] };
    const features = data.features ?? [];

    const byLayer = new Map<string, DeAirspaceLookupMatch>();
    for (const feature of features) {
      const prefix = feature.id?.split(".")[0]?.toLowerCase();
      const layer = prefix ? LAYER_BY_WMS_NAME.get(prefix) : undefined;
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

    return NextResponse.json({ matches } satisfies DeAirspaceLookupResponse);
  } catch (err) {
    console.error("de-airspace-lookup failed:", err);
    return NextResponse.json({ error: "lookup failed" }, { status: 502 });
  }
}
