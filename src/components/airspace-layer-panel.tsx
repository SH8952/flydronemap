"use client";

import { useState } from "react";
import { Layers, Lock, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { AIRSPACE_LAYERS } from "@/lib/airspace-layers";
import { cn } from "@/lib/utils";

type AirspaceLayerPanelProps = {
  activeIds: Set<string>;
  onToggle: (id: string, next: boolean) => void;
  loadingIds: Set<string>;
};

/** Floating "layers" button + slide-out panel, overlaid on the map, listing
 * every Korean airspace layer as a checkbox — required layers (비행금지구역,
 * 관제권, 비행제한구역) are shown checked and locked, the rest are optional
 * toggles the user turns on to add to the map. Mirrors the layer picker on
 * Korea's official 드론원스톱 (drone.onestop.go.kr) airspace map. */
export function AirspaceLayerPanel({
  activeIds,
  onToggle,
  loadingIds,
}: AirspaceLayerPanelProps) {
  const [open, setOpen] = useState(false);
  const t = useTranslations("Home");
  const tLayer = useTranslations("Home.airspaceLayerNames");

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
        <div className="absolute right-0 top-11 max-h-[60vh] w-64 overflow-y-auto rounded-lg border border-border bg-background/95 p-3 shadow-lg backdrop-blur-sm">
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

          <p className="mb-2 text-xs text-muted-foreground">
            {t("airspaceLayersRequiredNote")}
          </p>

          <ul className="flex flex-col gap-1.5">
            {AIRSPACE_LAYERS.map((layer) => {
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
                      {tLayer(layer.id)}
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
