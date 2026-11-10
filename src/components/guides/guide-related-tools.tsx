import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { TOOLS } from "@/lib/tools";

/**
 * 가이드 글 하단에 "이 글과 함께 쓰면 좋은 도구"를 보여 준다.
 * 어떤 도구가 어떤 가이드를 관련 글로 두었는지(`TOOLS[].guides`)를 거꾸로 찾아서
 * 자동으로 연결하므로 mdx 본문을 수정하지 않는다. 연결된 도구가 없으면 아무것도 그리지 않는다.
 */
export async function GuideRelatedTools({ slug }: { slug: string }) {
  const tools = TOOLS.filter((tool) => tool.guides.includes(slug));
  if (tools.length === 0) return null;

  const tg = await getTranslations("Guides");
  const tt = await getTranslations("Tools");

  return (
    <nav aria-label={tg("relatedTools")} className="flex flex-col gap-3 border-t border-border pt-6">
      <h2 className="text-lg font-semibold tracking-tight">{tg("relatedTools")}</h2>
      <ul className="grid gap-3 sm:grid-cols-2">
        {tools.map((tool) => (
          <li key={tool.key}>
            <Link
              href={`/tools/${tool.slug}`}
              className="group flex h-full flex-col gap-1 rounded-lg border border-border p-4 transition-colors hover:border-primary/60 hover:bg-muted/40"
            >
              <span className="text-sm font-semibold">{tt(`items.${tool.key}.name`)}</span>
              <span className="text-sm text-muted-foreground">{tt(`items.${tool.key}.short`)}</span>
              <span className="mt-1 text-sm text-primary">{tt("hub.openTool")}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
