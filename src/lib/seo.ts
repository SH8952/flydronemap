import { routing } from "@/i18n/routing";

/**
 * The production site URL. Set NEXT_PUBLIC_SITE_URL once the real domain
 * is purchased and pointed at Vercel — everything below (canonical URLs,
 * hreflang alternates, Open Graph, JSON-LD) derives from this one value.
 */
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
  "https://droneweather.example.com";

const LOCALE_TO_OG: Record<(typeof routing.locales)[number], string> = {
  en: "en_US",
  ko: "ko_KR",
  es: "es_ES",
  ja: "ja_JP",
};

export function ogLocale(locale: string) {
  return LOCALE_TO_OG[locale as (typeof routing.locales)[number]] ?? "en_US";
}

/** hreflang alternates for every supported locale, plus x-default. */
export function languageAlternates(path = "") {
  const entries = routing.locales.map(
    (locale) => [locale, `${SITE_URL}/${locale}${path}`] as const,
  );
  return {
    ...Object.fromEntries(entries),
    "x-default": `${SITE_URL}/${routing.defaultLocale}${path}`,
  };
}

export function webApplicationJsonLd(locale: string) {
  return {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "DroneWeather",
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
