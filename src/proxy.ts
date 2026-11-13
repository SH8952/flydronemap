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

// 2026-11-13 Vercel 사용량 최적화: 이 프록시는 지금까지 모든 페이지 요청(봇 포함)에서 실행되어 서버 CPU를 썼다.
// 하는 일은 (1) 언어 접두사가 없는 주소의 언어 이동, (2) geo-country 쿠키 심기, (3) ?dev= 개발자 제외 쿠키 심기뿐이므로,
//  - 언어 접두사가 없는 주소(/, /about 등)는 예전처럼 항상 실행하고,
//  - 언어 접두사가 있는 주소(/ko/…)는 "geo-country 쿠키가 아직 없는 일반 방문자"에게만 실행한다
//    (쿠키가 이미 있는 재방문자와, 쿠키가 필요 없는 검색엔진·크롤러는 건너뜀),
//  - 단 ?dev= 가 붙은 주소는 개발자 제외 쿠키를 심어야 하므로 항상 실행한다.
// 접두사 주소는 모든 페이지가 setRequestLocale(locale) 로 언어를 직접 받으므로 프록시 없이도 동일하게 렌더링된다.
// 언어를 추가하면 아래 (ko|en|ja|es|de) 세 곳도 함께 고쳐야 한다.
export const config = {
  matcher: [
    "/((?!(?:ko|en|ja|es|de)(?:/|$)|api|trpc|_next|_vercel|.*\\..*).*)",
    {
      source: "/:locale(ko|en|ja|es|de)/:path*",
      missing: [
        { type: "cookie", key: "geo-country" },
        {
          type: "header",
          key: "user-agent",
          value:
            ".*([Bb]ot|[Cc]rawl|[Ss]pider|[Ss]lurp|[Ff]acebookexternalhit|[Pp]review|[Mm]ediapartners|[Ll]ighthouse).*",
        },
      ],
    },
    {
      source: "/:locale(ko|en|ja|es|de)/:path*",
      has: [{ type: "query", key: "dev" }],
    },
  ],
};
