/**
 * 프랑스 좌표에 대한 드론 비행 제한구역(DGAC의 "Restrictions UAS catégorie
 * Ouverte et Aéromodélisme") 지점별 조회 — 서버(Vercel 함수)에서 IGN
 * Géoplateforme WMS의 GetFeatureInfo를 호출한다. 카탈로그와 실측 근거는
 * src/lib/wms-airspace-countries.ts 상단 주석 참고.
 *
 * INFO_FORMAT은 `text/plain`을 쓴다(2026-11-02 실측): `application/json`은
 * 경계 폴리곤 전체를 포함해 응답이 최대 1.4MB까지 커지는 반면, text/plain은
 * 약 400바이트이며 필요한 속성(`limite`, `remarque`)을 모두 담는다. 대신
 * 폴리곤 좌표는 "[GEOMETRY (Polygon) with N points]" 요약뿐이라 경계는 받지
 * 못하는데, 지도에는 이미 WMS 타일로 구역이 색칠되므로 지장이 없다(독일 DIPUL
 * 라우트와 같은 방식). 요청에는 `FORMAT`(예: image/png)이 반드시 있어야 하며
 * 없으면 `MissingParameterValue` 400이 난다.
 *
 * 응답 형식(text/plain, 실측):
 *   "Results for FeatureType 'http://TRANSPORTS.DRONES.RESTRICTIONS:<타입>':\n"
 *   "--------------------------------------------\n"
 *   "limite = Vol interdit *\n"
 *   "remarque = Évolution interdite en espace public en agglomération ...\n"
 *   "geom = [GEOMETRY (Polygon) with 12273 points]\n"
 *   (매칭된 feature마다 반복. 값이 없으면 "remarque = null")
 *
 * `limite` 값은 레이어 범례(legend.png)에 대응한다: "Vol interdit"(비행 금지),
 * "Hauteur maximale de vol de 30/50/60/100 m"(최대 비행고도), "Notification
 * aéronefs de plus de 900g"(900g 초과 기체 통지), "Tout vol interdit au
 * dessus de 120 m"(120m 초과 금지), 모두 끝에 별표(*)가 붙는다. 지금까지 실제로
 * 확인한 값은 "Vol interdit *"뿐이고(파리·오를리·샤를드골·마르세유·크뢰즈·레위니옹),
 * 고도 제한 값의 정확한 철자는 범례 문구를 근거로 한 추정이다 — 그래서 알 수
 * 없는 값은 원문 그대로 제목으로 보여준다(아래 classify의 마지막 분기).
 */
import { NextRequest, NextResponse } from "next/server";
import { fetchWithRetry } from "@/lib/fetch-with-retry";
import type {
  WmsAirspaceLookupResponse,
  WmsAirspaceMatch,
} from "@/lib/wms-airspace-countries";

const WMS_URL = "https://data.geopf.fr/wms-r/wms";
const LAYER = "TRANSPORTS.DRONES.RESTRICTIONS";
const LOOKUP_DELTA_DEG = 0.001;
const LOOKUP_SIZE_PX = 256;
const FEATURE_COUNT = 20;
const REQUEST_TIMEOUT_MS = 10_000;

const COLOR_PROHIBITED = "#ef4444";
const COLOR_NEUTRAL = "#6b7280";
// 범례의 최대 고도 구간 색(30m 주황 → 100m 연노랑)과 같은 순서.
const COLOR_BY_HEIGHT: Record<number, string> = {
  30: "#fb923c",
  50: "#f59e0b",
  60: "#eab308",
  100: "#facc15",
};

type Classified = {
  categoryId: string;
  color: string;
  params?: Record<string, number>;
  /** 번역 키가 없는 값은 원문을 제목으로 그대로 보여준다. */
  title?: string;
  /** 낮을수록 비행 제한이 강함 — 카드 정렬용. */
  rank: number;
};

/** `limite` 원문을 범례 분류로 매핑한다. 별표(*)는 분류에는 쓰지 않는다. */
function classify(rawLimit: string): Classified {
  const s = rawLimit.replace(/\s*\*+\s*$/, "").trim();
  const lower = s.toLowerCase();

  const above = lower.match(/tout vol interdit au[- ]?dessus de\s*(\d+)\s*m/);
  if (above) {
    return { categoryId: "frAbove", color: COLOR_NEUTRAL, params: { height: Number(above[1]) }, rank: 90 };
  }
  const maxH = lower.match(/hauteur maximale de vol de\s*(\d+)\s*m/);
  if (maxH) {
    const height = Number(maxH[1]);
    return { categoryId: "frMaxHeight", color: COLOR_BY_HEIGHT[height] ?? COLOR_NEUTRAL, params: { height }, rank: 10 + height };
  }
  if (/^vol interdit/.test(lower)) {
    return { categoryId: "frProhibited", color: COLOR_PROHIBITED, rank: 0 };
  }
  const notify = lower.match(/notification.*plus de\s*(\d+)\s*g/);
  if (notify) {
    return { categoryId: "frNotify", color: COLOR_NEUTRAL, params: { weight: Number(notify[1]) }, rank: 80 };
  }
  return { categoryId: "frOther", color: COLOR_NEUTRAL, title: s || rawLimit, rank: 100 };
}

