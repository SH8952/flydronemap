import type { Metadata } from "next";
import { routing } from "@/i18n/routing";
import { toolMetadata } from "@/lib/tool-metadata";
import { ToolPage } from "@/components/tools/tool-page";
import { EuCategoryCheck } from "@/components/tools/eu-category-check";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return toolMetadata(locale, "euCategory");
}

export default async function EuCategoryPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return (
    <ToolPage locale={locale} toolKey="euCategory">
      <EuCategoryCheck />
    </ToolPage>
  );
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}
