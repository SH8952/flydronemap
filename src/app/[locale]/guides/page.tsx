import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { SITE_URL, languageAlternates, ogLocale } from "@/lib/seo";
import { getAllGuidesMeta } from "@/lib/guides";

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
      siteName: "DroneWeather",
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
  const guides = getAllGuidesMeta(locale as Locale);

  const dateFormatter = new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-10">
      <div className="flex flex-col gap-2 text-center">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          {t("title")}
        </h1>
        <p className="mx-auto max-w-2xl text-muted-foreground">
          {t("subtitle")}
        </p>
      </div>

      {guides.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground">
          {t("empty")}
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {guides.map((guide) => (
            <Link
              key={guide.slug}
              href={`/guides/${guide.slug}`}
              className="flex flex-col gap-1 rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary/40"
            >
              <h2 className="text-lg font-semibold tracking-tight">
                {guide.title}
              </h2>
              <p className="text-sm text-muted-foreground">
                {guide.description}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {dateFormatter.format(new Date(guide.publishedAt))} ·{" "}
                {t("readingTime", { minutes: guide.readingMinutes })}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}
