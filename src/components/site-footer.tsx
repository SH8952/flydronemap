import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export function SiteFooter() {
  const t = useTranslations("Footer");
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-3 px-4 py-6 text-sm text-muted-foreground sm:flex-row">
        <p>© {year} FlyDroneMap. {t("rights")}</p>
        <nav className="flex flex-wrap items-center justify-center gap-4">
          <Link href="/about" className="hover:text-foreground">
            {t("about")}
          </Link>
          <Link href="/guides" className="hover:text-foreground">
            {t("guides")}
          </Link>
          <Link href="/privacy" className="hover:text-foreground">
            {t("privacy")}
          </Link>
          <Link href="/terms" className="hover:text-foreground">
            {t("terms")}
          </Link>
          <Link href="/disclosure" className="hover:text-foreground">
            {t("disclosure")}
          </Link>
        </nav>
      </div>
    </footer>
  );
}
