import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { evaluate } from "@mdx-js/mdx";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import * as runtime from "react/jsx-runtime";
import type { ComponentType } from "react";
import { routing, type Locale } from "@/i18n/routing";

const GUIDES_DIR = path.join(process.cwd(), "content", "guides");

export type GuideFrontmatter = {
  title: string;
  description: string;
  publishedAt: string;
  updatedAt?: string;
  tags?: string[];
  /** Category slug, one of CATEGORY_ORDER below. Falls back to "general". */
  category?: string;
  /** Representative image path (e.g. "/guides/images/{slug}.webp"), auto-attached
   * from Unsplash on publish or set via the dev-only image tool. Optional — older
   * guides published before this feature (2026-09-03) may not have one. */
  image?: string;
  imageCredit?: string;
  imageCreditUrl?: string;
};

/**
 * Fixed category taxonomy for the Guides section, in display order. Keeping
 * this as a small fixed list (rather than free-form tags) is what lets the
 * Guides index page group articles instead of rendering one long flat list.
 */
export const CATEGORY_ORDER = [
  "weather-safety",
  "space-weather-gps",
  "us-airspace-regulations",
  "gear-flight-tips",
  // 2026-09-16 신규 추가 — 사이트가 실제로 대시보드를 갖춘 한국/일본/스페인/EU
  // 규정을 다루는 가이드 카테고리(그동안 규정 카테고리가 미국(us-airspace-regulations)에만
  // 한정돼 있던 공백을 메움). messages/{en,ko,ja,es}.json의 Guides.categories에도
  // 라벨을 함께 추가해야 함(guides 목록 페이지가 t(`categories.${category}`)로 참조).
  "international-regulations",
  // 2026-09-28 신규 추가 — SEO 콘텐츠 갭 분석 1군 ③(용어집). 새 라우트를 만들지
  // 않고 기존 가이드 인프라(카테고리/라우팅/sitemap/hreflang)를 그대로 재사용하기
  // 위해 카테고리 하나만 추가하는 방식을 택함. messages/*.json의
  // Guides.categories.glossary에도 라벨을 함께 추가해야 함(5개 언어 모두).
  "glossary",
] as const;

export type CategorySlug = (typeof CATEGORY_ORDER)[number] | "general";

export type GuideMeta = GuideFrontmatter & {
  slug: string;
  /** Rough reading time in minutes, derived from word count (~200 wpm). */
  readingMinutes: number;
};

function guideDir(locale: Locale) {
  return path.join(GUIDES_DIR, locale);
}

/** 해당 가이드(slug)의 번역본이 실제로 있는 언어 목록. */
export function getGuideLocales(slug: string): Locale[] {
  return routing.locales.filter((locale) =>
    fs.existsSync(path.join(guideDir(locale), `${slug}.mdx`)),
  );
}

/**
 * 일부 언어에만 번역본이 있는 가이드의 {slug: 사용 가능한 언어들}. 모든
 * 언어에 있는 가이드는 포함하지 않는다. 언어 전환 시 404를 피하는 데 쓴다.
 */
export function getPartialGuideLocales(): Record<string, Locale[]> {
  const result: Record<string, Locale[]> = {};
  const slugs = new Set(routing.locales.flatMap((l) => getGuideSlugs(l)));
  for (const slug of slugs) {
    const available = getGuideLocales(slug);
    if (available.length < routing.locales.length) result[slug] = available;
  }
  return result;
}

/** All published guide slugs for a locale, derived from the .mdx filenames present. */
export function getGuideSlugs(locale: Locale): string[] {
  const dir = guideDir(locale);
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((file) => file.endsWith(".mdx"))
    .map((file) => file.replace(/\.mdx$/, ""));
}

function readRawSource(locale: Locale, slug: string): string {
  const filePath = path.join(guideDir(locale), `${slug}.mdx`);
  return fs.readFileSync(filePath, "utf8");
}

