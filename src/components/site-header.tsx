"use client";

import { Wind } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { LanguageSwitcher } from "@/components/language-switcher";

export function SiteHeader() {
  const t = useTranslations("Header");

  return (
    <header className="border-b border-border">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <Wind className="size-6 text-primary" />
          <span className="flex flex-col leading-tight">
            <span className="text-lg font-semibold tracking-tight">
              DroneWeather
            </span>
            <span className="hidden text-xs text-muted-foreground sm:block">
              {t("tagline")}
            </span>
          </span>
        </Link>

        <nav className="flex items-center gap-4">
          <Link
            href="/guides"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            {t("guidesNav")}
          </Link>
          <LanguageSwitcher />
        </nav>
      </div>
    </header>
  );
}
