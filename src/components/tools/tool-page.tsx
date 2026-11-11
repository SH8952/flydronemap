import Image from "next/image";
import { getTranslations, setRequestLocale } from "next-intl/server";
import {
  Aperture,
  ArrowRight,
  BatteryCharging,
  ChevronDown,
  ClipboardCheck,
  Mountain,
  Ruler,
  Scale,
  Sunrise,
  Telescope,
  Timer,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import { ResultShare } from "@/components/result-share";
import { SITE_URL, breadcrumbJsonLd } from "@/lib/seo";
import { getGuideMeta } from "@/lib/guides";
import type { Locale } from "@/i18n/routing";
import { TOOLS, getTool, type ToolKey } from "@/lib/tools";
import { getToolImage } from "@/lib/tool-images";
import { ToolImageDevPanel } from "@/components/dev/tool-image-dev-panel";

const ICONS = {
  ndFilter: Aperture,
  flightTime: Timer,
  batteryCheck: BatteryCharging,
  goldenHour: Sunrise,
  gsd: Ruler,
  densityAltitude: Mountain,
  lineOfSight: Telescope,
  checklist: ClipboardCheck,
  euCategory: Scale,
} as const;

export function ToolIcon({ toolKey, className }: { toolKey: ToolKey; className?: string }) {
  const Icon = ICONS[toolKey];
  return <Icon className={className} aria-hidden="true" />;
}

type Faq = { q: string; a: string };

/**
 * 모든 도구 페이지가 공유하는 틀: 제목·설명 → (도구 화면) → 사용 방법 → 계산 원리 →
 * 자주 묻는 질문 → 대시보드 안내 → 관련 가이드 → 다른 도구.
 * `children` 자리에 각 도구의 클라이언트 컴포넌트가 들어간다.
 */
export async function ToolPage({
  locale,
  toolKey,
  children,
}: {
  locale: string;
  toolKey: ToolKey;
  children: React.ReactNode;
}) {
  setRequestLocale(locale);
  const tool = getTool(toolKey);
  const t = await getTranslations({ locale, namespace: `Tools.${toolKey}` });
  const c = await getTranslations({ locale, namespace: "Tools.common" });
  const hub = await getTranslations({ locale, namespace: "Tools.hub" });
  const items = await getTranslations({ locale, namespace: "Tools.items" });

  const steps = t.raw("howToSteps") as string[];
  const formula = t.raw("formulaBody") as string[];
  const faq = t.raw("faq") as Faq[];

  const guides = tool.guides
    .map((slug) => getGuideMeta(locale as Locale, slug))
    .filter((g): g is NonNullable<typeof g> => g !== null)
    .slice(0, 3);

  // 목록에서 현재 도구 다음 순서의 도구 4개(끝에 닿으면 처음부터)를 보여 준다.
  const at = TOOLS.findIndex((o) => o.key === toolKey);
  const relatedTools = Array.from({ length: Math.min(4, TOOLS.length - 1) }, (_, k) => TOOLS[(at + 1 + k) % TOOLS.length]);
  const heroImage = getToolImage(tool.slug);
  const url = `${SITE_URL}/${locale}/tools/${tool.slug}`;
  const breadcrumbs = breadcrumbJsonLd([
    { name: "Home", url: `${SITE_URL}/${locale}` },
    { name: hub("title"), url: `${SITE_URL}/${locale}/tools` },
    { name: t("title"), url },
  ]);

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-4 py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }} />

      <div className="flex items-center justify-between gap-3">
        <nav aria-label="breadcrumb" className="text-sm text-muted-foreground">
          <Link href="/tools" className="hover:text-foreground">
            {hub("title")}
          </Link>
          <span aria-hidden="true"> › </span>
          <span>{t("title")}</span>
        </nav>
        <ResultShare path={`/tools/${tool.slug}`} title={t("title")} text={t("subtitle")} />
      </div>

      <header className="flex flex-col gap-2 text-center">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{t("title")}</h1>
        <p className="mx-auto max-w-2xl text-muted-foreground">{t("subtitle")}</p>
      </header>

      {heroImage ? (
        <figure className="flex flex-col gap-1.5">
          <div className="relative aspect-[16/7] w-full overflow-hidden rounded-lg">
            <Image
              src={heroImage.image}
              alt={t("title")}
              fill
              sizes="(min-width: 896px) 896px, 100vw"
              className="object-cover"
              priority
            />
          </div>
          {heroImage.imageCredit && heroImage.imageCreditUrl ? (
            <figcaption className="text-xs text-muted-foreground">
              Photo by{" "}
              <a href={heroImage.imageCreditUrl} target="_blank" rel="noopener noreferrer" className="hover:text-foreground">
                {heroImage.imageCredit}
              </a>{" "}
              on{" "}
              <a
                href="https://unsplash.com/?utm_source=FlyDroneMap&utm_medium=referral"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-foreground"
              >
                Unsplash
              </a>
            </figcaption>
          ) : null}
        </figure>
      ) : null}

      {children}

      <p className="rounded-lg border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
        {c("estimateNote")}
      </p>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold tracking-tight">{c("howToTitle")}</h2>
        <ol className="flex list-decimal flex-col gap-2 pl-5 text-sm leading-relaxed text-muted-foreground">
          {steps.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ol>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold tracking-tight">{t("formulaTitle")}</h2>
        {formula.map((p) => (
          <p key={p} className="text-sm leading-relaxed text-muted-foreground">
            {p}
          </p>
        ))}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold tracking-tight">{c("faqTitle")}</h2>
        <div className="flex flex-col gap-2">
          {faq.map((item) => (
            <details key={item.q} className="group rounded-lg border border-border px-4 py-3">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-sm font-medium">
                {item.q}
                <ChevronDown className="size-4 shrink-0 transition-transform group-open:rotate-180" aria-hidden="true" />
              </summary>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-2 rounded-lg border border-border p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-semibold">{c("dashboardTitle")}</h2>
          <p className="text-sm text-muted-foreground">{c("dashboardText")}</p>
        </div>
        <Link
          href="/"
          className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-primary underline-offset-4 hover:underline"
        >
          {c("dashboardButton")}
          <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      </section>

      {guides.length > 0 ? (
        <section className="flex flex-col gap-3">
          <h2 className="text-xl font-semibold tracking-tight">{c("relatedGuidesTitle")}</h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {guides.map((g) => (
              <li key={g.slug}>
                <Link
                  href={`/guides/${g.slug}`}
                  className="flex h-full flex-col gap-1 rounded-lg border border-border p-4 transition-colors hover:border-primary hover:bg-muted/30"
                >
                  <span className="text-sm font-semibold">{g.title}</span>
                  <span className="line-clamp-2 text-xs text-muted-foreground">{g.description}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold tracking-tight">{c("relatedToolsTitle")}</h2>
        <ul className="grid gap-3 sm:grid-cols-2">
          {relatedTools.map((o) => (
            <li key={o.key}>
              <Link
                href={`/tools/${o.slug}`}
                className="flex h-full flex-col gap-1 rounded-lg border border-border p-4 transition-colors hover:border-primary hover:bg-muted/30"
              >
                <span className="flex items-center gap-2 text-sm font-semibold">
                  <ToolIcon toolKey={o.key} className="size-4 text-primary" />
                  {items(`${o.key}.name`)}
                </span>
                <span className="text-xs text-muted-foreground">{items(`${o.key}.short`)}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {process.env.NODE_ENV === "development" ? (
        <ToolImageDevPanel
          items={[
            {
              slug: tool.slug,
              label: items(`${toolKey}.name`),
              query: tool.imageQuery,
              currentImage: heroImage?.image,
              currentImageCredit: heroImage?.imageCredit,
            },
          ]}
        />
      ) : null}
    </div>
  );
}
