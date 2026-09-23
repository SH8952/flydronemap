/**
 * 독일 좌표에 대한 DIPUL 지리적 구역(비행제한구역/관제구역 등) 지점별 조회 —
 * 서버(Vercel 함수)에서 DIPUL 공식 GeoServer WMS의 GetFeatureInfo를 호출한다.
 *
 * **2026-09-22 실측으로 확정된 사양**: 처음에는 한국(VWorld)과 동일하게
 * `INFO_FORMAT=application/json`으로 구현했으나, 실제 사용자 테스트(로컬
 * 개발 서버, 베를린 브란덴부르크 공항 인근 클릭)에서 상세 정보가 전혀
 * 표시되지 않는 문제가 보고됨. Claude in Chrome으로 이 GeoServer에 직접
 * 여러 INFO_FORMAT 값을 실측 조회한 결과, 이 서버는 관리자가
 * `application/json`과 `application/vnd.ogc.gml`(GML) 둘 다 명시적으로
 * 금지해 두었음을 확인(`ServiceException code="ForbiddenFormat"`) —
 * **`text/plain`만 허용**된다. text/plain 응답은 GML/JSON과 달리 실제
 * 폴리곤 좌표(geometry)는 포함하지 않고 "geom = [GEOMETRY (Polygon) with
 * N points]" 같은 요약 문자열만 주지만, 대신 라벨 정보는 한국/스페인보다
 * 오히려 더 풍부하고 구조화되어 있다(`name`/`generated_name_EN`/
 * `legal_ref`/`type_code_detail`/`lower_limit_altitude` 등 고정 키=값
 * 형식, 실측 확인). 이런 이유로 이 라우트는 지도에 그릴 경계(boundary)는
 * 제공하지 못하지만(다른 나라와 다른 부분 — 지도 위 WMS 타일 자체에는
 * 이미 구역이 시각적으로 표시되므로 실사용에 지장은 없음), 클릭 시
 * "공역 정보" 카드에 표시되는 텍스트 상세는 오히려 가장 정확하다.
 *
 * 응답 형식(text/plain, 실측 확인):
 *   "Results for FeatureType 'de.dfs.dipul:kontrollzonen':\n"
 *   "--------------------------------------------\n"
 *   "key = value\n" (여러 줄)
 *   "--------------------------------------------\n"
 *   (매칭된 레이어마다 반복, 매칭이 없으면 전체가 "no features were found")
 * FeatureType 식별자는 "de.dfs.dipul:<레이어명>" 형태(네임스페이스가
 * "dipul"이 아니라 "de.dfs.dipul") — 마지막 콜론 뒤 부분만 취해 카탈로그의
 * wmsName과 대조한다.
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

// wmsName(소문자, 네임스페이스 제외) → 카탈로그 항목.
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

/** "Results for FeatureType '...':" 블록 하나. */
type DeFeatureBlock = {
  /** "de.dfs.dipul:kontrollzonen" 전체 문자열. */
  featureType: string;
  properties: Record<string, string>;
};

/** GeoServer text/plain GetFeatureInfo 응답을 블록 단위로 파싱한다. 실측
 * 확인된 구분자("Results for FeatureType '<id>':" + 대시 구분선 + key = value
 * 줄들)를 그대로 따른다. 매칭이 없으면(정확히 "no features were found")
 * 빈 배열을 반환한다. */
function parseTextPlain(body: string): DeFeatureBlock[] {
  const blocks: DeFeatureBlock[] = [];
  const parts = body.split(/Results for FeatureType '([^']+)':/g);
  // split with a capturing group returns [preamble, id1, body1, id2, body2, ...]
  for (let i = 1; i < parts.length; i += 2) {
    const featureType = parts[i]?.trim();
    const blockBody = parts[i + 1] ?? "";
    if (!featureType) continue;

    const properties: Record<string, string> = {};
    for (const line of blockBody.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || /^-+$/.test(trimmed)) continue;
      const eq = trimmed.indexOf(" = ");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      const value = trimmed.slice(eq + 3).trim();
      if (key === "geom") continue; // 좌표 없이 요약 문자열만 있어 쓸모없음
      properties[key] = value;
    }
    blocks.push({ featureType, properties });
  }
  return blocks;
}

function isUsable(v: string | undefined): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

/** 고도 범위를 "0m AGL - 2500ft MSL" 형태로 합성한다(실측된 필드명 기준). */
function altitudeLabel(p: Record<string, string>): string | undefined {
  const lower = p.lower_limit_altitude;
  const upper = p.upper_limit_altitude;
  if (!isUsable(lower) && !isUsable(upper)) return undefined;
  const lowerStr = isUsable(lower)
    ? `${lower}${p.lower_limit_unit ?? ""} ${p.lower_limit_alt_ref ?? ""}`.trim()
    : "?";
  const upperStr = isUsable(upper)
    ? `${upper}${p.upper_limit_unit ?? ""} ${p.upper_limit_alt_ref ?? ""}`.trim()
    : "?";
  return `${lowerStr} - ${upperStr}`;
}

/** 실측으로 확인된 필드명(generated_name_EN/name/legal_ref/type_code_detail)
 * 우선순위로 최대 4개의 라벨을 뽑는다. 못 찾아도 호출부는 카탈로그의
 * 고정 레이어명만으로 정상 표시된다(한국/스페인과 동일한 안전 원칙). */
function extractLabels(p: Record<string, string>): string[] {
  const labels: string[] = [];
  const name = p.generated_name_EN ?? p.name ?? p.generated_name_DE;
  if (isUsable(name)) labels.push(name);
  const altitude = altitudeLabel(p);
  if (altitude) labels.push(altitude);
  if (isUsable(p.legal_ref)) labels.push(p.legal_ref);
  if (isUsable(p.type_code_detail)) labels.push(p.type_code_detail);
  return Array.from(new Set(labels)).slice(0, MAX_LABELS_PER_ZONE);
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
  // 2026-09-22 실측 확정: 이 서버는 application/json·GML을 명시적으로
  // 금지하고 text/plain만 허용한다(위 파일 상단 주석 참고).
  url.searchParams.set("INFO_FORMAT", "text/plain");
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

    const body = await res.text();
    // 서버가 오류를 HTTP 200 + ServiceExceptionReport(XML) 본문으로 내려줄
    // 때가 있다(실측 확인, 예: 잘못된 INFO_FORMAT) — 이 경우도 "빈 결과"가
    // 아니라 명백한 실패로 취급한다(한국/스페인 라우트와 동일 원칙).
    if (body.includes("ServiceExceptionReport")) {
      console.error("de-airspace-lookup failed: ServiceExceptionReport", body.slice(0, 500));
      return NextResponse.json({ error: "lookup failed" }, { status: 502 });
    }

    const blocks = parseTextPlain(body);

    const byLayer = new Map<string, DeAirspaceLookupMatch>();
    for (const block of blocks) {
      const wmsName = block.featureType.split(":").pop()?.toLowerCase();
      const layer = wmsName ? LAYER_BY_WMS_NAME.get(wmsName) : undefined;
      if (!layer) continue;

      const labels = extractLabels(block.properties);
      const existing = byLayer.get(layer.id);
      if (existing) {
        existing.labels = Array.from(new Set([...existing.labels, ...labels])).slice(
          0,
          MAX_LABELS_PER_ZONE,
        );
      } else {
        byLayer.set(layer.id, { layerId: layer.id, labels });
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
