import { notFound } from "next/navigation";

/**
 * 정의되지 않은 주소(예: /ko/없는-페이지)를 사이트 전용 404 화면(`../not-found.tsx`)으로
 * 보내는 캐치올 라우트. 이게 없으면 [locale] 밖의 기본 영어 404가 나온다.
 * 실제 라우트(가이드·규정·FAQ 등)가 항상 먼저 매칭되고, 응답 상태 코드는 404 그대로다.
 */
export default function CatchAllNotFound() {
  notFound();
}
