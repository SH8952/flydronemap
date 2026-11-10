import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { SITE_URL, languageAlternates, ogLocale, DEFAULT_OG_IMAGE } from "@/lib/seo";
import { getTool, type ToolKey } from "@/lib/tools";
import { getToolImage } from "@/lib/tool-images";

/** 도구 페이지 공통 메타데이터. 제목 템플릿(" · FlyDroneMap")은 레이아웃이 붙인다. */
export async function toolMetadata(locale: string, key: ToolKey): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: `Tools.${key}` });
  const { slug } = getTool(key);
  const path = `/tools/${slug}`;
  const title = t("metaTitle");
  const description = t("metaDescription");
  const hero = getToolImage(slug);
  const ogImages = hero ? [{ url: `${SITE_URL}${hero.image}`, width: 1600, height: 900 }] : [DEFAULT_OG_IMAGE];
  return {
    title,
    description,
    alternates: {
      canonical: `${SITE_URL}/${locale}${path}`,
      languages: languageAlternates(path),
    },
    openGraph: {
      type: "website",
      locale: ogLocale(locale),
      siteName: "FlyDroneMap",
      images: ogImages,
      title,
      description,
      url: `${SITE_URL}/${locale}${path}`,
    },
  };
}
