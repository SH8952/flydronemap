"use client";

import { DroneDashboard } from "@/components/drone-dashboard";

/**
 * 홈페이지의 대시보드 영역 래퍼.
 *
 * 2026-10-04 변경: "장비 추천"과 "관련 도구(ExifLens)"를 이 래퍼에서 빼서
 * 홈 화면 최하단(자주 묻는 질문 아래)으로 옮겼다. 광고·제휴 영역이 정보
 * 콘텐츠보다 앞에 보이면 사이트가 정보 제공보다 수익 창출 목적이 강하게
 * 보일 수 있다는 판단에 따라(exifnd.com에 먼저 적용), 대시보드 → 이용 방법 →
 * 가이드 → FAQ → 관련 도구 → 장비 추천 순서로 바꿨다. 두 섹션은 더 이상
 * 대시보드 결과 상태와 연결될 필요가 없어(관련 도구는 항상 표시) 상태
 * 공유용 prop/콜백은 제거했다. 이전 구조는 2026-09-07 항목(CHANGELOG) 참고.
 */
export function HomeDashboardSection() {
  return <DroneDashboard />;
}
