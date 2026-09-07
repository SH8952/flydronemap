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
};

export const ES_AIRSPACE_LAYERS: EsAirspaceLayerDef[] = [
  { id: "aero", mapServerId: 2, wmsName: "0", color: "#ef4444" },
  { id: "urbano", mapServerId: 3, wmsName: "1", color: "#f59e0b" },
  { id: "infraestructuras", mapServerId: 0, wmsName: "2", color: "#3b82f6" },
];

export function getEsAirspaceLayer(
  id: string,
): EsAirspaceLayerDef | undefined {
  return ES_AIRSPACE_LAYERS.find((l) => l.id === id);
}

/** 세 레이어를 한 번에 겹쳐 그리기 위한 WMS `layers` 파라미터(콤마 구분,
 * WMS Name 기준) — 스페인은 레이어가 3개뿐이고 사용자가 켜고 끌 "선택 사항"의
 * 성격이 아니라(모두 인가/신고 필요 구역 카테고리) 항상 전부 함께 표시한다. */
export function getEsWmsLayerParam(): string {
  return ES_AIRSPACE_LAYERS.map((l) => l.wmsName).join(",");
}

export const ES_MAPSERVER_BASE_URL =
  "https://servais.enaire.es/insignia/rest/services/NSF_SRV/SRV_UAS_ZG_V0/MapServer";

export const ES_WMS_URL =
  "https://servais.enaire.es/insignia/services/NSF_SRV/SRV_UAS_ZG_V0/MapServer/WMSServer";
