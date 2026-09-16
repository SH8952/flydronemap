import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing, type Locale } from "@/i18n/routing";
import {
  SITE_URL,
  breadcrumbJsonLd,
  languageAlternates,
  ogLocale,
} from "@/lib/seo";
import { getGuidesByCategory } from "@/lib/guides";
import { GuideCategorySection } from "@/components/guides/guide-category-section";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Guides" });
  const title = t("title");
  const description = t("subtitle");

  return {
    title,
    description,
    alternates: {
      canonical: `${SITE_URL}/${locale}/guides`,
      languages: languageAlternates("/guides"),
    },
    openGraph: {
      type: "website",
      locale: ogLocale(locale),
      siteName: "FlyDroneMap",
      title,
      description,
      url: `${SITE_URL}/${locale}/guides`,
    },
  };
}

export default async function GuidesIndexPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Guides");
  const groups = getGuidesByCategory(locale as Locale);

  const dateFormatter = new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const breadcrumbs = breadcrumbJsonLd([
    { name: "Home", url: `${SITE_URL}/${locale}` },
    { name: t("title"), url: `${SITE_URL}/${locale}/guides` },
  ]);

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-10 px-4 py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }}
      />
      <div className="flex flex-col gap-2 text-center">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          {t("title")}
        </h1>
        <p className="mx-auto max-w-2xl text-muted-foreground">
          {t("subtitle")}
        </p>
      </div>

      {groups.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground">
          {t("empty")}
        </p>
      ) : (
        <div className="flex flex-col gap-10">
          {groups.map(({ category, guides }) => (
            <GuideCategorySection
              key={category}
              categoryLabel={t(`categories.${category}`)}
              expandLabel={t("showMore")}
              collapseLabel={t("showLess")}
              items={guides.map((guide) => ({
                slug: guide.slug,
                title: guide.title,
                description: guide.description,
                dateLabel: `${dateFormatter.format(new Date(guide.publishedAt))} · ${t("readingTime", { minutes: guide.readingMinutes })}`,
              }))}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}
