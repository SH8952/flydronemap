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
 * No documented per-account rate limit as tight as Coupang's, but callers
 * should still rely on the /api/aliexpress/search route's caching rather
 * than calling this per-request/per-user.
 */
export async function searchAliexpressProducts(
  keyword: string,
  limit: number,
  { targetCurrency, targetLanguage }: ProductQueryOptions,
): Promise<AliexpressProduct[]> {
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
    page_size: String(Math.min(Math.max(limit, 1), 50)),
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
    next: { revalidate: 21600 },
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new AliexpressApiError(
      `AliExpress API responded with ${response.status}: ${text.slice(0, 300)}`,
    );
  }

  const json = (await response.json()) as Record<string, unknown>;
  return parseProductQueryResponse(json);
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
