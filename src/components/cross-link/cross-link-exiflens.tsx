"use client";

import { useTranslations } from "next-intl";
import { Camera, ArrowUpRight } from "lucide-react";

/**
 * Contextual cross-link to the sister site ExifLens (camera EXIF
 * analysis & ND filter long-exposure calculator). Rendered only once the
 * user has an actual flight-condition result (same gating as the result
 * cards above it) so it appears in the exact context where it's useful,
 * rather than as a site-wide banner. Kept as `rel="noopener noreferrer"`
 * (no nofollow/sponsored): this is a legitimate same-owner tool
 * recommendation, not a paid or manipulative link.
 */
export function CrossLinkExifLens() {
  const t = useTranslations("Home");

  return (
    <section
      aria-labelledby="cross-link-exiflens-heading"
      className="rounded-lg border border-border p-5"
    >
      <div className="mb-1 flex items-center gap-2 font-semibold">
        <Camera className="size-4" aria-hidden="true" />
        <h3 id="cross-link-exiflens-heading">{t("crossLinkTitle")}</h3>
      </div>

      <p className="text-sm text-muted-foreground">
        {t("crossLinkDescription")}
      </p>

      <a
        href="https://exiflens.com/"
        target="_blank"
        rel="noopener noreferrer"
        aria-label={t("crossLinkCtaAria")}
        className="mt-3 inline-flex items-center gap-1 rounded-sm text-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        {t("crossLinkCta")}
        <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
      </a>
    </section>
  );
}
