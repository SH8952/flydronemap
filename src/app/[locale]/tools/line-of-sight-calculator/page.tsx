import type { Metadata } from "next";
import { routing } from "@/i18n/routing";
import { toolMetadata } from "@/lib/tool-metadata";
import { ToolPage } from "@/components/tools/tool-page";
import { LineOfSightCalculator } from "@/components/tools/line-of-sight-calculator";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return toolMetadata(locale, "lineOfSight");
}

export default async function LineOfSightPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return (
    <ToolPage locale={locale} toolKey="lineOfSight">
      <LineOfSightCalculator />
    </ToolPage>
  );
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}
