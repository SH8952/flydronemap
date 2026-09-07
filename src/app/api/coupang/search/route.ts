import { NextResponse } from "next/server";
import {
  CoupangApiError,
  CoupangConfigError,
  searchCoupangProducts,
  type CoupangProduct,
} from "@/lib/coupang";

// FlyDroneMap 전용 한국어 키워드 (2026-09-06, 석한님 검토·승인).
// 키워드 총 개수(5 + 5 = 10)는 쿠팡 Open API의 시간당 10회 호출 제한 안에
// 맞춰 설계됨 — 새 키워드를 추가하려면 기존 키워드를 줄여 총합 10개를
// 넘지 않도록 유지할 것 (각 키워드 호출은 6시간 캐시되므로, 요청이 몰려도
// 실제 API 호출 횟수 자체는 늘지 않지만 캐시 만료 시점마다 총 10개를
// 넘으면 한도 초과 위험이 있음).
const ROW1_KEYWORDS = [
  "드론 배터리",
  "드론 프로펠러",
  "드론 ND 필터",
  "드론 촬영 microSD",
  "드론 착륙패드",
];
const ROW1_DISPLAY_COUNT = 5;
const ROW1_POOL_SIZE = 5;

const ACCESSORY_KEYWORDS = [
  "조종기 선쉐이드",
  "조종기 넥스트랩",
  "드론 파우치",
  "드론 하드케이스",
  "드론 프로펠러 가드",
];
const ACCESSORY_DISPLAY_COUNT = 5;
const ACCESSORY_POOL_SIZE = 10;

function pickRandom<T>(items: T[], count: number): T[] {
  const shuffled = [...items];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, Math.max(0, count));
}

// capacity(각 키워드의 실제 검색 결과 개수)를 고려해 배분한다. ExifLens의
// 알리익스프레스 라우트에서 이미 이 방식으로 "재고가 적은 키워드에 과다
// 배정되어 노출 개수가 목표보다 적게 나오는" 버그를 수정한 바 있어(2026-09-06
// 인수인계 문서 3번 항목), 쿠팡 쪽도 처음부터 동일한 capacity 기반
// 알고리즘으로 통일한다(ExifLens 원본은 균등 분배 버전이었음).
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

export async function GET() {
  const [row1Settled, accessorySettled] = await Promise.all([
    Promise.allSettled(
      ROW1_KEYWORDS.map((keyword) => searchCoupangProducts(keyword, ROW1_POOL_SIZE)),
    ),
    Promise.allSettled(
      ACCESSORY_KEYWORDS.map((keyword) =>
        searchCoupangProducts(keyword, ACCESSORY_POOL_SIZE),
      ),
    ),
  ]);

  const anyConfigMissing = [...row1Settled, ...accessorySettled].some(
    (r) => r.status === "rejected" && r.reason instanceof CoupangConfigError,
  );
  if (anyConfigMissing) {
    return NextResponse.json({ products: [] }, { status: 200 });
  }

  for (const result of [...row1Settled, ...accessorySettled]) {
    if (result.status === "rejected") {
      if (result.reason instanceof CoupangApiError) {
        console.error("[coupang] API error:", result.reason.message);
      } else {
        console.error("[coupang] unexpected error:", result.reason);
      }
    }
  }

  const row1Pools: CoupangProduct[][] = row1Settled.map((r) =>
    r.status === "fulfilled" ? r.value : [],
  );
  const accessoryPools: CoupangProduct[][] = accessorySettled.map((r) =>
    r.status === "fulfilled" ? r.value : [],
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
    .filter((p): p is CoupangProduct => Boolean(p));

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

  return NextResponse.json(
    { products },
    { headers: { "Cache-Control": "no-store" } },
  );
}
