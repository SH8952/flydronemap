"use client";

import { useTranslations } from "next-intl";
import { Clock, Droplets, Moon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DroneModel } from "@/lib/drone-models";
import {
  findBestWindow,
  hourlyVerdict,
  type HourlyCondition,
} from "@/lib/hourly-conditions";
import {
  VERDICT_BG_COLOR,
  VERDICT_BORDER_COLOR,
  VERDICT_ICON,
  VERDICT_TEXT_COLOR,
} from "@/lib/verdict-style";

// "2026-10-03T14:00" → "14:00"
function hourLabel(time: string): string {
  return time.slice(11, 16);
}

// 구간 끝 라벨: 마지막 시간대의 다음 정시 ("17:00" 시간대까지면 "18:00").
function endLabel(time: string): string {
  const hour = Number(time.slice(11, 13));
  return `${String((hour + 1) % 24).padStart(2, "0")}:00`;
}

// "2026-10-03T00:00" → "10-03"
function dateLabel(time: string): string {
  return time.slice(5, 10);
}

/**
 * 지금부터 24시간의 비행 조건 타임라인(2026-10-03 신규). 시간대별 돌풍·강수·
 * 가시거리로 양호/주의/비권장을 표시하고, 가장 좋은 연속 시간대를 요약한다.
 * 기종을 골랐다면 기종 기준 돌풍 판정도 함께 반영한다. Kp 지수는 현재값만 있어
 * 반영하지 않는다(화면에 안내).
 */
export function HourlyFlightTimeline({
  hours,
  model,
}: {
  hours: HourlyCondition[];
  model: DroneModel | null;
}) {
  const t = useTranslations("Home");
  const best = findBestWindow(hours, model);

  let summary: string;
  let summaryLevel: "good" | "caution" | "no-fly";
  if (!best) {
    summary = t("hourlyNoWindow");
    summaryLevel = "no-fly";
  } else {
    const values = {
      start: hourLabel(hours[best.startIndex].time),
      end: endLabel(hours[best.endIndex].time),
      min: Math.round(best.minGustKmh),
      max: Math.round(best.maxGustKmh),
    };
    summary =
      best.level === "good"
        ? t("hourlyBestGood", values)
        : t("hourlyBestCaution", values);
    summaryLevel = best.level;
  }

  return (
    <div className="rounded-lg border border-border p-5">
      <div className="mb-3 flex items-center gap-2 font-semibold">
        <Clock className="size-4" />
        {t("hourlyTitle")}
      </div>

      <p
        className={cn(
          "mb-3 rounded-md px-3 py-2 text-sm font-medium",
          VERDICT_BG_COLOR[summaryLevel],
          VERDICT_TEXT_COLOR[summaryLevel],
        )}
      >
        {summary}
      </p>
      {model ? (
        <p className="mb-3 text-xs text-muted-foreground">
          {t("hourlyModelBasis", { model: model.name })}
        </p>
      ) : null}

      <ul
        aria-label={t("hourlyListLabel")}
        className="flex gap-2 overflow-x-auto pb-2"
      >
        {hours.map((h, i) => {
          const verdict = hourlyVerdict(h, model);
          const Icon = VERDICT_ICON[verdict];
          const showDate =
            i === 0 || dateLabel(h.time) !== dateLabel(hours[i - 1].time);
          const raining = h.precipitationMm >= 0.1;
          return (
            <li
              key={h.time}
              aria-label={`${hourLabel(h.time)} ${t(`hourlyLegend.${verdict}`)} ${Math.round(h.windGustKmh)} km/h`}
              className={cn(
                "flex min-w-[64px] shrink-0 flex-col items-center gap-1 rounded-lg border px-2 py-2 text-center",
                VERDICT_BORDER_COLOR[verdict],
              )}
            >
              <span className="text-[10px] leading-none text-muted-foreground">
                {showDate ? dateLabel(h.time) : " "}
              </span>
              <span className="text-xs font-semibold">
                {i === 0 ? t("hourlyNow") : hourLabel(h.time)}
              </span>
              <Icon className={cn("size-5", VERDICT_TEXT_COLOR[verdict])} />
              <span className="text-xs font-medium">
                {Math.round(h.windGustKmh)}
                <span className="ml-0.5 text-[10px] text-muted-foreground">
                  km/h
                </span>
              </span>
              <span className="flex h-4 items-center gap-1 text-muted-foreground">
                {raining ? (
                  <Droplets
                    className="size-3.5 text-sky-500"
                    aria-label={t("hourlyRain")}
                  />
                ) : null}
                {!h.isDay ? (
                  <Moon className="size-3.5" aria-label={t("hourlyNight")} />
                ) : null}
              </span>
            </li>
          );
        })}
      </ul>

      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {(["good", "caution", "no-fly"] as const).map((v) => {
          const Icon = VERDICT_ICON[v];
          return (
            <li key={v} className="flex items-center gap-1.5">
              <Icon className={cn("size-3.5", VERDICT_TEXT_COLOR[v])} />
              {t(`hourlyLegend.${v}`)}
            </li>
          );
        })}
      </ul>
      <p className="mt-3 text-xs text-muted-foreground">{t("hourlyHint")}</p>
    </div>
  );
}
