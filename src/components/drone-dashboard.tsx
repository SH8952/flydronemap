"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { Search, MapPin, Wind, Radio, ShieldAlert, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Leaflet touches `window` at import time, so it can only run client-side —
// load it with ssr disabled rather than importing it directly.
const FlightMap = dynamic(
  () => import("@/components/flight-map").then((m) => m.FlightMap),
  {
    ssr: false,
    loading: () => (
      <div className="h-72 w-full animate-pulse rounded-lg border border-border bg-muted sm:h-96" />
    ),
  },
);

type LatLngRing = [number, number][];

type GeocodeResult = {
  name: string;
  admin1?: string;
  country: string;
  countryCode?: string;
  latitude: number;
  longitude: number;
};

type DashboardData = {
  weather: {
    temperatureC: number;
    windSpeedKmh: number;
    windGustKmh: number;
    windDirectionDeg: number;
    visibilityM: number;
    precipitationMm: number;
    time: string;
  } | null;
  kp: { kp: number; time: string } | null;
  airspace:
    | {
        source: "faa";
        ceilingFeet: number;
        nearestFacility?: string;
        boundary?: LatLngRing[];
      }
    | {
        source: "kr";
        restricted: true;
        zoneLabel: string;
        categoryName: string;
        lowerAltitude: string;
        upperAltitude: string;
        boundary?: LatLngRing[][];
      }
    | { source: "kr"; restricted: false }
    | null;
};

function windRisk(gustKmh: number): "low" | "moderate" | "high" {
  if (gustKmh < 20) return "low";
  if (gustKmh < 35) return "moderate";
  return "high";
}

function kpRisk(kp: number): "quiet" | "unsettled" | "storm" {
  if (kp < 4) return "quiet";
  if (kp < 5) return "unsettled";
  return "storm";
}

const RISK_COLOR: Record<string, string> = {
  low: "text-emerald-500",
  quiet: "text-emerald-500",
  moderate: "text-amber-500",
  unsettled: "text-amber-500",
  high: "text-red-500",
  storm: "text-red-500",
};

