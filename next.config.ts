import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  // Next.js가 browserslist 설정과 무관하게 항상 삽입하는 내부 폴리필 모듈
  // (next/dist/build/polyfills/polyfill-module)을 빈 파일로 치환 — 이미
  // browserslist에서 모던 브라우저만 지원하도록 설정했으므로(2026-09-14,
  // PageSpeed Insights "레거시 JavaScript" 진단 1차 반영) 실제 폴리필이
  // 전혀 필요하지 않은 상태에서 불필요하게 14KiB가 항상 다운로드되고
  // 있었음. 자세한 설명은 src/lib/empty-polyfill-module.js 참고.
  // ⚠️ 문서화되지 않은 Next.js 내부 경로에 의존하는 워크어라운드이므로
  // (vercel/next.js Discussion #64330, Issue #86785 참고), Next.js 버전을
  // 올릴 때 "레거시 JavaScript" 경고가 다시 나타나지 않는지 재확인 필요.
  turbopack: {
    resolveAlias: {
      "../build/polyfills/polyfill-module": "./src/lib/empty-polyfill-module.js",
      "next/dist/build/polyfills/polyfill-module": "./src/lib/empty-polyfill-module.js",
    },
  },
  images: {
    // 알리익스프레스 상품 이미지 도메인 — 상품마다 서브도메인 번호(a1, a2...)가
    // 달라질 수 있어 와일드카드로 등록 (2026-09-14, PageSpeed Insights 이미지
    // 전송 개선 진단 반영: 실제 렌더된 상품 이미지 URL을 로컬에서 직접 확인해
    // 도메인을 확정함). 쿠팡 상품 이미지 도메인은 아직 실제 값이 확인되지
    // 않아 이번에는 건드리지 않고 `unoptimized`를 유지함 — 도메인이 다르면
    // 잘못된 remotePatterns 때문에 이미지가 깨질 수 있으므로 확인 전까지 보류.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.aliexpress-media.com",
      },
    ],
  },
};

export default withNextIntl(nextConfig);
