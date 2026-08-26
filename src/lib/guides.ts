import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { evaluate } from "@mdx-js/mdx";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import * as runtime from "react/jsx-runtime";
import type { ComponentType } from "react";
import type { Locale } from "@/i18n/routing";

const GUIDES_DIR = path.join(process.cwd(), "content", "guides");

export type GuideFrontmatter = {
  title: string;
  description: string;
  publishedAt: string;
  updatedAt?: string;
  tags?: string[];
};

export type GuideMeta = GuideFrontmatter & {
  slug: string;
  /** Rough reading time in minutes, derived from word count (~200 wpm). */
  readingMinutes: number;
};

function guideDir(locale: Locale) {
  return path.join(GUIDES_DIR, locale);
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
 * Compiles one guide's MDX body into a renderable React component. Called
 * from a server component (RSC) — @mdx-js/mdx's `evaluate` runs the MDX
 * compiler and hands back a ready-to-render `default` export, following the
 * standard mdx-js Next.js App Router integration pattern.
 */
export async function compileGuide(
  locale: Locale,
  slug: string,
): Promise<{ Content: ComponentType; meta: GuideMeta } | null> {
  const filePath = path.join(guideDir(locale), `${slug}.mdx`);
  if (!fs.existsSync(filePath)) return null;

  const raw = readRawSource(locale, slug);
  const { data, content } = matter(raw);
  const fm = data as GuideFrontmatter;

  const { default: Content } = await evaluate(content, {
    ...runtime,
    remarkPlugins: [remarkGfm],
    rehypePlugins: [rehypeSlug, rehypeAutolinkHeadings],
  });

  return {
    Content: Content as ComponentType,
    meta: {
      ...fm,
      slug,
      readingMinutes: estimateReadingMinutes(content),
    },
  };
}