export function DroneDashboard() {
  const t = useTranslations("Home");
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<GeocodeResult[]>([]);
  const [selected, setSelected] = useState<GeocodeResult | null>(null);
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSearchInput(value: string) {
    setQuery(value);
    if (value.trim().length < 2) {
      setSuggestions([]);
      return;
    }
    setSearching(true);
    try {
      const res = await fetch(`/api/geocode?q=${encodeURIComponent(value)}`);
      const json = await res.json();
      setSuggestions(json.results ?? []);
    } finally {
      setSearching(false);
    }
  }

  async function loadDashboard(lat: number, lon: number) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/dashboard?lat=${lat}&lon=${lon}`);
      if (!res.ok) throw new Error("failed");
      const json = (await res.json()) as DashboardData;
      setData(json);
    } catch {
      setError(t("errorText"));
    } finally {
      setLoading(false);
    }
  }

  function selectLocation(loc: GeocodeResult) {
    setSelected(loc);
    setSuggestions([]);
    setQuery(`${loc.name}${loc.admin1 ? `, ${loc.admin1}` : ""}`);
    loadDashboard(loc.latitude, loc.longitude);
  }

  function useMyLocation() {
    if (!navigator.geolocation) {
      setError(t("errorText"));
      return;
    }
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc: GeocodeResult = {
          name: t("myLocation"),
          country: "",
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        };
        setSelected(loc);
        setQuery(t("myLocation"));
        loadDashboard(loc.latitude, loc.longitude);
      },
      () => {
        setLoading(false);
        setError(t("errorText"));
      },
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="relative flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => handleSearchInput(e.target.value)}
            placeholder={t("searchPlaceholder")}
            className="h-11 pl-9"
          />
          {suggestions.length > 0 ? (
            <ul className="absolute z-10 mt-1 w-full rounded-md border border-border bg-popover shadow-md">
              {suggestions.map((s, i) => (
                <li key={i}>
                  <button
                    type="button"
                    onClick={() => selectLocation(s)}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-muted"
                  >
                    {s.name}
                    {s.admin1 ? `, ${s.admin1}` : ""} · {s.country}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={useMyLocation}
          className="h-11 gap-2"
        >
          <MapPin className="size-4" />
          {t("useMyLocationButton")}
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-10 text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
          {t("loadingText")}
        </div>
      ) : null}

      {error ? (
        <p className="text-center text-sm text-destructive">{error}</p>
      ) : null}

      {data && selected && !loading ? (
        <FlightMap
          latitude={selected.latitude}
          longitude={selected.longitude}
          faaBoundary={
            data.airspace?.source === "faa"
              ? data.airspace.boundary
              : undefined
          }
          krBoundary={
            data.airspace?.source === "kr" && data.airspace.restricted
              ? data.airspace.boundary
              : undefined
          }
          restricted={
            data.airspace?.source === "kr"
              ? data.airspace.restricted
              : undefined
          }
        />
      ) : null}

      {data && !loading ? (
        <div className="grid gap-4 md:grid-cols-3">
          {/* Wind / weather card */}
          <div className="rounded-lg border border-border p-5">
            <div className="mb-3 flex items-center gap-2 font-semibold">
              <Wind className="size-4" />
              {t("windSectionTitle")}
            </div>
            {data.weather ? (
              <div className="flex flex-col gap-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    {t("windSpeed")}
                  </span>
                  <span className="font-medium">
                    {Math.round(data.weather.windSpeedKmh)} km/h
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    {t("windGust")}
                  </span>
                  <span
                    className={cn(
                      "font-medium",
                      RISK_COLOR[windRisk(data.weather.windGustKmh)],
                    )}
                  >
                    {Math.round(data.weather.windGustKmh)} km/h
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    {t("visibility")}
                  </span>
                  <span className="font-medium">
                    {(data.weather.visibilityM / 1000).toFixed(1)} km
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    {t("temperature")}
                  </span>
                  <span className="font-medium">
                    {Math.round(data.weather.temperatureC)}°C
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                {t("noDataForLocation")}
              </p>
            )}
          </div>

          {/* KP index card */}
          <div className="rounded-lg border border-border p-5">
            <div className="mb-3 flex items-center gap-2 font-semibold">
              <Radio className="size-4" />
              {t("kpSectionTitle")}
            </div>
            {data.kp ? (
              <div className="flex flex-col gap-2">
                <div
                  className={cn(
                    "text-3xl font-bold",
                    RISK_COLOR[kpRisk(data.kp.kp)],
                  )}
                >
                  Kp {data.kp.kp.toFixed(1)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {t(`kpHint.${kpRisk(data.kp.kp)}`)}
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                {t("noDataForLocation")}
              </p>
            )}
          </div>

          {/* Airspace card */}
          <div className="rounded-lg border border-border p-5">
            <div className="mb-3 flex items-center gap-2 font-semibold">
              <ShieldAlert className="size-4" />
              {t("airspaceSectionTitle")}
            </div>
            {data.airspace && data.airspace.source === "faa" ? (
              <div className="flex flex-col gap-2">
                <div className="text-2xl font-bold">
                  {data.airspace.ceilingFeet} ft AGL
                </div>
                {data.airspace.nearestFacility ? (
                  <p className="text-xs text-muted-foreground">
                    {t("nearFacility", {
                      facility: data.airspace.nearestFacility,
                    })}
                  </p>
                ) : null}
              </div>
            ) : null}

            {data.airspace &&
            data.airspace.source === "kr" &&
            data.airspace.restricted ? (
              <div className="flex flex-col gap-2">
                <div className="text-lg font-bold text-red-500">
                  {data.airspace.categoryName || t("krRestrictedZone")} (
                  {data.airspace.zoneLabel})
                </div>
                <p className="text-xs text-muted-foreground">
                  {t("krAltitudeRange", {
                    lower: data.airspace.lowerAltitude,
                    upper: data.airspace.upperAltitude,
                  })}
                </p>
              </div>
            ) : null}

            {data.airspace &&
            data.airspace.source === "kr" &&
            !data.airspace.restricted ? (
              <div className="text-lg font-bold text-emerald-500">
                {t("krNoRestriction")}
              </div>
            ) : null}

            {!data.airspace ? (
              <p className="text-sm text-muted-foreground">
                {t("airspaceNoData")}
              </p>
            ) : null}
            <p className="mt-3 text-xs text-muted-foreground">
              {t("airspaceDisclaimer")}
            </p>
          </div>
        </div>
      ) : null}

      {!data && !loading ? (
        <p className="text-center text-sm text-muted-foreground">
          {t("emptyState")}
        </p>
      ) : null}
    </div>
  );
}
