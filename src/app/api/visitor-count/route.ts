import { NextRequest, NextResponse } from "next/server";
import { getVisitorCounts, incrementVisitorCounts } from "@/lib/visitor-counter";

export const dynamic = "force-dynamic";

/**
 * Visitor counter — returns { daily, total }. Skips incrementing
 * (read-only) when the developer-exclusion cookie is present (set when the
 * site is visited with "?dev=<DEV_EXCLUDE_TOKEN>") so the developer's own
 * visits — from any network, not just a fixed IP — don't inflate the count.
 */
export async function GET(request: NextRequest) {
  const isDev = request.cookies.get("dev_exclude")?.value === "1";
  const counts = isDev
    ? await getVisitorCounts()
    : await incrementVisitorCounts();
  return NextResponse.json(counts);
}
