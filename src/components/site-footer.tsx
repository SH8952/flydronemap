import { useTranslations } from "next-intl";
import { Rss } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { VisitorCounter } from "@/components/visitor-counter";

export function SiteFooter() {
  const t = useTranslations("Footer");
  const year = new Date().getFullYear();

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
