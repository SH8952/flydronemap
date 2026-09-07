import { NextRequest, NextResponse } from "next/server";
import { addBlockedProducts } from "@/lib/aliexpress-blocklist";

// 개발자 전용 - 로컬(NODE_ENV=development)에서만 동작. 홈페이지 알리익스프레스
// 상품 카드에서 개발자가 클릭으로 선택한 상품을, 실제 상품 페이지로 이동해
// 클릭 어뷰징을 일으키지 않고도 차단 목록(aliexpress-blocked-products.json)에
// 등록하기 위한 라우트.
export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "개발 모드에서만 사용할 수 있습니다." }, { status: 403 });
  }

  const body = (await req.json().catch(() => null)) as { products?: unknown } | null;
  const rawProducts = Array.isArray(body?.products) ? body.products : [];

  const products: { productId: string; productName: string }[] = rawProducts.filter(
    (p): p is { productId: string; productName: string } =>
      typeof p === "object" &&
      p !== null &&
      typeof (p as Record<string, unknown>).productId === "string" &&
      typeof (p as Record<string, unknown>).productName === "string",
  );

  if (products.length === 0) {
    return NextResponse.json({ error: "products가 비어 있습니다." }, { status: 400 });
  }

  try {
    const updated = addBlockedProducts(products);
    return NextResponse.json({ blockedCount: updated.length });
  } catch (e) {
    console.error("[dev/aliexpress-block] unexpected error:", e);
    return NextResponse.json({ error: "차단 등록 중 오류가 발생했습니다." }, { status: 500 });
  }
}
