import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

/**
 * 상위 페이지로 돌아가는 버튼 — 가이드 글의 "← 가이드 목록으로"와 같은 위치·모양.
 * 브라우저 기록이 아니라 고정된 상위 페이지로 이동한다(홈 → /, 도구 → /tools).
 */
export function BackLink({
  to,
  className = "",
}: {
  to: "home" | "tools";
  className?: string;
}) {
  const t = useTranslations("BackNav");
  return (
    <Link
      href={to === "home" ? "/" : "/tools"}
      className={`self-start text-sm text-muted-foreground hover:text-foreground ${className}`.trim()}
    >
      {to === "home" ? t("toHome") : t("toTools")}
    </Link>
  );
}
