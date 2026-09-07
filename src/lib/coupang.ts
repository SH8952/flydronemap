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
 */
export async function searchCoupangProducts(
  keyword: string,
  limit = 5,
): Promise<CoupangProduct[]> {
  const { accessKey, secretKey } = getCredentials();

  const query = new URLSearchParams({
    keyword,
    limit: String(Math.min(Math.max(limit, 1), 10)),
  }).toString();
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
