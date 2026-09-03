/**
 * 미국 좌표에 대한 공역(Class B/C/D/E, 비행금지/제한/경고/주의구역, 군사훈련구역
 * MOA, FAA 인증 식별구역 FRIA) 지점별 조회 — 서버(Vercel 함수)에서 FAA의 공개
 * ArcGIS Online FeatureServer 3개를 호출한다.
 *
 * 대한민국의 /api/airspace-lookup(브이월드 WMS GetFeatureInfo 경유)과 같은
 * "서버가 대신 조회해서 지점에 매칭된 zone만 반환" 구조를 그대로 따르되,
 * 데이터 출처는 완전히 다르다: FAA 조직(services6.arcgis.com/ssFJjBXIUyZDrSYZ)은
 * 인증키가 필요 없는 공개 FeatureServer이며, 이미 이 저장소에서
 * src/lib/airspace.ts의 fetchFaaAirspaceCeiling()이 같은 조직의 다른
 * 서비스(FAA_UAS_FacilityMap_Data)를 geometryType=esriGeometryPoint로
 * 정상 호출해 프로덕션에서 검증된 방식이다 — 이 라우트도 동일한 지점 조회
 * 방식을 그대로 재사용한다.
 *
 * 이 조직은 WMS/MapServer(래스터 타일) 서비스를 제공하지 않는다(2026-09
 * 확인) — 그래서 한국처럼 지도 전체에 상시 색칠된 오버레이를 두지 않고,
 * 검색/클릭한 지점 하나만 조회해서 결과를 보여주는 방식으로 구현한다
 * (사용자 승인 사항 — "클릭 시점 조회만" 방식).
 *
 * 레이어 매핑(2026-09 실제 서비스 조회로 확인한 값):
 * - Class_Airspace: CLASS 속성이 "B"/"C"/"D"/"E"인 경우만 매핑. 그 외 값
 *   (예: Mode C veil의 "Other")은 무시한다.
 * - Special_Use_Airspace: TYPE_CODE 속성이 "P"(금지)/"R"(제한)/"W"(경고)/
 *   "A"(주의)/"MOA"(군사훈련구역)인 경우만 매핑. Prohibited_Areas 레이어는
 *   Special_Use_Airspace의 TYPE_CODE='P' 부분집합으로 확인되어 별도 호출
 *   하지 않는다(중복 방지).
 * - FAA_Recognized_Identification_Areas: 속성 구분 없이, 결과가 있으면
 *   그 자체로 FRIA 매칭.
 *
 * 일반 TFR(임시비행제한구역, tfr.faa.gov)은 이번 1단계 범위에서 제외한다 —
 * JSON 피드 스키마를 아직 검증하지 못했다.
 */
import { NextRequest, NextResponse } from "next/server";
import type { LatLngRing } from "@/lib/airspace";

const ARCGIS_BASE =
  "https://services6.arcgis.com/ssFJjBXIUyZDrSYZ/arcgis/rest/services";

const MAX_LABELS_PER_ZONE = 3;

const CLASS_AIRSPACE_TO_LAYER: Record<string, string> = {
  B: "classB",
  C: "classC",
  D: "classD",
  E: "classE",
};

const SPECIAL_USE_TYPE_TO_LAYER: Record<string, string> = {
  P: "prohibited",
  R: "restricted",
  W: "warning",
  A: "alert",
  MOA: "moa",
};

// 대표 zone(카드 최상단에 그릴 경계) 선정 우선순위 — 한국 라우트와 같은
// 원칙: 비행 자체가 금지/제한되는 레이어를 정보성 레이어보다 우선한다.
const PRIORITY_ORDER = [
  "prohibited",
  "restricted",
  "classB",
  "classC",
  "classD",
  "classE",
  "alert",
  "warning",
  "moa",
  "fria",
];
function layerPriority(layerId: string): number {
  const idx = PRIORITY_ORDER.indexOf(layerId);
  return idx === -1 ? PRIORITY_ORDER.length : idx;
}

