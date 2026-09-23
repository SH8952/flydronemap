/**
 * 독일 DIPUL(Digitale Plattform Unbemannte Luftfahrt, 독일 항행청 DFS가
 * 운영하는 공식 드론 지리정보 플랫폼) 지리적 구역(Geografische Gebiete,
 * §21h LuftVO 기준) 카탈로그.
 *
 * 서비스: 공개 GeoServer WMS — `DE_WMS_URL` (`https://uas-betrieb.de/geoservices/dipul/wms`).
 * 공식 문서(dipul.de/homepage/en/help/instructions-for-the-web-map-service-wms/)
 * 상 인증키·등록·도메인 등록이 전혀 필요 없는 완전 공개 API로 명시돼 있고,
 * `GetFeatureInfo`(지점 조회)도 OGC 표준으로 정식 지원된다고 문서화되어 있다.
 *
 * **주의(2026-09-22, 사전 검증 한계)**: 한국(VWorld)·스페인(ENAIRE) 때와
 * 달리, 이 서비스는 클라우드 세션의 아웃바운드 네트워크 정책(독일 정부
 * 도메인 전체 차단)과 WebFetch의 robots.txt 준수 정책 두 가지 모두에 막혀
 * 사전에 실제 좌표로 GetFeatureInfo 응답을 실측하지 못했다. 아래 레이어
 * 목록과 WMS 기본 주소는 공식 문서 설명 + 실제 동작 중인 예시
 * GetMap 요청 URL(커뮤니티 자료에서 확인, 동일 GeoServer 인스턴스·동일
 * `dipul:` 네임스페이스)로 교차 확인한 것이며, `GetFeatureInfo`의 정확한
 * 응답 스키마(속성 필드명 등)는 배포 후 실서버(Vercel)에서 최종 검증이
 * 필요하다 — /api/de-airspace-lookup/route.ts 상단 주석 참고.
 *
 * **수정(2026-09-23, 실사용 버그 수정)**: 사용자가 로컬에서 지도의 비행제한
 * 구역을 클릭했을 때 "공역 정보" 카드에 상세 내용이 전혀 뜨지 않는 문제를
 * 보고. Claude in Chrome으로 이 GeoServer의 GetCapabilities를 직접 조회해
 * 실제 존재하는 레이어명 전체와 이 카탈로그를 대조한 결과, `verfassungsorgane`
 * 와 `oberste_behoerden`(변수명 `obersteBehoerden`) 두 레이어가 서버에
 * 존재하지 않는 것으로 확인됨(`ServiceException code="LayerNotDefined"`).
 * GetFeatureInfo는 LAYERS 파라미터에 포함된 모든 레이어를 한 번에 검증하므로,
 * 존재하지 않는 레이어 하나만 있어도 요청 전체가 실패해 필수 레이어
 * (flugbeschraenkungsgebiete/kontrollzonen 포함)까지 응답을 받지 못했음 —
 * 이것이 실제 버그의 원인이었다. 두 항목은 지도 타일 오버레이(GetMap)로도
 * 애초에 동작하지 않았을 것이므로(같은 레이어명을 재사용) 카탈로그에서
 * 제거했다 — 기능 축소가 아니라 원래도 죽어 있던 항목 제거.
 *
 * 레이어 네임스페이스는 `dipul:<레이어명>`이며, 이 카탈로그의 `wmsName`
 * 필드에는 네임스페이스 없이 레이어명만 저장한다(호출부에서 필요 시
 * `dipul:` 접두사를 붙인다) — 한국(AIRSPACE_LAYERS)·스페인
 * (ES_AIRSPACE_LAYERS)과 같은 이유로, 지도 오버레이(WMSTileLayer)와 지점
 * 조회(GetFeatureInfo) 양쪽에서 같은 값을 그대로 재사용하기 위함이다.
 *
 * required(항상 켜짐, 끌 수 없음)로 지정한 두 레이어는 실제 비행 제한과
 * 직결되는 핵심 규제 구역이다 — 한국의 "필수 3종"(비행금지/비행제한/관제권)과
 * 같은 취지:
 *   - flugbeschraenkungsgebiete: 비행제한구역(§21h LuftVO에 따른 실제 비행
 *     제한/금지 구역, 임시 구역 포함)
 *   - kontrollzonen: 관제구역(공항 주변 관제권, CTR)
 * 나머지 29개는 참고용 근접 정보(자연보호구역·주요 시설·기반시설 등)로,
 * 스페인 구현 때의 교훈(넓은 면적의 레이어가 사전 안내 없이 지도를 뒤덮는
 * 문제)을 고려해 기본값을 모두 꺼짐으로 두고 사용자가 레이어 패널에서 직접
 * 선택하도록 한다.
 */

