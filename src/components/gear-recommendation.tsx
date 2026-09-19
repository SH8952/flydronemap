"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { resolveAffiliateProvider } from "@/lib/affiliate";
import { CoupangGearCards } from "@/components/coupang-gear-cards";
import { AliexpressGearCards } from "@/components/aliexpress-gear-cards";
import type { InitialGearData } from "@/lib/gear-recommendation-ssr";

function readGeoCountryCookie(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(?:^|; )geo-country=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

function subscribeNever() {
  // The geo-country cookie doesn't change during a page's lifetime, so
  // there's nothing to subscribe to — this just satisfies
  // useSyncExternalStore's API.
  return () => {};
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
 *
 * 2026-09-19 (AdSense 재심사 대응): 서버에서 로케일 기준 기본 제공사로
 * 미리 조회해둔 실제 상품 2개(initialData, see
 * src/lib/gear-recommendation-ssr.ts)가 있으면 그걸 getServerSnapshot의
 * 기준값으로 삼는다 — 이전에는 이 값이 무조건 "pending"이라 서버
 * HTML에는 항상 로딩 스켈레톤만 있었다. geo-country 쉷키에 따라
 * 클라이언트에서 실제로 골라야 할 제공사가 initialData와 다르면(드물건 경우),
 * useSyncExternalStore가 알아서 클라이언트 값으로 다시 렌더링한다 — 기존 개인화
 * 동작은 그대로 유지된다.
 */
export function GearRecommendation({
  locale,
  initialData,
}: {
  locale: string;
  initialData: InitialGearData | null;
}) {
  const t = useTranslations("Home");

  const provider = React.useSyncExternalStore(
    subscribeNever,
    () => resolveAffiliateProvider(locale, readGeoCountryCookie()),
    () => initialData?.provider ?? "pending",
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
    return (
      <CoupangGearCards
        initialProducts={
          initialData?.provider === "coupang" ? initialData.products : undefined
        }
      />
    );
  }

  if (provider === "aliexpress") {
    return (
      <AliexpressGearCards
        initialProducts={
          initialData?.provider === "aliexpress" ? initialData.products : undefined
        }
      />
    );
  }

  return <p className="text-sm text-muted-foreground">{t("gearSectionHint")}</p>;
}
