"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Chip, Field, Notice, SegmentedControl, Stat } from "@/components/tools/tool-ui";
import { parseNumber } from "@/lib/drone-tools/parse";
import {
  FEET_PER_METER,
  INCHES_PER_CM,
  SENSOR_PRESETS,
  altitudeForGsd,
  footprint,
  gsdCmPerPx,
  spacing,
} from "@/lib/drone-tools/gsd";

type Mode = "gsd" | "altitude";
type Units = "metric" | "imperial";

export function GsdCalculator() {
  const t = useTranslations("Tools.gsd");
  const locale = useLocale();
  const nf1 = useMemo(() => new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }), [locale]);
  const nf2 = useMemo(() => new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }), [locale]);
  const nf0 = useMemo(() => new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }), [locale]);

  const [mode, setMode] = useState<Mode>("gsd");
  const [units, setUnits] = useState<Units>("metric");
  const [altitude, setAltitude] = useState("100");
  const [targetGsd, setTargetGsd] = useState("2");
  const [preset, setPreset] = useState<string>("1");
  const [sensorW, setSensorW] = useState("13.2");
  const [sensorH, setSensorH] = useState("8.8");
  const [focal, setFocal] = useState("10.3");
  const [imgW, setImgW] = useState("5472");
  const [imgH, setImgH] = useState("3648");
  const [front, setFront] = useState("80");
  const [side, setSide] = useState("70");
  const [speed, setSpeed] = useState("");

  const imperial = units === "imperial";
  const mFromInput = (v: number) => (imperial ? v / FEET_PER_METER : v);
  const lenOut = (m: number) => (imperial ? m * FEET_PER_METER : m);
  const lenUnit = imperial ? "ft" : "m";

  function choosePreset(id: string) {
    setPreset(id);
    const p = SENSOR_PRESETS.find((s) => s.id === id);
    if (p) {
      setSensorW(String(p.widthMm));
      setSensorH(String(p.heightMm));
    }
  }

  const calc = useMemo(() => {
    const sw = parseNumber(sensorW);
    const f = parseNumber(focal);
    const w = parseNumber(imgW);
    const h = parseNumber(imgH);
    if (![sw, f, w, h].every((n) => Number.isFinite(n) && n > 0)) return null;
    const base = { sensorWidthMm: sw, focalMm: f, imageWidthPx: w };

    let altitudeM: number;
    let gsdCm: number;
    if (mode === "gsd") {
      const a = parseNumber(altitude);
      if (!(a > 0) || !Number.isFinite(a)) return null;
      altitudeM = mFromInput(a);
      gsdCm = gsdCmPerPx({ altitudeM, ...base });
    } else {
      const g = parseNumber(targetGsd);
      if (!(g > 0) || !Number.isFinite(g)) return null;
      gsdCm = imperial ? g / INCHES_PER_CM : g;
      altitudeM = altitudeForGsd(gsdCm, base);
    }

    const fp = footprint(gsdCm, w, h);
    const fr = parseNumber(front);
    const sd = parseNumber(side);
    const sp = parseNumber(speed);
    const overlapOk = Number.isFinite(fr) && Number.isFinite(sd) && fr >= 0 && fr < 100 && sd >= 0 && sd < 100;
    const spc = overlapOk ? spacing(fp, fr, sd, Number.isFinite(sp) && sp > 0 ? sp : undefined) : null;
    return { altitudeM, gsdCm, fp, spc };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, units, altitude, targetGsd, sensorW, focal, imgW, imgH, front, side, speed]);

  const field = (id: string, value: string, set: (v: string) => void, label: string, help?: string) => (
    <Field label={label} htmlFor={id} help={help}>
      <Input id={id} inputMode="decimal" autoComplete="off" value={value} onChange={(e) => set(e.target.value)} />
    </Field>
  );

  const gsdText = (cm: number) =>
    imperial ? t("gsdValueIn", { value: nf2.format(cm * INCHES_PER_CM) }) : t("gsdValueCm", { value: nf2.format(cm) });
  const lenText = (m: number) => t("lengthValue", { value: nf1.format(lenOut(m)), unit: lenUnit });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-5 rounded-lg border border-border p-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label={t("modeLabel")}>
            <SegmentedControl<Mode>
              ariaLabel={t("modeLabel")}
              value={mode}
              onChange={setMode}
              options={[
                { value: "gsd", label: t("modeGsd") },
                { value: "altitude", label: t("modeAltitude") },
              ]}
            />
          </Field>
          <Field label={t("unitLabel")}>
            <SegmentedControl<Units>
              ariaLabel={t("unitLabel")}
              value={units}
              onChange={setUnits}
              options={[
                { value: "metric", label: t("unitMetric") },
                { value: "imperial", label: t("unitImperial") },
              ]}
            />
          </Field>
        </div>

        {mode === "gsd"
          ? field("gsd-alt", altitude, setAltitude, t(imperial ? "altitudeLabelFt" : "altitudeLabelM"), t("altitudeHelp"))
          : field("gsd-target", targetGsd, setTargetGsd, t(imperial ? "targetLabelIn" : "targetLabelCm"))}
      </div>

      <div className="flex flex-col gap-5 rounded-lg border border-border p-5">
        <h2 className="text-base font-semibold">{t("cameraTitle")}</h2>
        <Field label={t("presetLabel")}>
          <div className="flex flex-wrap gap-1.5">
            {SENSOR_PRESETS.map((p) => (
              <Chip key={p.id} active={preset === p.id} onClick={() => choosePreset(p.id)}>
                {t(`preset_${p.id.replace(/[/.\-]/g, "_")}`)}
              </Chip>
            ))}
            <Chip active={preset === "custom"} onClick={() => setPreset("custom")}>
              {t("presetCustom")}
            </Chip>
          </div>
        </Field>
        <div className="grid gap-5 sm:grid-cols-2">
          {field("gsd-sw", sensorW, (v) => { setPreset("custom"); setSensorW(v); }, t("sensorWidthLabel"))}
          {field("gsd-sh", sensorH, (v) => { setPreset("custom"); setSensorH(v); }, t("sensorHeightLabel"))}
          {field("gsd-focal", focal, setFocal, t("focalLabel"), t("focalHelp"))}
          <div />
          {field("gsd-iw", imgW, setImgW, t("imageWidthLabel"))}
          {field("gsd-ih", imgH, setImgH, t("imageHeightLabel"))}
        </div>
      </div>

      <div className="flex flex-col gap-5 rounded-lg border border-border p-5">
        <h2 className="text-base font-semibold">{t("overlapTitle")}</h2>
        <div className="grid gap-5 sm:grid-cols-3">
          {field("gsd-front", front, setFront, t("frontLabel"))}
          {field("gsd-side", side, setSide, t("sideLabel"))}
          {field("gsd-speed", speed, setSpeed, t("speedLabel"), t("speedHelp"))}
        </div>
      </div>

      <section aria-live="polite" className="flex flex-col gap-4 rounded-lg border border-border p-5">
        <h2 className="text-lg font-semibold tracking-tight">{t("resultTitle")}</h2>
        {!calc ? (
          <Notice tone="warn">{t("invalid")}</Notice>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <Stat label={t("resultGsd")} value={gsdText(calc.gsdCm)} />
              <Stat
                label={t("resultAltitude")}
                value={t("lengthValue", { value: nf0.format(lenOut(calc.altitudeM)), unit: lenUnit })}
              />
              <Stat label={t("footprintWidth")} value={lenText(calc.fp.widthM)} />
              <Stat label={t("footprintHeight")} value={lenText(calc.fp.heightM)} />
            </div>
            {calc.altitudeM > 120 ? <Notice tone="warn">{t("warnAltitude")}</Notice> : null}
            {calc.spc ? (
              <div className="grid gap-3 sm:grid-cols-3">
                <Stat label={t("photoDistance")} value={lenText(calc.spc.photoDistanceM)} />
                <Stat label={t("lineSpacing")} value={lenText(calc.spc.lineSpacingM)} />
                {calc.spc.intervalSeconds !== null ? (
                  <Stat label={t("interval")} value={t("secondsValue", { value: nf1.format(calc.spc.intervalSeconds) })} />
                ) : null}
              </div>
            ) : (
              <Notice tone="warn">{t("invalidOverlap")}</Notice>
            )}
            <p className="text-xs text-muted-foreground">{t("orientationNote")}</p>
          </>
        )}
      </section>
    </div>
  );
}
