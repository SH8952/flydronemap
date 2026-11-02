/**
 * 스위스·프랑스 공역(드론 비행 제한구역) 지도 데이터 카탈로그 — 2026-11-02 추가.
 *
 * 두 나라 모두 정부 기관이 인증키·가입·도메인 등록 없이 쓸 수 있게 공개한
 * 표준 WMS를 운영하며, 한국·독일·스페인과 같은 방식으로 구현한다:
 *   - 지도 오버레이: WMS GetMap 타일을 브라우저가 <img>로 직접 요청
 *     (FlightMap의 `airspaceOverlayLayers`, `wmsUrl` 재사용)
 *   - 지점 조회: 서버(Vercel 함수)가 대신 호출해 지점에 매칭된 구역만 반환
 *     (`/api/ch-airspace-lookup`, `/api/fr-airspace-lookup`)
 *
 * 두 나라는 레이어가 하나뿐이고 사용자가 끄고 켤 이유가 없어(스페인·독일처럼
 * 큰 면적 레이어가 지도를 뒤덮을 일도 없음) 레이어 토글 패널(AirspaceLayerPanel)
 * 없이 항상 표시한다. 나라가 늘어도 이 파일에 항목만 추가하면 되도록 대시보드는
 * 이 카탈로그만 참조한다(국가별 if 분기를 새로 만들지 않기 위함).
 *
 * 2026-11-02 실측(클라우드 세션에서 실서버 호출)으로 확인한 사양:
 *
 * [스위스 CH] 연방민간항공청(BAZL/FOCA)의 `ch.bazl.einschraenkungen-drohnen`
 *   - 지도: https://wms.geo.admin.ch/ GetMap(EPSG:3857/4326), 키 없음, `Fees: none`.
 *   - 지점 조회: WMS GetFeatureInfo는 `application/json`이 서버 오류(OGR GEOJSON
 *     드라이버)를 내서 쓸 수 없다. 대신 geo.admin.ch REST `identify`
 *     (https://api3.geo.admin.ch/rest/services/all/MapServer/identify)가
 *     JSON으로 정상 동작하며 구역명·제한 문구가 독/불/이/영 4개 언어로 들어 있다.
 *
 * [프랑스 FR] DGAC가 만들고 IGN Géoplateforme이 배포하는
 *   `TRANSPORTS.DRONES.RESTRICTIONS`("Restrictions UAS catégorie Ouverte et
 *   Aéromodélisme", 2026년 6월판)
 *   - 지도/조회 모두 https://data.geopf.fr/wms-r/wms, 키 없음, `Fees: none`.
 *     이용 약관: https://cartes.gouv.fr/cgu
 *   - GetFeatureInfo는 `FORMAT` 파라미터(예: image/png)가 반드시 있어야 한다.
 *     `application/json`은 경계 폴리곤 전체를 담아 응답이 최대 1.4MB까지 커지므로
 *     속성만 있는 `text/plain`(약 400바이트)을 쓴다(독일 DIPUL 라우트와 같은 방식).
 *   - 지도는 약 1:17,000보다 크게 확대하면(MinScaleDenominator) 타일이 비어 보인다.
 *   - 데이터 자체의 공지: "임시 금지구역은 포함하지 않으며, 일부 금지는 AIP에
 *     없는 비공개 자료 기반이라 부분적으로만 반영"된다. 화면에 같은 취지의 안내를
 *     반드시 함께 보여준다(messages Home.wmsAirspaceNotes).
 *
 * ⚠️ 라이선스: 두 서비스 모두 서비스 메타데이터에 이용료 없음으로 표시되지만,
 * 출처 표기 조건의 전문은 확인하지 못했다. 지도 우하단 출처 표기(attribution)와
 * 화면 하단 출처 문구(airspaceSourcesNote)로 출처를 밝힌다.
 */
import { getCountryCode } from "@/lib/country-info";

export type WmsAirspaceCountryId = "ch" | "fr";

/** 지점 조회 API가 돌려주는 매칭 구역 하나. */
export type WmsAirspaceMatch = {
  /** 번역 키(Home.wmsAirspaceCategories.<categoryId>)로 쓰이거나, `title`이
   * 있으면 그 값이 우선한다. 매칭 구역의 우선순위 정렬에도 쓰인다. */
  categoryId: string;
  /** 카드의 점·제목 색(hex). */
  color: string;
  /** 출처 데이터가 직접 주는 구역 이름(예: "CTR ZURICH"). 번역하지 않고 그대로 표시. */
  title?: string;
  /** 번역 문구의 {height}/{weight} 같은 자리표시자 값. */
  params?: Record<string, string | number>;
  /** 제목 아래에 줄바꿈해 보여줄 설명 문구(출처 원문 그대로). */
  labels: string[];
  /** 제한 사유 코드(ED-269: AIR_TRAFFIC 등) — Home.wmsAirspaceReasons로 번역. */
  reasonId?: string;
  /** 예외 허가를 신청할 담당 기관 링크(http/https만 허용). */
  authority?: { name: string; url?: string };
  /** 기간이 한정된(임시) 제한인지 — true면 "유효 기간은 공식 지도에서 확인" 안내를 붙인다. */
  temporary?: boolean;
};

