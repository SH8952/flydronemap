/**
 * 판정(양호/주의/비권장) 표시용 아이콘·색상 공통 정의. 대시보드의 Good-to-Fly
 * 배너, 기종 판정 카드, 24시간 타임라인이 같은 모양을 쓰도록 한곳에 둔다.
 */
import { CircleCheck, TriangleAlert, CircleX } from "lucide-react";
import type { FlightVerdict } from "@/lib/weather";

export const VERDICT_ICON: Record<FlightVerdict, typeof CircleCheck> = {
  good: CircleCheck,
  caution: TriangleAlert,
  "no-fly": CircleX,
};

export const VERDICT_TEXT_COLOR: Record<FlightVerdict, string> = {
  good: "text-emerald-500",
  caution: "text-amber-500",
  "no-fly": "text-red-500",
};

export const VERDICT_BORDER_COLOR: Record<FlightVerdict, string> = {
  good: "border-emerald-500/30",
  caution: "border-amber-500/30",
  "no-fly": "border-red-500/30",
};

export const VERDICT_BG_COLOR: Record<FlightVerdict, string> = {
  good: "bg-emerald-500/10",
  caution: "bg-amber-500/10",
  "no-fly": "bg-red-500/10",
};