function estimateReadingMinutes(body: string): number {
  const words = body.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

/** Frontmatter + slug + reading time for one guide, without compiling the MDX body. */
export function getGuideMeta(locale: Locale, slug: string): GuideMeta | null {
  const filePath = path.join(guideDir(locale), `${slug}.mdx`);
  if (!fs.existsSync(filePath)) return null;
  const raw = fs.readFileSync(filePath, "utf8");
  const { data, content } = matter(raw);
  const fm = data as GuideFrontmatter;
  return {
    ...fm,
    slug,
    readingMinutes: estimateReadingMinutes(content),
  };
}

/** All guides for a locale, sorted newest-first by publishedAt. */
export function getAllGuidesMeta(locale: Locale): GuideMeta[] {
  return getGuideSlugs(locale)
    .map((slug) => getGuideMeta(locale, slug))
    .filter((g): g is GuideMeta => g !== null)
    .sort((a, b) => (a.publishedAt < b.publishedAt ? 1 : -1));
}

/**
 * Guides for a locale grouped by category, in CATEGORY_ORDER (any guide
 * missing a recognized category falls into "general" at the end). Each
 * group's guides are newest-first, same as getAllGuidesMeta.
 */
export function getGuidesByCategory(
  locale: Locale,
): Array<{ category: CategorySlug; guides: GuideMeta[] }> {
  const all = getAllGuidesMeta(locale);
  const order: CategorySlug[] = [...CATEGORY_ORDER, "general"];

  return order
    .map((category) => ({
      category,
      guides: all.filter((g) =>
        category === "general"
          ? !g.category || !CATEGORY_ORDER.includes(g.category as (typeof CATEGORY_ORDER)[number])
          : g.category === category,
      ),
    }))
    .filter((group) => group.guides.length > 0);
}

/**
 * 글 하단 "관련 글" 링크 그래프 (2026-11-26 개편).
 *
 * 이전에는 "같은 카테고리의 최신 글 6개"만 걸어서, 카테고리마다 가장 최근 글 몇 개만
 * 링크를 받고 나머지(특히 용어집·규정처럼 글 수가 적은 카테고리의 새 글)는 허브 목록
 * 한 곳에서만 링크됐다. 검색엔진이 새 글을 늦게 읽는 원인 중 하나가 이 편중이었다.
 *
 * 지금은 언어별로 한 번 계산해 두는 그래프다.
 *  1) 글마다 정확히 `RELATED_LINKS`개(기본 6)를 걸고,
 *  2) 가장 적게 링크 받은 글부터 "관련도가 가장 높은 글"이 자신의 목록에 넣게 해서
 *     모든 글이 비슷한 수의 링크를 받게 한다(최신순 편중 제거).
 *  관련도 = 공통 태그 수(최대 3개 × 4점) + 같은 카테고리(3점) + 글 쌍마다 고정된 작은 변동값.
 *  변동값은 난수가 아니라 slug 쌍의 해시라 배포마다 같은 결과가 나오고, 글마다 목록이 달라진다.
 *  각 글의 목록은 관련도 높은 순으로 정렬한다. 본문(mdx)은 전혀 건드리지 않는다.
 *
 * 글이 추가돼도 파일 목록에서 그대로 다시 계산되므로 손으로 관리할 목록이 없다.
 * 개발 서버(development)에서는 글을 바로 반영하려고 캐시하지 않는다.
 */
const RELATED_LINKS = 6;

type RelatedGraph = {
  bySlug: Map<string, GuideMeta>;
  links: Map<string, string[]>;
};

const relatedGraphCache = new Map<string, RelatedGraph>();

/** slug 쌍으로 만든 0 이상 1 미만의 고정 값(FNV-1a). 같은 입력 → 항상 같은 값. */
function pairJitter(from: string, to: string): number {
  const text = `${from}>${to}`;
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return ((hash >>> 0) % 1000) / 1000;
}

function relatedScore(from: GuideMeta, to: GuideMeta): number {
  const toTags = new Set(to.tags ?? []);
  const shared = (from.tags ?? []).filter((tag) => toTags.has(tag)).length;
  const sameCategory = from.category && from.category === to.category ? 3 : 0;
  return Math.min(shared, 3) * 4 + sameCategory + pairJitter(from.slug, to.slug);
}

function buildRelatedGraph(locale: Locale): RelatedGraph {
  const metas = [...getAllGuidesMeta(locale)].sort((a, b) =>
    a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0,
  );
  const bySlug = new Map(metas.map((meta) => [meta.slug, meta]));
  const cap = Math.min(RELATED_LINKS, Math.max(0, metas.length - 1));
  const links = new Map<string, string[]>(metas.map((meta) => [meta.slug, []]));
  const inbound = new Map<string, number>(metas.map((meta) => [meta.slug, 0]));
  const exhausted = new Set<string>();

  while (exhausted.size < metas.length) {
    // 지금까지 가장 적게 링크 받은 글(동률이면 slug 순).
    let target: GuideMeta | null = null;
    for (const meta of metas) {
      if (exhausted.has(meta.slug)) continue;
      if (!target || (inbound.get(meta.slug) ?? 0) < (inbound.get(target.slug) ?? 0)) {
        target = meta;
      }
    }
    if (!target) break;

    // 아직 자리가 남은 글 중 target 과 가장 관련 있는 글이 target 으로 링크를 건다.
    let source: GuideMeta | null = null;
    let best = -1;
    for (const meta of metas) {
      if (meta.slug === target.slug) continue;
      const list = links.get(meta.slug) ?? [];
      if (list.length >= cap || list.includes(target.slug)) continue;
      const score = relatedScore(meta, target);
      if (score > best) {
        best = score;
        source = meta;
      }
    }
    if (!source) {
      exhausted.add(target.slug);
      continue;
    }
    links.get(source.slug)?.push(target.slug);
    inbound.set(target.slug, (inbound.get(target.slug) ?? 0) + 1);
  }

  // 각 글의 목록은 관련도 높은 순으로.
  for (const meta of metas) {
    const list = links.get(meta.slug) ?? [];
    list.sort((a, b) => {
      const ta = bySlug.get(a);
      const tb = bySlug.get(b);
      if (!ta || !tb) return 0;
      return relatedScore(meta, tb) - relatedScore(meta, ta);
    });
  }

  return { bySlug, links };
}

function getRelatedGraph(locale: Locale): RelatedGraph {
  if (process.env.NODE_ENV === "development") return buildRelatedGraph(locale);
  const cached = relatedGraphCache.get(locale);
  if (cached) return cached;
  const built = buildRelatedGraph(locale);
  relatedGraphCache.set(locale, built);
  return built;
}

/**
 * 글 하단 내부 링크용으로 `limit`개(최대 6개까지 그래프에서, 그 이상은 같은 카테고리 최신순으로 보충)를
 * 돌려준다. 현재 글 자신은 절대 포함하지 않는다. 그래프에 없는 글(방금 추가돼 계산 전 등)은
 * 예전 방식(같은 카테고리 → 나머지, 최신순)으로 대신한다.
 */
export function getRelatedGuides(
  locale: Locale,
  currentSlug: string,
  limit = 3,
): GuideMeta[] {
  const { bySlug, links } = getRelatedGraph(locale);
  const fromGraph = (links.get(currentSlug) ?? [])
    .map((slug) => bySlug.get(slug))
    .filter((guide): guide is GuideMeta => guide !== undefined);

  if (fromGraph.length >= limit) return fromGraph.slice(0, limit);

  const all = getAllGuidesMeta(locale).filter((g) => g.slug !== currentSlug);
  const current = getGuideMeta(locale, currentSlug);
  const picked = new Set(fromGraph.map((g) => g.slug));
  const sameCategory = all.filter((g) => g.category === current?.category);
  const rest = all.filter((g) => g.category !== current?.category);
  const filler = [...sameCategory, ...rest].filter((g) => !picked.has(g.slug));
  return [...fromGraph, ...filler].slice(0, limit);
}

/** 목차용 H2 소제목 — rehype-slug가 붙인 id와 일치한다. */
export type GuideHeading = { id: string; text: string };

type HastNode = {
  type: string;
  tagName?: string;
  value?: string;
  properties?: { id?: unknown };
  children?: HastNode[];
};

function hastText(node: HastNode): string {
  if (node.type === "text") return node.value ?? "";
  return (node.children ?? []).map(hastText).join("");
}

/**
 * rehype-slug 뒤·autolink 앞에서 H2 소제목(id, 글자)을 수집하는 플러그인.
 * H3·FAQ 질문은 제외. 결과는 `sink` 배열에 쌓인다. (2026-10-17 신규)
 */
function collectH2Headings(sink: GuideHeading[]) {
  return () => (tree: HastNode) => {
    const walk = (node: HastNode) => {
      if (
        node.type === "element" &&
        node.tagName === "h2" &&
        typeof node.properties?.id === "string"
      ) {
        const text = hastText(node).trim();
        if (text) sink.push({ id: node.properties.id, text });
      }
      node.children?.forEach(walk);
    };
    walk(tree);
  };
}

/**
 * Compiles one guide's MDX body into a renderable React component. Called
 * from a server component (RSC) — @mdx-js/mdx's `evaluate` runs the MDX
 * compiler and hands back a ready-to-render `default` export, following the
 * standard mdx-js Next.js App Router integration pattern.
 */
export async function compileGuide(
  locale: Locale,
  slug: string,
): Promise<{
  Content: ComponentType;
  meta: GuideMeta;
  headings: GuideHeading[];
} | null> {
  const filePath = path.join(guideDir(locale), `${slug}.mdx`);
  if (!fs.existsSync(filePath)) return null;

  const raw = readRawSource(locale, slug);
  const { data, content } = matter(raw);
  const fm = data as GuideFrontmatter;

  const headings: GuideHeading[] = [];
  const { default: Content } = await evaluate(content, {
    ...runtime,
    // singleTilde: false — 콘텐츠 본문에서 "~"를 범위 표기(예: "23~27km/h")로
    // 자주 사용하는데, remark-gfm 기본값(singleTilde: true)은 단일 "~" 하나만
    // 있어도 취소선으로 해석해 문장이 잘못 표시되는 버그가 있었음(2026-09-28 발견).
    // "~~"(더블 틸드)로만 취소선을 인식하도록 명시적으로 제한.
    remarkPlugins: [[remarkGfm, { singleTilde: false }]],
    // collectH2Headings의 변환기 타입은 hast 전체 타입과 구조만 같아 `as never`로 통과시킨다.
    rehypePlugins: [
      rehypeSlug,
      collectH2Headings(headings) as never,
      rehypeAutolinkHeadings,
    ],
  });

  return {
    Content: Content as ComponentType,
    meta: {
      ...fm,
      slug,
      readingMinutes: estimateReadingMinutes(content),
    },    headings,
  };
}