export type DeAirspaceLayerId =
  | "flugbeschraenkungsgebiete"
  | "kontrollzonen"
  | "flugplaetze"
  | "flughaefen"
  | "naturschutzgebiete"
  | "nationalparks"
  | "vogelschutzgebiete"
  | "ffhGebiete"
  | "bundesautobahnen"
  | "bundesstrassen"
  | "bahnanlagen"
  | "binnenwasserstrassen"
  | "seewasserstrassen"
  | "schifffahrtsanlagen"
  | "stromleitungen"
  | "windkraftanlagen"
  | "kraftwerke"
  | "umspannwerke"
  | "wohngrundstuecke"
  | "freibaeder"
  | "industrieanlagen"
  | "justizvollzugsanstalten"
  | "militaerischeAnlagen"
  | "labore"
  | "diplomatischeVertretungen"
  | "internationaleOrganisationen"
  | "polizei"
  | "sicherheitsbehoerden"
  | "krankenhaeuser";

export type DeAirspaceLayerDef = {
  id: DeAirspaceLayerId;
  /** GeoServer의 실제 레이어명(네임스페이스 `dipul:` 제외) — WMSTileLayer의
   * `layers` prop과 GetFeatureInfo의 `QUERY_LAYERS`/`LAYERS`에 그대로 쓰인다. */
  wmsName: string;
  color: string;
  /** Required layers are always shown and can't be turned off by the user —
   * AirspaceLayerDef(한국)/EsAirspaceLayerDef(스페인)와 동일한 필드라 같은
   * AirspaceLayerPanel 컴포넌트를 공유한다. */
  required: boolean;
};

export const DE_AIRSPACE_LAYERS: DeAirspaceLayerDef[] = [
  { id: "flugbeschraenkungsgebiete", wmsName: "flugbeschraenkungsgebiete", color: "#ef4444", required: true },
  { id: "kontrollzonen", wmsName: "kontrollzonen", color: "#3b82f6", required: true },
  { id: "flugplaetze", wmsName: "flugplaetze", color: "#14b8a6", required: false },
  { id: "flughaefen", wmsName: "flughaefen", color: "#0ea5e9", required: false },
  { id: "naturschutzgebiete", wmsName: "naturschutzgebiete", color: "#22c55e", required: false },
  { id: "nationalparks", wmsName: "nationalparks", color: "#16a34a", required: false },
  { id: "vogelschutzgebiete", wmsName: "vogelschutzgebiete", color: "#84cc16", required: false },
  { id: "ffhGebiete", wmsName: "ffh-gebiete", color: "#65a30d", required: false },
  { id: "bundesautobahnen", wmsName: "bundesautobahnen", color: "#737373", required: false },
  { id: "bundesstrassen", wmsName: "bundesstrassen", color: "#a3a3a3", required: false },
  { id: "bahnanlagen", wmsName: "bahnanlagen", color: "#78716c", required: false },
  { id: "binnenwasserstrassen", wmsName: "binnenwasserstrassen", color: "#0891b2", required: false },
  { id: "seewasserstrassen", wmsName: "seewasserstrassen", color: "#0e7490", required: false },
  { id: "schifffahrtsanlagen", wmsName: "schifffahrtsanlagen", color: "#155e75", required: false },
  { id: "stromleitungen", wmsName: "stromleitungen", color: "#eab308", required: false },
  { id: "windkraftanlagen", wmsName: "windkraftanlagen", color: "#ca8a04", required: false },
  { id: "kraftwerke", wmsName: "kraftwerke", color: "#a16207", required: false },
  { id: "umspannwerke", wmsName: "umspannwerke", color: "#854d0e", required: false },
  { id: "wohngrundstuecke", wmsName: "wohngrundstuecke", color: "#f97316", required: false },
  { id: "freibaeder", wmsName: "freibaeder", color: "#06b6d4", required: false },
  { id: "industrieanlagen", wmsName: "industrieanlagen", color: "#64748b", required: false },
  { id: "justizvollzugsanstalten", wmsName: "justizvollzugsanstalten", color: "#7c3aed", required: false },
  { id: "militaerischeAnlagen", wmsName: "militaerische_anlagen", color: "#6d28d9", required: false },
  { id: "labore", wmsName: "labore", color: "#9333ea", required: false },
  { id: "diplomatischeVertretungen", wmsName: "diplomatische_vertretungen", color: "#db2777", required: false },
  { id: "internationaleOrganisationen", wmsName: "internationale_organisationen", color: "#e11d48", required: false },
  { id: "polizei", wmsName: "polizei", color: "#4338ca", required: false },
  { id: "sicherheitsbehoerden", wmsName: "sicherheitsbehoerden", color: "#4f46e5", required: false },
  { id: "krankenhaeuser", wmsName: "krankenhaeuser", color: "#dc2626", required: false },
];

export function getDeAirspaceLayer(
  id: string,
): DeAirspaceLayerDef | undefined {
  return DE_AIRSPACE_LAYERS.find((l) => l.id === id);
}

export const DE_WMS_URL = "https://uas-betrieb.de/geoservices/dipul/wms";

/** GetFeatureInfo/GetMap의 LAYERS 파라미터에 쓸 네임스페이스 포함 레이어명. */
export function getDeQualifiedLayerName(layer: DeAirspaceLayerDef): string {
  return `dipul:${layer.wmsName}`;
}
