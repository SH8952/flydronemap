"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Chip, Field, Notice, SegmentedControl, Stat } from "@/components/tools/tool-ui";
import { parseShutter } from "@/lib/drone-tools/parse";
import {
  ND_FILTERS,
  formatShutter,
  recommendNd,
  shutterFromFps,
  shutterWithStops,
  transmissionPercent,
  type NdSuggestion,
} from "@/lib/drone-tools/nd-filter";

const BASE_PRESETS = ["1/8000", "1/4000", "1/2000", "1/1000", "1/500", "1/250", "1/125", "1/60"];
const TARGET_PRESETS = ["1/30", "1/15", "1/4", "1", "2", "5", "15", "30"];
const FPS_OPTIONS = [24, 25, 30, 50, 60, 120];
const ANGLE_OPTIONS = [90, 180, 270];

type Mode = "video" | "photo";

export function NdFilterCalculator() {
  const t = useTranslations("Tools.ndFilter");
  const locale = useLocale();
  const nf = useMemo(() => new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }), [locale]);

  const [mode, setMode] = useState<Mode>("video");
  const [base, setBase] = useState("1/1000");
  const [fps, setFps] = useState(30);
  const [angle, setAngle] = useState(180);
  const [target, setTarget] = useState("2");

  const baseSec = parseShutter(base);
  const targetSec = mode === "video" ? shutterFromFps(fps, angle) : parseShutter(target);
  const valid = baseSec > 0 && targetSec > 0;
  const rec = useMemo(() => (valid ? recommendNd(baseSec, targetSec) : null), [valid, baseSec, targetSec]);

  const offsetText = (s: NdSuggestion) => {
    const abs = Math.abs(s.offsetStops);
    if (abs < 0.15) return t("offsetExact");
    return s.offsetStops > 0
      ? t("offsetSlower", { value: nf.format(abs) })
      : t("offsetFaster", { value: nf.format(abs) });
  };

  const suggestionRow = (label: string, s: NdSuggestion) => (
    <div className="flex flex-col gap-0.5 rounded-lg border border-border p-3 text-sm">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="font-semibold">
        {s.filter.name} <span className="font-normal text-muted-foreground">({s.filter.stops} {t("colStops")})</span>
      </span>
      <span className="text-muted-foreground">
        {t("resultShutter")} {formatShutter(s.resultSeconds)} · {offsetText(s)}
      </span>
    </div>
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-5 rounded-lg border border-border p-5">
        <Field label={t("modeLabel")}>
          <SegmentedControl<Mode>
            ariaLabel={t("modeLabel")}
            value={mode}
            onChange={setMode}
            options={[
              { value: "video", label: t("modeVideo") },
              { value: "photo", label: t("modePhoto") },
            ]}
          />
        </Field>

        <Field label={t("baseShutterLabel")} htmlFor="nd-base" help={t("baseShutterHelp")}>
          <Input
            id="nd-base"
            inputMode="text"
            autoComplete="off"
            value={base}
            onChange={(e) => setBase(e.target.value)}
            aria-invalid={!(baseSec > 0)}
            className="max-w-xs"
          />
          <div className="flex flex-wrap gap-1.5">
            {BASE_PRESETS.map((p) => (
              <Chip key={p} active={base === p} onClick={() => setBase(p)}>
                {p}
              </Chip>
            ))}
          </div>
        </Field>

        {mode === "video" ? (
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label={t("fpsLabel")}>
              <div className="flex flex-wrap gap-1.5">
                {FPS_OPTIONS.map((f) => (
                  <Chip key={f} active={fps === f} onClick={() => setFps(f)}>
                    {f}
                  </Chip>
                ))}
              </div>
            </Field>
            <Field label={t("angleLabel")} help={t("angleHelp")}>
              <div className="flex flex-wrap gap-1.5">
                {ANGLE_OPTIONS.map((a) => (
                  <Chip key={a} active={angle === a} onClick={() => setAngle(a)}>
                    {a}°
                  </Chip>
                ))}
              </div>
            </Field>
          </div>
        ) : (
          <Field label={t("targetLabel")} htmlFor="nd-target" help={t("targetHelp")}>
            <Input
              id="nd-target"
              inputMode="text"
              autoComplete="off"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              aria-invalid={!(targetSec > 0)}
              className="max-w-xs"
            />
            <div className="flex flex-wrap gap-1.5">
              {TARGET_PRESETS.map((p) => (
                <Chip key={p} active={target === p} onClick={() => setTarget(p)}>
                  {formatShutter(parseShutter(p))}
                </Chip>
              ))}
            </div>
          </Field>
        )}
      </div>

      <section aria-live="polite" className="flex flex-col gap-4 rounded-lg border border-border p-5">
        <h2 className="text-lg font-semibold tracking-tight">{t("resultTitle")}</h2>
        {!rec ? (
          <Notice tone="warn">{t("invalid")}</Notice>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-3">
              <Stat label={t("targetShutter")} value={formatShutter(targetSec)} />
              <Stat
                label={t("stopsNeeded")}
                value={t("stopsValue", { value: nf.format(rec.stops) })}
              />
              <Stat
                label={t("recommended")}
                value={rec.needsFilter && rec.best ? rec.best.filter.name : "–"}
                sub={
                  rec.needsFilter && rec.best
                    ? `${t("resultShutter")} ${formatShutter(rec.best.resultSeconds)}`
                    : undefined
                }
              />
            </div>

            {!rec.needsFilter ? <Notice>{t("noFilter")}</Notice> : null}
            {rec.needsFilter && rec.best ? (
              <p className="text-sm text-muted-foreground">{offsetText(rec.best)}</p>
            ) : null}
            {rec.exceedsRange ? <Notice tone="warn">{t("exceeds")}</Notice> : null}

            {rec.needsFilter && (rec.lighter || rec.stronger) ? (
              <div className="flex flex-col gap-2">
                <h3 className="text-sm font-semibold">{t("alternativesTitle")}</h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  {rec.lighter ? suggestionRow(t("lighter"), rec.lighter) : null}
                  {rec.stronger ? suggestionRow(t("stronger"), rec.stronger) : null}
                </div>
              </div>
            ) : null}
          </>
        )}
      </section>

      {valid ? (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold tracking-tight">{t("tableTitle")}</h2>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full min-w-[420px] text-sm">
              <caption className="p-3 text-left text-xs text-muted-foreground">
                {t("tableCaption", { shutter: formatShutter(baseSec) })}
              </caption>
              <thead>
                <tr className="border-y border-border bg-muted/40 text-left">
                  <th scope="col" className="px-3 py-2 font-medium">{t("colFilter")}</th>
                  <th scope="col" className="px-3 py-2 font-medium">{t("colStops")}</th>
                  <th scope="col" className="px-3 py-2 font-medium">{t("colLight")}</th>
                  <th scope="col" className="px-3 py-2 font-medium">{t("colShutter")}</th>
                </tr>
              </thead>
              <tbody>
                {ND_FILTERS.map((f) => {
                  const isBest = rec?.best?.filter.name === f.name;
                  return (
                    <tr key={f.name} className={isBest ? "bg-primary/10" : undefined}>
                      <th scope="row" className="px-3 py-2 text-left font-medium">{f.name}</th>
                      <td className="px-3 py-2">{f.stops}</td>
                      <td className="px-3 py-2">{nf.format(transmissionPercent(f.stops))}%</td>
                      <td className="px-3 py-2">{formatShutter(shutterWithStops(baseSec, f.stops))}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </div>
  );
}
