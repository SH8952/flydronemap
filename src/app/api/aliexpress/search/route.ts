import { NextRequest, NextResponse } from "next/server";
import {
  AliexpressApiError,
  AliexpressConfigError,
  searchAliexpressProducts,
  type AliexpressProduct,
} from "@/lib/aliexpress";
import { getBlockedProductIds } from "@/lib/aliexpress-blocklist";

// FlyDroneMap 전용 영문/브랜드 키워드 (2026-09-06, 석한님 검토·승인).
const ROW1_KEYWORDS = [
  "DJI drone battery",
  "DJI drone propeller",
  "Freewell ND filter drone",
  "Lexar microSD 4K",
  "drone landing pad",
];
const ROW1_DISPLAY_COUNT = 5;
const ROW1_POOL_SIZE = 5;

const ACCESSORY_KEYWORDS = [
  "PolarPro ND filter drone",
  "remote controller sunshade drone",
  "drone neck strap",
  "drone carrying case",
  "drone hard case",
  "drone propeller guard",
];
const ACCESSORY_DISPLAY_COUNT = 5;
const ACCESSORY_POOL_SIZE = 10;

// 상품 제목 기반 2차 안전장치. ExifLens에서 실제로 걸러야 했던 사례(로봇/
// 인형/장난감/폰 케이스/스마트워치/이어폰 등 카메라·드론과 무관한 상품)를
// 그대로 유지. 상품 제목은 target_language에 따라 언어가 다르므로, 화면에
// 보인 언어 그대로 계속 추가하면 됨.
const BLACKLIST_TITLE_WORDS = [
  "robot",
  "companion",
  "plush",
  "doll",
  "toy",
  "phone case",
  "iphone",
  "samsung galaxy",
  "smart watch",
  "earbuds",
  "headphone",
  "bluetooth speaker",
  // FlyDroneMap에서 새로 발견되는 무관 상품은 여기 계속 추가
];

function isRelevantProduct(product: AliexpressProduct, blockedIds: Set<string>): boolean {
  if (blockedIds.has(product.productId)) return false;
  const title = product.productName.toLowerCase();
  return !BLACKLIST_TITLE_WORDS.some((word) => title.includes(word));
}

// UI locale -> AliExpress target_currency / target_language.
const LOCALE_TO_ALIEXPRESS: Record<string, { currency: string; language: string }> = {
  en: { currency: "USD", language: "EN" },
  ja: { currency: "JPY", language: "JA" },
  es: { currency: "EUR", language: "ES" },
};
const DEFAULT_ALIEXPRESS_LOCALE = { currency: "USD", language: "EN" };

function pickRandom<T>(items: T[], count: number): T[] {
  const shuffled = [...items];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, Math.max(0, count));
}

// capacity(각 키워드의 실제 검색 결과 개수)를 고려해 배분 — 그렇지 않으면
// 재고가 적은 키워드에 과다 배정되어 노출 개수가 목표보다 적게 나오는
// 버그가 생김(ExifLens에서 "5개 중 4개만 뜬다"로 실제 발견됨).
function randomDistribution(total: number, capacities: number[]): number[] {
  const counts = new Array(capacities.length).fill(0);
  let remaining = total;
  while (remaining > 0) {
    const available = counts
      .map((count, i) => (count < capacities[i] ? i : -1))
      .filter((i) => i >= 0);
    if (available.length === 0) break;
    const i = available[Math.floor(Math.random() * available.length)];
    counts[i]++;
    remaining--;
  }
  return counts;
}

export async function GET(request: NextRequest) {
  const locale = request.nextUrl.searchParams.get("locale") ?? "";
  const target = LOCALE_TO_ALIEXPRESS[locale] ?? DEFAULT_ALIEXPRESS_LOCALE;

  const [row1Settled, accessorySettled] = await Promise.all([
    Promise.allSettled(
      ROW1_KEYWORDS.map((keyword) =>
        searchAliexpressProducts(keyword, ROW1_POOL_SIZE, {
          targetCurrency: target.currency,
          targetLanguage: target.language,
        }),
      ),
    ),
    Promise.allSettled(
      ACCESSORY_KEYWORDS.map((keyword) =>
        searchAliexpressProducts(keyword, ACCESSORY_POOL_SIZE, {
          targetCurrency: target.currency,
          targetLanguage: target.language,
        }),
      ),
    ),
  ]);

  const anyConfigMissing = [...row1Settled, ...accessorySettled].some(
    (r) => r.status === "rejected" && r.reason instanceof AliexpressConfigError,
  );
  if (anyConfigMissing) {
    return NextResponse.json({ products: [] }, { status: 200 });
  }

  for (const result of [...row1Settled, ...accessorySettled]) {
    if (result.status === "rejected") {
      if (result.reason instanceof AliexpressApiError) {
        console.error("[aliexpress] API error:", result.reason.message);
      } else {
        console.error("[aliexpress] unexpected error:", result.reason);
      }
    }
  }

  const blockedIds = getBlockedProductIds();
  const row1Pools: AliexpressProduct[][] = row1Settled.map((r) =>
    r.status === "fulfilled" ? r.value.filter((p) => isRelevantProduct(p, blockedIds)) : [],
  );
  const accessoryPools: AliexpressProduct[][] = accessorySettled.map((r) =>
    r.status === "fulfilled" ? r.value.filter((p) => isRelevantProduct(p, blockedIds)) : [],
  );

  const availableRow1Indexes = row1Pools
    .map((pool, i) => (pool.length > 0 ? i : -1))
    .filter((i) => i >= 0);
  const chosenRow1Indexes = pickRandom(
    availableRow1Indexes,
    Math.min(ROW1_DISPLAY_COUNT, availableRow1Indexes.length),
  );
  const row1Products = chosenRow1Indexes
    .map((i) => pickRandom(row1Pools[i], 1)[0])
    .filter((p): p is AliexpressProduct => Boolean(p));

  const distribution = randomDistribution(
    ACCESSORY_DISPLAY_COUNT,
    accessoryPools.map((pool) => pool.length),
  );
  const accessoryProducts = accessoryPools.flatMap((pool, i) =>
    pickRandom(pool, distribution[i]),
  );

  const products = [
    ...pickRandom(row1Products, row1Products.length),
    ...pickRandom(accessoryProducts, accessoryProducts.length),
  ];

  if (products.length === 0) {
    return NextResponse.json({ products: [] }, { status: 200 });
  }

  return NextResponse.json({ products }, { headers: { "Cache-Control": "no-store" } });
}
