import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { TOOLS } from "@/lib/tools";
import { getToolImage } from "@/lib/tool-images";

/**
 * 홈 화면 "드론 도구" 섹션 — 형제 사이트 ExifLens 홈의 도구 섹션과 같은 형태.
 * `TOOLS` 목록(도구 허브와 같은 단일 출처)을 그대로 읽어 모든 도구를 이름·한 줄 설명과 함께
 * 서버에서 그려 주므로(크롤링 가능) 도구가 추가되면 홈 편집 없이 자동으로 따라온다.
 * 대표 이미지가 지정된 도구에만 카드 위에 썸네일이 붙고, 없으면 글만 보인다.
 */
export async function HomeToolsHighlights() {
  const t = await getTranslations("Home");
  const items = await getTranslations("Tools.items");

  return (
    <section className="flex flex-col gap-4 border-t border-border pt-10">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-semibold tracking-tight">{t("toolsHighlightsTitle")}</h2>
        <p className="text-sm text-muted-foreground">{t("toolsHighlightsSubtitle")}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {TOOLS.map((tool) => {
          const img = getToolImage(tool.slug);
          return (
            <Link
              key={tool.slug}
              href={`/tools/${tool.slug}`}
              className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card transition hover:border-foreground/30"
            >
              {img ? (
                <div className="relative aspect-[16/9] overflow-hidden bg-muted">
                  <Image
                    src={img.image}
                    alt={items(`${tool.key}.name`)}
                    fill
                    sizes="(min-width: 1024px) 384px, (min-width: 640px) 50vw, 100vw"
                    className="object-cover transition duration-300 group-hover:scale-105"
                  />
                </div>
              ) : null}
              <div className="flex flex-col gap-1.5 p-4">
                <h3 className="font-semibold leading-snug tracking-tight group-hover:underline">
                  {items(`${tool.key}.name`)}
                </h3>
                <p className="line-clamp-3 text-sm text-muted-foreground">
                  {items(`${tool.key}.description`)}
                </p>
              </div>
            </Link>
          );
        })}
      </div>

      <Link href="/tools" className="text-sm font-medium underline-offset-4 hover:underline">
        {t("toolsHighlightsCta")}
      </Link>
    </section>
  );
}
