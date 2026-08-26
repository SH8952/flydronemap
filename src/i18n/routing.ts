import { defineRouting } from "next-intl/routing";

export const locales = ["en", "es", "ja", "ko"] as const;
export type Locale = (typeof locales)[number];

export const localeLabels: Record<Locale, string> = {
  en: "EN",
  es: "ES",
  ja: "JA",
  ko: "KO",
};

export const routing = defineRouting({
  locales,
  defaultLocale: "en",
  localePrefix: "always",
});
