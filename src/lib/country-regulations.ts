/**
 * "국가별 드론 규정 안내" 신규 섹션(2026-09 협의, 미착수 상태에서 클라우드 전용
 * 클론으로 구현) 카탈로그. DJI FlySafe(fly-safe.dji.com)를 참고 모델로 사용자와
 * 합의한 범위:
 *   1) 기존 대시보드는 그대로 두고 별도 섹션/페이지로 신설
 *   2) 초기 지원국은 사이트가 이미 지원하는 4개 언어(en/ko/ja/es)에 대응하는
 *      미국·한국·일본·스페인 (2026-09-22: 지도 데이터가 있는 국가를 언어
 *      대응과 무관하게 넓히기로 하고 독일을 추가)
 *   3) 지도 데이터가 있는 미국(FAA)·한국(VWorld WMS)·스페인(ENAIRE ZGUAS,
 *      2026-09-07 추가)·독일(DIPUL WMS, 2026-09-22 추가)은 지도 색상 구역
 *      확인 방법을 안내하고, 아직 데이터가 없는 일본은 1차로 텍스트 요약 +
 *      공식 링크만 제공
 *
 * 이 파일은 번역되지 않는 구조적 데이터(국가 id, 지도 데이터 보유 여부, 공식
 * 링크 URL)만 담는다. 화면에 보이는 텍스트(국가명/규정 요약/링크 라벨)는 모두
 * messages/{locale}.json의 "Regulations" 네임스페이스에서 가져온다 — 다른
 * 정적 페이지(About/Guides 등)와 동일한 패턴.
 *
 * 주의: 이 페이지의 정보는 참고용 요약이며 법률 자문이 아니다. 실제 비행 전
 * 반드시 각국 공식 기관에서 최신 규정을 확인하도록 화면에 안내 문구를 둔다.
 */

export type RegulationCountryId = "us" | "kr" | "jp" | "es" | "de" | "gb" | "ca" | "au";

export type RegulationLinkKey =
  | "official"
  | "registration"
  | "flightApproval"
  | "airspaceMap";

export type RegulationCountryDef = {
  id: RegulationCountryId;
  /** 이 사이트가 이미 실시간 공역 지도 오버레이 데이터를 가진 국가인지.
   * true: 홈 대시보드에서 위치 검색 시 색상 구역이 지도에 표시됨(미국 FAA,
   * 한국 VWorld WMS, 스페인 ENAIRE ZGUAS). false: 아직 지도 데이터 없음 —
   * 공식 링크만 안내. */
  hasMapData: boolean;
  /** 국가 선택 드롭다운에서 이 국가를 고르면 지도를 이동시킬 기준 좌표(수도). */
  capital: { latitude: number; longitude: number };
  links: { key: RegulationLinkKey; url: string }[];
  /** 이 국가 페이지 하단에 "관련 가이드"로 연결할 가이드 slug 목록(내부 링크 강화용).
   * 해당 언어에 없는 slug는 화면에서 자동으로 건너뜀. */
  relatedGuideSlugs: string[];
};

