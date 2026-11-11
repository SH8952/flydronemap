import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { SITE_URL, languageAlternates, ogLocale, DEFAULT_OG_IMAGE, breadcrumbJsonLd } from "@/lib/seo";
import { ShareButton } from "@/components/share-button";
import { ToolIcon } from "@/components/tools/tool-page";
import { TOOLS, TOOL_CATEGORIES } from "@/lib/tools";
import { getToolImage } from "@/lib/tool-images";
import { ToolImageDevPanel } from "@/components/dev/tool-image-dev-panel";
import { BackLink } from "@/components/back-link";

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
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-10">
      <BackLink to="home" className="-mb-4" />
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

      {TOOL_CATEGORIES.map((category) => {
        const list = TOOLS.filter((tool) => tool.category === category);
        if (list.length === 0) return null;
        return (
          <section key={category} aria-labelledby={`tools-cat-${category}`} className="flex flex-col gap-4">
            <h2 id={`tools-cat-${category}`} className="text-xl font-semibold tracking-tight">
              {t(`categories.${category}`)}
            </h2>
            <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {list.map((tool) => (
                <li key={tool.key}>
                  <Link
                    href={`/tools/${tool.slug}`}
                    className="flex h-full flex-col gap-2 overflow-hidden rounded-lg border border-border p-5 transition-colors hover:border-primary hover:bg-muted/30"
                  >
                    {getToolImage(tool.slug) ? (
                      <span className="relative -mx-5 -mt-5 mb-1 block aspect-[16/7] overflow-hidden">
                        <Image
                          src={getToolImage(tool.slug)!.image}
                          alt={items(`${tool.key}.name`)}
                          fill
                          sizes="(min-width: 1024px) 320px, (min-width: 640px) 440px, 100vw"
                          className="object-cover"
                        />
                      </span>
                    ) : null}
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
          </section>
        );
      })}

      {process.env.NODE_ENV === "development" ? (
        <ToolImageDevPanel
          items={TOOLS.map((tool) => {
            const img = getToolImage(tool.slug);
            return {
              slug: tool.slug,
              label: items(`${tool.key}.name`),
              query: tool.imageQuery,
              currentImage: img?.image,
              currentImageCredit: img?.imageCredit,
            };
          })}
        />
      ) : null}
    </div>
  );
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}
