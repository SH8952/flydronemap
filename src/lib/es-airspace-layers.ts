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
  /** 지도 상시 오버레이(WMS)에 포함할지 여부. 지점 클릭/검색 조회
   * (`/api/es-airspace-lookup`)에는 이 값과 무관하게 항상 포함된다 —
   * 순수하게 "지도에 항상 그려둘지"만 결정한다.
   *
   * urbano(도심)는 false다: 실측 확인(2026-09-07) 결과 이 레이어는 전체
   * 4건 중 "NPDRID"(인구밀집지역 근처 인가 필요, reasons: POPULATION)
   * 하나가 스페인 본토 전체와 거의 같은 크기(위도 35.8~45, 경도 -13~-0.07)
   * 로 등록되어 있어, 지도를 조금만 축소해도 화면 대부분을 분홍색으로
   * 뒤덮어버린다 — 데이터 자체는 정확하지만("인구밀집지역 근처는 항상
   * 확인 필요"라는 실제 규정을 그대로 반영한 것) 상시 오버레이로 두면
   * 지도가 사실상 못 쓰게 됨. 사용자 확인 후 상시 오버레이에서는 제외하고,
   * 지점 클릭/검색 시 "공역 정보" 텍스트 패널에서는 그대로 계속 보여주기로
   * 결정함. */
  showOnMap: boolean;
};

export const ES_AIRSPACE_LAYERS: EsAirspaceLayerDef[] = [
  { id: "aero", mapServerId: 2, wmsName: "0", color: "#ef4444", showOnMap: true },
  { id: "urbano", mapServerId: 3, wmsName: "1", color: "#f59e0b", showOnMap: false },
  { id: "infraestructuras", mapServerId: 0, wmsName: "2", color: "#3b82f6", showOnMap: true },
];

export function getEsAirspaceLayer(
  id: string,
): EsAirspaceLayerDef | undefined {
  return ES_AIRSPACE_LAYERS.find((l) => l.id === id);
}

/** 지도 상시 오버레이에 포함되는 레이어(`showOnMap: true`)만 한 번에 겹쳐
 * 그리기 위한 WMS `layers` 파라미터(콤마 구분, WMS Name 기준). urbano가
 * 제외되는 이유는 위 `showOnMap` 필드 주석 참고. */
export function getEsWmsLayerParam(): string {
  return ES_AIRSPACE_LAYERS.filter((l) => l.showOnMap)
    .map((l) => l.wmsName)
    .join(",");
}

export const ES_MAPSERVER_BASE_URL =
  "https://servais.enaire.es/insignia/rest/services/NSF_SRV/SRV_UAS_ZG_V0/MapServer";

export const ES_WMS_URL =
  "https://servais.enaire.es/insignia/services/NSF_SRV/SRV_UAS_ZG_V0/MapServer/WMSServer";
