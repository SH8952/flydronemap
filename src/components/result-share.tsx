"use client";

import * as React from "react";
import { useLocale } from "next-intl";
import { ShareButton } from "@/components/share-button";
import { SITE_URL } from "@/lib/seo";
import { getShareState, subscribeShareState } from "@/lib/share-state";

type ResultShareProps = {
  /** 로케일 뒤에 붙는 도구 경로. 예: "/tools/dof-calculator" */
  path: string;
  title: string;
  /** 계산 결과가 아직 없을 때(서버 렌더링·잘못된 입력) 쓰는 기본 설명 문구 */
  text: string;
};

/**
 * 페이지의 공유 버튼. 카드가 올린 현재 입력값이 있으면 그 값이 담긴 링크
 * (`?f=50&a=2.8` 형태)와 결과 요약 문장을 공유하고, 없으면 기본 페이지 주소와 설명을 공유한다.
 * 링크를 받은 사람이 열면 같은 입력값이 채워진다.
 */
export function ResultShare({ path, title, text }: ResultShareProps) {
  const locale = useLocale();
  const state = React.useSyncExternalStore(
    subscribeShareState,
    () => getShareState(path),
    () => null,
  );

  const base = `${SITE_URL}/${locale}${path}`;
  const url = state && state.query ? `${base}?${state.query}` : base;

  return (
    <ShareButton
      title={title}
      text={state?.text ?? text}
      url={url}
      isResult={Boolean(state?.text)}
    />
  );
}
