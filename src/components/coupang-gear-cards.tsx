"use client";

import * as React from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import type { CoupangProduct } from "@/lib/coupang";

// ExifLens 원본은 ND 필터 계산기의 filterId 값을 검색어 대신 사용했지만
// FlyDroneMap에는 대응되는 상태가 없어 그 로직을 제거하고 단순히 마운트
// 시 한 번 fetch하는 형태로 단순화했다(2026-09-06, 인수인계 문서 4.8 하단
// 안내 참고).
type FetchState =
  | { status: "empty" }
  | { status: "error" }
  | { status: "ok"; products: CoupangProduct[] };

/**
 * initialProducts: 2026-09-19 추가 (AdSense 재심사 대응). 부모 서버
 * 컴포넌트가 미리 조회해둔 실제 상품(src/lib/gear-recommendation-ssr.ts)이
 * 있으면 초기 상태로 그것부터 보여주고(서버 HTML에도 그대로 포함되어
 * 크롤러가 빈 스켈레톤이 아닌 실제 콘텐츠를 본다), 마운트 후 기존처럼
 * /api/coupang/search를 호출해 더 풍부한 개인화 결과로 자연스럽게 교체한다.
 * 이 개인화 조회가 비거나 실패하면 initialProducts를 그대로 유지해 화면이
 * 다시 비어보이지 않도록 한다.
 */
export function CoupangGearCards({
  initialProducts,
}: {
  initialProducts?: CoupangProduct[];
}) {
  const t = useTranslations("Home");
  const [state, setState] = React.useState<FetchState | null>(() =>
    initialProducts && initialProducts.length > 0
      ? { status: "ok", products: initialProducts }
      : null,
  );

  React.useEffect(() => {
    let cancelled = false;

    fetch("/api/coupang/search")
      .then((res) => res.json())
      .then((data: { products?: CoupangProduct[] }) => {
        if (cancelled) return;
        const products = data.products ?? [];
        if (products.length > 0) {
          setState({ status: "ok", products });
        } else if (!initialProducts || initialProducts.length === 0) {
          setState({ status: "empty" });
        }
      })
      .catch(() => {
        if (!cancelled && (!initialProducts || initialProducts.length === 0)) {
          setState({ status: "error" });
        }
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