type EsriFeature = {
  attributes?: Record<string, unknown>;
  geometry?: { rings?: number[][][] };
};

function toBoundary(geom?: EsriFeature["geometry"]): LatLngRing[][] | undefined {
  const rings = geom?.rings;
  if (!rings || rings.length === 0) return undefined;
  // Esri rings는 [x, y](경도, 위도) — Leaflet은 [lat, lon]을 기대한다.
  // 한 feature의 rings 전체(외곽선 + 구멍/추가 조각)를 하나의 폴리곤으로 취급
  // 한다 — src/lib/airspace.ts의 fetchFaaAirspaceCeiling과 동일한 방식.
  const allRings: LatLngRing[] = rings.map((ring) =>
    ring.map(([x, y]) => [y, x] as [number, number]),
  );
  return [allRings];
}

async function queryFeatureServer(
  layerPath: string,
  latitude: number,
  longitude: number,
  outFields: string,
): Promise<EsriFeature[]> {
  const url = new URL(`${ARCGIS_BASE}/${layerPath}/query`);
  url.searchParams.set("geometry", `${longitude},${latitude}`);
  url.searchParams.set("geometryType", "esriGeometryPoint");
  url.searchParams.set("inSR", "4326");
  url.searchParams.set("spatialRel", "esriSpatialRelIntersects");
  url.searchParams.set("outFields", outFields);
  url.searchParams.set("returnGeometry", "true");
  url.searchParams.set("outSR", "4326");
  url.searchParams.set("f", "json");

  const res = await fetch(url.toString(), { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`ArcGIS ${layerPath} 조회 실패: HTTP ${res.status}`);
  }
  const data = (await res.json()) as {
    features?: EsriFeature[];
    error?: unknown;
  };
  // Esri는 요청 한도 초과 등 오류도 HTTP 200 + 본문의 error 필드로 내려줄
  // 때가 있다 — 이 경우도 "빈 결과"가 아니라 명백한 실패로 취급해야 한다.
  // 그렇지 않으면 실제로는 조회에 실패했을 뿐인데 "이 위치는 제한 구역이
  // 아닙니다"처럼 확정적으로 안전하다고 오인시킬 위험이 있다.
  if (data.error) {
    throw new Error(
      `ArcGIS ${layerPath} 조회 오류: ${JSON.stringify(data.error)}`,
    );
  }
  return data.features ?? [];
}

// R-2508처럼 상한이 없는(UNLIMITED) 구역은 UPPER_VAL이 -9998 같은 Esri
// 센티널 값으로 내려온다 — 그대로 노출하면 "-9998"처럼 의미 없는 숫자로
// 보이므로 "UNL"(항공 표기 관례)로 바꾼다. UOM이 비어 있으면 단위 없이
// 숫자만 붙인다.
function formatAltitudeValue(val: unknown, uom: unknown): string | undefined {
  if (typeof val !== "number" && typeof val !== "string") return undefined;
  const num = typeof val === "number" ? val : Number(val);
  if (Number.isFinite(num) && num <= -9000) return "UNL";
  const uomStr = isUsableLabel(uom) ? uom.trim() : "";
  return `${val}${uomStr}`;
}

