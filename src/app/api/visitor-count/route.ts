import { NextRequest, NextResponse } from "next/server";
import {
  getVisitorCounts,
  incrementVisitorCounts,
  getBotCounts,
  incrementBotCounts,
} from "@/lib/visitor-counter";

export const dynamic = "force-dynamic";

// Local addresses — the local dev/preview server shares the production Redis
// store (same .env credentials), so these visits must never be counted.
const LOCAL_HOSTNAMES = new Set(["localhost", "127.0.0.1", "[::1]", "::1"]);

// Known search-engine/AI-crawler User-Agent substrings. These bots are what
// was inflating the public visitor count (they execute the page's client JS,
// including this counter's fetch, so they looked like real visits) — GA4
// filters this same traffic out via its own built-in bot list, which is why
// GA4's numbers and this counter's numbers diverged. Matched case-insensitively
// against the raw User-Agent string; a generic "bot|crawler|spider" fallback
// catches anything not explicitly named below. The tail of the list covers
// crawlers/tools whose UA has no "bot" in it: AdSense (Mediapartners-Google),
// Search Console URL inspection, headless Chrome, Lighthouse/PageSpeed, and
// Daum's crawler (Daumoa). Never match a bare "daum": the Daum mobile app's
// in-app browser UA contains "DaumApps/<ver>" and those are real users.
const BOT_UA_PATTERN =
  /bot|crawler|spider|slurp|googlebot|bingbot|yeti|duckduckbot|baiduspider|yandexbot|facebookexternalhit|twitterbot|linkedinbot|applebot|ahrefsbot|semrushbot|mj12bot|dotbot|petalbot|gptbot|chatgpt-user|ccbot|claudebot|claude-web|anthropic-ai|perplexitybot|google-extended|bytespider|archive\.org_bot|mediapartners-google|google-inspectiontool|headlesschrome|lighthouse|daumoa|daum\/\d/i;

function isBotRequest(request: NextRequest): boolean {
  const ua = request.headers.get("user-agent") ?? "";
  return BOT_UA_PATTERN.test(ua);
}

/**
 * Visitor counter — returns { daily, total, botDaily?, botTotal? }.
 *
 * Real-visitor count skips incrementing (read-only) when:
 *  - the developer-exclusion cookie is present (set when the site is visited
 *    with "?dev=<DEV_EXCLUDE_TOKEN>") so the developer's own visits — from any
 *    network, not just a fixed IP — don't inflate the count, or
 *  - the request comes from a local development environment (NODE_ENV is
 *    "development" or the host is localhost), which needs no cookie at all,
 *  - or the request looks like a known bot/crawler (see BOT_UA_PATTERN) — in
 *    that case it increments the separate bot counter instead, leaving the
 *    public visitor number clean.
 *
 * The bot counts (botDaily/botTotal) are only ever included in the JSON
 * response when the developer-exclusion cookie is present, so a regular
 * visitor inspecting network requests never sees them — this is a
 * server-side gate, not just a UI one.
 */
export async function GET(request: NextRequest) {
  const hasDevCookie = request.cookies.get("dev_exclude")?.value === "1";
  const isLocal =
    process.env.NODE_ENV === "development" ||
    LOCAL_HOSTNAMES.has(request.nextUrl.hostname);
  const isBot = isBotRequest(request);

  let counts;
  if (hasDevCookie || isLocal) {
    counts = await getVisitorCounts();
  } else if (isBot) {
    await incrementBotCounts();
    counts = await getVisitorCounts();
  } else {
    counts = await incrementVisitorCounts();
  }

  if (!hasDevCookie) {
    return NextResponse.json(counts);
  }

  const botCounts = await getBotCounts();
  return NextResponse.json({
    ...counts,
    botDaily: botCounts.daily,
    botTotal: botCounts.total,
  });
}
