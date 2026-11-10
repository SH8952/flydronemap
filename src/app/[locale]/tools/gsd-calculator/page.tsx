import type { Metadata } from "next";
import { routing } from "@/i18n/routing";
import { toolMetadata } from "@/lib/tool-metadata";
import { ToolPage } from "@/components/tools/tool-page";
import { GsdCalculator } from "@/components/tools/gsd-calculator";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return toolMetadata(locale, "gsd");
}

export default async function GsdPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return (
    <ToolPage locale={locale} toolKey="gsd">
      <GsdCalculator />
    </ToolPage>
  );
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}
