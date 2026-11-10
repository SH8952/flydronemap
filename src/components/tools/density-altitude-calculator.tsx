"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Field, Notice, SegmentedControl, Stat } from "@/components/tools/tool-ui";
import { parseNumber } from "@/lib/drone-tools/parse";
import { FT_PER_M, HPA_PER_INHG, densityAltitude, fToC } from "@/lib/drone-tools/density-altitude";

type Units = "metric" | "imperial";

export function DensityAltitudeCalculator() {
  const t = useTranslations("Tools.densityAltitude");
  const locale = useLocale();
  const nf0 = useMemo(() => new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }), [locale]);
  const nf1 = useMemo(() => new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }), [locale]);

  const [units, setUnits] = useState<Units>("metric");
  const [elevation, setElevation] = useState("0");
  const [temp, setTemp] = useState("30");
  const [qnh, setQnh] = useState("1013");
  const imperial = units === "imperial";

  function changeUnits(next: Units) {
    // 입력값을 새 단위로 환산해 같은 조건을 유지한다.
    const e = parseNumber(elevation);
    const tm = parseNumber(temp);
    const q = parseNumber(qnh);
    if (next === "imperial") {
      if (Number.isFinite(e)) setElevation(String(Math.round(e * FT_PER_M)));
      if (Number.isFinite(tm)) setTemp(String(Math.round(((tm * 9) / 5 + 32) * 10) / 10));
      if (Number.isFinite(q)) setQnh(String(Math.round((q / HPA_PER_INHG) * 100) / 100));
    } else {
      if (Number.isFinite(e)) setElevation(String(Math.round(e / FT_PER_M)));
      if (Number.isFinite(tm)) setTemp(String(Math.round(fToC(tm) * 10) / 10));
      if (Number.isFinite(q)) setQnh(String(Math.round(q * HPA_PER_INHG)));
    }
    setUnits(next);
  }

  const calc = useMemo(() => {
    const e = parseNumber(elevation);
    const tm = parseNumber(temp);
    const q = parseNumber(qnh);
    if (![e, tm, q].every(Number.isFinite)) return null;
    const elevFt = imperial ? e : e * FT_PER_M;
    const tempC = imperial ? fToC(tm) : tm;
    const qHpa = imperial ? q * HPA_PER_INHG : q;
    if (qHpa < 850 || qHpa > 1090 || tempC < -60 || tempC > 60 || elevFt < -1500 || elevFt > 30000) return null;
    const r = densityAltitude(elevFt, tempC, qHpa);
    return { elevFt, tempC, r, delta: r.densityAltitudeFt - elevFt };
  }, [elevation, temp, qnh, imperial]);

  const alt = (ft: number) =>
    imperial
      ? t("altFtValue", { value: nf0.format(ft) })
      : t("altMValue", { value: nf0.format(ft / FT_PER_M), ft: nf0.format(ft) });

  const level = !calc ? null : calc.delta < 1000 ? "Small" : calc.delta < 3000 ? "Noticeable" : "Large";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-5 rounded-lg border border-border p-5">
        <Field label={t("unitLabel")}>
          <SegmentedControl<Units>
            ariaLabel={t("unitLabel")}
            value={units}
            onChange={changeUnits}
            options={[
              { value: "metric", label: t("unitMetric") },
              { value: "imperial", label: t("unitImperial") },
            ]}
          />
        </Field>
        <div className="grid gap-5 sm:grid-cols-3">
          <Field label={t(imperial ? "elevationLabelFt" : "elevationLabelM")} htmlFor="da-elev" help={t("elevationHelp")}>
            <Input id="da-elev" inputMode="decimal" autoComplete="off" value={elevation} onChange={(e) => setElevation(e.target.value)} />
          </Field>
          <Field label={t(imperial ? "tempLabelF" : "tempLabelC")} htmlFor="da-temp">
            <Input id="da-temp" inputMode="decimal" autoComplete="off" value={temp} onChange={(e) => setTemp(e.target.value)} />
          </Field>
          <Field label={t(imperial ? "qnhLabelInHg" : "qnhLabelHpa")} htmlFor="da-qnh" help={t("qnhHelp")}>
            <Input id="da-qnh" inputMode="decimal" autoComplete="off" value={qnh} onChange={(e) => setQnh(e.target.value)} />
          </Field>
        </div>
      </div>

      <section aria-live="polite" className="flex flex-col gap-4 rounded-lg border border-border p-5">
        <h2 className="text-lg font-semibold tracking-tight">{t("resultTitle")}</h2>
        {!calc ? (
          <Notice tone="warn">{t("invalid")}</Notice>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <Stat label={t("densityAltitude")} value={alt(calc.r.densityAltitudeFt)} sub={t("densityAltitudeSub", { value: alt(calc.delta) })} />
              <Stat label={t("pressureAltitude")} value={alt(calc.r.pressureAltitudeFt)} />
              <Stat label={t("densityRatio")} value={t("percentValue", { value: nf0.format(calc.r.densityRatio * 100) })} sub={t("densityRatioSub")} />
              <Stat
                label={t("hoverPower")}
                value={t("signedPercentValue", { value: (calc.r.hoverPowerFactor >= 1 ? "+" : "−") + nf0.format(Math.abs(calc.r.hoverPowerFactor - 1) * 100) })}
                sub={t("hoverPowerSub")}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              {t("isaLine", {
                isa: nf1.format(imperial ? (calc.r.isaTempC * 9) / 5 + 32 : calc.r.isaTempC),
                dev: (calc.r.isaDeviationC >= 0 ? "+" : "−") + nf1.format(Math.abs(imperial ? (calc.r.isaDeviationC * 9) / 5 : calc.r.isaDeviationC)),
                unit: imperial ? "°F" : "°C",
              })}
            </p>
            {level ? <Notice tone={level === "Small" ? "info" : "warn"}>{t(`level${level}`)}</Notice> : null}
          </>
        )}
      </section>
    </div>
  );
}
