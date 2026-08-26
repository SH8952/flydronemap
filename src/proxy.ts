import type { NextRequest } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

const intlMiddleware = createMiddleware(routing);

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

  return response;
}

export const config = {
  matcher: ["/((?!api|trpc|_next|_vercel|.*\\..*).*)"],
};
