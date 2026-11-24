import type { ReactNode } from "react";

/**
 * 가이드(MDX) 본문용 도식 컴포넌트 모음. 서버 컴포넌트(훅 없음).
 * 색은 CSS 변수/고정 oklch라 라이트·다크 모드에서 모두 읽히고, 폭이 좁으면 세로로 쌓입니다.
 * 규칙: 도식의 숫자·항목은 반드시 같은 글 본문의 표·문장에 있는 값만 사용합니다.
 */

const PALETTE = [
  "var(--color-primary)",
  "oklch(0.70 0.13 165)",
  "oklch(0.76 0.14 80)",
  "var(--color-destructive)",
  "oklch(0.65 0.14 300)",
];

// 낮음 → 높음(안전 → 주의 → 위험) 순서의 눈금 색
const SCALE = [
  "oklch(0.72 0.14 160)",
  "oklch(0.82 0.14 105)",
  "oklch(0.78 0.15 70)",
  "oklch(0.66 0.20 30)",
  "oklch(0.55 0.21 18)",
];

function Fig({ title, caption, children }: { title: string; caption?: string; children: ReactNode }) {
  return (
    <figure
      className="not-prose my-8 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4 sm:p-5"
      aria-label={title}
    >
      <p className="text-sm font-semibold text-[var(--color-foreground)]">{title}</p>
      <div className="mt-4">{children}</div>
      {caption ? (
        <figcaption className="mt-4 text-xs leading-5 text-[var(--color-muted-foreground)]">{caption}</figcaption>
      ) : null}
    </figure>
  );
}

type BarItem = { label: string; value: number; text?: string; note?: string; highlight?: boolean };

/** 가로 막대 비교. value는 길이 계산용 숫자, text는 막대 끝에 보일 표기. */
export function DiagramBars({ title, items, caption }: { title: string; items: BarItem[]; caption?: string }) {
  const max = Math.max(...items.map((i) => Math.abs(i.value)), 1);
  return (
    <Fig title={title} caption={caption}>
      <ul className="flex flex-col gap-3">
        {items.map((it, idx) => (
          <li key={it.label}>
            <div className="flex items-baseline justify-between gap-3 text-xs">
              <span className="text-[var(--color-foreground)]">{it.label}</span>
              <span className="tabular-nums font-semibold text-[var(--color-foreground)]">{it.text ?? String(it.value)}</span>
            </div>
            <div className="mt-1 h-3 w-full rounded-full bg-[var(--color-border)]">
              <div
                className="h-3 rounded-full"
                style={{
                  width: `${Math.max(2, (Math.abs(it.value) / max) * 100)}%`,
                  background: it.highlight ? PALETTE[3] : PALETTE[idx % 2 === 0 ? 0 : 1],
                }}
              />
            </div>
            {it.note ? <p className="mt-1 text-[11px] text-[var(--color-muted-foreground)]">{it.note}</p> : null}
          </li>
        ))}
      </ul>
    </Fig>
  );
}

type FlowStep = { label: string; sub?: string };

/** 순서·흐름도. 넓은 화면에서는 가로, 좁은 화면에서는 세로로 화살표가 이어집니다. */
export function DiagramFlow({ title, steps, caption }: { title: string; steps: FlowStep[]; caption?: string }) {
  return (
    <Fig title={title} caption={caption}>
      <ol className="flex flex-col gap-2 md:flex-row md:items-stretch md:gap-0">
        {steps.map((s, i) => (
          <li key={s.label} className="flex flex-col items-stretch md:flex-1 md:flex-row md:items-center">
            <div className="flex-1 rounded-lg border border-[var(--color-border)] p-3 text-center">
              <span
                className="mx-auto mb-1 flex h-6 w-6 items-center justify-center rounded-full border-2 text-xs font-bold text-[var(--color-foreground)]"
                style={{ borderColor: PALETTE[i % 4] }}
              >
                {i + 1}
              </span>
              <p className="text-xs font-semibold text-[var(--color-foreground)]">{s.label}</p>
              {s.sub ? <p className="mt-1 text-[11px] leading-4 text-[var(--color-muted-foreground)]">{s.sub}</p> : null}
            </div>
            {i < steps.length - 1 ? (
              <span aria-hidden className="py-1 text-center text-[var(--color-muted-foreground)] md:px-1 md:py-0">
                <span className="md:hidden">↓</span>
                <span className="hidden md:inline">→</span>
              </span>
            ) : null}
          </li>
        ))}
      </ol>
    </Fig>
  );
}

type Part = { label: string; value: number; text?: string };