export const REGULATION_COUNTRIES: RegulationCountryDef[] = [
  {
    id: "us",
    relatedGuideSlugs: ["faa-part-107-explained", "what-is-laanc-and-why-it-matters", "understanding-us-airspace-classes"],
    hasMapData: true,
    capital: { latitude: 38.9072, longitude: -77.0369 },
    links: [
      { key: "official", url: "https://www.faa.gov/uas" },
      {
        key: "registration",
        url: "https://faadronezone.faa.gov/#/",
      },
      {
        key: "flightApproval",
        url: "https://www.faa.gov/uas/getting_started/laanc",
      },
    ],
  },
  {
    id: "kr",
    relatedGuideSlugs: ["korea-drone-license-and-registration-guide"],
    hasMapData: true,
    capital: { latitude: 37.5665, longitude: 126.978 },
    links: [
      { key: "official", url: "https://drone.onestop.go.kr" },
      {
        key: "registration",
        url: "https://drone.onestop.go.kr",
      },
      {
        key: "flightApproval",
        url: "https://drone.onestop.go.kr",
      },
    ],
  },
  {
    id: "jp",
    relatedGuideSlugs: ["japan-mlit-drone-regulations-overview"],
    hasMapData: false,
    capital: { latitude: 35.6762, longitude: 139.6503 },
    links: [
      {
        key: "official",
        url: "https://www.mlit.go.jp/koku/koku_ua_dips.html",
      },
      {
        key: "registration",
        url: "https://www.ossportal.dips.mlit.go.jp/portal/top/",
      },
    ],
  },
  {
    id: "es",
    relatedGuideSlugs: ["spain-drone-regulations-and-enaire-zguas-explained", "eu-easa-drone-regulations-basics"],
    hasMapData: true,
    capital: { latitude: 40.4168, longitude: -3.7038 },
    links: [
      {
        key: "official",
        url: "https://www.seguridadaerea.gob.es/es/ambitos/drones",
      },
      {
        key: "registration",
        url: "https://www.seguridadaerea.gob.es/en/ambitos/drones/registro-de-operador-de-drones-uas",
      },
    ],
  },
  {
    id: "de",
    relatedGuideSlugs: ["eu-easa-drone-regulations-basics"],
    hasMapData: true,
    capital: { latitude: 52.52, longitude: 13.405 },
    links: [
      {
        key: "official",
        url: "https://www.lba.de/DE/Drohnen/Drohnen_node.html",
      },
      {
        key: "registration",
        url: "https://www.lba.de/DE/Drohnen/UAS_Betreiberregistrierung/UAS_Betreiberregistrierung_node.html",
      },
      {
        key: "airspaceMap",
        url: "https://www.dipul.de",
      },
    ],
  },
  {
    id: "gb",
    relatedGuideSlugs: ["beginner-drone-preflight-checklist", "do-you-need-drone-insurance-checklist"],
    hasMapData: false,
    capital: { latitude: 51.5074, longitude: -0.1278 },
    links: [
      { key: "official", url: "https://www.caa.co.uk/drones/" },
      {
        key: "registration",
        url: "https://www.caa.co.uk/drones/open-category/getting-started-with-drones-and-model-aircraft/registering-to-fly-drones-and-model-aircraft/",
      },
      {
        key: "airspaceMap",
        url: "https://nats-uk.ead-it.com/cms-nats/opencms/en/uas-restriction-zones/",
      },
    ],
  },
  {
    id: "ca",
    relatedGuideSlugs: ["beginner-drone-preflight-checklist", "do-you-need-drone-insurance-checklist"],
    hasMapData: false,
    capital: { latitude: 45.4215, longitude: -75.6972 },
    links: [
      { key: "official", url: "https://tc.canada.ca/en/aviation/drone-safety" },
      {
        key: "registration",
        url: "https://tc.canada.ca/en/aviation/drone-safety/registering-your-drone",
      },
      {
        key: "airspaceMap",
        url: "https://nrc.canada.ca/en/drone-tool/",
      },
    ],
  },
  {
    id: "au",
    relatedGuideSlugs: ["beginner-drone-preflight-checklist", "do-you-need-drone-insurance-checklist"],
    hasMapData: false,
    capital: { latitude: -35.2809, longitude: 149.13 },
    links: [
      { key: "official", url: "https://www.casa.gov.au/drones" },
      {
        key: "registration",
        url: "https://www.casa.gov.au/knowyourdrone/registration",
      },
    ],
  },
];

export function getRegulationCountry(
  id: string,
): RegulationCountryDef | undefined {
  return REGULATION_COUNTRIES.find((c) => c.id === id);
}

/**
 * 국가별 요약을 작성할 때 직접 열어 확인한 공식 자료(2026-10-12, 보강 2026-10-23). 요약 문구를 고치거나
 * 새 국가를 추가할 때는 이 목록과 확인일(REGULATIONS_VERIFIED_ON)도 함께 갱신할 것.
 * 화면에는 페이지 하단에 작은 글씨로 표시된다(번역하지 않는 고유 명칭·주소만 둔다).
 */
export const REGULATIONS_VERIFIED_ON = "2026-10-23";

export const REGULATION_SOURCES: Record<
  RegulationCountryId,
  { name: string; url: string }[]
