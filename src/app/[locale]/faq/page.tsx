import type { Metadata } from "next";
import { ChevronDown } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { SITE_URL, languageAlternates, ogLocale } from "@/lib/seo";

type FaqItem = { question: string; answer: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Faq" });
  const title = t("title");
  const description = t("subtitle");

  return {
    title,
    description,
    alternates: {
      canonical: `${SITE_URL}/${locale}/faq`,
      languages: languageAlternates("/faq"),
    },
    openGraph: {
      type: "website",
      locale: ogLocale(locale),
      siteName: "FlyDroneMap",
      title,
      description,
      url: `${SITE_URL}/${locale}/faq`,
    },
  };
}

export default async function FaqPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Faq");
  const home = await getTranslations("Home");
  const faqs: FaqItem[] = home.raw("faq");

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      <div className="flex flex-col gap-2 text-center">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          {t("title")}
        </h1>
        <p className="mx-auto max-w-2xl text-muted-foreground">
          {t("subtitle")}
        </p>
      </div>

      <div className="flex flex-col divide-y divide-border rounded-lg border border-border">
        {faqs.map((item, i) => (
          <details
            key={i}
            className="group p-4 [&_summary::-webkit-details-marker]:hidden"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium">
              {item.question}
              <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-180" />
            </summary>
            <p className="mt-2 text-sm text-muted-foreground">
              {item.answer}
            </p>
          </details>
        ))}
      </div>
    </div>
  );
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}
