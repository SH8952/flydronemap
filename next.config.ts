import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
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
