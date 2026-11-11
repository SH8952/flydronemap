"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useSharePublish } from "@/lib/use-share-publish";
import { parseNumberText, parseStringChoice, readSharedParams } from "@/lib/shared-params";
import { Input } from "@/components/ui/input";
import { Field, Notice, SegmentedControl, Stat } from "@/components/tools/tool-ui";
import { parseNumber } from "@/lib/drone-tools/parse";
import { FT_PER_M, KM_PER_MILE, STANDARD_K, horizonKm, maxLinkKm, requiredAltitudeM } from "@/lib/drone-tools/line-of-sight";

type Mode = "distance" | "altitude";
type Units = "metric" | "imperial";

export function LineOfSightCalculator() {
  const t = useTranslations("Tools.lineOfSight");
  const locale = useLocale();
  const nf1 = useMemo(() => new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }), [locale]);
  const nf0 = useMemo(() => new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }), [locale]);

  const [mode, setMode] = useState<Mode>("distance");
  const [units, setUnits] = useState<Units>("metric");
  const [altitude, setAltitude] = useState("120");
  const [pilot, setPilot] = useState("1.6");
  const [distance, setDistance] = useState("20");

  // 공유 링크로 들어온 경우 입력값을 채운다. 서버 렌더링 결과(기본값)와 첫 화면을 맞추기 위해
  // 마운트 직후 한 번만 읽고, 허용 범위·목록 밖의 값은 무시한다.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const q = readSharedParams();
    if (!q) return;
    const md = parseStringChoice(q.get("md"), ["distance", "altitude"] as const);
    const un = parseStringChoice(q.get("un"), ["metric", "imperial"] as const);
    const al = parseNumberText(q.get("al"), 0.1, 100000);
    const pl = parseNumberText(q.get("pl"), 0, 10000);
    const ds = parseNumberText(q.get("ds"), 0.1, 10000);
    if (md !== null) setMode(md);
    if (un !== null) setUnits(un);
    if (al !== null) setAltitude(al);
    if (pl !== null) setPilot(pl);
    if (ds !== null) setDistance(ds);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */
  const imperial = units === "imperial";

  const heightM = (v: number) => (imperial ? v / FT_PER_M : v);
  const distKm = (v: number) => (imperial ? v * KM_PER_MILE : v);
  const showDist = (km: number) =>
    t("distanceValue", { value: nf1.format(imperial ? km / KM_PER_MILE : km), unit: imperial ? "mi" : "km" });
  const showHeight = (m: number) =>
    t("heightValue", { value: nf0.format(imperial ? m * FT_PER_M : m), unit: imperial ? "ft" : "m" });

  const calc = useMemo(() => {
    const p = parseNumber(pilot);
    if (!(p >= 0) || !Number.isFinite(p)) return null;
    const pm = heightM(p);
    if (mode === "distance") {
      const a = parseNumber(altitude);
      if (!(a > 0) || !Number.isFinite(a)) return null;
      const am = heightM(a);
      return {
        kind: "distance" as const,
        geo: maxLinkKm(pm, am, 1),
        radio: maxLinkKm(pm, am, STANDARD_K),
        pilotOnly: horizonKm(pm, 1),
      };
    }
    const d = parseNumber(distance);
    if (!(d > 0) || !Number.isFinite(d)) return null;
    const km = distKm(d);
    return {
      kind: "altitude" as const,
      geoAlt: requiredAltitudeM(km, pm, 1),
      radioAlt: requiredAltitudeM(km, pm, STANDARD_K),
      pilotOnly: horizonKm(pm, 1),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, units, altitude, pilot, distance]);

  const lenUnit = imperial ? "ft" : "m";
  const distUnit = imperial ? "mi" : "km";

  // 페이지 상단 공유 버튼이 쓸 현재 입력값(링크)과 결과 요약(문구)을 올린다.
  const shareQuery = new URLSearchParams({
    md: mode,
    un: units,
    al: altitude,
    pl: pilot,
    ds: distance,
  }).toString();
  const shareText = !calc
    ? null
    : t("shareText", {
        kind: calc.kind,
        pilot: `${pilot} ${lenUnit}`,
        altitude: `${altitude} ${lenUnit}`,
        distance: `${distance} ${distUnit}`,
        geo: calc.kind === "distance" ? showDist(calc.geo) : showHeight(calc.geoAlt),
        radio: calc.kind === "distance" ? showDist(calc.radio) : showHeight(calc.radioAlt),
      });
  useSharePublish("/tools/line-of-sight-calculator", shareQuery, shareText);

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
                { value: "distance", label: t("modeDistance") },
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
        <div className="grid gap-5 sm:grid-cols-2">
          {mode === "distance" ? (
            <Field label={t("altitudeLabel", { unit: lenUnit })} htmlFor="los-alt" help={t("altitudeHelp")}>
              <Input id="los-alt" inputMode="decimal" autoComplete="off" value={altitude} onChange={(e) => setAltitude(e.target.value)} />
            </Field>
          ) : (
            <Field label={t("distanceLabel", { unit: distUnit })} htmlFor="los-dist">
              <Input id="los-dist" inputMode="decimal" autoComplete="off" value={distance} onChange={(e) => setDistance(e.target.value)} />
            </Field>
          )}
          <Field label={t("pilotLabel", { unit: lenUnit })} htmlFor="los-pilot" help={t("pilotHelp")}>
            <Input id="los-pilot" inputMode="decimal" autoComplete="off" value={pilot} onChange={(e) => setPilot(e.target.value)} />
          </Field>
        </div>
      </div>

      <section aria-live="polite" className="flex flex-col gap-4 rounded-lg border border-border p-5">
        <h2 className="text-lg font-semibold tracking-tight">{t("resultTitle")}</h2>
        {!calc ? (
          <Notice tone="warn">{t("invalid")}</Notice>
        ) : calc.kind === "distance" ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <Stat label={t("geoDistance")} value={showDist(calc.geo)} sub={t("geoDistanceSub")} />
            <Stat label={t("radioDistance")} value={showDist(calc.radio)} sub={t("radioDistanceSub")} />
            <Stat label={t("pilotHorizon")} value={showDist(calc.pilotOnly)} sub={t("pilotHorizonSub")} />
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            <Stat label={t("geoAltitude")} value={showHeight(calc.geoAlt)} sub={t("geoAltitudeSub")} />
            <Stat label={t("radioAltitude")} value={showHeight(calc.radioAlt)} sub={t("radioAltitudeSub")} />
            <Stat label={t("pilotHorizon")} value={showDist(calc.pilotOnly)} sub={t("pilotHorizonSub")} />
          </div>
        )}
        <Notice>{t("vlosNote")}</Notice>
      </section>
    </div>
  );
}
