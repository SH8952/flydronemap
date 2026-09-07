/**
 * ENAIRE(스페인 항행서비스 제공기관, AESA 산하) UAS 지리적 구역(ZGUAS, Zonas
 * Geográficas de UAS) 카탈로그.
 *
 * 서비스: ArcGIS Server `NSF_SRV/SRV_UAS_ZG_V0` — 인증키/등록/도메인 등록이
 * 전혀 필요 없는 완전 공개 API로 실측 확인됨(2026-09-07).
 *   - 지점 조회(REST): `${ES_MAPSERVER_BASE_URL}/{mapServerId}/query`
 *   - 지도 오버레이(WMS GetMap): `ES_WMS_URL`
 * 이 서비스는 FeatureServer 확장이 없음(500 오류로 실측 확인) — 반드시
 * MapServer 경로로만 조회해야 한다.
 *
 * **중요(실측으로 확인한 주의점)**: MapServer REST 조회에 쓰는 레이어 id와
 * WMS GetCapabilities가 광고하는 레이어 Name이 서로 다르다 — WMS는 ArcGIS
 * Server가 자동으로 부여하는 0부터 시작하는 "표시 순서" 인덱스를 쓰고, REST id는
 * 서비스에 원래 정의된 값을 그대로 쓴다. 실제 확인된 매핑:
 *
 *   레이어                   MapServer REST id(질의용)   WMS Name(GetMap용)
 *   ZGUAS_Aero                        2                        "0"
 *   ZGUAS_Urbano                      3                        "1"
 *   ZGUAS_Infraestructuras            0                        "2"
 *
 * 이 두 값을 뒤섞으면 지점 조회(query)는 되지만 지도 타일은 엉뚱한 레이어를
 * 그리거나 빈 타일이 되므로, 항상 이 카탈로그의 `mapServerId`/`wmsName`
 * 필드를 통해서만 참조할 것.
 *
 * 한국(VWorld)과 달리 인증키가 전혀 필요 없어 서버 IP 차단(VWorld-Vercel
 * 이슈, src/lib/airspace-layers.ts 참고) 자체가 발생하지 않는다.
 *
 * **지도 상시 오버레이는 사용자가 직접 켜고 끄는 토글 패널
 * (`AirspaceLayerPanel`, src/components/drone-dashboard.tsx에서
 * `activeEsLayerIds` state로 관리)로 제어된다 — 한국(AIRSPACE_LAYERS)과
 * 동일한 방식. 이전에는 이 카탈로그 자체에 `showOnMap` boolean 필드를 두어
 * urbano만 하드코딩으로 숨겼으나(2026-09-07 최초 대응), 그 직후 항공(Aero)
 * 레이어의 "TMA MADRID"(마드리드 터미널관제구역, 약 250km×215km)도 넓게
 * 표시되는 문제가 발견되어, 개별 레이어를 하드코딩으로 켜고 끄는 대신
 * 사용자가 직접 원하는 레이어만 지도에 표시할 수 있는 패널로 대체함
 * (2026-09-07, 사용자 요청). 3개 레이어 모두 필수(required)가 아니며,
 * 사용자의 명시적 요청에 따라 초기 상태는 모두 꺼짐 — 도심(Urbano)의
 * "NPDRID"(스페인 본토 전체 크기) 구역이나 항공(Aero)의 TMA 같은 큰 구역이
 * 사전 안내 없이 지도를 뒤덮는 것을 막기 위함이다. 지점 클릭/검색 조회
 * (`/api/es-airspace-lookup`)는 이 토글 상태와 무관하게 항상 3개 레이어
 * 전체를 확인한다(사용자 결정, 2026-09-07).
 */

export type EsAirspaceLayerId = "aero" | "urbano" | "infraestructuras";

export type EsAirspaceLayerDef = {
  id: EsAirspaceLayerId;
  /** MapServer REST 하위 레이어 id — `/MapServer/{mapServerId}/query`에 사용. */
  mapServerId: number;
  /** WMS GetCapabilities가 광고하는 레이어 Name(위 주석 참고) — WMSTileLayer의
   * `layers` prop에 사용. */
  wmsName: string;
  color: string;
  /** Required layers are always shown and can't be turned off by the user —
   * mirrors AirspaceLayerDef(한국, src/lib/airspace-layers.ts)의 필드라 두
   * 카탈로그가 같은 AirspaceLayerPanel 컴포넌트를 공유할 수 있다. ENAIRE의
   * 3개 레이어 중 필수로 고정할 레이어는 없어 항상 false. */
  required: boolean;
};

export const ES_AIRSPACE_LAYERS: EsAirspaceLayerDef[] = [
  { id: "aero", mapServerId: 2, wmsName: "0", color: "#ef4444", required: false },
  { id: "urbano", mapServerId: 3, wmsName: "1", color: "#f59e0b", required: false },
  { id: "infraestructuras", mapServerId: 0, wmsName: "2", color: "#3b82f6", required: false },
];

export function getEsAirspaceLayer(
  id: string,
): EsAirspaceLayerDef | undefined {
  return ES_AIRSPACE_LAYERS.find((l) => l.id === id);
}

export const ES_MAPSERVER_BASE_URL =
  "https://servais.enaire.es/insignia/rest/services/NSF_SRV/SRV_UAS_ZG_V0/MapServer";

export const ES_WMS_URL =
  "https://servais.enaire.es/insignia/services/NSF_SRV/SRV_UAS_ZG_V0/MapServer/WMSServer";
