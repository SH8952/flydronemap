import { NextRequest, NextResponse } from "next/server";
import { getVisitorCounts, incrementVisitorCounts } from "@/lib/visitor-counter";

export const dynamic = "force-dynamic";

// Local addresses — the local dev/preview server shares the production Redis
// store (same .env credentials), so these visits must never be counted.
const LOCAL_HOSTNAMES = new Set(["localhost", "127.0.0.1", "[::1]", "::1"]);

/**
 * Visitor counter — returns { daily, total }. Skips incrementing
 * (read-only) when:
 *  - the developer-exclusion cookie is present (set when the site is visited
 *    with "?dev=<DEV_EXCLUDE_TOKEN>") so the developer's own visits — from any
 *    network, not just a fixed IP — don't inflate the count, or
 *  - the request comes from a local development environment (NODE_ENV is
 *    "development" or the host is localhost), which needs no cookie at all.
 */
export async function GET(request: NextRequest) {
  const hasDevCookie = request.cookies.get("dev_exclude")?.value === "1";
  const isLocal =
    process.env.NODE_ENV === "development" ||
    LOCAL_HOSTNAMES.has(request.nextUrl.hostname);
  const counts =
    hasDevCookie || isLocal
      ? await getVisitorCounts()
      : await incrementVisitorCounts();
  return NextResponse.json(counts);
}
