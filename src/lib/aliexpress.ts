import crypto from "node:crypto";

/**
 * Server-only client for the AliExpress Affiliate Open Platform API.
 *
 * IMPORTANT: this module reads ALIEXPRESS_APP_KEY / ALIEXPRESS_APP_SECRET /
 * ALIEXPRESS_TRACKING_ID from process.env directly (no NEXT_PUBLIC_ prefix)
 * and must never be imported from a Client Component — it is only ever
 * called from the /api/aliexpress/search route handler, which runs on the
 * server. Mirrors the structure of src/lib/coupang.ts.
 *
 * AliExpress does not publish a formal OpenAPI spec for this API (unlike
 * Coupang), and this endpoint's exact wire format has proven to vary
 * across community write-ups (MD5 vs HMAC-SHA256, string vs epoch-ms
 * timestamp, one POST body vs query+body split — several combinations
 * were tried and all failed with a live "IncompleteSignature" error while
 * building this for ExifLens). The implementation below is instead copied
 * as closely as possible from a *confirmed-working* call to this exact
 * API (2026-09-06 FlyDroneMap gear recommendation handoff, section 4.1).
 * Do not "improve" this signature/param shape without re-verifying against
 * a real request — every deviation from this exact shape (extra params,
 * split query/body, a different timestamp format) has broken it in
 * practice. If AliExpress ever changes this, the symptom will be a JSON
 * body with an `error_response` key — see parseProductQueryResponse below,
 * which surfaces that case as an AliexpressApiError with the raw error
 * message.
 */

const API_HOST = "api-sg.aliexpress.com";
const API_PATH = "/sync";
const METHOD_PRODUCT_QUERY = "aliexpress.affiliate.product.query";

export type AliexpressProduct = {
  productId: string;
  productName: string;
  productPrice: number;
  currency: string;
  productImage: string;
  productUrl: string;
};

export class AliexpressConfigError extends Error {}
export class AliexpressApiError extends Error {}

// ---------------------------------------------------------------------------
// Real (Redis-backed) result cache.
//
// 2026-09-27: added alongside the ExifLens<->FlyDroneMap AliExpress-as-
// Coupang-fallback feature (see /api/coupang/search route's caller,
// src/components/coupang-gear-cards.tsx). Before this change,
// searchAliexpressProducts() relied only on Next.js's
// `fetch(..., { next: { revalidate: 21600 } })` cache — the exact same
// "cached for 6 hours" assumption that turned out to be false in
// production for src/lib/coupang.ts (see that file's history and
// CHANGELOG 2026-09-27) and nearly got the Coupang Partners account
// suspended. AliExpress does not publish as tight a per-account limit as
// Coupang's 10/hour, but adding a new call path (the Korean-locale
// fallback) that leans on the same unverified caching assumption would be
// repeating a known mistake rather than learning from it. This module now
// caches successful results in the shared Upstash Redis instance (same one
// src/lib/visitor-counter.ts and src/lib/coupang.ts use) with an explicit
// TTL, and short-circuits with a cached empty result for a cooldown period
// after any API error, exactly mirroring src/lib/coupang.ts's approach.
// ---------------------------------------------------------------------------

const KV_URL = process.env.KV_REST_API_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN;

const PROJECT = "flydronemap";
const CACHE_PREFIX = `${PROJECT}:aliexpress:search:v1:`;
const CACHE_TTL_SECONDS = 60 * 60 * 6; // 6 hours
const ERROR_COOLDOWN_SECONDS = 60 * 15; // 15 minutes — circuit breaker after any API error

