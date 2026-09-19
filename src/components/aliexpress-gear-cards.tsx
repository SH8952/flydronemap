"use client";

import * as React from "react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import type { AliexpressProduct } from "@/lib/aliexpress";

type FetchState =
  | { status: "empty"; locale: string }
  | { status: "error"; locale: string }
  | { status: "ok"; locale: string; products: AliexpressProduct[] };

// 개발자 전용 "Ads Block" 기능. 노출된 알리익스프레스 상품 중 무관한 것을
// 발견했을 때, 실제 상품 페이지로 이동해서 확인하면(클릭) 개발자 본인이
// 어붰징 클릭을 발생시키게 된다. 대신 로컬(NODE_ENV=development) 환경에서는
// 카드를 클릭해도 이동하지 않고 선택 표시(테두리)만 하며, "Ads Block"
// 버튼으로 선택된 상품을 한꺼번에 /api/dev/aliexpress-block에 등록한다.
const IS_DEV = process.env.NODE_ENV === "development";

/**
 * initialProducts: 2026-09-19 추가 (AdSense 재심사 대응). 부모 서버
 * 컴포넌트가 미리 조회해둔 실제 상품(src/lib/gear-recommendation-ssr.ts)이
 * 있으면 초기 상태로 그것부터 보여주고, 마운트 후 기존처럼
 * /api/aliexpress/search를 호출해 더 풍부한 개인화 결과로 자연스럽게 교체한다.
 */
export function AliexpressGearCards({
  initialProducts,
}: {
  initialProducts?: AliexpressProduct[];
}) {
  const t = useTranslations("Home");
  const locale = useLocale();
  const [state, setState] = React.useState<FetchState | null>(() =>
    initialProducts && initialProducts.length > 0
      ? { status: "ok", locale, products: initialProducts }
      : null,
  );
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [blockStatus, setBlockStatus] = React.useState<"idle" | "sending" | "done" | "error">(
    "idle",
  );

  React.useEffect(() => {
    let cancelled = false;

    fetch(`/api/aliexpress/search?locale=${encodeURIComponent(locale)}`)
      .then((res) => res.json())
      .then((data: { products?: AliexpressProduct[] }) => {
        if (cancelled) return;
        const products = data.products ?? [];
        if (products.length > 0) {
          setState({ status: "ok", locale, products });
        } else if (!initialProducts || initialProducts.length === 0) {
          setState({ status: "empty", locale });
        }
      })
      .catch(() => {
        if (!cancelled && (!initialProducts || initialProducts.length === 0)) {
          setState({ status: "error", locale });
        }
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locale]);

  const toggleSelected = React.useCallback((productId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) {
        next.delete(productId);
      } else {
        next.add(productId);
      }
      return next;
    });
  }, []);

  const handleAdsBlock = React.useCallback(async () => {
    if (state?.status !== "ok" || selectedIds.size === 0) return;
    const targets = state.products.filter((p) => selectedIds.has(p.productId));

    setBlockStatus("sending");
    try {
      const res = await fetch("/api/dev/aliexpress-block", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          products: targets.map((p) => ({
            productId: p.productId,
            productName: p.productName,
          })),
        }),
      });
      if (!res.ok) throw new Error(`status ${res.status}`);

      setState((prev) =>
        prev?.status === "ok"
          ? { ...prev, products: prev.products.filter((p) => !selectedIds.has(p.productId)) }
          : prev,
      );
      setSelectedIds(new Set());
      setBlockStatus("done");
    } catch (e) {
      console.error("[aliexpress-block] failed:", e);
      setBlockStatus("error");
    } finally {
      setTimeout(() => setBlockStatus("idle"), 2000);
    }
  }, [state, selectedIds]);

  if (state === null || state.locale !== locale) {
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
        {state.products.map((product) => {
          const isSelected = IS_DEV && selectedIds.has(product.productId);
          return (
            <a
              key={product.productId}
              href={product.productUrl}
              target="_blank"
              rel="nofollow sponsored noopener noreferrer"
              onClick={(e) => {
                if (!IS_DEV) return;
                e.preventDefault();
                toggleSelected(product.productId);
              }}
              className={`group flex flex-col gap-2 rounded-lg border bg-background p-2 transition-colors ${
                isSelected
                  ? "border-destructive ring-2 ring-destructive"
                  : "border-border hover:border-primary/50"
              }`}
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
                {product.currency} {product.productPrice.toLocaleString()}
              </p>
            </a>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground">{t("gearDisclosure")}</p>

      {IS_DEV ? (
        <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-lg border border-border bg-background p-3 shadow-lg">
          <span className="text-xs text-muted-foreground">
            🛠 알리익스프레스 상품 차단 (DEV) — {selectedIds.size}개 선택됨
          </span>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={handleAdsBlock}
            disabled={selectedIds.size === 0 || blockStatus === "sending"}
          >
            {blockStatus === "sending"
              ? "차단 중..."
              : blockStatus === "done"
                ? "차단 완료"
                : blockStatus === "error"
                  ? "오류 발생"
                  : "Ads Block"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
