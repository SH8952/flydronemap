import { routing } from "@/i18n/routing";

/**
 * The production site URL. Set NEXT_PUBLIC_SITE_URL once the real domain
 * is purchased and pointed at Vercel — everything below (canonical URLs,
 * hreflang alternates, Open Graph, JSON-LD) derives from this one value.
 */
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
  "https://flydronemap.com";

const LOCALE_TO_OG: Record<(typeof routing.locales)[number], string> = {
  en: "en_US",
  ko: "ko_KR",
  es: "es_ES",
  ja: "ja_JP",
  de: "de_DE",
};

export function ogLocale(locale: string) {
  return LOCALE_TO_OG[locale as (typeof routing.locales)[number]] ?? "en_US";
}

/**
 * hreflang alternates plus x-default. 기본값은 지원하는 모든 언어이고,
 * `availableLocales`를 주면 그 언어만 표기한다. 일부 언어에만 번역본이 있는
 * 가이드는 번역본이 없는 언어 주소(404)를 hreflang/사이트맵에 넣지 않도록
 * 반드시 사용 가능한 언어만 넘길 것(2026-10-03: 독일어에 없는 가이드 9편 수정).
 * x-default는 기본 언어가 있으면 기본 언어, 없으면 사용 가능한 첫 언어.
 */
export function languageAlternates(
  path = "",
  availableLocales?: readonly string[],
) {
  const locales = availableLocales
    ? routing.locales.filter((l) => availableLocales.includes(l))
    : routing.locales;
  const entries = locales.map(
    (locale) => [locale, `${SITE_URL}/${locale}${path}`] as const,
  );
  const defaultLocale = locales.includes(routing.defaultLocale)
    ? routing.defaultLocale
    : locales[0];
  return {
    ...Object.fromEntries(entries),
    "x-default": `${SITE_URL}/${defaultLocale}${path}`,
  };
}

export function breadcrumbJsonLd(items: { name: string; url: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

export function webApplicationJsonLd(locale: string) {
  return {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "FlyDroneMap",
    url: `${SITE_URL}/${locale}`,
    applicationCategory: "UtilitiesApplication",
    operatingSystem: "Any (runs in the browser)",
    description:
      "Search any location to check current wind speed, wind gusts, visibility, the latest planetary Kp index, and (for US locations) the FAA UAS Facility Map altitude ceiling for safer drone flight planning.",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    inLanguage: locale,
  };
}
