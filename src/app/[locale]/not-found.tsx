import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";

/**
 * 사이트 전용 404 화면 — 헤더·푸터는 [locale]/layout이 그대로 감싼다.
 * notFound()와 캐치올 라우트([...rest])가 모두 이 화면을 쓴다.
 * 응답 상태 코드는 Next.js가 404로 유지한다.
 */
export default async function LocaleNotFound() {
  const t = await getTranslations("NotFound");

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-6 px-4 py-20 text-center">
      <p className="text-sm font-medium tracking-widest text-muted-foreground">
        404
      </p>
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
        {t("title")}
      </h1>
      <p className="max-w-md text-muted-foreground">{t("description")}</p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button asChild>
          <Link href="/">{t("home")}</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/guides">{t("guides")}</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/regulations">{t("regulations")}</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/faq">{t("faq")}</Link>
        </Button>
      </div>
    </div>
  );
}
