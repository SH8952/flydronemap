import crypto from "node:crypto";

/**
 * Server-only client for the Coupang Partners Open API.
 *
 * IMPORTANT: this module reads COUPANG_ACCESS_KEY / COUPANG_SECRET_KEY from
 * process.env directly (no NEXT_PUBLIC_ prefix) and must never be imported
 * from a Client Component — it is only ever called from the
 * /api/coupang/search route handler, which runs on the server.
 *
 * Ported as-is from ExifLens's implementation (2026-09-06 FlyDroneMap gear
 * recommendation handoff, section 4.3), then updated together with it on
 * 2026-09-27 to add the Redis-backed cache and shared hourly hard cap
 * described below.
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

/**
 * Temporary kill-switch for outbound Coupang API calls, independent of
 * whether credentials are configured. When COUPANG_API_DISABLED="true",
 * searchCoupangProducts() short-circuits before making any network
 * request, the same way a missing-credentials config error does (the
 * route handler already treats CoupangConfigError as "hide the section
 * quietly", so no extra handling is needed at the call site).
 *
 * Use this to pause calls while the account's hourly rate limit
 * (10 requests/hour) is being shared across multiple dev sites being
 * tested at the same time. Remove the env var (or set it to anything
 * other than "true") in .env.local to resume.
 */
function isCoupangApiTemporarilyDisabled(): boolean {
  return process.env.COUPANG_API_DISABLED === "true";
}

// ---------------------------------------------------------------------------
// Real (Redis-backed) result cache.
//
// 2026-09-27: the comment that used to live here claimed Next.js's
// `fetch(..., { next: { revalidate } })` cache made every keyword "cached
// for 6 hours, so repeat visits cost no extra API calls" — that turned out
// to be false in production (confirmed on ExifLens's Vercel runtime logs:
// the same rate-limit error was recurring on nearly every single request
// within a 15-minute window). Every page view was making 10 fresh outbound
// calls to Coupang (5 row-1 keywords + 5 accessory keywords), which blows
// through the 10-requests/hour account limit almost immediately — and this
// account's 10 req/hour limit is *shared* with ExifLens (same
// COUPANG_ACCESS_KEY), so the real combined budget is even tighter. Coupang
// had already flagged the account for exceeding the limit twice; a third
// strike gets Partners access restricted, so this needed a real fix, not
// just a bigger `revalidate` number or the local-only COUPANG_API_DISABLED
// workaround this file used to rely on for dev-time testing.
//
// This now caches successful results in the shared Upstash Redis instance
// (same one src/lib/visitor-counter.ts uses) with an explicit TTL, keyed
// per project (so ExifLens and FlyDroneMap never share or overwrite each
// other's cached productUrl — those URLs are tagged with a project-specific
// subId, so mixing them would misattribute affiliate credit). This works
// regardless of serverless cold starts or however Next.js's own fetch cache
// behaves, because it's a real read/write to a persistent store instead of
// an in-process/framework-level cache.
//
// On any API error (including a rate-limit rejection), a short-lived empty
// result is cached too, so a failing keyword doesn't get hit again on every
// subsequent request for the next 15 minutes — this is the circuit breaker
// that actually stops the hammering once the account is already over
// budget for the hour, instead of retrying forever.
// ---------------------------------------------------------------------------

const KV_URL = process.env.KV_REST_API_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN;

const PROJECT = "flydronemap";
const CACHE_PREFIX = `${PROJECT}:coupang:search:v1:`;
const CACHE_TTL_SECONDS = 60 * 60 * 6; // 6 hours — matches the old (broken) fetch-cache intent
const ERROR_COOLDOWN_SECONDS = 60 * 15; // 15 minutes — circuit breaker after any API error

