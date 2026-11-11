/**
 * 계산기 "결과 공유 링크"용 URL 파라미터 읽기 도우미.
 * 공유 링크는 `?f=50&a=2.8` 처럼 입력값만 담는다. 페이지 주소(canonical)는 파라미터 없는
 * 기본 주소 그대로이므로 새 색인 대상 주소가 생기지 않는다.
 * 모든 값은 허용 범위·목록으로 검증하며, 맞지 않으면 null 을 돌려줘 기본값을 유지한다.
 */

/** 브라우저에서만 호출한다(useEffect 안). 서버 렌더링 중에는 null. */
export function readSharedParams(): URLSearchParams | null {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search);
}

/** 숫자이면서 [min, max] 범위 안일 때만 값을 돌려준다. */
export function parseBoundedNumber(
  raw: string | null,
  min: number,
  max: number,
): number | null {
  if (raw === null || raw.trim() === "") return null;
  const value = Number(raw);
  if (!Number.isFinite(value) || value < min || value > max) return null;
  return value;
}

/** 허용된 숫자 목록에 들어 있을 때만 값을 돌려준다. */
export function parseNumberChoice(
  raw: string | null,
  allowed: readonly number[],
): number | null {
  if (raw === null || raw.trim() === "") return null;
  const value = Number(raw);
  return allowed.includes(value) ? value : null;
}

/** 허용된 문자열 목록에 들어 있을 때만 값을 돌려준다. */
export function parseStringChoice<T extends string>(
  raw: string | null,
  allowed: readonly T[],
): T | null {
  if (raw === null) return null;
  return (allowed as readonly string[]).includes(raw) ? (raw as T) : null;
}

/**
 * 문자열 상태로 값을 들고 있는 숫자 입력칸용: [min, max] 범위 안의 숫자이면
 * 화면에 넣을 정리된 문자열을 돌려주고, 아니면 null.
 */
export function parseNumberText(
  raw: string | null,
  min: number,
  max: number,
): string | null {
  const value = parseBoundedNumber(raw, min, max);
  return value === null ? null : String(value);
}