type Block = { properties: Record<string, string> };

/** GeoServer text/plain GetFeatureInfo 응답을 feature 블록 단위로 파싱한다. */
function parseTextPlain(body: string): Block[] {
  const blocks: Block[] = [];
  const parts = body.split(/Results for FeatureType '[^']+':/g);
  // split 결과: [머리말, 본문1, 본문2, ...]
  for (let i = 1; i < parts.length; i++) {
    const properties: Record<string, string> = {};
    for (const line of parts[i].split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || /^-+$/.test(trimmed)) continue;
      const eq = trimmed.indexOf(" = ");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      if (key === "geom") continue; // 좌표 없이 요약 문자열뿐
      properties[key] = trimmed.slice(eq + 3).trim();
    }
    blocks.push({ properties });
  }
  return blocks;
}

function usable(v: string | undefined): v is string {
  return typeof v === "string" && v.length > 0 && v.toLowerCase() !== "null";
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const lat = Number(params.get("lat"));
  const lon = Number(params.get("lon"));

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return NextResponse.json({ error: "lat/lon required" }, { status: 400 });
  }

  const center = Math.round(LOOKUP_SIZE_PX / 2);
  const url = new URL(WMS_URL);
  url.searchParams.set("SERVICE", "WMS");
  url.searchParams.set("VERSION", "1.3.0");
  url.searchParams.set("REQUEST", "GetFeatureInfo");
  url.searchParams.set("LAYERS", LAYER);
  url.searchParams.set("QUERY_LAYERS", LAYER);
  url.searchParams.set("STYLES", "");
  url.searchParams.set("FORMAT", "image/png"); // 필수(위 주석 참고)
  url.searchParams.set("INFO_FORMAT", "text/plain");
  url.searchParams.set("CRS", "EPSG:4326");
  url.searchParams.set("FEATURE_COUNT", String(FEATURE_COUNT));
  // WMS 1.3.0 + EPSG:4326은 BBOX 축 순서가 위도,경도다.
  url.searchParams.set(
    "BBOX",
    `${lat - LOOKUP_DELTA_DEG},${lon - LOOKUP_DELTA_DEG},${lat + LOOKUP_DELTA_DEG},${lon + LOOKUP_DELTA_DEG}`,
  );
  url.searchParams.set("WIDTH", String(LOOKUP_SIZE_PX));
  url.searchParams.set("HEIGHT", String(LOOKUP_SIZE_PX));
  url.searchParams.set("I", String(center));
  url.searchParams.set("J", String(center));

  try {
    // 2026-11-02 실측: 같은 요청이 한 번 일시적으로 HTTP 404를 받았다가 재시도에서
    // 정상 응답한 적이 있어(IGN 쪽 일시 오류) 한 번 재시도한다.
    const res = await fetchWithRetry(url.toString(), () => ({
      cache: "no-store",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    }));
    if (!res.ok) {
      console.error(`fr-airspace-lookup failed: HTTP ${res.status}`);
      return NextResponse.json({ error: "lookup failed" }, { status: 502 });
    }

    const body = await res.text();
    // 서버가 오류를 HTTP 200 + ServiceExceptionReport(XML) 본문으로 내려줄 수
    // 있다 — "빈 결과"가 아니라 명백한 실패로 취급한다(다른 나라 라우트와 같은 원칙).
    if (body.includes("ServiceExceptionReport")) {
      console.error("fr-airspace-lookup failed: ServiceExceptionReport", body.slice(0, 500));
      return NextResponse.json({ error: "lookup failed" }, { status: 502 });
    }

    // 같은 분류(예: "Vol interdit")의 feature가 여럿이면 하나로 합친다.
    const byCategory = new Map<string, { c: Classified; match: WmsAirspaceMatch }>();
    for (const block of parseTextPlain(body)) {
      const limite = block.properties.limite;
      if (!usable(limite)) continue;
      const c = classify(limite);
      const key = `${c.categoryId}:${c.title ?? ""}:${JSON.stringify(c.params ?? {})}`;
      const remark = usable(block.properties.remarque) ? block.properties.remarque : undefined;

      const existing = byCategory.get(key);
      if (existing) {
        if (remark && !existing.match.labels.includes(remark)) existing.match.labels.push(remark);
        continue;
      }
      byCategory.set(key, {
        c,
        match: {
          categoryId: c.categoryId,
          color: c.color,
          title: c.title,
          params: c.params,
          labels: remark ? [remark] : [],
        },
      });
    }

    const matches = Array.from(byCategory.values())
      .sort((a, b) => a.c.rank - b.c.rank)
      .map((e) => e.match);

    return NextResponse.json({ matches } satisfies WmsAirspaceLookupResponse);
  } catch (err) {
    console.error("fr-airspace-lookup failed:", err);
    return NextResponse.json({ error: "lookup failed" }, { status: 502 });
  }
}
