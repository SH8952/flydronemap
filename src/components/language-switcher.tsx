"use client";

import { useLocale } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { locales, localeLabels, type Locale } from "@/i18n/routing";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/**
 * `guideLocales`: 일부 언어에만 번역본이 있는 가이드의 {slug: 사용 가능한 언어들}.
 * 번역본이 없는 언어로 전환하면 404가 되므로, 그 경우 가이드 목록으로 보낸다
 * (2026-10-03).
 */
export function LanguageSwitcher({
  guideLocales = {},
}: {
  guideLocales?: Record<string, Locale[]>;
} = {}) {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  return (
    <Select
      value={locale}
      onValueChange={(next) => {
        const guideSlug = pathname.match(/^\/guides\/([^/]+)$/)?.[1];
        const available = guideSlug ? guideLocales[guideSlug] : undefined;
        const target =
          available && !available.includes(next as Locale)
            ? "/guides"
            : pathname;
        router.replace(target, { locale: next as Locale });
      }}
    >
      <SelectTrigger size="sm" className="w-[84px]" aria-label="Language">
        <SelectValue />
      </SelectTrigger>
      <SelectContent align="end">
        {locales.map((l) => (
          <SelectItem key={l} value={l}>
            {localeLabels[l]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
