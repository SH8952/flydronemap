"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useLocale, useTranslations } from "next-intl";
import { Search, MapPin, Wind, Radio, ShieldAlert, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CrossLinkExifLens } from "@/components/cross-link/cross-link-exiflens";
import { AirspaceLayerPanel } from "@/components/airspace-layer-panel";
import { AIRSPACE_LAYERS, getWmsLayerParam } from "@/lib/airspace-layers";
import { isInSouthKorea } from "@/lib/airspace";
import {
  getCountryCode,
  getCountryDisplayName,
  toPriorityRegulationId,
} from "@/lib/country-info";
import { getRegulationCountry } from "@/lib/country-regulations";
import { fetchKoreaAirspaceZones } from "@/lib/airspace-lookup-client";
import { getUsAirspaceLayer } from "@/lib/us-airspace-layers";
import {
  fetchUsAirspaceZones,
  type UsAirspaceZones,
} from "@/lib/us-airspace-lookup-client";

// WMS 타일 방식으로 전환되어 레이어별 fetch/로딩 상태가 없으므로 항상 빈 집합.
const NO_LOADING_LAYER_IDS: Set<string> = new Set();

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
        matches: Array<{
          layerId: string;
          labels: string[];
          boundary?: LatLngRing[][];
        }>;
      }
    | { source: "kr"; restricted: false }
    | null;
  // 미국 지점의 Class B/C/D/E, 금지/제한/경고/주의구역, MOA, FRIA 조회 결과 —
  // 기존 airspace(FAA 고도 상한) 필드와 별개로 병렬 저장한다(서로 다른 정보이며,
  // 한 지점에 대해 둘 다 동시에 존재할 수 있으므로 airspace.source를 덮어쓰지
  // 않는다). src/app/api/us-airspace-lookup/route.ts 참고.
  usAirspaceZones: UsAirspaceZones;
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
  const tReg = useTranslations("Regulations");
  const locale = useLocale();
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<GeocodeResult[]>([]);
  const [selected, setSelected] = useState<GeocodeResult | null>(null);
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [countryCode, setCountryCode] = useState<string | undefined>(
    undefined,
  );

  // 항공 공역 레이어(관제권/비행제한구역 등) — 필수 레이어는 항상 켜진 채 시작하고,
  // 나머지는 사용자가 레이어 패널에서 켠 만큼 지도에 WMS 타일로 추가된다. WMS
  // 타일은 브라우저에서 직접 <img>로 요청되므로(VWorld API 서버 IP 차단 우회)
  // 별도의 fetch/캐시/로딩 상태가 필요 없다 — src/lib/airspace-layers.ts 참고.
  const [activeLayerIds, setActiveLayerIds] = useState<Set<string>>(
    () => new Set(AIRSPACE_LAYERS.filter((l) => l.required).map((l) => l.id)),
  );

  // Guards against out-of-order responses: if the user keeps typing, an
  // earlier (slower) request resolving after a later one would otherwise
  // overwrite the fresh suggestions with stale ones, which looks like the
  // dropdown "flickering" open and shut.
  const searchRequestId = useRef(0);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // 사용자가 검색/버튼/지도클릭 등 직접 조작을 시작했는지 추적. true가 되면
  // IP 기반 자동 위치 감지 결과가 늦게 도착해도 사용자의 선택을 덮어쓰지 않음.
  const userActedRef = useRef(false);

  function handleSearchInput(value: string) {
    userActedRef.current = true;
    setQuery(value);

    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    if (value.trim().length < 2) {
      setSuggestions([]);
      return;
    }

    debounceTimer.current = setTimeout(async () => {
      const requestId = ++searchRequestId.current;
      setSearching(true);
      try {
        const res = await fetch(
          `/api/geocode?q=${encodeURIComponent(value)}`,
        );
        const json = await res.json();
        // Ignore this response if a newer keystroke already started another request.
        if (requestId !== searchRequestId.current) return;
        setSuggestions(json.results ?? []);
      } finally {
        if (requestId === searchRequestId.current) setSearching(false);
      }
    }, 300);
  }

  useEffect(() => {
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, []);

  async function loadDashboard(lat: number, lon: number) {
    setLoading(true);
    setError(null);
    setCountryCode(getCountryCode(lat, lon));
    try {
      // 한국 지점의 비행금지구역 조회는 서버가 아니라 브라우저에서 직접
      // 브이월드 WMS로 수행한다(src/lib/airspace-wms-lookup.ts 참고) —
      // /api/dashboard 응답과 병렬로 요청해 추가 지연 없이 병합한다.
      const [res, krZone, usZones] = await Promise.all([
        fetch(`/api/dashboard?lat=${lat}&lon=${lon}`),
        isInSouthKorea(lat, lon)
          ? fetchKoreaAirspaceZones(lat, lon)
          : Promise.resolve(null),
        // 미국 지점의 클릭 시점 공역 조회도 같은 방식으로 병렬 요청한다 —
        // src/app/api/us-airspace-lookup/route.ts 참고.
        isInSouthKorea(lat, lon)
          ? Promise.resolve(null)
          : fetchUsAirspaceZones(lat, lon),
      ]);
      if (!res.ok) throw new Error("failed");
      const json = (await res.json()) as DashboardData;
      if (krZone) {
        json.airspace = krZone;
      }
      json.usAirspaceZones = usZones;
      setData(json);
    } catch {
      setError(t("errorText"));
    } finally {
      setLoading(false);
    }
  }

  function selectLocation(loc: GeocodeResult) {
    userActedRef.current = true;
    setSelected(loc);
    setSuggestions([]);
    setQuery(`${loc.name}${loc.admin1 ? `, ${loc.admin1}` : ""}`);
    loadDashboard(loc.latitude, loc.longitude);
  }

  /** Called when the user clicks directly on the map instead of searching. */
  function selectCoordinates(lat: number, lon: number) {
    userActedRef.current = true;
    const label = `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
    const loc: GeocodeResult = {
      name: label,
      country: "",
      latitude: lat,
      longitude: lon,
    };
    setSelected(loc);
    setSuggestions([]);
    setQuery(label);
    loadDashboard(lat, lon);
  }

  function useMyLocation() {
    userActedRef.current = true;
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

  // 접속 즉시 IP 기반 대략 위치로 첫 화면을 채운다 (브라우저 위치 권한 팝업 없음).
  // Vercel 엣지 네트워크가 붙여주는 헤더가 없는 환경(로컬 개발 등)에서는 조용히
  // 아무 것도 하지 않고 기존처럼 검색창만 있는 기본 화면을 유지한다.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch("/api/geo");
        if (!res.ok) return;
        const json = await res.json();
        if (cancelled || userActedRef.current || !json.available) return;

        const label = json.city
          ? `${json.city}${json.country ? `, ${json.country}` : ""}`
          : t("myLocation");
        const loc: GeocodeResult = {
          name: label,
          country: json.country ?? "",
          latitude: json.latitude,
          longitude: json.longitude,
        };
        setSelected(loc);
        setQuery(label);
        loadDashboard(loc.latitude, loc.longitude);
      } catch {
        // 자동 위치 감지 실패 시 조용히 무시하고 기본 화면 유지
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleAirspaceLayerToggle(id: string, next: boolean) {
    setActiveLayerIds((prev) => {
      const updated = new Set(prev);
      if (next) updated.add(id);
      else updated.delete(id);
      return updated;
    });
  }

  // 선택된 위치의 국가에 따라 공역 정보 박스의 제목/설명/링크를 결정한다.
  // 4개 우선 지원국(미국/한국/일본/스페인)은 country-regulations.ts에
  // 정리된 국가명·공식 링크를 그대로 재사용하고, 그 외 국가는
  // Intl.DisplayNames로 국가명만 표시하며(링크 없음), 국가를 아예 판별할
  // 수 없는 좌표(공해상 등)는 국가 정보 없이 일반적인 문구로 대체한다.
  const priorityRegulationId = toPriorityRegulationId(countryCode);
  const countryDisplayName = countryCode
    ? priorityRegulationId
      ? tReg(`countries.${priorityRegulationId}.name`)
      : getCountryDisplayName(countryCode, locale)
    : undefined;
  const regulationOfficialUrl = priorityRegulationId
    ? getRegulationCountry(priorityRegulationId)?.links.find(
        (l) => l.key === "official",
      )?.url
    : undefined;
  const prioritySummary = priorityRegulationId
    ? (
        tReg.raw(`countries.${priorityRegulationId}.summary`) as
          | string[]
          | undefined
      )?.[0]
    : undefined;

  return (
    <div className="flex flex-col gap-6">
      <div className="relative z-[1000] flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => handleSearchInput(e.target.value)}
            placeholder={t("searchPlaceholder")}
            className="h-11 pl-9"
          />
          {suggestions.length > 0 ? (
            <ul className="absolute z-[1000] mt-1 w-full rounded-md border border-border bg-popover shadow-md">
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
              ? data.airspace.matches[0]?.boundary
              : data.usAirspaceZones?.restricted
                ? data.usAirspaceZones.matches[0]?.boundary
                : undefined
          }
          restricted={
            data.airspace?.source === "kr"
              ? data.airspace.restricted
              : data.usAirspaceZones
                ? data.usAirspaceZones.restricted
                : undefined
          }
          onMapClick={selectCoordinates}
          clickHintText={t("clickMapHint")}
          airspaceOverlayLayers={
            isInSouthKorea(selected.latitude, selected.longitude)
              ? AIRSPACE_LAYERS.filter((layer) =>
                  activeLayerIds.has(layer.id),
                ).map((layer) => ({
                  id: layer.id,
                  label: t(`airspaceLayerNames.${layer.id}`),
                  wmsLayers: getWmsLayerParam(layer),
                }))
              : undefined
          }
          mapOverlay={
            isInSouthKorea(selected.latitude, selected.longitude) ? (
              <AirspaceLayerPanel
                activeIds={activeLayerIds}
                onToggle={handleAirspaceLayerToggle}
                loadingIds={NO_LOADING_LAYER_IDS}
              />
            ) : undefined
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
              {countryDisplayName
                ? t("airspaceSectionTitleWithCountry", {
                    country: countryDisplayName,
                  })
                : t("airspaceSectionTitleGeneric")}
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
                {data.airspace.matches.map((m) => {
                  const layer = AIRSPACE_LAYERS.find(
                    (l) => l.id === m.layerId,
                  );
                  return (
                    <div key={m.layerId} className="flex flex-col gap-0.5">
                      <div
                        className="flex items-center gap-1.5 text-base font-bold"
                        style={{ color: layer?.color }}
                      >
                        <span
                          className="inline-block size-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: layer?.color }}
                        />
                        {t(`airspaceLayerNames.${m.layerId}`)}
                      </div>
                      {m.labels.length > 0 ? (
                        <p className="pl-4 text-xs text-muted-foreground">
                          {m.labels.join(" · ")}
                        </p>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            ) : null}

            {data.airspace &&
            data.airspace.source === "kr" &&
            !data.airspace.restricted ? (
              <div className="text-lg font-bold text-emerald-500">
                {t("krNoRestriction")}
              </div>
            ) : null}

            {/* usAirspaceZones가 null이 아니라면(restricted:true든 false든)
                이미 미국 조회가 확정적으로 끝난 것이므로, "상세 데이터 없음"
                문구와 동시에 보여주면 서로 모순된다 — usAirspaceZones가
                아예 null(조회 실패/미시도)일 때만 이 문구를 보여준다. */}
            {!data.airspace && !data.usAirspaceZones ? (
              <p className="text-sm text-muted-foreground">
                {t("airspaceNoData")}
              </p>
            ) : null}

            {data.usAirspaceZones && data.usAirspaceZones.restricted ? (
              <div className="mt-3 flex flex-col gap-2 border-t border-border pt-3">
                {data.usAirspaceZones.matches.map((m) => {
                  const layer = getUsAirspaceLayer(m.layerId);
                  return (
                    <div key={m.layerId} className="flex flex-col gap-0.5">
                      <div
                        className="flex items-center gap-1.5 text-base font-bold"
                        style={{ color: layer?.color }}
                      >
                        <span
                          className="inline-block size-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: layer?.color }}
                        />
                        {t(`usAirspaceLayerNames.${m.layerId}`)}
                      </div>
                      {m.labels.length > 0 ? (
                        <p className="pl-4 text-xs text-muted-foreground">
                          {m.labels.join(" · ")}
                        </p>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            ) : null}

            {data.usAirspaceZones && !data.usAirspaceZones.restricted ? (
              <div className="mt-3 border-t border-border pt-3 text-sm text-emerald-500">
                {t("krNoRestriction")}
              </div>
            ) : null}
            <p className="mt-3 text-xs text-muted-foreground">
              {priorityRegulationId && prioritySummary
                ? `${prioritySummary} ${t("airspaceDisclaimerPrioritySuffix")}`
                : countryDisplayName
                  ? t("airspaceDisclaimerGeneric", {
                      country: countryDisplayName,
                    })
                  : t("airspaceDisclaimerUnknownLocation")}
            </p>
            {priorityRegulationId && regulationOfficialUrl ? (
              <Button variant="outline" size="sm" className="mt-3" asChild>
                <a
                  href={regulationOfficialUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {t("airspaceRegulationCheckButton", {
                    country: countryDisplayName ?? "",
                  })}
                </a>
              </Button>
            ) : null}

            {/* VWorld의 좌표 클릭 조회(GetFeatureInfo)는 서버 측 Referer 제한으로
                동작하지 않아, 대신 현재 지도에 표시 중인 공역 레이어를 범례
                형태의 텍스트로 보여준다 — WMS 타일 자체(GetMap)는 정상 동작하므로
                이 목록은 항상 지도 상태와 일치한다. */}
            {selected && isInSouthKorea(selected.latitude, selected.longitude) ? (
              <div className="mt-3 flex flex-col gap-1.5 border-t border-border pt-3">
                <p className="text-xs font-medium text-muted-foreground">
                  {t("airspaceActiveLayersTitle")}
                </p>
                <ul className="flex flex-wrap gap-x-3 gap-y-1">
                  {AIRSPACE_LAYERS.filter((layer) =>
                    activeLayerIds.has(layer.id),
                  ).map((layer) => (
                    <li
                      key={layer.id}
                      className="flex items-center gap-1.5 text-xs text-muted-foreground"
                    >
                      <span
                        className="inline-block size-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: layer.color }}
                      />
                      {t(`airspaceLayerNames.${layer.id}`)}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {data && !loading ? <CrossLinkExifLens /> : null}

      {!data && !loading ? (
        <p className="text-center text-sm text-muted-foreground">
          {t("emptyState")}
        </p>
      ) : null}
    </div>
  );
}
