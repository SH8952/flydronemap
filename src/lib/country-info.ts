import { iso1A2Code } from "@rapideditor/country-coder";

/**
 * 좌표(lat/lon)를 ISO 3166-1 alpha-2 국가 코드(예: "KR")로 변환한다.
 *
 * 단순 bounding box가 아니라 실제 국경 폴리곤 데이터를 기반으로 하는
 * @rapideditor/country-coder(OpenStreetMap iD 편집기에서 실사용 중)를
 * 사용 — 완전히 오프라인으로 동작하며 네트워크 호출이 없다. 해외 영토가
 * 있는 국가(미국/프랑스/러시아 등)나 공해상 좌표도 안정적으로 처리한다.
 *
 * 국가를 판별할 수 없는 좌표(공해상 등)에서는 undefined를 반환한다 —
 * 호출부는 이를 "국가 미상"으로 처리해야 하며, 임의의 기본값으로 대체하지
 * 않는다.
 */
export function getCountryCode(
  latitude: number,
  longitude: number,
): string | undefined {
  try {
    const code = iso1A2Code([longitude, latitude]);
    return code ?? undefined;
  } catch {
    return undefined;
  }
}

/** 이 사이트가 국가별 규정 카탈로그(country-regulations.ts)를 갖춘 4개국. */
const PRIORITY_COUNTRY_CODES = new Set(["US", "KR", "JP", "ES"]);

/** ISO 국가 코드가 규정 카탈로그를 갖춘 4개국(미국/한국/일본/스페인) 중
 * 하나인지 확인하고, 맞다면 country-regulations.ts의 소문자 id로 변환한다. */
export function toPriorityRegulationId(
  countryCode: string | undefined,
): "us" | "kr" | "jp" | "es" | undefined {
  if (!countryCode) return undefined;
  const upper = countryCode.toUpperCase();
  if (!PRIORITY_COUNTRY_CODES.has(upper)) return undefined;
  return upper.toLowerCase() as "us" | "kr" | "jp" | "es";
}

/**
 * ISO 국가 코드를 해당 로케일 언어로 된 국가명으로 변환한다(예: "KR" + "ko"
 * → "대한민국"). 브라우저에 내장된 Intl.DisplayNames를 사용하므로 전 세계
 * 모든 국가에 대해 별도의 번역 데이터 없이 동작한다 — 4개 우선 지원국은
 * 대신 messages/{locale}.json의 Regulations.countries.{id}.name을 우선
 * 사용해 사이트 전체와 표기를 통일한다(이 함수는 그 외 국가에서 쓰인다).
 *
 * 이 로케일/코드 조합을 지원하지 않는 극히 드문 환경에서는 국가 코드
 * 원문(예: "DE")을 그대로 반환한다.
 */
export function getCountryDisplayName(
  countryCode: string,
  locale: string,
): string {
  try {
    const displayNames = new Intl.DisplayNames([locale], { type: "region" });
    return displayNames.of(countryCode.toUpperCase()) ?? countryCode;
  } catch {
    return countryCode;
  }
}