export type WmsAirspaceLookupResponse = {
  matches: WmsAirspaceMatch[];
};

export type WmsAirspaceCountryDef = {
  id: WmsAirspaceCountryId;
  /** country-coder(src/lib/country-info.ts)가 돌려주는 ISO 3166-1 alpha-2 코드들.
   * 프랑스는 해외 영토(레위니옹 등)를 별도 코드로 돌려주므로 여러 개다. */
  countryCodes: string[];
  /** 국가 선택 드롭다운에 표시할 이름용 ISO 코드(Intl.DisplayNames 입력). */
  pickerCountryCode: string;
  /** 지도 타일(GetMap)용 WMS 주소와 레이어 이름. */
  wmsUrl: string;
  wmsLayers: string;
  /** 지도 우하단 출처 표기(HTML). Leaflet attribution 형식. */
  attribution: string;
  /** 화면 문구에 쓰는 데이터 출처 짧은 이름. */
  sourceName: string;
  /** "공식 드론 지도 열기" 버튼 링크. */
  officialMapUrl: string;
  /** 범례 이미지(있는 나라만). */
  legendUrl?: string;
  /** 국가 선택 드롭다운에서 고르면 이동할 수도 좌표와 로케일별 이름. */
  capital: {
    latitude: number;
    longitude: number;
    names: Record<string, string>;
  };
};

export const WMS_AIRSPACE_COUNTRIES: WmsAirspaceCountryDef[] = [
  {
    id: "ch",
    countryCodes: ["CH"],
    pickerCountryCode: "CH",
    wmsUrl: "https://wms.geo.admin.ch/",
    wmsLayers: "ch.bazl.einschraenkungen-drohnen",
    attribution:
      '&copy; <a href="https://www.bazl.admin.ch/" target="_blank" rel="noopener noreferrer">FOCA (BAZL)</a> / <a href="https://www.swisstopo.admin.ch/" target="_blank" rel="noopener noreferrer">swisstopo</a>',
    sourceName: "FOCA / swisstopo",
    officialMapUrl:
      "https://map.geo.admin.ch/#/map?lang=en&topic=aviation&layers=ch.bazl.einschraenkungen-drohnen&bgLayer=ch.swisstopo.pixelkarte-grau",
    capital: {
      latitude: 46.948,
      longitude: 7.4474,
      names: { en: "Bern", ko: "베른", ja: "ベルン", es: "Berna", de: "Bern" },
    },
  },
  {
    id: "fr",
    // 레이어 메타데이터상 본토·기아나·앤틸리스·생피에르미클롱·마요트·레위니옹을
    // 포함한다. 레위니옹은 실제 조회로 확인했고 나머지는 메타데이터 기준이다.
    countryCodes: ["FR", "RE", "GP", "MQ", "GF", "YT", "PM"],
    pickerCountryCode: "FR",
    wmsUrl: "https://data.geopf.fr/wms-r/wms",
    wmsLayers: "TRANSPORTS.DRONES.RESTRICTIONS",
    attribution:
      '&copy; <a href="https://www.ign.fr/" target="_blank" rel="noopener noreferrer">IGN</a> / DGAC',
    sourceName: "DGAC / IGN",
    officialMapUrl:
      "https://www.geoportail.gouv.fr/donnees/restrictions-uas-categorie-ouverte-et-aeromodelisme",
    legendUrl:
      "https://data.geopf.fr/annexes/ressources/legendes/TRANSPORTS.DRONES.RESTRICTIONS-legend.png",
    capital: {
      latitude: 48.8566,
      longitude: 2.3522,
      names: { en: "Paris", ko: "파리", ja: "パリ", es: "París", de: "Paris" },
    },
  },
];

const BY_COUNTRY_CODE = new Map<string, WmsAirspaceCountryDef>(
  WMS_AIRSPACE_COUNTRIES.flatMap((c) =>
    c.countryCodes.map((code) => [code, c] as const),
  ),
);

/** 좌표가 이 카탈로그의 나라에 속하면 그 나라 정의를, 아니면 undefined를 반환한다.
 * 국경 폴리곤 기반 country-coder를 쓰므로 인접국과 섞이지 않는다(isInGermany와
 * 같은 이유). */
export function getWmsAirspaceCountry(
  latitude: number,
  longitude: number,
): WmsAirspaceCountryDef | undefined {
  const code = getCountryCode(latitude, longitude);
  return code ? BY_COUNTRY_CODE.get(code) : undefined;
}

export function getWmsAirspaceCountryById(
  id: string,
): WmsAirspaceCountryDef | undefined {
  return WMS_AIRSPACE_COUNTRIES.find((c) => c.id === id);
}
