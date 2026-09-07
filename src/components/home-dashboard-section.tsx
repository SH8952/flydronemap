"use client";

import { useState } from "react";
import { DroneDashboard } from "@/components/drone-dashboard";
import { CrossLinkExifLens } from "@/components/cross-link/cross-link-exiflens";

/**
 * 홈페이지의 대시보드 → 장비 추천 → 관련 도구(ExifLens) 순서를 렌더링하는
 * 클라이언트 래퍼.
 *
 * "관련 도구" 링크는 DroneDashboard가 실제 비행 조건 결과(data)를 가지고
 * 있을 때만 노출되어야 하는데, 그 상태는 DroneDashboard 내부에 있고
 * "장비 추천" 섹션(GearRecommendationSection)은 서버 컴포넌트라 두 상태를
 * 하나의 트리에서 직접 공유할 수 없다. 그래서 GearRecommendationSection의
 * 렌더 결과를 서버(HomePage)에서 미리 만들어 `gearSection` prop으로
 * 전달받고, DroneDashboard가 콜백으로 알려주는 결과 표시 여부(hasResult)에
 * 따라 그 아래에 CrossLinkExifLens를 붙인다
 * (2026-09-07, 사용자 요청 — "관련 도구"/"장비 추천" 순서를 exifnd.com과
 * 동일하게 맞추기 위함. 이전에는 DroneDashboard 안에서 결과 카드 바로
 * 아래에 렌더링되었음).
 */
export function HomeDashboardSection({
  gearSection,
}: {
  gearSection: React.ReactNode;
}) {
  const [hasResult, setHasResult] = useState(false);

  return (
    <>
      <DroneDashboard onResultVisibilityChange={setHasResult} />

      {gearSection}

      {hasResult ? <CrossLinkExifLens /> : null}
    </>
  );
}
