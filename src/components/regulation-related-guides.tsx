import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { getGuideMeta } from "@/lib/guides";

/**
 * 국가별 규정 페이지 하단의 "관련 가이드" 목록. 규정 요약(3줄) 페이지에서
 * 해당 국가를 깊이 다룬 가이드로 내부 링크를 연결해, 사용자에게는 더 자세한
 * 설명을, 검색엔진에는 페이지 간 주제 연결을 제공한다. 해당 언어로 발행되지
 * 않은 가이드는 조용히 건너뛴다(링크 깨짐 방지).
 */
export async function RegulationRelatedGuides({
  locale,
  slugs,
}: {
  locale: string;
  slugs: string[];
}) {
  const t = await getTranslations("Regulations");
  const guides = slugs
    .map((slug) => getGuideMeta(locale as Locale, slug))
    .filter((g): g is NonNullable<typeof g> => g !== null);

  if (guides.length === 0) return null;

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold tracking-tight">
        {t("relatedGuidesTitle")}
      </h2>
      <ul className="flex flex-col gap-3">
        {guides.map((guide) => (
          <li key={guide.slug}>
            <Link
              href={`/guides/${guide.slug}`}
              className="group flex flex-col gap-1 rounded-lg border border-border p-4 transition hover:border-foreground/30"
            >
              <span className="font-medium leading-snug group-hover:underline">
                {guide.title}
              </span>
              <span className="line-clamp-2 text-sm text-muted-foreground">
                {guide.description}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
