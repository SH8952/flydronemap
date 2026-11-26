"use client";

import { useLocale, useTranslations } from "next-intl";
import { Rss } from "lucide-react";
import { Link, usePathname } from "@/i18n/navigation";
import { VisitorCounter } from "@/components/visitor-counter";
import { ShareButton } from "@/components/share-button";
import { SITE_URL } from "@/lib/seo";

export function SiteFooter() {
  const t = useTranslations("Footer");
  const homeT = useTranslations("Home");
  const locale = useLocale();
  const pathname = usePathname();
  const year = new Date().getFullYear();
  const isHomePage = pathname === "/";

  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-3 px-4 py-6 text-sm text-muted-foreground sm:flex-row">
        <p>© {year} FlyDroneMap. {t("rights")}</p>
        <VisitorCounter />
        <nav className="flex flex-wrap items-center justify-center gap-4">
          <Link href="/privacy" className="hover:text-foreground">
            {t("privacy")}
          </Link>
          <Link href="/terms" className="hover:text-foreground">
            {t("terms")}
          </Link>
          <Link href="/disclosure" className="hover:text-foreground">
            {t("disclosure")}
          </Link>
          <Link href="/contact" className="hover:text-foreground">
            {t("contact")}
          </Link>
          {isHomePage ? (
            <ShareButton
              title={homeT("title")}
              text={homeT("subtitle")}
              url={`${SITE_URL}/${locale}`}
              variant="ghost"
              size="sm"
              menuPlacement="top"
            />
          ) : null}
          <a
            href="/rss.xml"
            aria-label="RSS feed"
            title="RSS feed"
            className="hover:text-foreground"
          >
            <Rss className="size-4" />
          </a>
        </nav>
      </div>
    </footer>
  );
}
