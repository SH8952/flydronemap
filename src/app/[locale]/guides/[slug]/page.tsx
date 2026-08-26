import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { SITE_URL, languageAlternates, ogLocale } from "@/lib/seo";
import { compileGuide, getGuideMeta, getGuideSlugs } from "@/lib/guides";

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
      siteName: "DroneWeather",
      title: meta.title,
      description: meta.description,
      url: `${SITE_URL}/${locale}/guides/${slug}`,
      publishedTime: meta.publishedAt,
      modifiedTime: meta.updatedAt ?? meta.publishedAt,
    },
    twitter: {
      card: "summary_large_image",
      title: meta.title,
      description: meta.description,
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
      name: "DroneWeather",
    },
    publisher: {
      "@type": "Organization",
      name: "DroneWeather",
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

      <article className="prose prose-neutral dark:prose-invert max-w-none prose-headings:tracking-tight prose-a:text-primary">
        <Content />
      </article>
    </div>
  );
}