async function getCachedProducts(cacheKey: string): Promise<CoupangProduct[] | null> {
  if (!KV_URL || !KV_TOKEN) return null;
  try {
    const res = await fetch(`${KV_URL}/get/${encodeURIComponent(cacheKey)}`, {
      headers: { Authorization: `Bearer ${KV_TOKEN}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { result: string | null };
    if (!data.result) return null;
    return JSON.parse(data.result) as CoupangProduct[];
  } catch {
    return null;
  }
}

async function setCachedProducts(
  cacheKey: string,
  products: CoupangProduct[],
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

// ---------------------------------------------------------------------------
// Shared hourly call hard cap (2026-09-27, added after a 2nd rate-limit
// strike on this Coupang account).
//
// The Redis result cache above is a strong mitigation for the *normal* case,
// but it is not an absolute guarantee: if the Upstash read itself fails or
// times out, getCachedProducts() deliberately swallows the error and returns
// null (a safe fallback for ordinary transient issues) — which means a
// Redis hiccup, a code bug, or a sudden traffic spike could still fall
// through to a real Coupang API call with no cache in front of it. Given
// this account is already at 2 of 3 allowed violations, a "best effort"
// cache alone was judged not safe enough — a real, counted hard cap was
// needed on top of it.
//
// This counter is intentionally NOT prefixed with PROJECT: ExifLens and
// FlyDroneMap share the same COUPANG_ACCESS_KEY, so Coupang's 10-req/hour
// limit is a single combined budget across both sites. Both projects'
// coupang.ts increment the exact same Redis key per UTC hour, so the cap
// is enforced on the true combined call count, not just this project's own.
//
// HOURLY_SAFETY_LIMIT is set below Coupang's actual 10/hour limit (not at
// 10) so the two sites both stop calling out with a safety margin still
// left, rather than racing each other right up to the edge of the account's
// real limit.
// ---------------------------------------------------------------------------

const SHARED_CALL_COUNTER_PREFIX = "coupang-shared:calls:v1:";
const HOURLY_SAFETY_LIMIT = 7; // Coupang's real limit is 10/hour; stop early with margin.

/** UTC yyyyMMddHH — one counter bucket per hour, shared by both sites. */
function currentHourBucketUtc(): string {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  const d = String(now.getUTCDate()).padStart(2, "0");
  const h = String(now.getUTCHours()).padStart(2, "0");
  return `${y}${m}${d}${h}`;
}

/**
 * Atomically increments this hour's shared call counter and returns the new
 * count, or null if Redis isn't reachable/configured (in which case the
 * hard cap simply can't be enforced for this call — the result cache above
 * is the only protection left for that request).
 */
async function incrementSharedHourlyCallCount(): Promise<number | null> {
  if (!KV_URL || !KV_TOKEN) return null;
  try {
    const key = `${SHARED_CALL_COUNTER_PREFIX}${currentHourBucketUtc()}`;
    const res = await fetch(`${KV_URL}/incr/${encodeURIComponent(key)}`, {
      headers: { Authorization: `Bearer ${KV_TOKEN}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { result: number };
    if (data.result === 1) {
      // First call to hit this hour's bucket — set it to expire after the
      // hour is over so old bucket keys don't accumulate forever. Best
      // effort: if this fails the key still gets naturally superseded next
      // hour since the key name itself changes.
      await fetch(`${KV_URL}/expire/${encodeURIComponent(key)}/3600`, {
        headers: { Authorization: `Bearer ${KV_TOKEN}` },
        cache: "no-store",
      }).catch(() => {});
    }
    return data.result;
  } catch {
    return null;
  }
}

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
 * strict 10 requests/hour per account — shared with ExifLens, which uses
 * the same COUPANG_ACCESS_KEY — so real results are cached in Redis (see
 * above) for CACHE_TTL_SECONDS, and on top of that a shared hourly call
 * counter enforces a hard cap (HOURLY_SAFETY_LIMIT) across both sites
 * combined. Callers must never rely on this being cheap to call repeatedly
 * without that cache in front of it.
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
  if (isCoupangApiTemporarilyDisabled()) {
    throw new CoupangConfigError(
      "Coupang API calls are temporarily disabled (COUPANG_API_DISABLED=true)",
    );
  }

  const clampedLimit = Math.min(Math.max(limit, 1), 10);
  const cacheKey = `${CACHE_PREFIX}${keyword}:${clampedLimit}`;

  const cached = await getCachedProducts(cacheKey);
  if (cached) return cached;

  // Hard cap check — happens after the cache-miss so a cache hit never
  // consumes any of the hourly budget, but strictly before any real
  // outbound call to Coupang.
  const callCount = await incrementSharedHourlyCallCount();
  if (callCount !== null && callCount > HOURLY_SAFETY_LIMIT) {
    await setCachedProducts(cacheKey, [], ERROR_COOLDOWN_SECONDS);
    throw new CoupangApiError(
      `Coupang shared hourly call safety limit reached (${callCount}/${HOURLY_SAFETY_LIMIT}) — skipping the real API call this hour to protect the shared account`,
    );
  }

  const { accessKey, secretKey } = getCredentials();
  const subId = process.env.COUPANG_PARTNER_SUBID;

  const params: Record<string, string> = {
    keyword,
    limit: String(clampedLimit),
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
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    await setCachedProducts(cacheKey, [], ERROR_COOLDOWN_SECONDS);
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
    await setCachedProducts(cacheKey, [], ERROR_COOLDOWN_SECONDS);
    throw new CoupangApiError(json.rMessage || `Coupang API error ${json.rCode}`);
  }

  const products = json.data?.productData ?? [];
  await setCachedProducts(cacheKey, products, CACHE_TTL_SECONDS);
  return products;
}
