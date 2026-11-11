/**
 * 공유 버튼용 순수 도우미 (외부 import 없음 — 단위 테스트가 쉽도록 분리).
 * - 언어별 공유 채널 구성
 * - 공유 링크에 붙이는 UTM (GA4에서 "공유로 들어온 방문"을 구분)
 * - 채널별 공유 주소 만들기
 */

/** 메뉴에 표시되는 외부 채널(기기 공유·링크 복사는 항상 맨 위에 따로 표시). */
export type ShareChannel =
  | "kakao"
  | "band"
  | "line"
  | "whatsapp"
  | "telegram"
  | "x"
  | "facebook";

export type ShareContentType = "tool" | "blog" | "guide" | "page";

/** 언어별 채널 구성과 순서. 알 수 없는 언어는 en 구성을 따른다. */
const CHANNELS_BY_LOCALE: Record<string, ShareChannel[]> = {
  ko: ["kakao", "band", "x", "facebook"],
  en: ["x", "facebook", "whatsapp", "telegram"],
  ja: ["line", "x", "facebook"],
  es: ["whatsapp", "telegram", "x", "facebook"],
  de: ["whatsapp", "telegram", "x", "facebook"],
};

export function getShareChannels(locale: string): ShareChannel[] {
  return CHANNELS_BY_LOCALE[locale] ?? CHANNELS_BY_LOCALE.en;
}

/** "/ko/tools/x" -> "/tools/x" (언어 접두사 제거). */
export function stripLocalePath(pathname: string): string {
  const stripped = pathname.replace(/^\/(ko|en|ja|es|de)(?=\/|$)/, "");
  return stripped === "" ? "/" : stripped;
}

/** 현재 경로로 콘텐츠 종류를 구분합니다 (GA4 content_type / utm_campaign). */
export function getShareContentType(pathname: string): ShareContentType {
  const p = stripLocalePath(pathname);
  if (p === "/tools" || p.startsWith("/tools/")) return "tool";
  if (p === "/blog" || p.startsWith("/blog/")) return "blog";
  if (p === "/guides" || p.startsWith("/guides/")) return "guide";
  return "page";
}

/**
 * 공유 주소에 UTM을 붙입니다. 기존 쿼리(결과 공유의 입력값 등)는 그대로 유지하고,
 * 주소를 해석하지 못하면 원래 주소를 그대로 돌려줍니다.
 * (페이지의 canonical은 쿼리 없는 주소로 고정이라 색인에는 영향이 없습니다.)
 */
export function withShareUtm(
  url: string,
  medium: string,
  campaign: ShareContentType,
): string {
  try {
    const u = new URL(url);
    u.searchParams.set("utm_source", "share");
    u.searchParams.set("utm_medium", medium);
    u.searchParams.set("utm_campaign", campaign);
    return u.toString();
  } catch {
    return url;
  }
}

export type ShareContent = { title: string; text?: string; url: string };

/** 채널별 공유 창 주소 (카카오는 SDK로 보내므로 여기서 제외). */
export function buildChannelUrl(
  channel: Exclude<ShareChannel, "kakao">,
  { title, url }: ShareContent,
): string {
  const e = encodeURIComponent;
  switch (channel) {
    case "x":
      return `https://twitter.com/intent/tweet?text=${e(title)}&url=${e(url)}`;
    case "facebook":
      return `https://www.facebook.com/sharer/sharer.php?u=${e(url)}`;
    case "telegram":
      return `https://t.me/share/url?url=${e(url)}&text=${e(title)}`;
    case "whatsapp":
      return `https://wa.me/?text=${e(`${title}\n${url}`)}`;
    case "line":
      return `https://social-plugins.line.me/lineit/share?url=${e(url)}`;
    case "band":
      return `https://band.us/plugin/share?body=${e(`${title}\n${url}`)}&route=${e(url)}`;
    default:
      return url;
  }
}
