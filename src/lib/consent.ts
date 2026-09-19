/**
 * Google Consent Mode v2 지원 헬퍼.
 *
 * EEA(유럽경제지역) 27개 EU 회원국 + 비-EU EEA 3개국(아이슬란드·리히텐슈타인·
 * 노르웨이) + 영국·스위스(GDPR에 준하는 자체 개인정보보호법 적용)에 해당하는
 * ISO 3166-1 alpha-2 국가 코드 목록. 각 레이아웃의 GA4 inline script에서
 * `gtag('consent', 'default', { region: [...] })`로 넘기는 배열과 반드시
 * 동일하게 유지할 것 — 이 목록 밖의 방문자는 Google 기본 동작(별도 동의
 * 신호가 없으면 "허용"으로 간주)을 그대로 따르므로, 동의 배너 자체도
 * 노출하지 않는다(기존 동작 대비 변화 없음).
 */
export const CONSENT_REGION_CODES = [
  // EU 27개국
  "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR",
  "HU", "IE", "IT", "LV", "LT", "LU", "MT", "NL", "PL", "PT", "RO", "SK",
  "SI", "ES", "SE",
  // EEA 비-EU 회원국
  "IS", "LI", "NO",
  // 영국 + 스위스
  "GB", "CH",
] as const;

/**
 * 국가 코드(Vercel 엣지가 설정하는 `x-vercel-ip-country` 요청 헤더 값,
 * 대문자 ISO 3166-1 alpha-2)를 받아 동의 배너를 띄워야 하는지 판단한다.
 * null/undefined(로컬 개발 환경, 헤더가 없는 배포 환경 등)는 안전한 쪽으로
 * "필요함"으로 처리한다 — 불필요하게 한 번 더 보여주는 것은 사소한 UX
 * 손해지만, 실제로 필요한 방문자에게 누락하는 것은 컴플라이언스 리스크이기
 * 때문.
 */
export function needsConsentBanner(country: string | null | undefined): boolean {
  if (!country) return true;
  return (CONSENT_REGION_CODES as readonly string[]).includes(country.toUpperCase());
}