async function getCachedProducts(cacheKey: string): Promise<AliexpressProduct[] | null> {
  if (!KV_URL || !KV_TOKEN) return null;
  try {
    const res = await fetch(`${KV_URL}/get/${encodeURIComponent(cacheKey)}`, {
      headers: { Authorization: `Bearer ${KV_TOKEN}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { result: string | null };
    if (!data.result) return null;
    return JSON.parse(data.result) as AliexpressProduct[];
  } catch {
    return null;
  }
}

async function setCachedProducts(
  cacheKey: string,
  products: AliexpressProduct[],
  ttlSeconds: number,
): Promise<void> {
  if (!KV_URL || !KV_TOKEN) return;
  try {
    const value = encodeURIComponent(JSON.stringify(products));
    await fetch(
      `${KV_URL}/set/${encodeURIComponent(cacheKey)}/${value}/EX/${ttlSeconds}`,
      {
        headers: { Authorization: `Bearer ${KV_TOKEN}` },
        cache: "no-store",
      },
    );
  } catch {
    // Best-effort — a cache-write failure shouldn't break the response.
  }
}

/**
 * "yyyy-MM-dd HH:mm:ss" in Shanghai time (UTC+8), computed by shifting the
 * clock rather than relying on Intl/timeZone (matches the confirmed-working
 * reference implementation exactly).
 */
function signedTimestamp(now: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const shanghai = new Date(now.getTime() + 8 * 3600 * 1000);
  return (
    `${shanghai.getUTCFullYear()}-${pad(shanghai.getUTCMonth() + 1)}-${pad(shanghai.getUTCDate())} ` +
    `${pad(shanghai.getUTCHours())}:${pad(shanghai.getUTCMinutes())}:${pad(shanghai.getUTCSeconds())}`
  );
}

/**
 * TOP/MD5 signature: sort every param (system + business, excluding
 * `sign` itself) alphabetically by key, concatenate as key1value1key2value2...,
 * sandwich the result between the app secret on both sides, then MD5 and
 * uppercase-hex the whole thing.
 */
function signParams(params: Record<string, string>, secret: string): string {
  const sortedKeys = Object.keys(params).sort();
  const concatenated = sortedKeys.map((key) => `${key}${params[key]}`).join("");
  const wrapped = `${secret}${concatenated}${secret}`;
  return crypto.createHash("md5").update(wrapped, "utf8").digest("hex").toUpperCase();
}

function getCredentials() {
  const appKey = process.env.ALIEXPRESS_APP_KEY;
  const appSecret = process.env.ALIEXPRESS_APP_SECRET;
  const trackingId = process.env.ALIEXPRESS_TRACKING_ID;
  if (!appKey || !appSecret || !trackingId) {
    throw new AliexpressConfigError(
      "ALIEXPRESS_APP_KEY / ALIEXPRESS_APP_SECRET / ALIEXPRESS_TRACKING_ID are not configured",
    );
  }
  return { appKey, appSecret, trackingId };
}

type ProductQueryOptions = {
  targetCurrency: string;
  targetLanguage: string;
};

/**
 * Searches AliExpress products by keyword via aliexpress.affiliate.product.query.
 * No documented per-account rate limit as tight as Coupang's, but results
 * are still cached in Redis (see above) for CACHE_TTL_SECONDS so this isn't
 * called per-request/per-user, and any API error is cached as an empty
 * result for ERROR_COOLDOWN_SECONDS as a circuit breaker.
 */
export async function searchAliexpressProducts(
  keyword: string,
  limit: number,
  { targetCurrency, targetLanguage }: ProductQueryOptions,
): Promise<AliexpressProduct[]> {
  const clampedLimit = Math.min(Math.max(limit, 1), 50);
  const cacheKey = `${CACHE_PREFIX}${keyword}:${clampedLimit}:${targetCurrency}:${targetLanguage}`;

  const cached = await getCachedProducts(cacheKey);
  if (cached) return cached;

  const { appKey, appSecret, trackingId } = getCredentials();

  // Deliberately the same param set (names, order of construction, and
  // nothing extra) as the confirmed-working reference — no page_no, no
  // fields, no partner_id. tracking_id is only added when present, since
  // an always-present-but-empty tracking_id silently breaks ad insertion.
  const params: Record<string, string> = {
    method: METHOD_PRODUCT_QUERY,
    app_key: appKey,
    sign_method: "md5",
    timestamp: signedTimestamp(new Date()),
    format: "json",
    v: "2.0",
    keywords: keyword,
    page_size: String(clampedLimit),
    target_currency: targetCurrency,
    target_language: targetLanguage,
  };
  if (trackingId) {
    params.tracking_id = trackingId;
  }

  const sign = signParams(params, appSecret);
  const body = new URLSearchParams({ ...params, sign }).toString();

  const response = await fetch(`https://${API_HOST}${API_PATH}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded;charset=utf-8" },
    body,
    cache: "no-store",
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    await setCachedProducts(cacheKey, [], ERROR_COOLDOWN_SECONDS);
    throw new AliexpressApiError(
      `AliExpress API responded with ${response.status}: ${text.slice(0, 300)}`,
    );
  }

  const json = (await response.json()) as Record<string, unknown>;
  let products: AliexpressProduct[];
  try {
    products = parseProductQueryResponse(json);
  } catch (e) {
    await setCachedProducts(cacheKey, [], ERROR_COOLDOWN_SECONDS);
    throw e;
  }

  await setCachedProducts(cacheKey, products, CACHE_TTL_SECONDS);
  return products;
}

function parseProductQueryResponse(json: Record<string, unknown>): AliexpressProduct[] {
  // Successful envelope: { aliexpress_affiliate_product_query_response: { resp_result: { resp_code, resp_msg, result: { products: { product: [...] } } } } }
  const top = json["aliexpress_affiliate_product_query_response"] as
    | Record<string, unknown>
    | undefined;

  if (!top) {
    // Error envelope shape varies (error_response / errorResponse); surface
    // the raw body rather than guessing at a message field that may not exist.
    throw new AliexpressApiError(
      `Unexpected AliExpress response shape: ${JSON.stringify(json).slice(0, 500)}`,
    );
  }

  const respResult = top["resp_result"] as Record<string, unknown> | undefined;
  const respCode = respResult?.["resp_code"];
  if (respCode !== undefined && Number(respCode) !== 200) {
    throw new AliexpressApiError(
      `AliExpress API error ${respCode}: ${String(respResult?.["resp_msg"] ?? "unknown")}`,
    );
  }

  const result = respResult?.["result"] as Record<string, unknown> | undefined;
  const productsWrapper = result?.["products"] as Record<string, unknown> | undefined;
  const rawProducts = productsWrapper?.["product"];
  const productList = Array.isArray(rawProducts) ? rawProducts : [];

  return productList
    .map((raw): AliexpressProduct | null => {
      const p = raw as Record<string, unknown>;
      const productId = p["product_id"];
      const productImage = p["product_main_image_url"];
      const productUrl = p["promotion_link"] ?? p["product_detail_url"];
      const price = Number(p["target_sale_price"]);
      if (!productId || !productImage || !productUrl || !Number.isFinite(price)) {
        return null;
      }
      return {
        productId: String(productId),
        productName: String(p["product_title"] ?? ""),
        productPrice: price,
        currency: String(p["target_sale_price_currency"] ?? ""),
        productImage: String(productImage),
        productUrl: String(productUrl),
      };
    })
    .filter((p): p is AliexpressProduct => p !== null);
}
