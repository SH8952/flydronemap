import type { MetadataRoute } from "next";
import { routing, type Locale } from "@/i18n/routing";
import { SITE_URL, languageAlternates } from "@/lib/seo";
import { getAllGuidesMeta } from "@/lib/guides";
import { REGULATION_COUNTRIES } from "@/lib/country-regulations";

/**
 * Every static route currently in the app, per Google AdSense/SEO checklist
 * item 3 ("Google Search Console 인덱싱: sitemap.xml 제출"). `/guides` was
 * added once that route shipped (Phase 3) — individual articles are listed
 * separately below since each locale can have a different set of slugs.
 *
 * NOTE: this file started as a copy of ExifLens's sitemap.ts, which also
 * listed "/frame" (an ExifLens-only route). FlyDroneMap has no such route —
 * removed here so the sitemap doesn't submit 404s to Search Console.
 */
const STATIC_PATHS = [
  "",
  "/privacy",
  "/terms",
  "/about",
  "/disclosure",
  "/contact",
  "/guides",
  "/faq",
  "/regulations",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  const staticEntries = STATIC_PATHS.flatMap((path) => {
    const changeFrequency: "weekly" | "monthly" =
      path === "" || path === "/guides" ? "weekly" : "monthly";
    const priority = path === "" ? 1 : path === "/guides" ? 0.7 : 0.3;

    return routing.locales.map((locale) => ({
      url: `${SITE_URL}/${locale}${path}`,
      lastModified,
      changeFrequency,
      priority,
      alternates: {
        languages: languageAlternates(path),
      },
    }));
  });

  const guideEntries = routing.locales.flatMap((locale) =>
    getAllGuidesMeta(locale as Locale).map((guide) => ({
      url: `${SITE_URL}/${locale}/guides/${guide.slug}`,
      lastModified: new Date(guide.updatedAt ?? guide.publishedAt),
      changeFrequency: "monthly" as const,
      priority: 0.6,
      alternates: {
        languages: languageAlternates(`/guides/${guide.slug}`),
      },
    })),
  );

  const regulationEntries = routing.locales.flatMap((locale) =>
    REGULATION_COUNTRIES.map((country) => ({
      url: `${SITE_URL}/${locale}/regulations/${country.id}`,
      lastModified,
      changeFrequency: "monthly" as const,
      priority: 0.5,
      alternates: {
        languages: languageAlternates(`/regulations/${country.id}`),
      },
    })),
  );

  return [...staticEntries, ...guideEntries, ...regulationEntries];
}
