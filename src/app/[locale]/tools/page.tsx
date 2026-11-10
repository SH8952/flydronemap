import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { SITE_URL, languageAlternates, ogLocale, DEFAULT_OG_IMAGE, breadcrumbJsonLd } from "@/lib/seo";
import { ShareButton } from "@/components/share-button";
import { ToolIcon } from "@/components/tools/tool-page";
import { TOOLS } from "@/lib/tools";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Tools.hub" });
  const title = t("metaTitle");
  const description = t("metaDescription");
  return {
    title,
    description,
    alternates: {
      canonical: `${SITE_URL}/${locale}/tools`,
      languages: languageAlternates("/tools"),
    },
    openGraph: {
      type: "website",
      locale: ogLocale(locale),
      siteName: "FlyDroneMap",
      images: [DEFAULT_OG_IMAGE],
      title,
      description,
      url: `${SITE_URL}/${locale}/tools`,
    },
  };
}

export default async function ToolsIndexPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Tools.hub");
  const items = await getTranslations("Tools.items");

  const breadcrumbs = breadcrumbJsonLd([
    { name: "Home", url: `${SITE_URL}/${locale}` },
    { name: t("title"), url: `${SITE_URL}/${locale}/tools` },
  ]);

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-4 py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }} />
      <div className="flex justify-end">
        <ShareButton title={t("title")} text={t("subtitle")} url={`${SITE_URL}/${locale}/tools`} />
      </div>

      <div className="flex flex-col gap-2 text-center">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{t("title")}</h1>
        <p className="mx-auto max-w-2xl text-muted-foreground">{t("subtitle")}</p>
      </div>

      <p className="rounded-lg border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
        {t("notice")}
      </p>

      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {TOOLS.map((tool) => (
          <li key={tool.key}>
            <Link
              href={`/tools/${tool.slug}`}
              className="flex h-full flex-col gap-2 rounded-lg border border-border p-5 transition-colors hover:border-primary hover:bg-muted/30"
            >
              <span className="flex items-center gap-2 text-lg font-semibold tracking-tight">
                <ToolIcon toolKey={tool.key} className="size-5 text-primary" />
                {items(`${tool.key}.name`)}
              </span>
              <span className="text-sm text-muted-foreground">{items(`${tool.key}.description`)}</span>
              <span className="mt-auto pt-2 text-xs font-medium text-primary">{t("openTool")}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}
