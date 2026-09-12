import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { getAllGuidesMeta } from "@/lib/guides";

/**
 * Homepage "가이드 하이라이트" card section — surfaces a few guide articles
 * (title + excerpt + cover image) directly on the homepage with a deep link
 * into `/guides/[slug]`, and a link to the full `/guides` index.
 *
 * Added for AdSense re-review: the review bot evaluates the homepage's own
 * crawlable text/link richness, and previously nothing on the homepage
 * pointed at the long-form guide content that already exists.
 */
export async function HomeGuideHighlights({ locale }: { locale: string }) {
  const t = await getTranslations("Home");
  const tGuides = await getTranslations("Guides");
  const guides = getAllGuidesMeta(locale as Locale).slice(0, 3);

  if (guides.length === 0) return null;

  return (
    <section className="flex flex-col gap-4 border-t border-border pt-10">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-semibold tracking-tight">
          {t("guideHighlightsTitle")}
        </h2>
        <p className="text-sm text-muted-foreground">
          {t("guideHighlightsSubtitle")}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {guides.map((guide) => (
          <Link
            key={guide.slug}
            href={`/guides/${guide.slug}`}
            className="group flex flex-col gap-3 rounded-xl border border-border bg-card p-4 transition hover:border-foreground/30"
          >
            {guide.image ? (
              <div className="relative aspect-[16/9] overflow-hidden rounded-lg bg-muted">
                <Image
                  src={guide.image}
                  alt={guide.title}
                  fill
                  sizes="(min-width: 640px) 33vw, 100vw"
                  className="object-cover transition duration-300 group-hover:scale-105"
                />
              </div>
            ) : null}
            <div className="flex flex-col gap-1.5">
              <h3 className="font-semibold leading-snug tracking-tight group-hover:underline">
                {guide.title}
              </h3>
              <p className="line-clamp-3 text-sm text-muted-foreground">
                {guide.description}
              </p>
              <span className="text-xs text-muted-foreground">
                {tGuides("readingTime", { minutes: guide.readingMinutes })}
              </span>
            </div>
          </Link>
        ))}
      </div>

      <Link
        href="/guides"
        className="text-sm font-medium underline-offset-4 hover:underline"
      >
        {t("guideHighlightsCta")}
      </Link>
    </section>
  );
}
