import crypto from "node:crypto";

/**
 * Server-only client for the Coupang Partners Open API.
 *
 * IMPORTANT: this module reads COUPANG_ACCESS_KEY / COUPANG_SECRET_KEY from
 * process.env directly (no NEXT_PUBLIC_ prefix) and must never be imported
 * from a Client Component — it is only ever called from the
 * /api/coupang/search route handler, which runs on the server.
 *
 * Ported as-is from ExifLens's already-verified implementation
 * (2026-09-06 FlyDroneMap gear recommendation handoff, section 4.3).
 */

const API_BASE = "https://api-gateway.coupang.com";
const SEARCH_PATH = "/v2/providers/affiliate_open_api/apis/openapi/products/search";

export type CoupangProduct = {
  productId: number;
  productName: string;
  productPrice: number;
  productImage: string;
  productUrl: string;
  isRocket: boolean;
  isFreeShipping: boolean;
};

export class CoupangConfigError extends Error {}
export class CoupangApiError extends Error {}

/** yyMMdd'T'HHmmss'Z' in UTC, as required by Coupang's CEA signature scheme. */
function signedDate(now: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const yy = String(now.getUTCFullYear()).slice(2);
  const MM = pad(now.getUTCMonth() + 1);
  const dd = pad(now.getUTCDate());
  const HH = pad(now.getUTCHours());
  const mm = pad(now.getUTCMinutes());
  const ss = pad(now.getUTCSeconds());
  return `${yy}${MM}${dd}T${HH}${mm}${ss}Z`;
}

function buildAuthorizationHeader(
  method: string,
  pathWithQuery: string,
  accessKey: string,
  secretKey: string,
): string {
  const datetime = signedDate(new Date());
  const [path, query = ""] = pathWithQuery.split("?");
  const message = `${datetime}${method}${path}${query}`;
  const signature = crypto
    .createHmac("sha256", secretKey)
    .update(message)
    .digest("hex");

  return `CEA algorithm=HmacSHA256, access-key=${accessKey}, signed-date=${datetime}, signature=${signature}`;
}

function getCredentials() {
  // 2026-09-24: 로컬 개발 중 쿠팡 파트너스 Open API 시간당 호출 한도(10회)를
  // 반복 초과해(dev 서버 재시작마다 캐시가 초기화되며 /api/coupang/search 1회
  // 호출이 키워드 10개를 한 번에 조회하는 구조라 재시작 몇 번 만에 한도 소진)
  // "3회 초과 시 파트너스 이용 제한" 경고가 발생, 계정 제재 위험을 피하기
  // 위해 임시로 COUPANG_API_DISABLED 환경변수로 호출 자체를 차단할 수 있게
  // 함. CoupangConfigError를 던지면 기존 호출부(gear-recommendation-ssr.ts,
  // /api/coupang/search/route.ts)가 이미 "자격 증명 미설정" 상황과 동일하게
  // 조용히 빈 배열/폴백으로 처리하도록 되어 있어 다른 코드 변경이 전혀
  // 필요 없음. .env.local에만 설정(git에 커밋되지 않음, 배포 서버에는
  // 영향 없음) — 해제하려면 .env.local에서 이 줄을 지우고 dev 서버 재시작.
  if (process.env.COUPANG_API_DISABLED === "true") {
    throw new CoupangConfigError("COUPANG_API_DISABLED=true (temporarily disabled)");
  }

  const accessKey = process.env.COUPANG_ACCESS_KEY;
  const secretKey = process.env.COUPANG_SECRET_KEY;
  if (!accessKey || !secretKey) {
    throw new CoupangConfigError(
      "COUPANG_ACCESS_KEY / COUPANG_SECRET_KEY are not configured",
    );
  }
  return { accessKey, secretKey };
}

/**
 * Searches Coupang products by keyword. The Open API's rate limit is a
 * strict 10 requests/hour per account, so callers MUST cache results
 * (the /api/coupang/search route does this via Next.js's fetch cache) —
 * never call this directly from a per-request/per-user code path.
 *
 * When COUPANG_PARTNER_SUBID is set, it is sent as the `subId` request
 * parameter so Coupang tags every returned productUrl with it — this is
 * what lets clicks/sales be broken out by subId in the Partners dashboard.
 * Optional: omitted entirely (not sent as an empty param) when unset.
 */
export async function searchCoupangProducts(
  keyword: string,
  limit = 5,
): Promise<CoupangProduct[]> {
  const { accessKey, secretKey } = getCredentials();
  const subId = process.env.COUPANG_PARTNER_SUBID;

  const params: Record<string, string> = {
    keyword,
    limit: String(Math.min(Math.max(limit, 1), 10)),
  };
  if (subId) {
    params.subId = subId;
  }
  const query = new URLSearchParams(params).toString();
  const pathWithQuery = `${SEARCH_PATH}?${query}`;

  const authorization = buildAuthorizationHeader(
    "GET",
    pathWithQuery,
    accessKey,
    secretKey,
  );

  const response = await fetch(`${API_BASE}${pathWithQuery}`, {
    method: "GET",
    headers: {
      Authorization: authorization,
      "Content-Type": "application/json;charset=UTF-8",
    },
    // Cache for 6 hours at the fetch layer too, as a second safety net
    // alongside the route handler's own cache.
    next: { revalidate: 21600 },
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new CoupangApiError(
      `Coupang API responded with ${response.status}: ${body.slice(0, 300)}`,
    );
  }

  const json = (await response.json()) as {
    rCode?: string;
    rMessage?: string;
    data?: { productData?: CoupangProduct[] };
  };

  if (json.rCode && json.rCode !== "0") {
    throw new CoupangApiError(json.rMessage || `Coupang API error ${json.rCode}`);
  }

  return json.data?.productData ?? [];
}
