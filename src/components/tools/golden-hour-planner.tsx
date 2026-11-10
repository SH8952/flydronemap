"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { LocateFixed, Search } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Field, Notice, Stat } from "@/components/tools/tool-ui";
import { parseNumber } from "@/lib/drone-tools/parse";
import {
  compassIndex,
  computeSunDay,
  isValidLatLon,
  type Segment,
} from "@/lib/drone-tools/sun-times";
import { cn } from "@/lib/utils";

type Place = { lat: number; lon: number; name: string };
type Zone = { key: string; id: string; fallback: boolean };
type GeoItem = {
  name: string;
  admin1?: string;
  country: string;
  latitude: number;
  longitude: number;
};

const SEGMENT_COLOR: Record<Segment["kind"], string> = {
  night: "bg-slate-700",
  blue: "bg-blue-500",
  golden: "bg-amber-400",
  day: "bg-sky-200",
};

function todayString(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function deviceZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

export function GoldenHourPlanner() {
  const t = useTranslations("Tools.goldenHour");
  const locale = useLocale();
  const compass = t.raw("compass") as string[];

  const [date, setDate] = useState(todayString);
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<GeoItem[] | null>(null);
  const [searchError, setSearchError] = useState(false);
  const [locating, setLocating] = useState(false);
  const [geoMessage, setGeoMessage] = useState<string | null>(null);
  const [place, setPlace] = useState<Place | null>(null);
  const [manualOpen, setManualOpen] = useState(false);
  const [latText, setLatText] = useState("");
  const [lonText, setLonText] = useState("");
  const [zoneState, setZoneState] = useState<Zone | null>(null);
  const searchId = useRef(0);

  // 위치가 바뀌면 그 위치의 시간대를 Open-Meteo에서 받아 온다. 실패하면 기기 시간대로 대체한다.
  useEffect(() => {
    if (!place) return;
    const key = `${place.lat},${place.lon}`;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 6000);
    (async () => {
      try {
        const url = new URL("https://api.open-meteo.com/v1/forecast");
        url.searchParams.set("latitude", String(place.lat));
        url.searchParams.set("longitude", String(place.lon));
        url.searchParams.set("timezone", "auto");
        url.searchParams.set("forecast_days", "1");
        url.searchParams.set("daily", "sunrise");
        const res = await fetch(url, { signal: ctrl.signal });
        if (!res.ok) throw new Error("tz");
        const json = (await res.json()) as { timezone?: string };
        if (!json.timezone) throw new Error("tz");
        // 알 수 없는 시간대 이름이면 Intl이 예외를 던지므로 미리 검증한다.
        new Intl.DateTimeFormat("en", { timeZone: json.timezone });
        setZoneState({ key, id: json.timezone, fallback: false });
      } catch {
        setZoneState({ key, id: deviceZone(), fallback: true });
      } finally {
        clearTimeout(timer);
      }
    })();
    return () => {
      ctrl.abort();
      clearTimeout(timer);
    };
  }, [place]);

  // 위치가 바뀐 직후에는 이전 위치의 시간대를 쓰지 않는다.
  const zone = place && zoneState && zoneState.key === `${place.lat},${place.lon}` ? zoneState : null;

  async function runSearch() {
    const q = query.trim();
    if (q.length < 2) return;
    const id = ++searchId.current;
    setSearching(true);
    setSearchError(false);
    try {
      const res = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`);
      if (!res.ok) throw new Error("geocode");
      const json = (await res.json()) as { results?: GeoItem[] };
      if (id !== searchId.current) return;
      setResults(json.results ?? []);
    } catch {
      if (id !== searchId.current) return;
      setResults(null);
      setSearchError(true);
    } finally {
      if (id === searchId.current) setSearching(false);
    }
  }

  function pickResult(item: GeoItem) {
    const label = [item.name, item.admin1, item.country].filter(Boolean).join(", ");
    setPlace({ lat: item.latitude, lon: item.longitude, name: label });
    setLatText(String(item.latitude));
    setLonText(String(item.longitude));
    setResults(null);
    setGeoMessage(null);
  }

  function useMyLocation() {
    setGeoMessage(null);
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGeoMessage(t("geoUnavailable"));
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = Math.round(pos.coords.latitude * 10000) / 10000;
        const lon = Math.round(pos.coords.longitude * 10000) / 10000;
        setPlace({ lat, lon, name: t("myPlace") });
        setLatText(String(lat));
        setLonText(String(lon));
        setResults(null);
        setLocating(false);
      },
      () => {
        setGeoMessage(t("geoDenied"));
        setLocating(false);
      },
      { timeout: 10000, maximumAge: 600000 },
    );
  }

  function onManual(nextLat: string, nextLon: string) {
    setLatText(nextLat);
    setLonText(nextLon);
    const lat = parseNumber(nextLat);
    const lon = parseNumber(nextLon);
    if (isValidLatLon(lat, lon)) setPlace({ lat, lon, name: t("customPlace") });
  }

  const manualInvalid =
    manualOpen && (latText !== "" || lonText !== "") && !isValidLatLon(parseNumber(latText), parseNumber(lonText));

  const dateParts = useMemo(() => {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
    return m ? { year: +m[1], month: +m[2], day: +m[3] } : null;
  }, [date]);

  const sun = useMemo(() => {
    if (!place || !zone || !dateParts) return null;
    return computeSunDay({ ...dateParts, lat: place.lat, lon: place.lon, timeZone: zone.id });
  }, [place, zone, dateParts]);

  const timeFmt = useMemo(
    () =>
      zone
        ? new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit", timeZone: zone.id })
        : null,
    [locale, zone],
  );
  const nf1 = useMemo(() => new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }), [locale]);
  const nf4 = useMemo(() => new Intl.NumberFormat(locale, { maximumFractionDigits: 4 }), [locale]);

  const fmt = (ms: number | null) => (ms === null || !timeFmt ? null : timeFmt.format(new Date(ms)));
  const range = (w: [number | null, number | null]) => {
    const a = fmt(w[0]);
    const b = fmt(w[1]);
    return a && b ? t("windowRange", { start: a, end: b }) : t("noWindow");
  };
  const azimuth = (deg: number | null) =>
    deg === null ? undefined : t("azimuthValue", { dir: compass[compassIndex(deg)], deg: nf1.format(deg) });
  const hourLabel = (min: number) => {
    const total = sun ? Math.round((sun.endUtc - sun.startUtc) / 60000) : 1440;
    return `${String(Math.round((min / total) * 24)).padStart(2, "0")}:00`;
  };

  const totalMin = sun ? Math.round((sun.endUtc - sun.startUtc) / 60000) : 1440;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-5 rounded-lg border border-border p-5">
        <Field label={t("searchLabel")} htmlFor="gh-search">
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              void runSearch();
            }}
          >
            <Input
              id="gh-search"
              type="search"
              autoComplete="off"
              value={query}
              placeholder={t("searchPlaceholder")}
              onChange={(e) => setQuery(e.target.value)}
            />
            <Button type="submit" disabled={searching || query.trim().length < 2}>
              <Search className="size-4" aria-hidden />
              {searching ? t("searching") : t("searchButton")}
            </Button>
          </form>
        </Field>

        {results && results.length === 0 ? <Notice>{t("noResults")}</Notice> : null}
        {searchError ? <Notice tone="warn">{t("searchError")}</Notice> : null}
        {results && results.length > 0 ? (
          <ul className="flex flex-col overflow-hidden rounded-lg border border-border">
            {results.map((r, i) => (
              <li key={`${r.latitude},${r.longitude},${i}`} className="border-b border-border last:border-b-0">
                <button
                  type="button"
                  onClick={() => pickResult(r)}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-muted/50"
                >
                  {[r.name, r.admin1, r.country].filter(Boolean).join(", ")}
                </button>
              </li>
            ))}
          </ul>
        ) : null}

        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={useMyLocation} disabled={locating}>
            <LocateFixed className="size-4" aria-hidden />
            {locating ? t("locating") : t("useMyLocation")}
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => setManualOpen((v) => !v)} aria-expanded={manualOpen}>
            {t("manualToggle")}
          </Button>
        </div>
        {geoMessage ? <Notice tone="warn">{geoMessage}</Notice> : null}

        {manualOpen ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t("latLabel")} htmlFor="gh-lat">
              <Input id="gh-lat" inputMode="decimal" autoComplete="off" value={latText} onChange={(e) => onManual(e.target.value, lonText)} />
            </Field>
            <Field label={t("lonLabel")} htmlFor="gh-lon">
              <Input id="gh-lon" inputMode="decimal" autoComplete="off" value={lonText} onChange={(e) => onManual(latText, e.target.value)} />
            </Field>
            {manualInvalid ? (
              <div className="sm:col-span-2">
                <Notice tone="warn">{t("invalidPlace")}</Notice>
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="flex flex-wrap items-end gap-3">
          <Field label={t("dateLabel")} htmlFor="gh-date" className="w-full sm:w-auto">
            <Input id="gh-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Button type="button" variant="outline" size="sm" onClick={() => setDate(todayString())}>
            {t("today")}
          </Button>
        </div>
        {!dateParts ? <Notice tone="warn">{t("invalidDate")}</Notice> : null}
        <p className="text-xs text-muted-foreground">{t("serverNote")}</p>
      </div>

      <section aria-live="polite" className="flex flex-col gap-4 rounded-lg border border-border p-5">
        <h2 className="text-lg font-semibold tracking-tight">{t("resultTitle")}</h2>
        {!place ? (
          <Notice>{t("noPlace")}</Notice>
        ) : !zone ? (
          <Notice>{t("locating")}</Notice>
        ) : !sun ? null : (
          <>
            <div className="flex flex-col gap-1 text-sm text-muted-foreground">
              <span>
                <strong className="font-medium text-foreground">{t("placeLabel")}:</strong> {place.name} ·{" "}
                {t("placeCoords", { lat: nf4.format(place.lat), lon: nf4.format(place.lon) })}
              </span>
              <span>{t("tzLabel", { tz: zone.id })}</span>
            </div>
            {zone.fallback ? <Notice tone="warn">{t("tzFallback", { tz: zone.id })}</Notice> : null}
            {sun.polar === "day" ? <Notice tone="warn">{t("polarDay")}</Notice> : null}
            {sun.polar === "night" ? <Notice tone="warn">{t("polarNight")}</Notice> : null}

            <div className="grid gap-3 sm:grid-cols-2">
              <Stat label={t("sunrise")} value={fmt(sun.sunrise) ?? t("noWindow")} sub={azimuth(sun.sunriseAzimuth)} />
              <Stat label={t("sunset")} value={fmt(sun.sunset) ?? t("noWindow")} sub={azimuth(sun.sunsetAzimuth)} />
              <Stat
                label={t("dayLength")}
                value={
                  sun.dayLengthMinutes === null
                    ? t("noWindow")
                    : t("dayLengthValue", {
                        h: Math.floor(sun.dayLengthMinutes / 60),
                        m: Math.round(sun.dayLengthMinutes % 60),
                      })
                }
              />
              <Stat
                label={t("solarNoon")}
                value={fmt(sun.solarNoon) ?? t("noWindow")}
                sub={`${t("maxElevation")} ${t("degreesValue", { value: nf1.format(sun.maxElevation) })}`}
              />
            </div>

            <div className="flex flex-col gap-2">
              <h3 className="text-sm font-semibold">{t("windowsTitle")}</h3>
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full min-w-[300px] text-sm">
                  <tbody>
                    {(
                      [
                        ["morningBlue", sun.windows.morningBlue, "bg-blue-500"],
                        ["morningGolden", sun.windows.morningGolden, "bg-amber-400"],
                        ["eveningGolden", sun.windows.eveningGolden, "bg-amber-400"],
                        ["eveningBlue", sun.windows.eveningBlue, "bg-blue-500"],
                      ] as const
                    ).map(([key, w, dot]) => (
                      <tr key={key} className="border-b border-border last:border-b-0">
                        <th scope="row" className="px-3 py-2 text-left font-medium">
                          <span className={cn("mr-2 inline-block size-2.5 rounded-full align-middle", dot)} aria-hidden />
                          {t(key)}
                        </th>
                        <td className="px-3 py-2 text-right">{range(w)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <h3 className="text-sm font-semibold">{t("dayBarTitle")}</h3>
              <div className="flex h-5 w-full overflow-hidden rounded-md border border-border" role="presentation">
                {sun.segments.map((s, i) => (
                  <div
                    key={i}
                    className={SEGMENT_COLOR[s.kind]}
                    style={{ width: `${((s.endMin - s.startMin) / totalMin) * 100}%` }}
                  />
                ))}
              </div>
              <div className="flex justify-between text-[11px] text-muted-foreground" aria-hidden>
                {[0, 6, 12, 18, 24].map((h) => (
                  <span key={h}>{hourLabel((h / 24) * totalMin)}</span>
                ))}
              </div>
              <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                {(
                  [
                    ["night", "legendNight"],
                    ["blue", "legendBlue"],
                    ["golden", "legendGolden"],
                    ["day", "legendDay"],
                  ] as const
                ).map(([k, label]) => (
                  <li key={k} className="flex items-center gap-1.5">
                    <span className={cn("inline-block size-2.5 rounded-sm", SEGMENT_COLOR[k])} aria-hidden />
                    {t(label)}
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}
      </section>

      <Notice>
        <strong className="font-semibold text-foreground">{t("droneTitle")}.</strong> {t("droneBody")}{" "}
        <Link href="/regulations" className="text-primary underline underline-offset-2">
          {t("regulationsLink")}
        </Link>
      </Notice>
    </div>
  );
}
