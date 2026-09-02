/**
 * "국가별 드론 규정 안내" 신규 섹션(2026-09 협의, 미착수 상태에서 클라우드 전용
 * 클론으로 구현) 카탈로그. DJI FlySafe(fly-safe.dji.com)를 참고 모델로 사용자와
 * 합의한 범위:
 *   1) 기존 대시보드는 그대로 두고 별도 섹션/페이지로 신설
 *   2) 초기 지원국은 사이트가 이미 지원하는 4개 언어(en/ko/ja/es)에 대응하는
 *      미국·한국·일본·스페인
 *   3) 지도 데이터가 이미 있는 미국(FAA)·한국(VWorld WMS)은 지도 색상 구역
 *      확인 방법을 안내하고, 아직 데이터가 없는 일본·스페인은 1차로 텍스트
 *      요약 + 공식 링크만 제공
 *
 * 이 파일은 번역되지 않는 구조적 데이터(국가 id, 지도 데이터 보유 여부, 공식
 * 링크 URL)만 담는다. 화면에 보이는 텍스트(국가명/규정 요약/링크 라벨)는 모두
 * messages/{locale}.json의 "Regulations" 네임스페이스에서 가져온다 — 다른
 * 정적 페이지(About/Guides 등)와 동일한 패턴.
 *
 * 주의: 이 페이지의 정보는 참고용 요약이며 법률 자문이 아니다. 실제 비행 전
 * 반드시 각국 공식 기관에서 최신 규정을 확인하도록 화면에 안내 문구를 둔다.
 */

export type RegulationCountryId = "us" | "kr" | "jp" | "es";

export type RegulationLinkKey =
  | "official"
  | "registration"
  | "flightApproval"
  | "airspaceMap";

export type RegulationCountryDef = {
  id: RegulationCountryId;
  /** 이 사이트가 이미 실시간 공역 지도 오버레이 데이터를 가진 국가인지.
   * true: 홈 대시보드에서 위치 검색 시 색상 구역이 지도에 표시됨(미국 FAA,
   * 한국 VWorld WMS). false: 아직 지도 데이터 없음 — 공식 링크만 안내. */
  hasMapData: boolean;
  links: { key: RegulationLinkKey; url: string }[];
};

export const REGULATION_COUNTRIES: RegulationCountryDef[] = [
  {
    id: "us",
    hasMapData: true,
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
    hasMapData: true,
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
    hasMapData: false,
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
    hasMapData: false,
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
];

export function getRegulationCountry(
  id: string,
): RegulationCountryDef | undefined {
  return REGULATION_COUNTRIES.find((c) => c.id === id);
}
