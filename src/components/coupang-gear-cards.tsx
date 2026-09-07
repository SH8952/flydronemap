"use client";

import * as React from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import type { CoupangProduct } from "@/lib/coupang";

// ExifLens 원본은 ND 필터 계산기의 filterId 값을 검색어 대신 사용했지만,
// FlyDroneMap에는 대응되는 상태가 없어 그 로직을 제거하고 단순히 마운트
// 시 한 번 fetch하는 형태로 단순화했다(2026-09-06, 인수인계 문서 4.8 하단
// 안내 참고).
type FetchState =
  | { status: "empty" }
  | { status: "error" }
  | { status: "ok"; products: CoupangProduct[] };

export function CoupangGearCards() {
  const t = useTranslations("Home");
  const [state, setState] = React.useState<FetchState | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    fetch("/api/coupang/search")
      .then((res) => res.json())
      .then((data: { products?: CoupangProduct[] }) => {
        if (cancelled) return;
        const products = data.products ?? [];
        setState(products.length > 0 ? { status: "ok", products } : { status: "empty" });
      })
      .catch(() => {
        if (!cancelled) setState({ status: "error" });
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (state === null) {
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

  if (state.status === "empty" || state.status === "error") {
    return <p className="text-sm text-muted-foreground">{t("gearSectionHint")}</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {state.products.map((product) => (
          <a
            key={product.productId}
            href={product.productUrl}
            target="_blank"
            rel="nofollow sponsored noopener noreferrer"
            className="group flex flex-col gap-2 rounded-lg border border-border bg-background p-2 transition-colors hover:border-primary/50"
          >
            <div className="relative aspect-square overflow-hidden rounded-md bg-muted">
              <Image
                src={product.productImage}
                alt={product.productName}
                fill
                sizes="(min-width: 640px) 20vw, 45vw"
                className="object-cover transition-transform group-hover:scale-105"
                unoptimized
              />
            </div>
            <p className="line-clamp-2 text-xs text-foreground">
              {product.productName}
            </p>
            <p className="text-sm font-semibold text-primary">
              {product.productPrice.toLocaleString()}원
            </p>
          </a>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">{t("gearDisclosure")}</p>
    </div>
  );
}
