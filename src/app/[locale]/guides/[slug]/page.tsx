import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { SITE_URL, languageAlternates, ogLocale } from "@/lib/seo";
import {
  compileGuide,
  getGuideMeta,
  getGuideSlugs,
  getRelatedGuides,
} from "@/lib/guides";
import { GuideImageDevPanel } from "@/components/dev/guide-image-dev-panel";

export function generateStaticParams() {
  return routing.locales.flatMap((locale) =>
    getGuideSlugs(locale).map((slug) => ({ locale, slug })),
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const meta = getGuideMeta(locale as Locale, slug);
  if (!meta) return {};

  return {
    title: meta.title,
    description: meta.description,
    alternates: {
      canonical: `${SITE_URL}/${locale}/guides/${slug}`,
      languages: languageAlternates(`/guides/${slug}`),
    },
    openGraph: {
      type: "article",
      locale: ogLocale(locale),
      siteName: "FlyDroneMap",
      title: meta.title,
      description: meta.description,
      url: `${SITE_URL}/${locale}/guides/${slug}`,
      publishedTime: meta.publishedAt,
      modifiedTime: meta.updatedAt ?? meta.publishedAt,
      images: meta.image
        ? [{ url: `${SITE_URL}${meta.image}`, width: 1600, height: 900 }]
        : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: meta.title,
      description: meta.description,
      images: meta.image ? [`${SITE_URL}${meta.image}`] : undefined,
    },
  };
}

export default async function GuidePage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Guides");

  const compiled = await compileGuide(locale as Locale, slug);
  if (!compiled) notFound();
  const { Content, meta } = compiled;
  const relatedGuides = getRelatedGuides(locale as Locale, slug);

  const dateFormatter = new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: meta.title,
    description: meta.description,
    datePublished: meta.publishedAt,
    dateModified: meta.updatedAt ?? meta.publishedAt,
    author: {
      "@type": "Organization",
      name: "FlyDroneMap",
    },
    publisher: {
      "@type": "Organization",
      name: "FlyDroneMap",
    },
    mainEntityOfPage: `${SITE_URL}/${locale}/guides/${slug}`,
    inLanguage: locale,
  };

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />

      <Link
        href="/guides"
        className="text-sm text-muted-foreground hover:text-foreground"
      >
        {t("backToGuides")}
      </Link>

      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          {meta.title}
        </h1>
        <p className="text-sm text-muted-foreground">
          {dateFormatter.format(new Date(meta.publishedAt))} ·{" "}
          {t("readingTime", { minutes: meta.readingMinutes })}
        </p>
      </div>

      {meta.image ? (
        <figure className="flex flex-col gap-1.5">
          <div className="relative aspect-[16/9] w-full overflow-hidden rounded-lg">
            <Image
              src={meta.image}
              alt={meta.title}
              fill
              sizes="(min-width: 768px) 768px, 100vw"
              className="object-cover"
              priority
            />
          </div>
          {meta.imageCredit && meta.imageCreditUrl ? (
            <figcaption className="text-xs text-muted-foreground">
              Photo by{" "}
              <a
                href={meta.imageCreditUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-foreground"
              >
                {meta.imageCredit}
              </a>{" "}
              on{" "}
              <a
                href="https://unsplash.com/?utm_source=FlyDroneMap&utm_medium=referral"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-foreground"
              >
                Unsplash
              </a>
            </figcaption>
          ) : null}
        </figure>
      ) : null}

      <article className="prose prose-neutral dark:prose-invert max-w-none prose-headings:tracking-tight prose-a:text-primary">
        <Content />
      </article>

      {relatedGuides.length > 0 ? (
        <nav
          aria-label={t("relatedGuides")}
          className="flex flex-col gap-3 border-t border-border pt-6"
        >
          <h2 className="text-lg font-semibold tracking-tight">
            {t("relatedGuides")}
          </h2>
          <ul className="flex flex-col gap-2">
            {relatedGuides.map((guide) => (
              <li key={guide.slug}>
                <Link
                  href={`/guides/${guide.slug}`}
                  className="text-sm text-primary hover:underline"
                >
                  {guide.title}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}

      {process.env.NODE_ENV === "development" ? (
        <GuideImageDevPanel
          slug={slug}
          currentImage={meta.image}
          currentImageCredit={meta.imageCredit}
          tags={meta.tags}
        />
      ) : null}
    </div>
  );
}
