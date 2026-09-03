/**
 * Catalog of United States airspace layers, queried point-by-point from
 * FAA's public ArcGIS Online FeatureServer services (services6.arcgis.com,
 * organization ssFJjBXIUyZDrSYZ). Unlike Korea's catalog (see
 * src/lib/airspace-layers.ts), these are NOT rendered as a persistent
 * map overlay: this ArcGIS organization only exposes vector FeatureServer
 * query endpoints, not a WMS/MapServer image service, so an always-on
 * colored overlay would require re-querying every polygon in the visible
 * map on every pan/zoom (heavy, and large layers like Class B are
 * expensive). Instead — same approach as the FAA UAS Facility Map ceiling
 * lookup already used elsewhere in this app (src/lib/airspace.ts) — a
 * single point query runs only for the searched/clicked location, and the
 * (at most one) matched zone's boundary is drawn via FlightMap's existing
 * `krBoundary` prop, reused as a generic "matched zone" slot.
 *
 * Field values were verified 2026-09 by querying the live FeatureServer
 * endpoints directly:
 * - Class_Airspace: CLASS is one of "B"/"C"/"D"/"E" for the layers below;
 *   other values (e.g. "Other" for Mode C veils) are intentionally not
 *   mapped to any layer here and are skipped by the lookup route.
 * - Special_Use_Airspace: TYPE_CODE is one of "P"/"R"/"W"/"A"/"MOA" for the
 *   layers below. TYPE_CODE "NSA" (National Security Area) was confirmed
 *   empty in this dataset and is out of scope.
 * - FAA_Recognized_Identification_Areas has no type/class attribute — any
 *   returned feature is a FRIA match.
 */

export type UsAirspaceLayerDef = {
  id: string;
  /** Hex color used for the matched-zone map boundary and the info card's
   * colored dot — kept close to src/lib/airspace-layers.ts's palette for
   * visual consistency between the Korea and US experiences. */
  color: string;
};

export const US_AIRSPACE_LAYERS: UsAirspaceLayerDef[] = [
  { id: "prohibited", color: "#ef4444" },
  { id: "restricted", color: "#f97316" },
  { id: "classB", color: "#3b82f6" },
  { id: "classC", color: "#0ea5e9" },
  { id: "classD", color: "#14b8a6" },
  { id: "classE", color: "#84cc16" },
  { id: "alert", color: "#a855f7" },
  { id: "warning", color: "#eab308" },
  { id: "moa", color: "#8b5cf6" },
  { id: "fria", color: "#22c55e" },
];

export function getUsAirspaceLayer(id: string): UsAirspaceLayerDef | undefined {
  return US_AIRSPACE_LAYERS.find((layer) => layer.id === id);
}
