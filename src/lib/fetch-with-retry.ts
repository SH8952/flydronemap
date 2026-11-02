/**
 * 외부 공공 지도 서버 호출용 — 일시적 실패(네트워크 오류, 5xx, 그리고 IGN
 * Géoplateforme이 실측에서 한 번 돌려준 일시적 404)에 한해 짧게 한 번만 재시도한다.
 *
 * 재시도 후에도 실패하면 응답(또는 마지막 오류)을 그대로 돌려주므로, 호출부는
 * 지금까지와 똑같이 "조회 실패(502)"로 처리한다 — 즉 실패를 "제한 없음"으로 오해하게
 * 만들지 않는다. 4xx 중 400(요청 형식 오류) 등은 재시도해도 같은 결과라 재시도하지 않는다.
 */
const RETRY_DELAY_MS = 400;

function isTransient(status: number): boolean {
  return status === 404 || status === 408 || status === 429 || status >= 500;
}

export async function fetchWithRetry(
  url: string,
  makeInit: () => RequestInit,
): Promise<Response> {
  try {
    const res = await fetch(url, makeInit());
    if (res.ok || !isTransient(res.status)) return res;
  } catch {
    // 아래에서 한 번 더 시도한다.
  }
  await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
  // 두 번째 시도의 오류는 그대로 던져 호출부의 catch가 502로 처리하게 한다.
  return fetch(url, makeInit());
}
