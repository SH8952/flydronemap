"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useTranslations } from "next-intl";

/**
 * 라이트/다크 전환 버튼 (2026-11-07).
 * - 기본값은 layout.tsx 의 ThemeProvider(defaultTheme="dark")를 따른다.
 * - 서버 렌더와 클라이언트 첫 렌더의 아이콘이 달라 생기는 hydration 경고를 막기 위해
 *   마운트 전에는 같은 크기의 빈 버튼을 그린다.
 */
export function ThemeToggle() {
  const t = useTranslations("Header");
  const { resolvedTheme, setTheme } = useTheme();
  // 서버 렌더에서는 false, 클라이언트 hydration 이후에는 true (effect 안 setState 없이 마운트 여부 판별)
  const mounted = React.useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  const isDark = resolvedTheme !== "light";
  const label = isDark ? t("toLightMode") : t("toDarkMode");

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={mounted ? label : undefined}
      title={mounted ? label : undefined}
      className="flex size-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
    >
      {mounted ? (
        isDark ? (
          <Sun className="size-5" />
        ) : (
          <Moon className="size-5" />
        )
      ) : (
        <span className="size-5" />
      )}
    </button>
  );
}
