"use client";

import { useTranslations } from "next-intl";
import { Plane } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  DRONE_MODELS,
  getDroneModel,
  modelMaxWindKmh,
  modelWindRatio,
  modelWindVerdict,
} from "@/lib/drone-models";
import {
  VERDICT_BORDER_COLOR,
  VERDICT_ICON,
  VERDICT_TEXT_COLOR,
} from "@/lib/verdict-style";

const NONE_VALUE = "none";

type AltitudeLevel = { altitudeM: number; windSpeedKmh: number };

/**
 * "내 기종" 기준 바람 판정 카드(2026-10-03 신규). 제조사 공식 최대 풍속과 현재
 * 돌풍을 비교한다. 판정은 지표 돌풍 기준이며, 80m/120m 고도 바람이 더 강하면
 * 판정은 바꾸지 않고 안내 문구만 덧붙인다.
 */
export function DroneModelVerdict({
  modelId,
  onModelChange,
  windGustKmh,
  altitudeLevels,
}: {
  modelId: string;
  onModelChange: (id: string) => void;
  windGustKmh: number;
  altitudeLevels?: AltitudeLevel[];
}) {
  const t = useTranslations("Home");
  const model = getDroneModel(modelId);

  let content: React.ReactNode = (
    <p className="text-sm text-muted-foreground">{t("modelPanelEmpty")}</p>
  );

  if (model) {
    const verdict = modelWindVerdict(model, windGustKmh);
    const VerdictIcon = VERDICT_ICON[verdict];
    const pct = Math.round(modelWindRatio(model, windGustKmh) * 100);
    const maxKmh = Math.round(modelMaxWindKmh(model));

    // 80m/120m 바람이 지표 돌풍보다 강하고, 그 값만으로도 "주의" 이상이면 안내.
    const strongestAltitude = (altitudeLevels ?? [])
      .filter((l) => l.altitudeM >= 80)
      .sort((a, b) => b.windSpeedKmh - a.windSpeedKmh)[0];
    const showAltitudeNote =
      strongestAltitude !== undefined &&
      strongestAltitude.windSpeedKmh > windGustKmh &&
      modelWindVerdict(model, strongestAltitude.windSpeedKmh) !== "good";

    content = (
      <div className="flex flex-col gap-2">
        <div
          className={cn(
            "flex items-start gap-3 rounded-lg border p-3",
            VERDICT_BORDER_COLOR[verdict],
          )}
        >
          <VerdictIcon
            className={cn("mt-0.5 size-5 shrink-0", VERDICT_TEXT_COLOR[verdict])}
          />
          <div>
            <div className={cn("font-semibold", VERDICT_TEXT_COLOR[verdict])}>
              {t(`modelVerdict.${verdict}`)}
            </div>
            <p className="text-sm text-muted-foreground">
              {t(`modelVerdictHint.${verdict}`)}
            </p>
          </div>
        </div>
        <p className="text-sm">
          {t("modelRatio", {
            gust: Math.round(windGustKmh),
            max: maxKmh,
            pct,
          })}
        </p>
        {showAltitudeNote && strongestAltitude ? (
          <p className="text-xs text-amber-500">
            {t("modelAltitudeNote", {
              altitude: strongestAltitude.altitudeM,
              speed: Math.round(strongestAltitude.windSpeedKmh),
            })}
          </p>
        ) : null}
        {model.conservative ? (
          <p className="text-xs text-muted-foreground">
            {t("modelConservativeNote")}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 font-semibold">
          <Plane className="size-4" />
          {t("modelPanelTitle")}
        </div>
        <Select
          value={model ? model.id : NONE_VALUE}
          onValueChange={(v) => onModelChange(v === NONE_VALUE ? "" : v)}
        >
          <SelectTrigger
            className="h-10 w-full sm:w-64"
            aria-label={t("modelSelectLabel")}
          >
            <SelectValue placeholder={t("modelSelectPlaceholder")} />
          </SelectTrigger>
          {/* 지도(Leaflet 컨트롤 z-index 1000) 위에 목록이 보이도록 z-[1100] —
              국가 선택 드롭다운과 같은 이유. */}
          <SelectContent align="end" className="z-[1100]">
            <SelectItem value={NONE_VALUE}>{t("modelSelectNone")}</SelectItem>
            {DRONE_MODELS.map((m) => (
              <SelectItem key={m.id} value={m.id}>
                {m.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {content}
      <p className="mt-3 text-xs text-muted-foreground">
        {t("modelDisclaimer")}
      </p>
    </div>
  );
}
