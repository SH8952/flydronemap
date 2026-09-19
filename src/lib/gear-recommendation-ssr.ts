import { resolveAffiliateProvider } from "@/lib/affiliate";
import { searchCoupangProducts, type CoupangProduct } from "@/lib/coupang";
import { searchAliexpressProducts, type AliexpressProduct } from "@/lib/aliexpress";

/**
 * AdSense 재심사 대응 (2026-09-19, 공통 대화방 "홈 빈 콘텐츠" 작업).
 *
 * 기존 구조: 홈페이지의 "Gear Recommendations" 섬션은 GearRecommendation
 * (클라이언트 컴포넌트)이 마운트된 뒤 /api/{coupang,aliexpress}/search를
 * 호출해서야 실제 상품이 채워졌다. 자바스크립트를 실행하지 않는 크롤러
 * 기준으로는(애드센스 심사 크롤러 포함) 서버가 내려주는 초기 HTML에
 * 로딩 스켈레톤만 존재하는 상태였다.
 *
 * 이 함수는 로케일 기준 기본 제공사(쿠팝/알리익스프레스)의 이미 검증된
 * 대표 키워드(각 라우트의 ROW1_KEYWORDS[0]) 하나로 딜 2개만 미리 조회해
 * 서버 HTML에 실제 상품을 심어둔다. 이 조회는 searchCoupangProducts /
 * searchAliexpressProducts에 이미 걸려있는 6시간 캐싱(next: {revalidate:
 * 21600})을 그대로 타므로 요청마다 실제 API를 호출하지 않는다 — 쿠팝
 * 시간당 10회 제한에 영향 없음. 실패(자격 증명 미설정, API 일시 오류 등)
 * 시에는 null을 반환해 기존 동작(클라이언트 위젯이 최종적으로 콘텐츠를
 * 채우는 것)으로 조용히 폴백한다 — 최악의 경우에도 기존보다 나빠지지
 * 않는다.
 */

// src/app/api/coupang/search/route.ts의 ROW1_KEYWORDS[0]과 동일하게 유지할 것
const SSR_COUPANG_KEYWORD = "드론 배터리";
// src/app/api/aliexpress/search/route.ts의 ROW1_KEYWORDS[0]과 동일하게 유지할 것
const SSR_ALIEXPRESS_KEYWORD = "DJI drone battery";

const LOCALE_TO_ALIEXPRESS: Record<string, { currency: string; language: string }> = {
  en: { currency: "USD", language: "EN" },
  ja: { currency: "JPY", language: "JA" },
  es: { currency: "EUR", language: "ES" },
};
const DEFAULT_ALIEXPRESS_LOCALE = { currency: "USD", language: "EN" };

export type InitialGearData =
  | { provider: "coupang"; products: CoupangProduct[] }
  | { provider: "aliexpress"; products: AliexpressProduct[] };

export async function fetchInitialGearProducts(
  locale: string,
): Promise<InitialGearData | null> {
  const provider = resolveAffiliateProvider(locale, null);

  try {
    if (provider === "coupang") {
      const products = await searchCoupangProducts(SSR_COUPANG_KEYWORD, 2);
      return products.length > 0 ? { provider: "coupang", products } : null;
    }

    if (provider === "aliexpress") {
      const target = LOCALE_TO_ALIEXPRESS[locale] ?? DEFAULT_ALIEXPRESS_LOCALE;
      const products = await searchAliexpressProducts(SSR_ALIEXPRESS_KEYWORD, 2, {
        targetCurrency: target.currency,
        targetLanguage: target.language,
      });
      return products.length > 0 ? { provider: "aliexpress", products } : null;
    }

    return null;
  } catch (e) {
    console.error("[gear-recommendation-ssr] initial fetch failed:", e);
    return null;
  }
}
