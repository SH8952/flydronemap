/**
 * 스위스 좌표에 대한 드론 비행 제한구역(연방민간항공청 BAZL의 지리적 UAS 구역)
 * 지점별 조회 — 서버(Vercel 함수)에서 geo.admin.ch REST `identify`를 호출한다.
 * 카탈로그와 실측 근거는 src/lib/wms-airspace-countries.ts 상단 주석 참고.
 *
 * WMS GetFeatureInfo 대신 `identify`를 쓰는 이유(2026-11-02 실측): 이 WMS의
 * `INFO_FORMAT=application/json`은 서버 쪽 OGR GEOJSON 드라이버 오류
 * (`OGR_DS_CreateLayer failed ... GEOJSON`)를 내서 쓸 수 없다. `identify`는
 * 같은 데이터를 JSON으로 정상 반환하고, 지점(esriGeometryPoint)에 포함된
 * 구역만 돌려준다 — 취리히 공항 중심은 공항 구역·공항 둘레·CTR 3건, 베른
 * 시내는 2건, 알프스 산악 지점은 0건으로 확인했다.
 *
 * 응답 속성(실측): zone_name_{de,fr,it,en}, zone_restriction_{...}(제한 문구),
 * zone_restriction_id(REQ_AUTHORISATION.MTOM_ALL/MTOM_FROM/CTR),
 * zone_reason_id(AIR_TRAFFIC/SENSITIVE 등), auth_name_{...}·auth_url_{...}
 * (예외 허가 담당 기관, 배열), time_permanent("Yes") 등. 경계 폴리곤은
 * returnGeometry=true로 받을 수 있지만 취리히 구역만 해도 점이 수백 개라
 * 응답이 커지고, 지도에는 이미 WMS 타일로 구역이 그려지므로 받지 않는다
 * (독일 DIPUL 라우트와 같은 판단).
 */
import { NextRequest, NextResponse } from "next/server";
import { fetchWithRetry } from "@/lib/fetch-with-retry";
import type {
  WmsAirspaceLookupResponse,
  WmsAirspaceMatch,
} from "@/lib/wms-airspace-countries";

const IDENTIFY_URL =
  "https://api3.geo.admin.ch/rest/services/all/MapServer/identify";
const LAYER_ID = "ch.bazl.einschraenkungen-drohnen";
const EXTENT_DELTA_DEG = 0.01;
const REQUEST_TIMEOUT_MS = 10_000;
const MAX_MATCHES = 8;

// 제한 문구·구역명을 제공하는 언어. 사이트 언어(en/ko/ja/es/de) 중 de/en은
// 그대로 대응하고, 나머지는 영어를 쓴다(공식 문구를 직접 번역하지 않는다).
const SOURCE_LANGS = ["de", "fr", "it", "en"] as const;
type SourceLang = (typeof SOURCE_LANGS)[number];
function pickLang(raw: string | null): SourceLang {
  return SOURCE_LANGS.includes(raw as SourceLang) ? (raw as SourceLang) : "en";
}

// 심각도 순(앞일수록 비행 제한이 강함)과 색. 모르는 코드는 맨 뒤, 노란색.
const RESTRICTION_ORDER = [
  "REQ_AUTHORISATION.MTOM_ALL",
  "REQ_AUTHORISATION.MTOM_FROM",
  "REQ_AUTHORISATION.CTR",
];
const RESTRICTION_COLOR: Record<string, string> = {
  "REQ_AUTHORISATION.MTOM_ALL": "#ef4444",
  "REQ_AUTHORISATION.MTOM_FROM": "#f97316",
  "REQ_AUTHORISATION.CTR": "#3b82f6",
};
const DEFAULT_COLOR = "#eab308";

type IdentifyResult = {
  featureId?: number | string;
  attributes?: Record<string, unknown>;
};

/** 속성값이 문자열이거나 문자열 배열(예: auth_name_en)일 수 있어 첫 비어있지 않은 문자열을 꺼낸다. */
function firstString(v: unknown): string | undefined {
  if (typeof v === "string") return v.trim() || undefined;
  if (Array.isArray(v)) {
    for (const item of v) {
      const s = firstString(item);
      if (s) return s;
    }
  }
  return undefined;
}

/** 링크는 http/https만 허용한다(출처 데이터의 임의 문자열이 javascript: 등으로
 * 렌더링되는 것을 막는다). */
function safeUrl(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  try {
    const u = new URL(raw);
    return u.protocol === "https:" || u.protocol === "http:" ? u.toString() : undefined;
  } catch {
    return undefined;
  }
}

