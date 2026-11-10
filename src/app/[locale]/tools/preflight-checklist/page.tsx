import type { Metadata } from "next";
import { routing } from "@/i18n/routing";
import { toolMetadata } from "@/lib/tool-metadata";
import { ToolPage } from "@/components/tools/tool-page";
import { PreflightChecklist } from "@/components/tools/preflight-checklist";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return toolMetadata(locale, "checklist");
}

export default async function ChecklistPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return (
    <ToolPage locale={locale} toolKey="checklist">
      <PreflightChecklist />
    </ToolPage>
  );
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}
