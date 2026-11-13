import type { ReactNode } from "react";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { routing } from "./routing";

type Messages = Record<string, unknown>;

/**
 * 클라이언트 컴포넌트가 실제로 쓰는 번역 묶음(네임스페이스)만 골라낸다.
 * 예: ["Header", "Tools.gsd"] → { Header: {...}, Tools: { gsd: {...} } }
 *
 * 2026-11-13 Vercel 사용량 최적화: NextIntlClientProvider 에 번역 전체를 넘기면
 * 모든 페이지의 HTML(클라이언트 데이터)에 번역 전체(약 100KB)가 중복으로 실려 ISR 읽기·전송량이 커진다.
 * 서버 컴포넌트의 getTranslations 는 영향이 없다(브라우저로 보내지 않는 번역).
 * 새 클라이언트 컴포넌트에서 useTranslations("X") 를 쓰면 해당 페이지 폴더의 layout.tsx
 * (또는 루트 layout.tsx 의 LAYOUT_NAMESPACES)에 "X" 를 추가해야 한다.
 */
export function pickMessages(messages: Messages, namespaces: string[]): Messages {
  // "A" 와 "A.b" 가 같이 있으면 "A.b" 는 이미 "A" 에 포함되므로 뺀다.
  const list = namespaces.filter(
    (ns) => !namespaces.some((o) => o !== ns && ns.startsWith(o + ".")),
  );
  const out: Messages = {};
  for (const ns of list) {
    const parts = ns.split(".");
    let src: unknown = messages;
    for (const key of parts) {
      if (src && typeof src === "object" && key in (src as Messages)) {
        src = (src as Messages)[key];
      } else {
        src = undefined;
        break;
      }
    }
    if (src === undefined) continue;
    let dst = out;
    parts.forEach((key, i) => {
      if (i === parts.length - 1) {
        dst[key] = src;
      } else {
        const next = dst[key];
        dst[key] =
          next && typeof next === "object" ? { ...(next as Messages) } : {};
        dst = dst[key] as Messages;
      }
    });
  }
  return out;
}

/** 페이지 폴더의 layout.tsx 에서 해당 페이지가 쓰는 번역 묶음만 클라이언트로 전달한다. */
export async function ClientMessages({
  locale,
  namespaces,
  children,
}: {
  locale: string;
  namespaces: string[];
  children: ReactNode;
}) {
  if (!hasLocale(routing.locales, locale)) return <>{children}</>;
  setRequestLocale(locale);
  const messages = (await getMessages({ locale })) as Messages;
  return (
    <NextIntlClientProvider messages={pickMessages(messages, namespaces)}>
      {children}
    </NextIntlClientProvider>
  );
}
