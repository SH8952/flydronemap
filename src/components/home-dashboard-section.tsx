"use client";

import { DroneDashboard } from "@/components/drone-dashboard";

/**
 * 홈페이지의 대시보드 영역 래퍼.
 *
 * 2026-10-04: "장비 추천"과 "관련 도구(ExifLens)"를 이 래퍼에서 빼서 홈 최하단으로
 * 옮기며 대시보드 결과 상태 공유용 prop/콜백을 제거했다.
 * 2026-11-03: 두 섹션을 원래 위치(대시보드 바로 아래, 광고 위)로 되돌렸다. 위치만
 * 복구했고(`page.tsx`에서 직접 배치), 결과 상태 연동 구조는 되살리지 않았다.
 * 이전 구조는 2026-09-07 항목(CHANGELOG) 참고.
 */
export function HomeDashboardSection() {
  return <DroneDashboard />;
}
