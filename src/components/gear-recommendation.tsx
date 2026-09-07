"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { resolveAffiliateProvider } from "@/lib/affiliate";
import { CoupangGearCards } from "@/components/coupang-gear-cards";
import { AliexpressGearCards } from "@/components/aliexpress-gear-cards";

function readGeoCountryCookie(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(?:^|; )geo-country=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

function subscribeNever() {
  return () => {};
}

function getServerSnapshot(): "pending" {
  return "pending";
}

/**
 * Client-side wrapper that decides which affiliate provider to show.
 *
 * This resolution intentionally happens in the browser (reading the
 * `geo-country` cookie set by src/proxy.ts) rather than in a Server
 * Component reading cookies() during render. Reading cookies() in a
 * Server Component would opt the entire page out of static generation
 * (Next.js marks the whole route as dynamic), which would undo the
 * SSG/SEO benefit the site is built for.
 */
export function GearRecommendation({ locale }: { locale: string }) {
  const t = useTranslations("Home");

  const provider = React.useSyncExternalStore(
    subscribeNever,
    () => resolveAffiliateProvider(locale, readGeoCountryCookie()),
    getServerSnapshot,
  );

  if (provider === "pending") {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {Array.from({ length: 10 }).map((_, i) => (
          <div
            key={i}
            className="aspect-[3/4] animate-pulse rounded-lg bg-muted"
          />
        ))}
      </div>
    );
  }

  if (provider === "coupang") {
    return <CoupangGearCards />;
  }

  if (provider === "aliexpress") {
    return <AliexpressGearCards />;
  }

  return <p className="text-sm text-muted-foreground">{t("gearSectionHint")}</p>;
}
