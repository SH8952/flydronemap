import type { GuideHeading } from "@/lib/guides";

/**
 * 가이드 상단 목차(항상 펼침). 본문 H2 소제목으로 가는 같은 페이지 `#앵커`
 * 링크이며 자바스크립트가 필요 없다. 소제목이 2개 미만이면 표시하지 않는다.
 * (2026-10-17 신규 — ExifLens에서 먼저 적용한 방식과 동일한 구성)
 */
export function GuideToc({
  headings,
  title,
}: {
  headings: GuideHeading[];
  title: string;
}) {
  if (headings.length < 2) return null;

  return (
    <nav
      aria-label={title}
      className="rounded-lg border border-border bg-muted/30 p-4"
    >
      <p className="mb-3 text-sm font-semibold">{title}</p>
      <ol className="flex flex-col gap-1.5 text-sm sm:block sm:columns-2 sm:gap-x-8">
        {headings.map((heading, index) => (
          <li
            key={heading.id}
            className="flex gap-2 break-inside-avoid sm:mb-1.5"
          >
            <span className="w-6 shrink-0 text-right tabular-nums text-muted-foreground">
              {index + 1}.
            </span>
            <a href={`#${heading.id}`} className="text-primary hover:underline">
              {heading.text}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
