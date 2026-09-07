/**
 * 스페인 좌표에 대한 UAS 지리적 구역(ZGUAS: 항공/도심/기반시설) 지점별 조회 —
 * 서버(Vercel 함수)에서 ENAIRE의 공개 ArcGIS MapServer 3개 레이어를 호출한다.
 *
 * 대한민국(/api/airspace-lookup, VWorld WMS 경유)·미국(/api/us-airspace-lookup,
 * FAA FeatureServer 3개 병렬 조회) 라우트와 같은 "서버가 대신 조회해서 지점에
 * 매칭된 zone만 반환" 구조를 그대로 따르되, 데이터 출처는 완전히 다르다:
 * ENAIRE `NSF_SRV/SRV_UAS_ZG_V0` 서비스는 인증키/등록이 전혀 필요 없는 공개
 * MapServer이며(2026-09-07 실측 확인), FeatureServer 확장이 없어 반드시
 * MapServer 경로(`/MapServer/{mapServerId}/query`)로 조회해야 한다 — 레이어별
 * `mapServerId`/`wmsName` 매핑은 src/lib/es-airspace-layers.ts 참고.
 *
 * 각 zone의 속성 스키마는 EU/EASA UAS 공통 GeoZone 형식을 따르는 것으로
 * 보이며(실측 확인), 세 레이어 모두 동일한 필드 집합을 공유한다: `type`
 * (REQ_AUTHORIZATION/CONDITIONAL/PROHIBITED 등 인가 요건), `name`/
 * `otherReasonInfo`(구역명·설명), `reasons`(구역 지정 이유),
 * `lower`/`upper`/`lowerReference`/`upperReference`/`uom`(고도 범위),
 * `provider`(관리 기관). 미국처럼 요청당 outFields를 다르게 줄 필요 없이
 * `outFields=*`로 한 번에 받아 공통 로직으로 처리한다.
 */
import { NextRequest, NextResponse } from "next/server";
import type { LatLngRing } from "@/lib/airspace";
import { ES_AIRSPACE_LAYERS, ES_MAPSERVER_BASE_URL } from "@/lib/es-airspace-layers";

const MAX_LABELS_PER_ZONE = 4;

// 대표 zone(카드 최상단에 그릴 경계) 선정 우선순위 — 레이어(항공/도심/기반시설)
// 자체가 아니라 실제 인가 요건 강도로 매긴다. PROHIBITED는 실측에서 아직
// 만나지 못했지만 EASA GeoZone 공통 스키마상 존재할 수 있어 최우선으로 둔다.
const TYPE_PRIORITY = ["PROHIBITED", "REQ_AUTHORIZATION", "CONDITIONAL"];
function typePriority(type: unknown): number {
  const idx = TYPE_PRIORITY.indexOf(String(type ?? "").toUpperCase());
  return idx === -1 ? TYPE_PRIORITY.length : idx;
}

