import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { SITE_URL, languageAlternates, ogLocale } from "@/lib/seo";
import { LegalPage } from "@/components/legal-page";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Privacy" });
  const title = t("title");

  return {
    title,
    alternates: {
      canonical: `${SITE_URL}/${locale}/privacy`,
      languages: languageAlternates("/privacy"),
    },
    openGraph: {
      type: "website",
      locale: ogLocale(locale),
      siteName: "FlyDroneMap",
      title,
      url: `${SITE_URL}/${locale}/privacy`,
    },
  };
}

export default async function PrivacyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Privacy");

  return (
    <LegalPage
      title={t("title")}
      updated={t("updated")}
      sections={t.raw("sections")}
    />
  );
}
