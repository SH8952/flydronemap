"use client";

import * as React from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  Share2,
  Link2,
  Check,
  MessageCircle,
  Send,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  buildChannelUrl,
  getShareChannels,
  getShareContentType,
  stripLocalePath,
  withShareUtm,
  type ShareChannel,
} from "@/lib/share-links";

const KAKAO_SDK_SRC = "https://t1.kakaocdn.net/kakao_js_sdk/2.8.1/kakao.min.js";
const KAKAO_SDK_INTEGRITY =
  "sha384-OL+ylM/iuPLtW5U3XcvLSGhE8JzReKDank5InqlHGWPhb4140/yrBw0bg0y7+C9J";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    Kakao?: {
      init: (key: string) => void;
      isInitialized: () => boolean;
      Share: {
        sendDefault: (options: Record<string, unknown>) => void;
        sendScrap: (options: Record<string, unknown>) => void;
        scrapImage: (options: {
          imageUrl: string;
        }) => Promise<{ infos?: { original?: { url?: string } } }>;
      };
    };
  }
}

let kakaoSdkPromise: Promise<void> | null = null;

/** Lazily injects the Kakao JS SDK script and initializes it, only once,
 *  only when a visitor actually opens the share menu (never on page load). */
function loadKakaoSdk(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.Kakao?.isInitialized()) return Promise.resolve();
  if (kakaoSdkPromise) return kakaoSdkPromise;

  kakaoSdkPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${KAKAO_SDK_SRC}"]`,
    );

    const initAndResolve = () => {
      try {
        const key = process.env.NEXT_PUBLIC_KAKAO_JS_KEY;
        if (key && !window.Kakao?.isInitialized()) {
          window.Kakao?.init(key);
        }
        resolve();
      } catch (err) {
        reject(err instanceof Error ? err : new Error(String(err)));
      }
    };

    if (existing) {
      initAndResolve();
      return;
    }

    const script = document.createElement("script");
    script.src = KAKAO_SDK_SRC;
    script.integrity = KAKAO_SDK_INTEGRITY;
    script.crossOrigin = "anonymous";
    script.onload = initAndResolve;
    script.onerror = () => reject(new Error("Failed to load Kakao SDK"));
    document.head.appendChild(script);
  });

  return kakaoSdkPromise;
}

/** 공유 사용 현황을 GA4 권장 이벤트(share)로 보냅니다. gtag가 없으면 조용히 건너뜁니다. */
function trackShare(method: string) {
  if (typeof window === "undefined" || typeof window.gtag !== "function") return;
  try {
    const path = window.location.pathname;
    window.gtag("event", "share", {
      method,
      content_type: getShareContentType(path),
      item_id: stripLocalePath(path),
    });
  } catch {
    // 분석 전송 실패는 공유 동작에 영향을 주지 않습니다.
  }
}

const ITEM_CLASS =
  "flex items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent hover:text-accent-foreground";

const CHANNEL_LABEL: Record<ShareChannel, string> = {
  kakao: "KakaoTalk",
  band: "BAND",
  line: "LINE",
  whatsapp: "WhatsApp",
  telegram: "Telegram",
  x: "X (Twitter)",
  facebook: "Facebook",
};

function ChannelIcon({
  channel,
  className,
}: {
  channel: ShareChannel;
  className?: string;
}) {
  switch (channel) {
    case "kakao":
      return <KakaoIcon className={className} />;
    case "facebook":
      return <FacebookIcon className={className} />;
    case "x":
      return <XIcon className={className} />;
    case "telegram":
      return <Send className={className} />;
    case "band":
      return <Users className={className} />;
    default:
      // line, whatsapp
      return <MessageCircle className={className} />;
  }
}

