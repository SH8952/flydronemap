import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { getAllGuidesMeta } from "@/lib/guides";

function pickRandomGuides<T>(items: T[], count: number): T[] {
  const pool = [...items];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, count);
}

/**
 * Homepage "가이드 하이라이트" card section — surfaces a random selection of
 * guide articles (title + excerpt + cover image) directly on the homepage
 * with a deep link into `/guides/[slug]`, and a link to the full `/guides`
 * index. The 6 guides shown are reshuffled on every request (Fisher-Yates),
 * so repeat visitors see a different subset over time.
 *
 * Added for AdSense re-review: the review bot evaluates the homepage's own
 * crawlable text/link richness, and previously nothing on the homepage
 * pointed at the long-form guide content that already exists. Expanded
 * from a fixed 3 to a random 6 on 2026-09-27, matching the same change
 * shipped on ExifLens.
 */
export async function HomeGuideHighlights({ locale }: { locale: string }) {
  const t = await getTranslations("Home");
  const tGuides = await getTranslations("Guides");
  const guides = pickRandomGuides(getAllGuidesMeta(locale as Locale), 6);

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
