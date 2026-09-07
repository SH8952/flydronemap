export type AffiliateProvider = "coupang" | "aliexpress" | null;

/**
 * Decides which affiliate program to show, mixing two signals:
 *  1. The visitor's real country, when Vercel's edge provides one (see
 *     src/proxy.ts, which copies `x-vercel-ip-country` into the
 *     `geo-country` cookie).
 *  2. A fallback based on the UI language, for local dev / non-Vercel
 *     hosting / when no geo signal is available yet.
 *
 * This is a plain, dependency-free function (no next/headers) so it can be
 * called from a Client Component — resolving it client-side (reading the
 * cookie in the browser) keeps the main page fully static/SSG instead of
 * opting the whole route into per-request dynamic rendering, which is what
 * happens if a Server Component reads cookies() here instead.
 *
 * Korea shows Coupang Partners. Everywhere else shows AliExpress
 * Affiliate.
 *
 * Note for local dev: with no `x-vercel-ip-country` header (see
 * src/proxy.ts), `geoCountry` is always null locally, so the UI locale
 * alone decides the provider — switching the site's language switcher
 * between ko and en/ja/es previews both experiences without needing a
 * real overseas connection.
 */
export function resolveAffiliateProvider(
  locale: string,
  geoCountry: string | null,
): AffiliateProvider {
  if (geoCountry) {
    return geoCountry === "KR" ? "coupang" : "aliexpress";
  }
  return locale === "ko" ? "coupang" : "aliexpress";
}