function isUsableLabel(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

type EsriFeature = {
  attributes?: Record<string, unknown>;
  geometry?: { rings?: number[][][] };
};

function toBoundary(geom?: EsriFeature["geometry"]): LatLngRing[][] | undefined {
  const rings = geom?.rings;
  if (!rings || rings.length === 0) return undefined;
  // Esri rings는 [x, y](경도, 위도) — Leaflet은 [lat, lon]을 기대한다. 한
  // feature의 rings 전체(외곽선 + 구멍/추가 조각)를 하나의 폴리곤으로 취급
  // 한다 — src/lib/airspace.ts의 fetchFaaAirspaceCeiling과 동일한 방식.
  const allRings: LatLngRing[] = rings.map((ring) =>
    ring.map(([x, y]) => [y, x] as [number, number]),
  );
  return [allRings];
}

function altitudeLabel(attrs: Record<string, unknown>): string | undefined {
  const lower = attrs.lower;
  const upper = attrs.upper;
  if (typeof lower !== "number" && typeof upper !== "number") return undefined;
  const uom = isUsableLabel(attrs.uom) ? attrs.uom : "m";
  const ref = isUsableLabel(attrs.lowerReference) ? attrs.lowerReference : "AGL";
  const lowerStr = typeof lower === "number" ? `${lower}${uom}` : "?";
  const upperStr = typeof upper === "number" ? `${upper}${uom}` : "?";
  return `${lowerStr} - ${upperStr} ${ref}`;
}

/** 한 feature에서 사람이 읽을 만한 라벨을 뽑는다 — name이 비어 있는 경우가
 * 많아(실측 확인) otherReasonInfo/reasons/provider까지 순서대로 시도한다. */
function extractLabels(attrs: Record<string, unknown>): string[] {
  const labels: string[] = [];
  if (isUsableLabel(attrs.name)) labels.push(attrs.name);
  if (isUsableLabel(attrs.otherReasonInfo)) labels.push(attrs.otherReasonInfo);
  const altitude = altitudeLabel(attrs);
  if (altitude) labels.push(altitude);
  if (isUsableLabel(attrs.reasons)) labels.push(attrs.reasons);
  if (isUsableLabel(attrs.provider)) labels.push(attrs.provider);
  return Array.from(new Set(labels)).slice(0, MAX_LABELS_PER_ZONE);
}

async function queryLayer(
  mapServerId: number,
  latitude: number,
  longitude: number,
): Promise<EsriFeature[]> {
  const url = new URL(`${ES_MAPSERVER_BASE_URL}/${mapServerId}/query`);
  url.searchParams.set("geometry", `${longitude},${latitude}`);
  url.searchParams.set("geometryType", "esriGeometryPoint");
  url.searchParams.set("inSR", "4326");
  url.searchParams.set("spatialRel", "esriSpatialRelIntersects");
  url.searchParams.set("outFields", "*");
  url.searchParams.set("returnGeometry", "true");
  url.searchParams.set("outSR", "4326");
  url.searchParams.set("f", "json");

  const res = await fetch(url.toString(), { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`ENAIRE MapServer/${mapServerId} 조회 실패: HTTP ${res.status}`);
  }
  const data = (await res.json()) as { features?: EsriFeature[]; error?: unknown };
  // Esri는 오류도 HTTP 200 + 본문의 error 필드로 내려줄 때가 있다 — 이 경우도
  // "빈 결과"가 아니라 명백한 실패로 취급해야 한다(미국 라우트와 동일 원칙).
  if (data.error) {
    throw new Error(`ENAIRE MapServer/${mapServerId} 조회 오류: ${JSON.stringify(data.error)}`);
  }
  return data.features ?? [];
}

export type EsAirspaceLookupMatch = {
  layerId: string;
  labels: string[];
  boundary?: LatLngRing[][];
};

export type EsAirspaceLookupResponse = {
  matches: EsAirspaceLookupMatch[];
};

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const lat = Number(params.get("lat"));
  const lon = Number(params.get("lon"));

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return NextResponse.json({ error: "lat/lon required" }, { status: 400 });
  }

  try {
    // 세 레이어 중 하나라도 조회에 실패하면(요청 한도 초과 등) 아래 catch로
    // 넘어가 오류 응답을 반환한다 — 개별 .catch()로 빈 배열 처리해 "일부만
    // 확인됨"을 "이 구역엔 제한 없음"으로 둔갑시키지 않는다(미국 라우트와
    // 동일 원칙).
    const results = await Promise.all(
      ES_AIRSPACE_LAYERS.map((layer) => queryLayer(layer.mapServerId, lat, lon)),
    );

    const matches: (EsAirspaceLookupMatch & { priority: number })[] = [];
    ES_AIRSPACE_LAYERS.forEach((layer, i) => {
      const features = results[i];
      if (features.length === 0) return;

      const labels = new Set<string>();
      let boundary: LatLngRing[][] | undefined;
      let priority = TYPE_PRIORITY.length;
      for (const feature of features) {
        const attrs = feature.attributes ?? {};
        extractLabels(attrs).forEach((l) => labels.add(l));
        if (!boundary) boundary = toBoundary(feature.geometry);
        priority = Math.min(priority, typePriority(attrs.type));
      }

      matches.push({
        layerId: layer.id,
        labels: Array.from(labels).slice(0, MAX_LABELS_PER_ZONE),
        boundary,
        priority,
      });
    });

    matches.sort((a, b) => a.priority - b.priority);
    const response: EsAirspaceLookupResponse = {
      matches: matches.map(({ layerId, labels, boundary }) => ({
        layerId,
        labels,
        boundary,
      })),
    };

    return NextResponse.json(response);
  } catch (err) {
    // 조회 자체가 실패한 경우 절대 { matches: [] }(= "확인 결과 제한 없음")를
    // 반환하지 않는다 — 클라이언트(fetchEsAirspaceZones)는 이 res.ok=false
    // 응답을 null(= "정보 없음")로 처리해 "제한 없음"이라는 확정적 문구 대신
    // "상세 데이터가 아직 준비되지 않았습니다"를 보여준다(미국 라우트와
    // 동일 원칙).
    console.error("es-airspace-lookup failed:", err);
    return NextResponse.json({ error: "lookup failed" }, { status: 502 });
  }
}
