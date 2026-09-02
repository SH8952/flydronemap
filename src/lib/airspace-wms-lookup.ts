/**
 * 한국 비행금지구역(LT_C_AISPRHC) 지점 조회 — 클라이언트(브라우저)에서
 * 직접 브이월드 WMS의 GetFeatureInfo 요청으로 수행한다.
 *
 * 기존에는 서버(Next.js API 라우트)에서 브이월드의 2D데이터 JSON API
 * (api.vworld.kr/req/data)를 호출했으나, 브이월드가 Vercel 서버 IP 대역을
 * 차단하고 있어 production에서 항상 실패했다(src/lib/airspace.ts의
 * fetchAirspaceCeiling은 이제 한국 지점에서 이 서버 호출을 아예 시도하지
 * 않는다 — 실패가 뻔한 네트워크 요청을 반복하지 않기 위함).
 *
 * 지도 오버레이(WMS 타일)는 브라우저가 직접 <img>로 요청해 이 차단을
 * 우회하고 있는데(src/lib/airspace-layers.ts 참고), WMS 표준에는 타일
 * 이미지(GetMap)와 별개로 특정 픽셀의 속성 정보를 돌려주는 GetFeatureInfo
 * 요청이 있고, 브이월드 서버가 이를 실제로 지원한다는 것을 직접 테스트로
 * 확인했다(2026-09-02, 김포 관제권/고리 원전 비행금지구역 두 지점 모두
 * 정상 응답 확인). 이 함수는 그 방식으로 서버 차단 없이 지점별 조회를
 * 되살린다.
 *
 * 반환 속성 스키마는 예전 서버 코드가 쓰던 것과 이름은 같지만(prh_lbl_1~4),
 * 고도 필드의 상/하한 순서는 실제 응답으로 재검증한 것이다: prh_lbl_2가
 * 하한(예: "SFC" = 지표면), prh_lbl_3이 상한(예: "10000ft AMSL")이다 — 예전
 * 서버 코드는 이 둘이 반대로 매핑되어 있었다(서버 호출 자체가 production에서
 * 한 번도 성공한 적이 없어 실제 데이터로 검증되지 못했던 것으로 보인다).
 */
import type { AirspaceCeiling, LatLngRing } from "@/lib/airspace";

const VWORLD_KEY = process.env.NEXT_PUBLIC_VWORLD_API_KEY;
const VWORLD_DOMAIN = process.env.NEXT_PUBLIC_VWORLD_DOMAIN;
const KR_PROHIBITED_WMS_LAYER = "lt_c_aisprhc";

/** 조회 지점 주변 작은 bbox 하나로 조회하며, 조회 지점이 항상 이미지
 * 정중앙 픽셀이 되도록 구성한다 — 값 자체의 정밀도는 중요하지 않다. */
const LOOKUP_DELTA_DEG = 0.01;
const LOOKUP_SIZE_PX = 256;

export async function fetchKoreaRestrictedZoneClientSide(
  latitude: number,
  longitude: number,
): Promise<AirspaceCeiling> {
  if (!VWORLD_KEY) return null;

  const center = Math.round(LOOKUP_SIZE_PX / 2);
  const url = new URL("https://api.vworld.kr/req/wms");
  url.searchParams.set("key", VWORLD_KEY);
  if (VWORLD_DOMAIN) url.searchParams.set("domain", VWORLD_DOMAIN);
  url.searchParams.set("SERVICE", "WMS");
  url.searchParams.set("VERSION", "1.3.0");
  url.searchParams.set("REQUEST", "GetFeatureInfo");
  url.searchParams.set("LAYERS", KR_PROHIBITED_WMS_LAYER);
  url.searchParams.set("QUERY_LAYERS", KR_PROHIBITED_WMS_LAYER);
  url.searchParams.set("STYLES", "");
  url.searchParams.set("FORMAT", "image/png");
  url.searchParams.set("INFO_FORMAT", "application/json");
  url.searchParams.set("TRANSPARENT", "true");
  url.searchParams.set("CRS", "EPSG:4326");
  url.searchParams.set(
    "BBOX",
    `${latitude - LOOKUP_DELTA_DEG},${longitude - LOOKUP_DELTA_DEG},${
      latitude + LOOKUP_DELTA_DEG
    },${longitude + LOOKUP_DELTA_DEG}`,
  );
  url.searchParams.set("WIDTH", String(LOOKUP_SIZE_PX));
  url.searchParams.set("HEIGHT", String(LOOKUP_SIZE_PX));
  url.searchParams.set("I", String(center));
  url.searchParams.set("J", String(center));

  try {
    const res = await fetch(url.toString());
    if (!res.ok) return null;

    const data = (await res.json()) as {
      features?: Array<{
        properties?: Record<string, unknown>;
        geometry?: {
          type?: string;
          coordinates?: number[][][] | number[][][][];
        };
      }>;
    };

    const feature = data.features?.[0];
    if (!feature) return { source: "kr", restricted: false };

    const props = feature.properties ?? {};

    let boundary: LatLngRing[][] | undefined;
    const geom = feature.geometry;
    if (geom?.coordinates) {
      const toLatLngRing = (ring: number[][]): LatLngRing =>
        ring.map(([lon, lat]) => [lat, lon] as [number, number]);

      if (geom.type === "MultiPolygon") {
        boundary = (geom.coordinates as number[][][][]).map((polygon) =>
          polygon.map(toLatLngRing),
        );
      } else if (geom.type === "Polygon") {
        boundary = [(geom.coordinates as number[][][]).map(toLatLngRing)];
      }
    }

    return {
      source: "kr",
      restricted: true,
      zoneLabel: typeof props.prh_lbl_1 === "string" ? props.prh_lbl_1 : "",
      categoryName:
        typeof props.prh_lbl_4 === "string" ? props.prh_lbl_4 : "",
      lowerAltitude:
        typeof props.prh_lbl_2 === "string" ? props.prh_lbl_2 : "",
      upperAltitude:
        typeof props.prh_lbl_3 === "string" ? props.prh_lbl_3 : "",
      boundary,
    };
  } catch {
    return null;
  }
}