/** 비율 분할 막대(합계 100% 기준으로 그려집니다). */
export function DiagramSplit({ title, parts, caption }: { title: string; parts: Part[]; caption?: string }) {
  const total = parts.reduce((a, p) => a + p.value, 0) || 1;
  return (
    <Fig title={title} caption={caption}>
      <div className="flex h-8 w-full overflow-hidden rounded-lg">
        {parts.map((p, i) => (
          <div
            key={p.label}
            style={{ width: `${(p.value / total) * 100}%`, background: PALETTE[i % PALETTE.length] }}
            title={`${p.label} ${p.text ?? p.value}`}
          />
        ))}
      </div>
      <ul className="mt-3 grid gap-2 sm:grid-cols-2">
        {parts.map((p, i) => (
          <li key={p.label} className="flex items-center gap-2 text-xs text-[var(--color-foreground)]">
            <span aria-hidden className="inline-block h-3 w-3 shrink-0 rounded-sm" style={{ background: PALETTE[i % PALETTE.length] }} />
            <span>{p.label}</span>
            <span className="ml-auto tabular-nums font-semibold">{p.text ?? p.value}</span>
          </li>
        ))}
      </ul>
    </Fig>
  );
}

type TimePoint = { when: string; label: string; sub?: string };

/** 세로 타임라인. */
export function DiagramTimeline({ title, points, caption }: { title: string; points: TimePoint[]; caption?: string }) {
  return (
    <Fig title={title} caption={caption}>
      <ol className="relative ml-2 border-l-2 border-[var(--color-border)] pl-5">
        {points.map((p, i) => (
          <li key={p.when + p.label} className="relative pb-4 last:pb-0">
            <span aria-hidden className="absolute -left-[27px] top-1 h-3 w-3 rounded-full" style={{ background: PALETTE[i % 4] }} />
            <p className="text-[11px] font-semibold tabular-nums text-[var(--color-muted-foreground)]">{p.when}</p>
            <p className="text-xs font-semibold text-[var(--color-foreground)]">{p.label}</p>
            {p.sub ? <p className="text-[11px] leading-4 text-[var(--color-muted-foreground)]">{p.sub}</p> : null}
          </li>
        ))}
      </ol>
    </Fig>
  );
}

type Side = { head: string; items: string[] };

/** 두 가지를 나란히 놓고 비교(장단점·전후 비교). */
export function DiagramCompare({ title, left, right, caption }: { title: string; left: Side; right: Side; caption?: string }) {
  return (
    <Fig title={title} caption={caption}>
      <div className="grid gap-3 sm:grid-cols-2">
        {[left, right].map((side, i) => (
          <div key={side.head} className="rounded-lg border border-[var(--color-border)] p-3">
            <p className="mb-2 border-b-2 pb-1 text-xs font-bold text-[var(--color-foreground)]" style={{ borderColor: PALETTE[i] }}>
              {side.head}
            </p>
            <ul className="flex flex-col gap-1.5">
              {side.items.map((t) => (
                <li key={t} className="text-[11px] leading-4 text-[var(--color-foreground)]">
                  · {t}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </Fig>
  );
}

type Stair = { label: string; sub?: string };

/** 오르막 계단(단계가 올라갈수록 높아지는 등급·단계 표현). */
export function DiagramStairs({ title, steps, caption }: { title: string; steps: Stair[]; caption?: string }) {
  const n = steps.length;
  return (
    <Fig title={title} caption={caption}>
      <ol className="flex items-end gap-1.5">
        {steps.map((s, i) => (
          <li key={s.label} className="flex-1">
            <div
              className="flex flex-col justify-end rounded-t-md p-1.5 text-center"
              style={{
                height: `${56 + (i * 96) / Math.max(n - 1, 1)}px`,
                background: `color-mix(in srgb, var(--color-primary) ${30 + (i * 60) / Math.max(n - 1, 1)}%, transparent)`,
              }}
            >
              <p className="text-[11px] font-bold leading-4 text-[var(--color-foreground)]">{s.label}</p>
              {s.sub ? <p className="text-[10px] leading-3 text-[var(--color-foreground)]">{s.sub}</p> : null}
            </div>
          </li>
        ))}
      </ol>
    </Fig>
  );
}

type Band = { label: string; range: string; note?: string };

/** 눈금(안전 → 위험 구간). 구간 폭은 같고, 색은 낮음→높음 순으로 달라집니다. */
export function DiagramScale({ title, bands, caption }: { title: string; bands: Band[]; caption?: string }) {
  return (
    <Fig title={title} caption={caption}>
      <div className="flex h-3 w-full overflow-hidden rounded-full">
        {bands.map((b, i) => (
          <div
            key={b.label}
            className="flex-1"
            style={{ background: SCALE[Math.round((i * (SCALE.length - 1)) / Math.max(bands.length - 1, 1))] }}
          />
        ))}
      </div>
      <ul className="mt-3 grid gap-3 sm:grid-flow-col sm:auto-cols-fr">
        {bands.map((b) => (
          <li key={b.label} className="text-xs">
            <p className="font-semibold text-[var(--color-foreground)]">{b.label}</p>
            <p className="tabular-nums text-[var(--color-muted-foreground)]">{b.range}</p>
            {b.note ? <p className="mt-1 text-[11px] leading-4 text-[var(--color-muted-foreground)]">{b.note}</p> : null}
          </li>
        ))}
      </ul>
    </Fig>
  );
}

export const guideDiagrams = {
  DiagramBars,
  DiagramFlow,
  DiagramSplit,
  DiagramTimeline,
  DiagramCompare,
  DiagramStairs,
  DiagramScale,
};
