import { NextRequest, NextResponse } from "next/server";
import { getVisitorCount, incrementVisitorCount } from "@/lib/visitor-counter";

export const dynamic = "force-dynamic";

/**
 * Visitor counter. Skips incrementing (read-only) when the developer-
 * exclusion cookie is present (set by src/proxy.ts when the site is
 * visited with "?dev=<DEV_EXCLUDE_TOKEN>") so the developer's own visits —
 * from any network, not just a fixed IP — don't inflate the count.
 */
export async function GET(request: NextRequest) {
  const isDev = request.cookies.get("dev_exclude")?.value === "1";
  const count = isDev ? await getVisitorCount() : await incrementVisitorCount();
  return NextResponse.json({ count });
}
