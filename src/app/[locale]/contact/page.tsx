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
  const t = await getTranslations({ locale, namespace: "Contact" });
  const title = t("title");

  return {
    title,
    alternates: {
      canonical: `${SITE_URL}/${locale}/contact`,
      languages: languageAlternates("/contact"),
    },
    openGraph: {
      type: "website",
      locale: ogLocale(locale),
      siteName: "FlyDroneMap",
      title,
      url: `${SITE_URL}/${locale}/contact`,
    },
  };
}

export default async function ContactPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Contact");

  return <LegalPage title={t("title")} sections={t.raw("sections")} />;
}
