"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Share2, Link2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const KAKAO_SDK_SRC = "https://t1.kakaocdn.net/kakao_js_sdk/2.8.1/kakao.min.js";
const KAKAO_SDK_INTEGRITY =
  "sha384-OL+ylM/iuPLtW5U3XcvLSGhE8JzReKDank5InqlHGWPhb4140/yrBw0bg0y7+C9J";

declare global {
  interface Window {
    Kakao?: {
      init: (key: string) => void;
      isInitialized: () => boolean;
      Share: {
        sendDefault: (options: Record<string, unknown>) => void;
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

type ShareButtonProps = {
  /** Page/content title, used by navigator.share, X/Kakao share text, and as a11y label. */
  title: string;
  /** Short description/summary shared alongside the title where the channel supports it. */
  text?: string;
  /** Absolute URL to share. Must be a full https:// URL (not a relative path). */
  url: string;
  /** Absolute image URL for the Kakao feed-style preview card. Omit to fall back to a text-only Kakao message. */
  image?: string;
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
  className,
  variant = "outline",
  size = "sm",
  menuPlacement = "bottom",
}: ShareButtonProps) {
  const t = useTranslations("Share");
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

  const handleShareClick = () => {
    setMenuOpen((open) => !open);
  };

  const handleNativeShare = async () => {
    try {
      await navigator.share({ title, text, url });
    } catch {
      // Visitor cancelled the native share sheet, or the browser refused
      // the request — nothing useful to fall back to here.
    }
    setMenuOpen(false);
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API unavailable (very old browser / permission denied) —
      // silently ignore, the other share options still work.
    }
  };

  const handleShareX = () => {
    const intent = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
      title,
    )}&url=${encodeURIComponent(url)}`;
    window.open(intent, "_blank", "noopener,noreferrer,width=550,height=420");
    setMenuOpen(false);
  };

  const handleShareFacebook = () => {
    const intent = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
      url,
    )}`;
    window.open(intent, "_blank", "noopener,noreferrer,width=550,height=420");
    setMenuOpen(false);
  };

  const handleShareKakao = async () => {
    try {
      await loadKakaoSdk();
      if (image) {
        window.Kakao?.Share.sendDefault({
          objectType: "feed",
          content: {
            title,
            description: text ?? "",
            imageUrl: image,
            link: { mobileWebUrl: url, webUrl: url },
          },
          buttons: [
            { title: t("viewOnWeb"), link: { mobileWebUrl: url, webUrl: url } },
          ],
        });
      } else {
        window.Kakao?.Share.sendDefault({
          objectType: "text",
          text: text ? `${title}\n${text}` : title,
          link: { mobileWebUrl: url, webUrl: url },
        });
      }
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
          <button
            type="button"
            role="menuitem"
            onClick={handleShareX}
            className="flex items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent hover:text-accent-foreground"
          >
            <XIcon className="size-4" />
            X (Twitter)
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={handleShareFacebook}
            className="flex items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent hover:text-accent-foreground"
          >
            <FacebookIcon className="size-4" />
            Facebook
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={handleShareKakao}
            className="flex items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent hover:text-accent-foreground"
          >
            <KakaoIcon className="size-4" />
            KakaoTalk
          </button>
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