function toMatch(
  a: Record<string, unknown>,
  restrictionId: string,
  lang: SourceLang,
): WmsAirspaceMatch | null {
  const title =
    firstString(a[`zone_name_${lang}`]) ?? firstString(a.zone_name_en);
  const description =
    firstString(a[`zone_restriction_${lang}`]) ??
    firstString(a.zone_restriction_en);
  // 이름도 제한 문구도 없으면 사용자에게 보여줄 내용이 없다.
  if (!title && !description) return null;

  const authName =
    firstString(a[`auth_name_${lang}`]) ?? firstString(a.auth_name_en);
  const authService =
    firstString(a[`auth_service_${lang}`]) ?? firstString(a.auth_service_en);
  const authUrl = safeUrl(
    firstString(a[`auth_url_${lang}`]) ?? firstString(a.auth_url_en),
  );
  const authorityName = [authName, authService]
    .filter((s, i, arr): s is string => Boolean(s) && arr.indexOf(s) === i)
    .join(" — ");

  return {
    // 제한 코드("REQ_AUTHORISATION.CTR" 등)는 점이 들어 있어 번역 키로 쓸 수
    // 없으므로, 번역 키는 고정값을 쓰고 코드는 색·정렬에만 쓴다. 구역 이름이
    // 없을 때만 이 키(Home.wmsAirspaceCategories.chZone)가 제목이 된다.
    categoryId: "chZone",
    color: RESTRICTION_COLOR[restrictionId] ?? DEFAULT_COLOR,
    title,
    labels: description ? [description] : [],
    reasonId: firstString(a.zone_reason_id),
    authority: authorityName ? { name: authorityName, url: authUrl } : undefined,
    // 상시(time_permanent === "Yes")가 아니면 기간이 한정된 임시 제한이다.
    temporary: firstString(a.time_permanent) !== "Yes" ? true : undefined,
  };
}

function severity(restrictionId: string): number {
  const idx = RESTRICTION_ORDER.indexOf(restrictionId);
  return idx === -1 ? RESTRICTION_ORDER.length : idx;
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const lat = Number(params.get("lat"));
  const lon = Number(params.get("lon"));
  const lang = pickLang(params.get("lang"));

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return NextResponse.json({ error: "lat/lon required" }, { status: 400 });
  }

  const url = new URL(IDENTIFY_URL);
  url.searchParams.set("geometryType", "esriGeometryPoint");
  url.searchParams.set("geometry", `${lon},${lat}`);
  url.searchParams.set("sr", "4326");
  url.searchParams.set("layers", `all:${LAYER_ID}`);
  url.searchParams.set("tolerance", "0");
  url.searchParams.set(
    "mapExtent",
    `${lon - EXTENT_DELTA_DEG},${lat - EXTENT_DELTA_DEG},${lon + EXTENT_DELTA_DEG},${lat + EXTENT_DELTA_DEG}`,
  );
  url.searchParams.set("imageDisplay", "256,256,96");
  url.searchParams.set("returnGeometry", "false");

  try {
    const res = await fetchWithRetry(url.toString(), () => ({
      cache: "no-store",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    }));
    if (!res.ok) {
      console.error(`ch-airspace-lookup failed: HTTP ${res.status}`);
      return NextResponse.json({ error: "lookup failed" }, { status: 502 });
    }

    const json = (await res.json()) as { results?: IdentifyResult[] };
    // 응답 형태가 예상과 다르면(배열이 아님) "구역 없음"이 아니라 명백한 실패로
    // 취급한다 — 비행 가능으로 오해시키지 않기 위함(다른 나라 라우트와 같은 원칙).
    if (!Array.isArray(json.results)) {
      console.error("ch-airspace-lookup failed: unexpected response shape");
      return NextResponse.json({ error: "lookup failed" }, { status: 502 });
    }

    const seen = new Set<string>();
    const ranked: { rank: number; match: WmsAirspaceMatch }[] = [];
    for (const r of json.results) {
      if (!r.attributes) continue;
      const key = String(r.featureId ?? "");
      if (key && seen.has(key)) continue;
      if (key) seen.add(key);
      const restrictionId = firstString(r.attributes.zone_restriction_id) ?? "";
      const match = toMatch(r.attributes, restrictionId, lang);
      if (match) ranked.push({ rank: severity(restrictionId), match });
    }
    ranked.sort((a, b) => a.rank - b.rank);

    return NextResponse.json({
      matches: ranked.slice(0, MAX_MATCHES).map((e) => e.match),
    } satisfies WmsAirspaceLookupResponse);
  } catch (err) {
    console.error("ch-airspace-lookup failed:", err);
    return NextResponse.json({ error: "lookup failed" }, { status: 502 });
  }
}
