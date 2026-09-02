import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { SITE_URL, languageAlternates, ogLocale } from "@/lib/seo";
import { REGULATION_COUNTRIES } from "@/lib/country-regulations";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Regulations" });
  const title = t("title");
  const description = t("subtitle");

  return {
    title,
    description,
    alternates: {
      canonical: `${SITE_URL}/${locale}/regulations`,
      languages: languageAlternates("/regulations"),
    },
    openGraph: {
      type: "website",
      locale: ogLocale(locale),
      siteName: "FlyDroneMap",
      title,
      description,
      url: `${SITE_URL}/${locale}/regulations`,
    },
  };
}

export default async function RegulationsIndexPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Regulations");

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-4 py-10">
      <div className="flex flex-col gap-2 text-center">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          {t("title")}
        </h1>
        <p className="mx-auto max-w-2xl text-muted-foreground">
          {t("subtitle")}
        </p>
      </div>

      <p className="rounded-lg border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
        {t("disclaimer")}
      </p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {REGULATION_COUNTRIES.map((country) => (
          <Link
            key={country.id}
            href={`/regulations/${country.id}`}
            className="flex flex-col gap-1 rounded-lg border border-border p-5 transition-colors hover:border-primary hover:bg-muted/30"
          >
            <span className="text-lg font-semibold tracking-tight">
              {t(`countries.${country.id}.name`)}
            </span>
            <span className="text-sm text-muted-foreground">
              {t(`countries.${country.id}.authority`)}
            </span>
            <span className="mt-2 text-xs font-medium text-primary">
              {country.hasMapData
                ? t("mapAvailableBadge")
                : t("mapUnavailableBadge")}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
