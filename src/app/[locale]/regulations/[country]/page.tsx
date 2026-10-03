import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ExternalLink, MapPin } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { SITE_URL, languageAlternates, ogLocale } from "@/lib/seo";
import { ShareButton } from "@/components/share-button";
import { RegulationRelatedGuides } from "@/components/regulation-related-guides";
import {
  REGULATION_COUNTRIES,
  getRegulationCountry,
} from "@/lib/country-regulations";

export function generateStaticParams() {
  return routing.locales.flatMap((locale) =>
    REGULATION_COUNTRIES.map((country) => ({ locale, country: country.id })),
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; country: string }>;
}): Promise<Metadata> {
  const { locale, country: countryId } = await params;
  const country = getRegulationCountry(countryId);
  if (!country) return {};

  const t = await getTranslations({ locale, namespace: "Regulations" });
  // 검색어 의도(예: "korea drone map", "mapa drones españa")에 맞춘 전용
  // 메타 문구. 없으면 기존 방식(국가명 — 제목 / 요약 첫 줄)으로 대체.
  const title = t.has(`countries.${country.id}.metaTitle`)
    ? t(`countries.${country.id}.metaTitle`)
    : `${t(`countries.${country.id}.name`)} — ${t("title")}`;
  const description = t.has(`countries.${country.id}.metaDescription`)
    ? t(`countries.${country.id}.metaDescription`)
    : t(`countries.${country.id}.summary.0`);

  return {
    title,
    description,
    alternates: {
      canonical: `${SITE_URL}/${locale}/regulations/${country.id}`,
      languages: languageAlternates(`/regulations/${country.id}`),
    },
    openGraph: {
      type: "article",
      locale: ogLocale(locale),
      siteName: "FlyDroneMap",
      title,
      description,
      url: `${SITE_URL}/${locale}/regulations/${country.id}`,
    },
  };
}

export default async function RegulationCountryPage({
  params,
}: {
  params: Promise<{ locale: string; country: string }>;
}) {
  const { locale, country: countryId } = await params;
  const country = getRegulationCountry(countryId);
  if (!country) notFound();

  setRequestLocale(locale);
  const t = await getTranslations("Regulations");
  const summary = t.raw(`countries.${country.id}.summary`) as string[];

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-10">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-3">
          <Link
            href="/regulations"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            ← {t("backToList")}
          </Link>
          <ShareButton
            title={`${t(`countries.${country.id}.name`)} — ${t("title")}`}
            text={summary[0]}
            url={`${SITE_URL}/${locale}/regulations/${country.id}`}
          />
        </div>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          {t(`countries.${country.id}.name`)}
        </h1>
        <p className="text-muted-foreground">
          {t(`countries.${country.id}.authority`)}
        </p>
      </div>

      <p className="rounded-lg border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
        {t("disclaimer")}
      </p>

      <div className="flex flex-col gap-3">
        {summary.map((paragraph, i) => (
          <p key={i} className="text-sm leading-relaxed text-foreground">
            {paragraph}
          </p>
        ))}
      </div>

      <div className="rounded-lg border border-border p-5">
        <div className="flex items-start gap-3">
          <MapPin className="mt-0.5 size-5 shrink-0 text-primary" />
          <div className="flex flex-col gap-1">
            <p className="text-sm font-medium">
              {country.hasMapData
                ? t("mapAvailableNote")
                : t("mapUnavailableNote")}
            </p>
            {country.hasMapData ? (
              <Link
                href="/"
                className="text-sm font-medium text-primary hover:underline"
              >
                {t("viewOnMapLabel")} →
              </Link>
            ) : null}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold tracking-tight">
          {t("officialLinksTitle")}
        </h2>
        <ul className="flex flex-col gap-2">
          {country.links.map((link) => (
            <li key={link.key}>
              <a
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
              >
                {t(`countries.${country.id}.links.${link.key}`)}
                <ExternalLink className="size-3.5" />
              </a>
            </li>
          ))}
        </ul>
      </div>

      <RegulationRelatedGuides
        locale={locale}
        slugs={country.relatedGuideSlugs}
      />
    </div>
  );
}
