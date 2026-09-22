"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useLocale, useTranslations } from "next-intl";
import {
  Search,
  MapPin,
  Globe,
  Wind,
  Radio,
  ShieldAlert,
  Loader2,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { AirspaceLayerPanel } from "@/components/airspace-layer-panel";
import { AIRSPACE_LAYERS, getWmsLayerParam } from "@/lib/airspace-layers";
import {
  ES_AIRSPACE_LAYERS,
  ES_WMS_URL,
  getEsAirspaceLayer,
} from "@/lib/es-airspace-layers";
import {
  DE_AIRSPACE_LAYERS,
  DE_WMS_URL,
  getDeAirspaceLayer,
  getDeQualifiedLayerName,
} from "@/lib/de-airspace-layers";
import { isInSouthKorea, isInSpain, isInGermany } from "@/lib/airspace";
import {
  getCountryCode,
  getCountryDisplayName,
  toPriorityRegulationId,
} from "@/lib/country-info";
import {
  getRegulationCountry,
  REGULATION_COUNTRIES,
  type RegulationCountryId,
} from "@/lib/country-regulations";
import { fetchKoreaAirspaceZones } from "@/lib/airspace-lookup-client";
import { getUsAirspaceLayer } from "@/lib/us-airspace-layers";
import {
  fetchUsAirspaceZones,
  type UsAirspaceZones,
} from "@/lib/us-airspace-lookup-client";
import {
  fetchEsAirspaceZones,
  type EsAirspaceZones,
} from "@/lib/es-airspace-lookup-client";
import {
  fetchDeAirspaceZones,
  type DeAirspaceZones,
} from "@/lib/de-airspace-lookup-client";

// WMS 타일 방식으로 전환되어 레이어별 fetch/로딩 상태가 없으므로 항상 빈 집합.
const NO_LOADING_LAYER_IDS: Set<string> = new Set();

// Leaflet touches `window` at import time, so it can only run client-side —
// load it with ssr disabled rather than importing it directly.
// 아래 두 로딩 스켈레톤(이 dynamic() loading 폴백 + 결과 영역의 초기 스켈레톤)에
// 동일한 인라인 SVG 플레이스홀더를 쓰는 이유: 2026-09-14(2차) 구조 변경으로 지도는
// 이제 날씨/공역 데이터(loading)가 아니라 위치(selected)만 있으면 곧바로 마운트되므로,
// 이 dynamic() 폴백(지도 컴포넌트 자체의 JS 청크가 아직 로드되지 않은 아주 짧은
// 순간에 보임)이 이전보다 훨씬 자주 화면에 나타나게 됨 — 그래서 여기도 이미지가
//없는 빈 배경색 대신 LCP 플레이스홀더를 넣어 일관되게 처리함.
const FlightMap = dynamic(
  () => import("@/components/flight-map").then((m) => m.FlightMap),
  {
    ssr: false,
    loading: () => (
      <div className="relative h-72 w-full overflow-hidden rounded-lg border border-border bg-muted sm:h-96">
        <img
          src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'%3E%3Crect width='400' height='300' fill='%23262626'/%3E%3C/svg%3E"
          alt=""
          aria-hidden="true"
          fetchPriority="high"
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover"
        />
      </div>
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
  // 스페인 지점의 ENAIRE ZGUAS(항공/도심/기반시설) 조회 결과 — 위 usAirspaceZones와
  // 동일한 이유로 별개 필드로 병렬 저장한다. src/app/api/es-airspace-lookup/route.ts 참고.
  esAirspaceZones: EsAirspaceZones;
  // 독일 지점의 DIPUL(비행제한구역/관제구역 등) 조회 결과 — 위와 동일한 이유로
  // 별개 필드로 병렬 저장한다. src/app/api/de-airspace-lookup/route.ts 참고.
  deAirspaceZones: DeAirspaceZones;
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

export function DroneDashboard({
  onResultVisibilityChange,
}: {
  onResultVisibilityChange?: (visible: boolean) => void;
} = {}) {
  const t = useTranslations("Home");
  const tReg = useTranslations("Regulations");
  const locale = useLocale();
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<GeocodeResult[]>([]);
  const [selected, setSelected] = useState<GeocodeResult | null>(null);
  const [countryPickerValue, setCountryPickerValue] = useState("");
  const [data, setData] = useState<DashboardData | null>(null);
  // 접속 직후 IP 기반 자동 위치 감지가 거의 항상 실행되므로(아래 useEffect),
  // 기본값을 true로 두어 첫 렌더부터 로딩 스켈레톤(최종 대시보드와 비슷한 높이)이
  // 보이게 한다 — false로 시작하면 "검색해주세요" 문구(매우 작음) → 로딩 스피너
  // → 전체 대시보드(지도+카드) 순으로 화면 높이가 두 번 크게 뛰어 레이아웃 밀림
  // (CLS)이 발생했다 (2026-09-14, PageSpeed Insights 진단: CLS 0.226).
  const [loading, setLoading] = useState(true);

  // 대시보드 결과(data)가 있고 로딩이 끝났을 때만 관련 도구(ExifLens ND
  // 필터 계산기) 링크를 노출한다. 이 컴포넌트는 더 이상 그 링크를 직접
  // 렌더링하지 않고, 부모(HomeDashboardSection)가 장비 추천 섹션 아래에
  // 배치할 수 있도록 가시 여부만 콜백으로 알려준다
  // (2026-09-07, 사용자 요청 — 관련 도구/장비 추천 순서를 exifnd.com과
  // 동일하게 맞추기 위함).
  useEffect(() => {
    onResultVisibilityChange?.(Boolean(data) && !loading);
  }, [data, loading, onResultVisibilityChange]);
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

  // 스페인(ENAIRE ZGUAS) 공역 레이어 — 3개 모두 필수(required)가 아니며,
  // 사용자의 명시적 요청(2026-09-07)에 따라 초기 상태는 모두 꺼짐이다:
  // 도심(Urbano)의 "NPDRID"(스페인 본토 전체 크기) 구역이나 항공(Aero)의
  // TMA(터미널관제구역, 예: 마드리드 약 250km×215km) 같은 큰 구역이 사전
  // 안내 없이 지도를 뒤덮는 것을 막기 위함 — 사용자가 레이어 패널에서 직접
  // 켜야 지도에 그려진다. src/lib/es-airspace-layers.ts 참고.
  const [activeEsLayerIds, setActiveEsLayerIds] = useState<Set<string>>(
    () => new Set(),
  );

  // 독일(DIPUL) 공역 레이어 — 비행제한구역/관제구역 2개는 실제 비행 제한과
  // 직결되는 핵심 규제 정보라 한국의 "필수 3종"과 동일하게 항상 켜진 채
  // 시작한다(끌 수 없음). 나머지 29개(자연보호구역·주요 시설 등 참고용
  // 근접 정보)는 스페인의 교훈(큰 면적 레이어가 사전 안내 없이 지도를
  // 뒤덮는 문제)에 따라 기본값을 꺼짐으로 두고 사용자가 직접 선택하도록
  // 한다. src/lib/de-airspace-layers.ts 참고.
  const [activeDeLayerIds, setActiveDeLayerIds] = useState<Set<string>>(
    () => new Set(DE_AIRSPACE_LAYERS.filter((l) => l.required).map((l) => l.id)),
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
      const inKorea = isInSouthKorea(lat, lon);
      const inSpain = isInSpain(lat, lon);
      const inGermany = isInGermany(lat, lon);
      const [res, krZone, usZones, esZones, deZones] = await Promise.all([
        fetch(`/api/dashboard?lat=${lat}&lon=${lon}`),
        inKorea ? fetchKoreaAirspaceZones(lat, lon) : Promise.resolve(null),
        // 미국 지점의 클릭 시점 공역 조회도 같은 방식으로 병렬 요청한다 —
        // src/app/api/us-airspace-lookup/route.ts 참고. 한국·스페인·독일은
        // 각자 전용 데이터 소스가 있으므로 여기서 제외한다(무의미한 외부
        // 호출 방지).
        inKorea || inSpain || inGermany
          ? Promise.resolve(null)
          : fetchUsAirspaceZones(lat, lon),
        // 스페인 지점의 ENAIRE ZGUAS 조회 — src/app/api/es-airspace-lookup/route.ts 참고.
        inSpain ? fetchEsAirspaceZones(lat, lon) : Promise.resolve(null),
        // 독일 지점의 DIPUL 조회 — src/app/api/de-airspace-lookup/route.ts 참고.
        inGermany ? fetchDeAirspaceZones(lat, lon) : Promise.resolve(null),
      ]);
      if (!res.ok) throw new Error("failed");
      const json = (await res.json()) as DashboardData;
      if (krZone) {
        json.airspace = krZone;
      }
      json.usAirspaceZones = usZones;
      json.esAirspaceZones = esZones;
      json.deAirspaceZones = deZones;
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

  /**
   * 국가 선택 드롭다운(공역 정보가 구현된 국가만 노출)에서 국가를 고르면
   * 그 국가의 수도로 지도를 이동시키고, 검색/지도클릭/내 위치 사용과 동일하게
   * 날씨·Kp지수·공역 정보까지 함께 조회한다.
   */
  function selectCountryCapital(id: RegulationCountryId) {
    userActedRef.current = true;
    const country = getRegulationCountry(id);
    if (!country) return;
    const capitalName = tReg(`countries.${id}.capital`);
    const countryName = tReg(`countries.${id}.name`);
    const loc: GeocodeResult = {
      name: capitalName,
      country: countryName,
      latitude: country.capital.latitude,
      longitude: country.capital.longitude,
    };
    setSelected(loc);
    setSuggestions([]);
    setQuery(`${capitalName}, ${countryName}`);
    loadDashboard(loc.latitude, loc.longitude);
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
        if (!res.ok) {
          // 자동 위치 감지를 사용할 수 없음 — 기본 화면(검색창만)으로 전환.
          if (!cancelled && !userActedRef.current) setLoading(false);
          return;
        }
        const json = await res.json();
        if (cancelled) return;
        // 사용자가 이미 검색/버튼/지도클릭으로 직접 조작을 시작한 뒤라면, 그
        // 조작이 스스로 loadDashboard()를 통해 loading 상태를 관리하고 있으므로
        // 여기서 건드리지 않는다.
        if (userActedRef.current) return;
        if (!json.available) {
          setLoading(false);
          return;
        }

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
        // 자동 위치 감지 실패 시 조용히 무시하고 기본 화면으로 전환
        if (!cancelled && !userActedRef.current) setLoading(false);
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

  function handleEsAirspaceLayerToggle(id: string, next: boolean) {
    setActiveEsLayerIds((prev) => {
      const updated = new Set(prev);
      if (next) updated.add(id);
      else updated.delete(id);
      return updated;
    });
  }

  function handleDeAirspaceLayerToggle(id: string, next: boolean) {
    setActiveDeLayerIds((prev) => {
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
        <Select
          value={countryPickerValue}
          onValueChange={(id) => {
            selectCountryCapital(id as RegulationCountryId);
            setCountryPickerValue("");
          }}
        >
          <SelectTrigger
            className="h-11! w-full gap-2 sm:w-auto"
            aria-label={t("countryJumpPlaceholder")}
          >
            <Globe className="size-4 text-muted-foreground" />
            <SelectValue placeholder={t("countryJumpPlaceholder")} />
          </SelectTrigger>
          <SelectContent align="end" className="z-[1100]">
            {REGULATION_COUNTRIES.filter((c) => c.hasMapData).map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {tReg(`countries.${c.id}.name`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!selected ? (
        // 아직 위치(selected) 자체가 없는 최초 진입 시점(/api/geo 응답 대기 중)
        // 에만 보여주는 지도 스켈레톤 — 최종 지도와 높이를 맞춰 CLS를 막는다
        // (2026-09-14, PageSpeed Insights CLS 0.226 진단 반영).
        // 2026-09-14(2차) 구조 변경: 위치가 정해진 뒤에는(날씨/공역 데이터를
        // 기다리지 않고) 곧바로 실제 지도를 보여주도록 바꿔서, 이 스켈레톤은
        // 검색/내 위치 등으로 이미 한 번 위치가 잡힌 뒤에는 다시 나타나지
        // 않는다(이전에는 새로 검색할 때마다 지도 전체가 스켈레톤으로
        // 리셋되었는데, 그 문제도 같이 해소됨).
        <div className="relative h-72 w-full overflow-hidden rounded-lg border border-border bg-muted sm:h-96">
          {/* LCP 개선용 플레이스홀더 이미지 (2026-09-14, PageSpeed Insights LCP
              6.7초 진단 반영). 이 자리에 실제로 나타날 지도는 클라이언트 사이드
              에서만 렌더링되는 Leaflet 타일 이미지라 초기 HTML에 존재하지 않고,
              그래서 Lighthouse가 이 로딩 상태를 건너뛰고 한참 뒤에 나타나는 지도
              타일을 LCP 요소로 잡아 점수가 크게 깎였음. 네트워크 요청이 필요
              없는 인라인 SVG를 fetchPriority="high"로 초기 문서에 바로 포함시켜,
              Lighthouse가 이 플레이스홀더를 빠르게 그려지는 LCP 요소로 잡도록
              유도함 — 실제 지도/기능 동작은 전혀 바뀌지 않음. */}
          <img
            src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'%3E%3Crect width='400' height='300' fill='%23262626'/%3E%3C/svg%3E"
            alt=""
            aria-hidden="true"
            fetchPriority="high"
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 flex items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="size-5 animate-spin" />
            {t("loadingText")}
          </div>
        </div>
      ) : null}

      {error ? (
        <p className="text-center text-sm text-destructive">{error}</p>
      ) : null}

      {selected ? (
        // 2026-09-14(2차) 구조 변경: 이전에는 날씨/공역 데이터(data)까지 전부
        // 도착해야만 지도를 그렸는데, 실제 배포 사이트 재측정에서 Lighthouse가
        // LCP 요소로 지목한 것이 위 스켈레톤이 아니라 "지도 자체의 첫 타일
        // 이미지"였고, 그 타일 요청이 시작되는 시점 자체가 데이터 로딩 대기
        // 때문에 4.7초나 늦어지는 것이 원인으로 확인됨. 지도의 기본 타일은
        // 위치(selected)만 있으면 그릴 수 있고, data가 필요한 것은 비행제한
        // 구역 등 안전 오버레이뿐이므로, 지도는 위치가 정해지는 즉시 그리고
        // data는 오버레이용으로 나중에 반영되도록 분리함.
        // ⚠️ 안전 관련 주의: data가 아직 없는 짧은 동안에는 비행제한구역
        // 오버레이가 보이지 않는데, 이를 "안전 확인됨"으로 오해하지 않도록
        // 아래 mapOverlay에 "공역 정보 확인 중" 배너를 반드시 함께 표시한다
        // (data가 도착하면 자동으로 사라지고 실제 오버레이로 교체됨).
        <FlightMap
          latitude={selected.latitude}
          longitude={selected.longitude}
          faaBoundary={
            data?.airspace?.source === "faa"
              ? data.airspace.boundary
              : undefined
          }
          krBoundary={
            data?.airspace?.source === "kr" && data.airspace.restricted
              ? data.airspace.matches[0]?.boundary
              : data?.usAirspaceZones?.restricted
                ? data.usAirspaceZones.matches[0]?.boundary
                : data?.esAirspaceZones?.restricted
                  ? data.esAirspaceZones.matches[0]?.boundary
                  : data?.deAirspaceZones?.restricted
                    ? data.deAirspaceZones.matches[0]?.boundary
                    : undefined
          }
          restricted={
            data?.airspace?.source === "kr"
              ? data.airspace.restricted
              : data?.usAirspaceZones
                ? data.usAirspaceZones.restricted
                : data?.esAirspaceZones
                  ? data.esAirspaceZones.restricted
                  : data?.deAirspaceZones
                    ? data.deAirspaceZones.restricted
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
              : isInSpain(selected.latitude, selected.longitude)
                ? ES_AIRSPACE_LAYERS.filter((layer) =>
                    activeEsLayerIds.has(layer.id),
                  ).map((layer) => ({
                    id: layer.id,
                    label: t(`esAirspaceLayerNames.${layer.id}`),
                    wmsLayers: layer.wmsName,
                    wmsUrl: ES_WMS_URL,
                  }))
                : isInGermany(selected.latitude, selected.longitude)
                  ? DE_AIRSPACE_LAYERS.filter((layer) =>
                      activeDeLayerIds.has(layer.id),
                    ).map((layer) => ({
                      id: layer.id,
                      label: t(`deAirspaceLayerNames.${layer.id}`),
                      wmsLayers: getDeQualifiedLayerName(layer),
                      wmsUrl: DE_WMS_URL,
                    }))
                  : undefined
          }
          mapOverlay={
            <>
              {!data || loading ? (
                <div className="pointer-events-none absolute left-1/2 top-2 z-[500] flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-background/90 px-3 py-1 text-xs font-medium text-muted-foreground shadow">
                  <Loader2 className="size-3.5 animate-spin" />
                  {t("airspaceCheckingText")}
                </div>
              ) : null}
              {isInSouthKorea(selected.latitude, selected.longitude) ? (
                <AirspaceLayerPanel
                  layers={AIRSPACE_LAYERS}
                  activeIds={activeLayerIds}
                  onToggle={handleAirspaceLayerToggle}
                  loadingIds={NO_LOADING_LAYER_IDS}
                  getLabel={(id) => t(`airspaceLayerNames.${id}`)}
                  requiredNote={t("airspaceLayersRequiredNote")}
                />
              ) : isInSpain(selected.latitude, selected.longitude) ? (
                <AirspaceLayerPanel
                  layers={ES_AIRSPACE_LAYERS}
                  activeIds={activeEsLayerIds}
                  onToggle={handleEsAirspaceLayerToggle}
                  loadingIds={NO_LOADING_LAYER_IDS}
                  getLabel={(id) => t(`esAirspaceLayerNames.${id}`)}
                />
              ) : isInGermany(selected.latitude, selected.longitude) ? (
                <AirspaceLayerPanel
                  layers={DE_AIRSPACE_LAYERS}
                  activeIds={activeDeLayerIds}
                  onToggle={handleDeAirspaceLayerToggle}
                  loadingIds={NO_LOADING_LAYER_IDS}
                  getLabel={(id) => t(`deAirspaceLayerNames.${id}`)}
                  requiredNote={t("deAirspaceLayersRequiredNote")}
                />
              ) : null}
            </>
          }
        />
      ) : null}

      {loading ? (
        // 날씨/Kp/공역 카드 3개의 스켈레톤 — 실제 카드가 나오는 자리(바로 아래
        // {data && !loading} 블록)와 정확히 같은 위치에 둔다. 이전에는 이
        // 스켈레톤이 지도보다 위에 있어서, 위치는 빨리 정해지고(selected) 데이터만
        // 늦게 도착하는 구간에 "카드 스켈레톤(지도 위) → 실제 카드(지도 아래)"로
        // 자리가 바뀌면서 그 사이에 있던 지도가 위로 밀리는 CLS 0.173 버그가
        // 있었음(2026-09-14 3차, PageSpeed 재측정 CLS 회귀 진단 반영) — 스켈레톤을
        // 실제 카드와 같은 자리로 옮겨 이 문제를 해결함. 지도 스켈레톤과 분리해서,
        // 위치는 이미 정해졌지만(selected) 데이터는 아직 로딩 중인 경우(새 검색
        // 등)에도 지도는 그대로 두고 이 카드들만 스켈레톤으로 보이도록 하는 목적
        // 자체는 2026-09-14 2차와 동일.
        <div className="grid gap-4 md:grid-cols-3">
          <div className="h-32 animate-pulse rounded-lg border border-border bg-muted" />
          <div className="h-32 animate-pulse rounded-lg border border-border bg-muted" />
          <div className="h-32 animate-pulse rounded-lg border border-border bg-muted" />
        </div>
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

            {/* usAirspaceZones/esAirspaceZones가 null이 아니라면(restricted:true든
                false든) 이미 해당 국가 조회가 확정적으로 끝난 것이므로, "상세
                데이터 없음" 문구와 동시에 보여주면 서로 모순된다 — 셋 다 아예
                null(조회 실패/미시도)일 때만 이 문구를 보여준다. */}
            {!data.airspace &&
            !data.usAirspaceZones &&
            !data.esAirspaceZones &&
            !data.deAirspaceZones ? (
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

            {data.esAirspaceZones && data.esAirspaceZones.restricted ? (
              <div className="mt-3 flex flex-col gap-2 border-t border-border pt-3">
                {data.esAirspaceZones.matches.map((m) => {
                  const layer = getEsAirspaceLayer(m.layerId);
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
                        {t(`esAirspaceLayerNames.${m.layerId}`)}
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

            {data.esAirspaceZones && !data.esAirspaceZones.restricted ? (
              <div className="mt-3 border-t border-border pt-3 text-sm text-emerald-500">
                {t("krNoRestriction")}
              </div>
            ) : null}

            {data.deAirspaceZones && data.deAirspaceZones.restricted ? (
              <div className="mt-3 flex flex-col gap-2 border-t border-border pt-3">
                {data.deAirspaceZones.matches.map((m) => {
                  const layer = getDeAirspaceLayer(m.layerId);
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
                        {t(`deAirspaceLayerNames.${m.layerId}`)}
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

            {data.deAirspaceZones && !data.deAirspaceZones.restricted ? (
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

            {/* 스페인은 한국과 동일하게, 사용자가 우측 상단 레이어 패널에서
                직접 켠 레이어만 이 범례에 나열한다(2026-09-07, 사용자 요청 —
                이전에는 showOnMap 필드로 도심(urbano)만 하드코딩으로 숨겼으나,
                이후 항공(Aero)의 TMA도 같은 문제가 있어 사용자가 직접 켜고
                끄는 방식으로 전환함). 기본값은 3개 모두 꺼짐이라, 아무것도
                켜지 않았다면 이 블록 자체를 표시하지 않는다. 지점 클릭/검색
                "공역 정보" 조회 결과(위)는 이 토글과 무관하게 항상 3개 레이어
                전체를 확인하므로, 지도 범례와 조회 결과 목록이 다를 수 있다
                (의도된 동작, 사용자 결정). */}
            {selected &&
            isInSpain(selected.latitude, selected.longitude) &&
            activeEsLayerIds.size > 0 ? (
              <div className="mt-3 flex flex-col gap-1.5 border-t border-border pt-3">
                <p className="text-xs font-medium text-muted-foreground">
                  {t("airspaceActiveLayersTitle")}
                </p>
                <ul className="flex flex-wrap gap-x-3 gap-y-1">
                  {ES_AIRSPACE_LAYERS.filter((layer) =>
                    activeEsLayerIds.has(layer.id),
                  ).map((layer) => (
                    <li
                      key={layer.id}
                      className="flex items-center gap-1.5 text-xs text-muted-foreground"
                    >
                      <span
                        className="inline-block size-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: layer.color }}
                      />
                      {t(`esAirspaceLayerNames.${layer.id}`)}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {/* 독일은 한국과 동일하게 필수 2종(비행제한구역/관제구역)이 항상
                켜져 있어, 사용자가 아무것도 추가로 켜지 않았어도 이 범례가
                항상 표시된다(activeDeLayerIds가 빈 채로 시작하지 않으므로
                스페인처럼 size>0 조건으로 감출 필요가 없음). */}
            {selected && isInGermany(selected.latitude, selected.longitude) ? (
              <div className="mt-3 flex flex-col gap-1.5 border-t border-border pt-3">
                <p className="text-xs font-medium text-muted-foreground">
                  {t("airspaceActiveLayersTitle")}
                </p>
                <ul className="flex flex-wrap gap-x-3 gap-y-1">
                  {DE_AIRSPACE_LAYERS.filter((layer) =>
                    activeDeLayerIds.has(layer.id),
                  ).map((layer) => (
                    <li
                      key={layer.id}
                      className="flex items-center gap-1.5 text-xs text-muted-foreground"
                    >
                      <span
                        className="inline-block size-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: layer.color }}
                      />
                      {t(`deAirspaceLayerNames.${layer.id}`)}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
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
