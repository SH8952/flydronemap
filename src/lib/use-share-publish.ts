"use client";

import * as React from "react";
import { publishShareState } from "@/lib/share-state";

/**
 * 계산기 카드가 현재 입력값(쿼리 문자열)과 결과 요약 문구를 페이지 하단 공유 버튼에 올리는 훅.
 * text 가 null(결과 없음·잘못된 입력)이면 해당 도구의 공유 상태를 지우고, 페이지를 떠날 때도 지운다.
 */
export function useSharePublish(path: string, query: string, text: string | null) {
  React.useEffect(() => {
    publishShareState(path, text === null ? null : { query, text });
  }, [path, query, text]);
  React.useEffect(() => () => publishShareState(path, null), [path]);
}