type ShareButtonProps = {
  /** Page/content title, used by navigator.share, X/Kakao share text, and as a11y label. */
  title: string;
  /** Short description/summary shared alongside the title where the channel supports it. */
  text?: string;
  /** Absolute URL to share. Must be a full https:// URL (not a relative path). */
  url: string;
  /** Absolute image URL for the Kakao feed-style preview card. Omit to fall back to a text-only Kakao message. */
  image?: string;
  /** true면 "계산 결과 요약"을 공유하는 것이므로 카카오톡에서 결과 문구가 담긴 카드로 보냅니다.
   *  false(기본)이면 페이지의 OG 정보(큰 이미지·제목·설명·도메인)로 만든 링크 미리보기 카드로 보냅니다. */
  isResult?: boolean;
  className?: string;
  variant?: "default" | "outline" | "secondary" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
  /** Which side of the button the dropdown opens on. Use "top" for buttons
   *  near the bottom edge of the page (e.g. the footer) so the menu doesn't
   *  extend the page downward. Defaults to "bottom". */
  menuPlacement?: "bottom" | "top";
};

export function ShareButton({
  title,
  text,
  url,
  image,
  isResult = false,
  className,
  variant = "outline",
  size = "sm",
  menuPlacement = "bottom",
}: ShareButtonProps) {
  const t = useTranslations("Share");
  const locale = useLocale();
  const channels = getShareChannels(locale);
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  // Detected on mount only (never during SSR) — navigator.share isn't
  // defined server-side, and its real availability can only be checked
  // once we're actually running in the browser.
  const [canNativeShare, setCanNativeShare] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    // Deliberately setting state synchronously here: this is a one-time
    // client-only feature check that must run *after* hydration (the
    // server has no `navigator`, so doing this during render would produce
    // a client/server markup mismatch).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCanNativeShare(
      typeof navigator !== "undefined" && typeof navigator.share === "function",
    );
  }, []);

  React.useEffect(() => {
    if (!menuOpen) return;
    function onClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [menuOpen]);

  // 카카오 SDK는 공유 메뉴를 연 방문자에게만, 메뉴가 열릴 때 미리 불러옵니다(페이지 로드 시에는 불러오지 않음).
  // 미리 받아 두면 카카오톡을 누른 뒤 지연이 줄어 공유창이 팝업 차단에 걸릴 가능성도 낮아집니다.
  const hasKakao = channels.includes("kakao");
  React.useEffect(() => {
    if (menuOpen && hasKakao) loadKakaoSdk().catch(() => {});
  }, [menuOpen, hasKakao]);

  const handleShareClick = () => {
    setMenuOpen((open) => !open);
  };

  // 클릭 시점의 경로로 콘텐츠 종류를 정하고, 채널별 UTM을 붙인 공유 주소를 만듭니다.
  const linkFor = (channel: string) =>
    withShareUtm(url, channel, getShareContentType(window.location.pathname));

  const handleNativeShare = async () => {
    try {
      await navigator.share({ title, text, url: linkFor("native") });
      trackShare("native");
    } catch {
      // Visitor cancelled the native share sheet, or the browser refused
      // the request — nothing useful to fall back to here.
    }
    setMenuOpen(false);
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(linkFor("copy"));
      trackShare("copy");
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API unavailable (very old browser / permission denied) —
      // silently ignore, the other share options still work.
    }
  };

  const handleShareWindow = (channel: Exclude<ShareChannel, "kakao">) => {
    const intent = buildChannelUrl(channel, {
      title,
      text,
      url: linkFor(channel),
    });
    window.open(intent, "_blank", "noopener,noreferrer,width=550,height=420");
    trackShare(channel);
    setMenuOpen(false);
  };

  const handleShareKakao = async () => {
    try {
      await loadKakaoSdk();
      const link = linkFor("kakao");

      // 1) 일반 페이지 공유: 페이지의 OG 정보로 만든 링크 미리보기 카드(큰 이미지 + 제목 + 설명 + 도메인).
      if (!isResult) {
        try {
          window.Kakao?.Share.sendScrap({ requestUrl: link });
          trackShare("kakao");
          setMenuOpen(false);
          return;
        } catch {
          // 스크랩 공유를 쓸 수 없으면 아래 피드 카드로 대신 보냅니다.
        }
      }

      // 2) 결과 공유(또는 스크랩 실패 시): 결과 문구가 담긴 피드 카드.
      //    카카오 메시지의 이미지는 카카오 서버에 올린 주소를 써야 하므로 먼저 이미지를 올려 주소를 받습니다.
      //    실패하면 원래 주소를 그대로 넘깁니다(이미지가 안 보일 수 있을 뿐 공유는 됩니다).
      const ogImage = document.querySelector<HTMLMetaElement>(
        'meta[property="og:image"]',
      )?.content;
      const rawImage =
        image ?? ogImage ?? `${new URL(link).origin}/og-default.png`;
      let imageUrl = rawImage;
      try {
        const res = await window.Kakao?.Share.scrapImage({ imageUrl: rawImage });
        imageUrl = res?.infos?.original?.url ?? rawImage;
      } catch {
        // 이미지 업로드 실패 — 원래 주소로 진행
      }
      window.Kakao?.Share.sendDefault({
        objectType: "feed",
        content: {
          title,
          description: text ?? "",
          imageUrl,
          link: { mobileWebUrl: link, webUrl: link },
        },
        buttons: [
          { title: t("viewOnWeb"), link: { mobileWebUrl: link, webUrl: link } },
        ],
      });
      trackShare("kakao");
    } catch {
      // Kakao SDK failed to load/init (blocked script, offline, etc.) — the
      // other share channels remain usable, so we fail silently here.
    }
    setMenuOpen(false);
  };

  return (
    <div ref={containerRef} className={cn("relative inline-block", className)}>
      <Button
        type="button"
        variant={variant}
        size={size}
        onClick={handleShareClick}
        aria-haspopup="menu"
        aria-expanded={menuOpen}
      >
        <Share2 className="size-4" />
        {t("button")}
      </Button>

      {menuOpen ? (
        <div
          role="menu"
          className={`absolute right-0 z-20 ${menuPlacement === "top" ? "bottom-full mb-2" : "mt-2"} flex w-48 flex-col gap-0.5 rounded-md border border-border bg-popover p-1.5 text-popover-foreground shadow-md`}
        >
          {canNativeShare ? (
            <button
              type="button"
              role="menuitem"
              onClick={handleNativeShare}
              className="flex items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent hover:text-accent-foreground"
            >
              <Share2 className="size-4" />
              {t("deviceShare")}
            </button>
          ) : null}
          <button
            type="button"
            role="menuitem"
            onClick={handleCopyLink}
            className="flex items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent hover:text-accent-foreground"
          >
            {copied ? (
              <Check className="size-4" />
            ) : (
              <Link2 className="size-4" />
            )}
            {copied ? t("copied") : t("copyLink")}
          </button>
          {channels.map((channel) => (
            <button
              key={channel}
              type="button"
              role="menuitem"
              onClick={() =>
                channel === "kakao"
                  ? handleShareKakao()
                  : handleShareWindow(channel)
              }
              className={ITEM_CLASS}
            >
              <ChannelIcon channel={channel} className="size-4" />
              {CHANNEL_LABEL[channel]}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function XIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function FacebookIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M22 12.06C22 6.505 17.523 2 12 2S2 6.505 2 12.06c0 5.02 3.657 9.184 8.438 9.94v-7.03H7.898v-2.91h2.54V9.845c0-2.526 1.492-3.921 3.777-3.921 1.094 0 2.238.197 2.238.197v2.475h-1.26c-1.243 0-1.63.775-1.63 1.57v1.888h2.773l-.443 2.91h-2.33V22c4.78-.756 8.437-4.92 8.437-9.94z" />
    </svg>
  );
}

function KakaoIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M12 3.5c-5.523 0-10 3.53-10 7.885 0 2.79 1.84 5.24 4.62 6.64-.2.73-.727 2.65-.833 3.06-.13.51.187.504.394.367.163-.108 2.59-1.76 3.64-2.475.7.102 1.428.157 2.179.157 5.523 0 10-3.53 10-7.75S17.523 3.5 12 3.5z" />
    </svg>
  );
}
