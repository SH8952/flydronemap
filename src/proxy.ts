import type { NextRequest } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

const intlMiddleware = createMiddleware(routing);

const DEV_EXCLUDE_COOKIE = "dev_exclude";
const DEV_EXCLUDE_TOKEN = process.env.DEV_EXCLUDE_TOKEN;

/**
 * Wraps next-intl's locale-routing middleware to also forward the
 * visitor's real country (set by Vercel's edge network as the
 * `x-vercel-ip-country` request header) into a short-lived cookie.
 *
 * This is the "geo" half of the locale+geo affiliate mix described to the
 * user: the UI language (`/ko`, `/en`, ...) is the default signal for which
 * affiliate program to show (see src/lib/affiliate.ts), and this cookie
 * lets us override that guess with the visitor's actual location when
 * Vercel provides one. Locally (or off Vercel) the header is absent, the
 * cookie is never set, and resolution falls back to locale alone.
 */
export default function proxy(request: NextRequest) {
  const response = intlMiddleware(request);

  const country = request.headers.get("x-vercel-ip-country");
  if (country) {
    response.cookies.set("geo-country", country, {
      path: "/",
      maxAge: 60 * 60 * 24,
      sameSite: "lax",
    });
  }


  // Developer-exclusion cookie: visiting the site once with
  // "?dev=<DEV_EXCLUDE_TOKEN>" sets a ~1 year cookie that the visitor
  // counter API (src/app/api/visitor-count/route.ts) and the GA4 inline
  // script (src/app/[locale]/layout.tsx) both check to skip counting this
  // visitor. Cookie-based (not IP-based) so it works from any network,
  // including a mobile bookmark accessed away from home.
  if (
    DEV_EXCLUDE_TOKEN &&
    request.nextUrl.searchParams.get("dev") === DEV_EXCLUDE_TOKEN
  ) {
    response.cookies.set(DEV_EXCLUDE_COOKIE, "1", {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
      httpOnly: false,
    });
  }

  return response;
}

export const config = {
  matcher: ["/((?!api|trpc|_next|_vercel|.*\\..*).*)"],
};
