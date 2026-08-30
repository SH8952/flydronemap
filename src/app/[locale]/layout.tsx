import type { Metadata } from "next";
import Script from "next/script";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { SITE_URL, languageAlternates, ogLocale, webApplicationJsonLd } from "@/lib/seo";
import { ThemeProvider } from "@/components/theme-provider";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { AdZone } from "@/components/ad-zone";
import "../globals.css";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

const ADSENSE_PUBLISHER_ID = process.env.NEXT_PUBLIC_ADSENSE_PUBLISHER_ID;
// AdSense's script tag requires the "ca-" prefixed client id (e.g.
// "ca-pub-XXXX"), while ads.txt and most dashboards use the bare "pub-XXXX"
// form. Normalize here so either form works in the env var.
const ADSENSE_CLIENT_ID = ADSENSE_PUBLISHER_ID
  ? ADSENSE_PUBLISHER_ID.startsWith("ca-")
    ? ADSENSE_PUBLISHER_ID
    : `ca-${ADSENSE_PUBLISHER_ID}`
  : undefined;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Home" });
  const title = t("metaTitle");
  const description = t("metaDescription");

  return {
    metadataBase: new URL(SITE_URL),
    title: {
      default: title,
      template: "%s · FlyDroneMap",
    },
    description,
    verification: {
      other: {
        "naver-site-verification": "3902a60f56435f9d59103b6255c02e82769238f7",
      },
    },
    alternates: {
      canonical: `${SITE_URL}/${locale}`,
      languages: languageAlternates(),
    },
    openGraph: {
      type: "website",
      locale: ogLocale(locale),
      siteName: "FlyDroneMap",
      title,
      description,
      url: `${SITE_URL}/${locale}`,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);

  return (
    <html lang={locale} suppressHydrationWarning className="h-full antialiased">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(webApplicationJsonLd(locale)),
          }}
        />
        <Script
          async
          strategy="afterInteractive"
          src="https://www.googletagmanager.com/gtag/js?id=G-QFT36DH8YR"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-QFT36DH8YR');
          `}
        </Script>
        {ADSENSE_CLIENT_ID ? (
          <Script
            async
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT_ID}`}
            crossOrigin="anonymous"
            strategy="afterInteractive"
          />
        ) : null}
      </head>
      <body className="flex min-h-full flex-col">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          <NextIntlClientProvider>
            <SiteHeader />
            <div className="w-full px-4 py-3">
              <AdZone
                id="top-leaderboard"
                label="Ad"
                size="728×90"
                className="max-w-[728px]"
              />
            </div>
            <main className="flex-1">{children}</main>
            <div className="w-full px-4 py-3">
              <AdZone
                id="bottom-infeed"
                label="Ad"
                size="in-feed"
                className="max-w-3xl"
              />
            </div>
            <SiteFooter />
          </NextIntlClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
