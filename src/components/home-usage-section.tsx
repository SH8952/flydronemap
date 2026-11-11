import {
  Clock,
  Compass,
  Gauge,
  MapPin,
  ShieldCheck,
  TriangleAlert,
  Wind,
  ChevronRight,
  type LucideIcon,
} from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { getGuideMeta } from "@/lib/guides";
import { getTool } from "@/lib/tools";

/**
 * 홈 화면 "FlyDroneMap 사용법" 섹션 — 단계 카드 + 판정 기준 칩 (2026-11-11).
 *
 * 문구는 messages `Home.usageSteps` 의 객체 배열이다.
 *   - 앞쪽 단계(마지막 제외): { title, summary, body, chips? } → 카드.
 *     summary 는 카드에 바로 보이는 1~2줄 요약, body 는 예전 긴 설명 전문으로 "자세히 보기"(접힘, DOM 에는 그대로 존재)에 둔다.
 *     chips 는 양호·주의·비권장 같은 기준 수치를 색 칩으로 보여 준다(level: ok | wn | bd | tag).
 *   - 마지막 단계: { title, summary } → 카드 아래 "참고용" 안내 박스.
 * 카드 아이콘·단계 그룹(위치/조건/판단)·관련 링크는 아래 상수로 단계 순서에 맞춰 둔다.
 * 단계를 늘리거나 순서를 바꾸면 이 상수도 messages 와 같이 맞춰야 한다.
 */
type UsageChip = { level: "ok" | "wn" | "bd" | "tag"; text: string };
type UsageStep = {
  title: string;
  summary: string;
  body?: string;
  chips?: { label: string; items: UsageChip[] };
};

// 카드(마지막 안내 제외)와 같은 순서.
const STEP_ICONS: LucideIcon[] = [MapPin, Wind, Compass, ShieldCheck, Clock, Gauge];
// 단계 그룹: 0 위치 정하기 / 1 조건 확인하기 / 2 판단하기
const STEP_PHASE = [0, 1, 1, 1, 1, 2];

type Related =
  | { type: "guide"; slug: string }
  | { type: "tool"; key: "goldenHour" }
  | { type: "regulations" };
const STEP_RELATED: Related[][] = [
  [],
  [{ type: "guide", slug: "what-weather-data-to-check-before-flying-a-drone" }],
  [{ type: "guide", slug: "kp-index-effect-on-gps-compass-reliability" }],
  [{ type: "regulations" }, { type: "guide", slug: "notam-explained" }],
  [{ type: "tool", key: "goldenHour" }, { type: "guide", slug: "best-time-of-day-to-fly-a-drone" }],
  [{ type: "guide", slug: "drone-wind-resistance-by-model" }],
];

const CHIP_CLASS: Record<UsageChip["level"], string> = {
  ok: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  wn: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  bd: "bg-red-500/10 text-red-700 dark:text-red-300",
  tag: "border border-border text-muted-foreground",
};

export async function HomeUsageSection() {
  const locale = (await getLocale()) as Locale;
  const t = await getTranslations("Home");
  const tHeader = await getTranslations("Header");
  const tTools = await getTranslations("Tools.items");
  const steps = t.raw("usageSteps") as UsageStep[];
  const phases = t.raw("usagePhases") as string[];
  const cards = steps.slice(0, -1);
  const notice = steps[steps.length - 1];

  const linkClass = "text-sm font-medium text-foreground underline-offset-4 hover:underline";

  function relatedLinks(i: number) {
    const out: { href: string; label: string }[] = [];
    for (const r of STEP_RELATED[i] ?? []) {
      if (r.type === "guide") {
        const meta = getGuideMeta(locale, r.slug);
        if (meta) out.push({ href: `/guides/${r.slug}`, label: meta.title });
      } else if (r.type === "tool") {
        out.push({ href: `/tools/${getTool(r.key).slug}`, label: tTools(`${r.key}.name`) });
      } else {
        out.push({ href: "/regulations", label: tHeader("regulationsNav") });
      }
    }
    return out;
  }

  return (
    <section className="flex flex-col gap-4 border-t border-border pt-10">
      <h2 className="text-xl font-semibold tracking-tight">{t("usageTitle")}</h2>

      <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((step, i) => {
          const Icon = STEP_ICONS[Math.min(i, STEP_ICONS.length - 1)];
          const phaseIndex = STEP_PHASE[Math.min(i, STEP_PHASE.length - 1)];
          const related = relatedLinks(i);
          return (
            <li key={i} className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5">
              <div className="flex items-center justify-between">
                <span
                  aria-hidden="true"
                  className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary"
                >
                  <Icon className="size-5" />
                </span>
                <span className="text-xs font-semibold tabular-nums text-muted-foreground">{i + 1}</span>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-[11px] font-semibold tracking-wide text-primary">
                  {phaseIndex + 1}. {phases[phaseIndex]}
                </span>
                <h3 className="text-[15px] font-semibold text-foreground">{step.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{step.summary}</p>
              </div>

              {step.chips ? (
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs text-muted-foreground">{step.chips.label}</span>
                  <ul className="flex flex-wrap gap-1.5">
                    {step.chips.items.map((chip, k) => (
                      <li
                        key={k}
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${CHIP_CLASS[chip.level]}`}
                      >
                        {chip.level !== "tag" ? (
                          <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
                        ) : null}
                        {chip.text}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {step.body ? (
                <details className="group mt-auto border-t border-dashed border-border pt-2">
                  <summary className="flex cursor-pointer list-none items-center gap-1 text-xs font-semibold text-primary [&::-webkit-details-marker]:hidden">
                    <ChevronRight className="size-3.5 transition-transform group-open:rotate-90" aria-hidden="true" />
                    {t("usageMore")}
                  </summary>
                  <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">{step.body}</p>
                  {related.length > 0 ? (
                    <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                      <span>{t("usageRelated")} →</span>
                      {related.map((r, k) => (
                        <span key={r.href} className="inline-flex items-center gap-2">
                          {k > 0 ? <span aria-hidden="true">·</span> : null}
                          <Link href={r.href} className="text-foreground underline underline-offset-2">
                            {r.label}
                          </Link>
                        </span>
                      ))}
                    </p>
                  ) : null}
                </details>
              ) : null}
            </li>
          );
        })}
      </ol>

      <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
        <TriangleAlert className="mt-0.5 size-5 shrink-0 text-amber-600 dark:text-amber-300" aria-hidden="true" />
        <div className="flex flex-col gap-0.5">
          <h3 className="text-sm font-semibold text-foreground">
            {cards.length + 1}. {notice.title}
          </h3>
          <p className="text-sm leading-relaxed text-muted-foreground">{notice.summary}</p>
        </div>
      </div>

      <nav className="flex flex-wrap gap-x-5 gap-y-2 pt-1">
        <Link href="/guides" className={linkClass}>
          {tHeader("guidesNav")} →
        </Link>
        <Link href="/tools" className={linkClass}>
          {tHeader("toolsNav")} →
        </Link>
        <Link href="/regulations" className={linkClass}>
          {tHeader("regulationsNav")} →
        </Link>
        <Link href="/faq" className={linkClass}>
          {tHeader("faqNav")} →
        </Link>
      </nav>
    </section>
  );
}