> = {
  us: [
    { name: "FAA — Recreational Flyers", url: "https://www.faa.gov/uas/recreational_flyers" },
    { name: "FAA — Become a Drone Pilot (Part 107)", url: "https://www.faa.gov/uas/commercial_operators/become_a_drone_pilot" },
    { name: "FAA — LAANC", url: "https://www.faa.gov/uas/getting_started/laanc" },
  ],
  kr: [
    { name: "드론원스톱 (국토교통부)", url: "https://drone.onestop.go.kr" },
    { name: "서울특별시 — 드론 비행 제한구역 안내", url: "https://news.seoul.go.kr/gov/archives/549810" },
  ],
  jp: [
    { name: "国土交通省 — 無人航空機の飛行ルール", url: "https://www.mlit.go.jp/koku/koku_fr10_000042.html" },
    { name: "国土交通省 — 無人航空機登録制度", url: "https://www.mlit.go.jp/koku/info/index.html" },
    { name: "国土交通省 — DIPS 2.0", url: "https://www.mlit.go.jp/koku/koku_ua_dips.html" },
  ],
  es: [
    { name: "AESA — Registro de operador de drones/UAS", url: "https://www.seguridadaerea.gob.es/en/ambitos/drones/registro-de-operador-de-drones-uas" },
    { name: "AESA — Zonas geográficas de UAS", url: "https://www.seguridadaerea.gob.es/en/ambitos/drones/zonas-geograficas-de-uas" },
    { name: "AESA — Training of UAS/drones pilots in the 'open' category", url: "https://www.seguridadaerea.gob.es/en/node/1531" },
    { name: "AESA — Drone/UAS class marking and direct remote identification (2024)", url: "https://www.seguridadaerea.gob.es/en/node/2821" },
  ],
  de: [
    { name: "LBA — Betreiberregistrierung", url: "https://www.lba.de/DE/Drohnen/UAS_Betreiberregistrierung/UAS_Betreiberregistrierung_node.html" },
    { name: "LBA — FAQ Drohnen", url: "https://www.lba.de/DE/Drohnen/FAQ/Uebersicht_FAQ_node.html" },
  ],
  gb: [
    { name: "CAA — Registering to fly drones and model aircraft", url: "https://www.caa.co.uk/drones/open-category/getting-started-with-drones-and-model-aircraft/registering-to-fly-drones-and-model-aircraft/" },
    { name: "CAA — Where you can fly", url: "https://www.caa.co.uk/drones/open-category/getting-started-with-drones-and-model-aircraft/where-you-can-fly/" },
    { name: "CAA — Class marks", url: "https://www.caa.co.uk/drones/open-category/getting-started-with-drones-and-model-aircraft/class-marks/" },
    { name: "CAA — The Drone and Model Aircraft Code (March 2026)", url: "https://www.caa.co.uk/media/csmfqbs1/the-drone-code-march-2026.pdf" },
  ],
  ca: [
    { name: "Transport Canada — Basic operations", url: "https://tc.canada.ca/en/aviation/drone-safety/learn-rules-you-fly-your-drone/drone-operation-categories-pilot-certificates/basic-operations" },
    { name: "Transport Canada — Drone operation categories and pilot certificates", url: "https://tc.canada.ca/en/aviation/drone-safety/learn-rules-you-fly-your-drone/drone-operation-categories-pilot-certificates" },
    { name: "Transport Canada — Registering your drone", url: "https://tc.canada.ca/en/aviation/drone-safety/registering-your-drone" },
    { name: "Transport Canada — Where to fly your drone", url: "https://tc.canada.ca/en/aviation/drone-safety/learn-rules-you-fly-your-drone/where-fly-your-drone" },
  ],
  au: [
    { name: "CASA — Drone safety rules", url: "https://www.casa.gov.au/drones/drone-rules/drone-safety-rules" },
    { name: "CASA — Drone weight categories and requirements", url: "https://www.casa.gov.au/drones/operator-accreditation-certificate/drone-weight-categories-and-requirements" },
    { name: "CASA — Flying near airports", url: "https://www.casa.gov.au/drones/drone-rules/flying-near-airports" },
    { name: "CASA — Registration", url: "https://www.casa.gov.au/knowyourdrone/registration" },
  ],
};
