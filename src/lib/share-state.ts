/**
 * 계산기 카드(입력값·결과를 아는 쪽)와 페이지 하단의 공유 버튼(카드 밖에 있는 쪽)을
 * 연결하는 아주 작은 저장소. 카드가 현재 입력값(쿼리 문자열)과 결과 요약 문구를 올리면,
 * 같은 도구 경로를 구독하는 공유 버튼이 그 값으로 링크·문구를 만든다.
 * 도구 경로(path)별로 따로 저장하므로, 다른 도구 페이지로 이동해도 값이 섞이지 않는다.
 */

export type ShareState = {
  /** 공유 링크에 붙일 쿼리 문자열(앞의 ? 없음). 예: "f=85&a=1.8" */
  query: string;
  /** 결과 요약 문구 */
  text: string;
};

const states = new Map<string, ShareState>();
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

/** 현재 상태를 올린다. null 이면 해당 도구의 상태를 지운다(결과가 없거나 페이지를 떠날 때). */
export function publishShareState(path: string, state: ShareState | null) {
  const prev = states.get(path) ?? null;
  if (prev === null && state === null) return;
  if (prev && state && prev.query === state.query && prev.text === state.text) {
    return;
  }
  if (state === null) states.delete(path);
  else states.set(path, state);
  emit();
}

export function subscribeShareState(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getShareState(path: string): ShareState | null {
  return states.get(path) ?? null;
}
