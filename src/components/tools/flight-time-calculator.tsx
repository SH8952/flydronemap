"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Chip, Field, Notice, SegmentedControl, Stat } from "@/components/tools/tool-ui";
import { parseNumber } from "@/lib/drone-tools/parse";
import {
  TEMP_POINTS,
  WIND_POINTS,
  estimateFlight,
  hoverMinutesFromSpec,
  type FlightStyle,
} from "@/lib/drone-tools/flight-time";

type BaseMode = "rated" | "spec";

export function FlightTimeCalculator() {
  const t = useTranslations("Tools.flightTime");
  const locale = useLocale();
  const nf0 = useMemo(() => new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }), [locale]);
  const nf1 = useMemo(() => new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }), [locale]);
  const nf2 = useMemo(() => new Intl.NumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 }), [locale]);

  const [baseMode, setBaseMode] = useState<BaseMode>("rated");
  const [rated, setRated] = useState("30");
  const [capacity, setCapacity] = useState("5000");
  const [volts, setVolts] = useState("15.4");
  const [weight, setWeight] = useState("900");
  const [power, setPower] = useState("130");
  const [wind, setWind] = useState("3");
  const [temp, setTemp] = useState("20");
  const [style, setStyle] = useState<FlightStyle>("normal");
  const [health, setHealth] = useState("100");
  const [reserve, setReserve] = useState("25");
  const [speed, setSpeed] = useState("");

  const calc = useMemo(() => {
    const windMps = parseNumber(wind);
    const tempC = parseNumber(temp);
    const healthPct = parseNumber(health);
    const reservePct = parseNumber(reserve);
    if (![windMps, tempC, healthPct, reservePct].every(Number.isFinite)) return null;
    if (windMps < 0 || healthPct <= 0 || reservePct < 0 || reservePct >= 100) return null;

    let baseMinutes: number;
    if (baseMode === "rated") {
      baseMinutes = parseNumber(rated);
    } else {
      baseMinutes = hoverMinutesFromSpec({
        capacityMah: parseNumber(capacity),
        volts: parseNumber(volts),
        weightGrams: parseNumber(weight),
        wattsPerKg: parseNumber(power),
      });
    }
    if (!(baseMinutes > 0) || !Number.isFinite(baseMinutes)) return null;

    const speedKmh = parseNumber(speed);
    const est = estimateFlight({
      baseMinutes,
      windMps,
      tempC,
      style,
      healthPercent: healthPct,
      reservePercent: reservePct,
      cruiseKmh: speedKmh > 0 ? speedKmh : undefined,
    });
    return { baseMinutes, windMps, tempC, est };
  }, [baseMode, rated, capacity, volts, weight, power, wind, temp, style, health, reserve, speed]);

  const minutes = (v: number) => t("minutesValue", { value: nf0.format(v) });
  const textInput = (
    id: string,
    value: string,
    set: (v: string) => void,
    label: string,
    help?: string,
    placeholder?: string,
  ) => (
    <Field label={label} htmlFor={id} help={help}>
      <Input
        id={id}
        inputMode="decimal"
        autoComplete="off"
        value={value}
        placeholder={placeholder}
        onChange={(e) => set(e.target.value)}
      />
    </Field>
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-5 rounded-lg border border-border p-5">
        <Field label={t("baseModeLabel")}>
          <SegmentedControl<BaseMode>
            ariaLabel={t("baseModeLabel")}
            value={baseMode}
            onChange={setBaseMode}
            options={[
              { value: "rated", label: t("baseRated") },
              { value: "spec", label: t("baseSpec") },
            ]}
          />
        </Field>

        {baseMode === "rated" ? (
          <div className="max-w-xs">{textInput("ft-rated", rated, setRated, t("ratedLabel"), t("ratedHelp"))}</div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2">
            {textInput("ft-cap", capacity, setCapacity, t("capacityLabel"))}
            {textInput("ft-volts", volts, setVolts, t("voltsLabel"), t("voltsHelp"))}
            {textInput("ft-weight", weight, setWeight, t("weightLabel"), t("weightHelp"))}
            {textInput("ft-power", power, setPower, t("powerLabel"), t("powerHelp"))}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-5 rounded-lg border border-border p-5">
        <h2 className="text-base font-semibold">{t("conditionsTitle")}</h2>
        <div className="grid gap-5 sm:grid-cols-2">
          {textInput("ft-wind", wind, setWind, t("windLabel"), t("windHelp"))}
          {textInput("ft-temp", temp, setTemp, t("tempLabel"))}
          {textInput("ft-health", health, setHealth, t("healthLabel"), t("healthHelp"))}
          {textInput("ft-reserve", reserve, setReserve, t("reserveLabel"), t("reserveHelp"))}
        </div>
        <Field label={t("styleLabel")}>
          <div className="flex flex-wrap gap-1.5">
            {(["smooth", "normal", "sporty"] as FlightStyle[]).map((s) => (
              <Chip key={s} active={style === s} onClick={() => setStyle(s)}>
                {t(`style${s === "smooth" ? "Smooth" : s === "normal" ? "Normal" : "Sporty"}`)}
              </Chip>
            ))}
          </div>
        </Field>
        <div className="max-w-xs">
          {textInput("ft-speed", speed, setSpeed, t("speedLabel"), t("speedHelp"), "30")}
        </div>
      </div>

      <section aria-live="polite" className="flex flex-col gap-4 rounded-lg border border-border p-5">
        <h2 className="text-lg font-semibold tracking-tight">{t("resultTitle")}</h2>
        {!calc ? (
          <Notice tone="warn">{t("invalid")}</Notice>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <Stat label={t("totalTime")} value={minutes(calc.est.totalMinutes)} />
              <Stat label={t("usableTime")} value={minutes(calc.est.usableMinutes)} />
              <Stat
                label={t("turnaround")}
                value={minutes(calc.est.turnaroundMinutes)}
                sub={t("turnaroundHelp")}
              />
              {calc.est.outAndBackRadiusKm !== null ? (
                <Stat
                  label={t("radius")}
                  value={t("kmValue", { value: nf1.format(calc.est.outAndBackRadiusKm) })}
                />
              ) : null}
            </div>

            {calc.windMps >= 10 ? <Notice tone="warn">{t("warnWind")}</Notice> : null}
            {calc.tempC < 5 ? <Notice tone="warn">{t("warnCold")}</Notice> : null}
            {calc.tempC > 35 ? <Notice tone="warn">{t("warnHot")}</Notice> : null}

            <div className="flex flex-col gap-2">
              <h3 className="text-sm font-semibold">{t("factorsTitle")}</h3>
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full min-w-[320px] text-sm">
                  <tbody>
                    <tr className="border-b border-border">
                      <th scope="row" className="px-3 py-2 text-left font-medium">{t("factorBase")}</th>
                      <td className="px-3 py-2 text-right">{minutes(calc.baseMinutes)}</td>
                    </tr>
                    {(
                      [
                        ["factorStyle", calc.est.factors.style],
                        ["factorWind", calc.est.factors.wind],
                        ["factorTemp", calc.est.factors.temp],
                        ["factorHealth", calc.est.factors.health],
                      ] as const
                    ).map(([key, f]) => (
                      <tr key={key} className="border-b border-border">
                        <th scope="row" className="px-3 py-2 text-left font-medium">{t(key)}</th>
                        <td className="px-3 py-2 text-right">× {nf2.format(f)}</td>
                      </tr>
                    ))}
                    <tr className="bg-muted/40">
                      <th scope="row" className="px-3 py-2 text-left font-semibold">{t("factorTotal")}</th>
                      <td className="px-3 py-2 text-right font-semibold">{minutes(calc.est.totalMinutes)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </section>

      <details className="rounded-lg border border-border p-4">
        <summary className="cursor-pointer text-sm font-medium">{t("tableTitle")}</summary>
        <p className="mt-3 text-xs text-muted-foreground">{t("tableNote")}</p>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <div>
            <h3 className="mb-1 text-xs font-semibold">{t("tableWind")}</h3>
            <ul className="text-sm text-muted-foreground">
              {WIND_POINTS.map(([x, y]) => (
                <li key={x}>
                  {x} → {nf2.format(y)}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="mb-1 text-xs font-semibold">{t("tableTemp")}</h3>
            <ul className="text-sm text-muted-foreground">
              {TEMP_POINTS.map(([x, y]) => (
                <li key={x}>
                  {x} → {nf2.format(y)}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </details>
    </div>
  );
}
