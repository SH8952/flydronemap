import fs from "node:fs";
import path from "node:path";

/**
 * 개발자가 로컬 개발 서버(FlyDroneMap 실행.command)에서 알리익스프레스
 * 상품 카드를 클릭해 수동으로 차단한 상품 ID 목록을 관리한다.
 *
 * 이 파일이 다루는 JSON 데이터(aliexpress-blocked-products.json)는 실제
 * 방문자 화면(src/app/api/aliexpress/search/route.ts)에도 그대로 반영되어야
 * 하므로, 자동 생성/수정되는 산출물이지만 .gitignore 대상이 아니라 git에
 * 커밋되는 일반 데이터 파일이다.
 *
 * 쓰기(addBlockedProducts)는 반드시 NODE_ENV === "development"를 확인하는
 * 호출자(src/app/api/dev/aliexpress-block/route.ts)에서만 이뤄져야 한다.
 */

const BLOCKLIST_PATH = path.join(process.cwd(), "src/lib/aliexpress-blocked-products.json");

export type BlockedProduct = {
  productId: string;
  productName: string;
  blockedAt: string;
};

function readBlockedProducts(): BlockedProduct[] {
  try {
    const raw = fs.readFileSync(BLOCKLIST_PATH, "utf8");
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as BlockedProduct[]) : [];
  } catch {
    return [];
  }
}

/** 실제 검색 라우트에서 수동 차단된 상품을 걸러낼 때 사용. */
export function getBlockedProductIds(): Set<string> {
  return new Set(readBlockedProducts().map((p) => p.productId));
}

/**
 * 새로 차단할 상품(productId 기준 중복 제거)을 추가하고 파일에 다시 쓴다.
 * NODE_ENV=development 가드는 호출자(API 라우트) 책임.
 */
export function addBlockedProducts(
  newEntries: { productId: string; productName: string }[],
): BlockedProduct[] {
  const existing = readBlockedProducts();
  const existingIds = new Set(existing.map((p) => p.productId));
  const now = new Date().toISOString();

  const additions: BlockedProduct[] = newEntries
    .filter((entry) => entry.productId && !existingIds.has(entry.productId))
    .map((entry) => ({
      productId: entry.productId,
      productName: entry.productName,
      blockedAt: now,
    }));

  const updated = [...existing, ...additions];
  fs.writeFileSync(BLOCKLIST_PATH, `${JSON.stringify(updated, null, 2)}\n`, "utf8");
  return updated;
}
