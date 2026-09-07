"use client";

import { useState } from "react";
import { Layers, Lock, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

/** Minimal shape this panel needs from a country's layer catalog — both
 * AirspaceLayerDef(한국, src/lib/airspace-layers.ts)와
 * EsAirspaceLayerDef(스페인, src/lib/es-airspace-layers.ts)가 이 형태를
 * 만족하므로 카탈로그별로 패널을 따로 만들지 않고 이 컴포넌트를 공유한다. */
export type AirspaceLayerPanelLayer = {
  id: string;
  color: string;
  required: boolean;
};

type AirspaceLayerPanelProps = {
  layers: AirspaceLayerPanelLayer[];
  activeIds: Set<string>;
  onToggle: (id: string, next: boolean) => void;
  loadingIds: Set<string>;
  /** Translated display name for a given layer id — caller supplies this so
   * the panel doesn't need to know which i18n namespace each catalog uses. */
  getLabel: (id: string) => string;
  /** Small note shown above the list, e.g. "필수 레이어는 항상 표시됩니다".
   * Omit when the catalog has no required/locked layers (e.g. Spain). */
  requiredNote?: string;
};

/** Floating "layers" button + slide-out panel, overlaid on the map, listing
 * every layer in the given catalog as a checkbox — required layers (if any)
 * are shown checked and locked, the rest are optional toggles the user
 * turns on to add to the map. Mirrors the layer picker on Korea's official
 * 드론원스톱 (drone.onestop.go.kr) airspace map; reused as-is for Spain's
 * 3-layer ENAIRE catalog (none required there, all default off — see
 * src/lib/es-airspace-layers.ts). */
export function AirspaceLayerPanel({
  layers,
  activeIds,
  onToggle,
  loadingIds,
  getLabel,
  requiredNote,
}: AirspaceLayerPanelProps) {
  const [open, setOpen] = useState(false);
  const t = useTranslations("Home");

  // 패널에 "보여지는" 체크박스 순서만 잠긴(필수) 레이어가 항상 맨 위에 오도록
  // 정렬한다. 지도 위 레이어가 그려지는 원본 순서(각 카탈로그 배열, 지도 타일
  // 겹침 순서에도 쓰임)는 건드리지 않음. Array.sort는 안정 정렬이므로 잠긴
  // 항목끼리·잠기지 않은 항목끼리의 상대 순서는 원본 그대로 유지됨.
  const orderedLayers = [...layers].sort((a, b) => {
    if (a.required === b.required) return 0;
    return a.required ? -1 : 1;
  });

  return (
    <div className="absolute right-2 top-2 z-[500]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={t("airspaceLayersButton")}
        className="flex size-9 items-center justify-center rounded-full border border-border bg-background/95 text-foreground shadow hover:bg-muted"
      >
        <Layers className="size-4" />
      </button>

      {open ? (
        <div className="absolute right-0 top-11 max-h-56 w-64 overflow-y-auto rounded-lg border border-border bg-background/95 p-3 shadow-lg backdrop-blur-sm sm:max-h-80">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-semibold">
              {t("airspaceLayersTitle")}
            </span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label={t("airspaceLayersClose")}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          </div>

          {requiredNote ? (
            <p className="mb-2 text-xs text-muted-foreground">
              {requiredNote}
            </p>
          ) : null}

          <ul className="flex flex-col gap-1.5">
            {orderedLayers.map((layer) => {
              const checked = activeIds.has(layer.id);
              const loading = loadingIds.has(layer.id);
              return (
                <li key={layer.id}>
                  <label
                    className={cn(
                      "flex cursor-pointer items-center gap-2 rounded px-1 py-1 text-sm hover:bg-muted",
                      layer.required && "cursor-not-allowed opacity-80",
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={layer.required}
                      onChange={(e) => onToggle(layer.id, e.target.checked)}
                      className="size-3.5 shrink-0"
                    />
                    <span
                      className="size-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: layer.color }}
                    />
                    <span className="flex-1 truncate">
                      {getLabel(layer.id)}
                    </span>
                    {layer.required ? (
                      <Lock className="size-3 shrink-0 text-muted-foreground" />
                    ) : loading ? (
                      <span className="size-3 shrink-0 animate-pulse rounded-full bg-muted-foreground/40" />
                    ) : null}
                  </label>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