function isUsableLabel(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

export type UsAirspaceLookupMatch = {
  layerId: string;
  labels: string[];
  boundary?: LatLngRing[][];
};

export type UsAirspaceLookupResponse = {
  matches: UsAirspaceLookupMatch[];
};

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const lat = Number(params.get("lat"));
  const lon = Number(params.get("lon"));

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return NextResponse.json({ error: "lat/lon required" }, { status: 400 });
  }

  const byLayer = new Map<string, UsAirspaceLookupMatch>();
  const addMatch = (
    layerId: string,
    labels: string[],
    boundary: LatLngRing[][] | undefined,
  ) => {
    const existing = byLayer.get(layerId);
    if (existing) {
      existing.labels = Array.from(
        new Set([...existing.labels, ...labels]),
      ).slice(0, MAX_LABELS_PER_ZONE);
      if (!existing.boundary && boundary) existing.boundary = boundary;
    } else {
      byLayer.set(layerId, {
        layerId,
        labels: labels.slice(0, MAX_LABELS_PER_ZONE),
        boundary,
      });
    }
  };

  try {
    // 세 조회 중 하나라도 실패하면(요청 한도 초과 등) 아래 catch로 넘어가
    // 오류 응답을 반환한다 — 절대 "일부만 확인됨"을 "이 구역엔 제한 없음"
    // 으로 둔갑시키지 않기 위해 개별 .catch()로 빈 배열 처리하지 않는다.
    const [classFeatures, suaFeatures, friaFeatures] = await Promise.all([
      queryFeatureServer(
        "Class_Airspace/FeatureServer/0",
        lat,
        lon,
        "CLASS,NAME",
      ),
      queryFeatureServer(
        "Special_Use_Airspace/FeatureServer/0",
        lat,
        lon,
        "TYPE_CODE,NAME,UPPER_VAL,UPPER_UOM,LOWER_VAL,LOWER_UOM",
      ),
      queryFeatureServer(
        "FAA_Recognized_Identification_Areas/FeatureServer/0",
        lat,
        lon,
        "title,orgName,refNumber",
      ),
    ]);

    for (const feature of classFeatures) {
      const cls = String(feature.attributes?.CLASS ?? "").trim();
      const layerId = CLASS_AIRSPACE_TO_LAYER[cls];
      if (!layerId) continue;
      const name = feature.attributes?.NAME;
      addMatch(
        layerId,
        isUsableLabel(name) ? [name] : [],
        toBoundary(feature.geometry),
      );
    }

    for (const feature of suaFeatures) {
      const typeCode = String(feature.attributes?.TYPE_CODE ?? "").trim();
      const layerId = SPECIAL_USE_TYPE_TO_LAYER[typeCode];
      if (!layerId) continue;
      const labels: string[] = [];
      const name = feature.attributes?.NAME;
      if (isUsableLabel(name)) labels.push(name);
      const upperLabel = formatAltitudeValue(
        feature.attributes?.UPPER_VAL,
        feature.attributes?.UPPER_UOM,
      );
      const lowerLabel = formatAltitudeValue(
        feature.attributes?.LOWER_VAL,
        feature.attributes?.LOWER_UOM,
      );
      if (lowerLabel !== undefined && upperLabel !== undefined) {
        labels.push(`${lowerLabel} - ${upperLabel}`);
      }
      addMatch(layerId, labels, toBoundary(feature.geometry));
    }

    if (friaFeatures.length > 0) {
      const first = friaFeatures[0];
      const title = first.attributes?.title;
      const orgName = first.attributes?.orgName;
      const labels = [title, orgName].filter(isUsableLabel);
      addMatch("fria", labels, toBoundary(first.geometry));
    }

    const matches = Array.from(byLayer.values()).sort(
      (a, b) => layerPriority(a.layerId) - layerPriority(b.layerId),
    );

    return NextResponse.json({ matches } satisfies UsAirspaceLookupResponse);
  } catch (err) {
    // 조회 자체가 실패한 경우 절대 { matches: [] }(= "확인 결과 제한
    // 없음")를 반환하지 않는다 — 클라이언트(fetchUsAirspaceZones)는 이
    // res.ok=false 응답을 null(= "정보 없음")로 처리해 "제한 없음"이라는
    // 확정적 문구 대신 "상세 데이터가 아직 준비되지 않았습니다"를 보여준다.
    console.error("us-airspace-lookup failed:", err);
    return NextResponse.json({ error: "lookup failed" }, { status: 502 });
  }
}
