import { useTranslations } from "next-intl";
import { Wind } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";

/**
 * CTA banner rendered inside guide articles (top and bottom of the body)
 * that links back to the site's main tool (the home page weather/Kp
 * dashboard). Guide pages previously had no path back to the tool itself
 * (only the cross-link to the sister site ExifLens existed) — added
 * 2026-09-09 as part of the SEO task list's day 4 item. Ported from the
 * same pattern already verified on ExifLens's guide pages.
 */
export function GuideToolCta() {
  const t = useTranslations("Guides");

  return (
    <div className="flex flex-col items-start gap-3 rounded-lg border border-border bg-card p-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-2">
        <Wind className="size-5 shrink-0 text-primary" aria-hidden="true" />
        <p className="text-sm font-medium">{t("ctaBannerText")}</p>
      </div>
      <Button asChild size="sm" className="shrink-0">
        <Link href="/">{t("ctaBannerButton")}</Link>
      </Button>
    </div>
  );
}
