import type { Metadata } from "next";
import { routing } from "@/i18n/routing";
import { toolMetadata } from "@/lib/tool-metadata";
import { ToolPage } from "@/components/tools/tool-page";
import { DensityAltitudeCalculator } from "@/components/tools/density-altitude-calculator";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return toolMetadata(locale, "densityAltitude");
}

export default async function DensityAltitudePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return (
    <ToolPage locale={locale} toolKey="densityAltitude">
      <DensityAltitudeCalculator />
    </ToolPage>
  );
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}
