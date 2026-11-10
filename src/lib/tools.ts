/**
 * 도구(계산기) 목록. 새 도구를 추가할 때는 여기에 한 줄 추가하고
 * messages/*.json 의 "Tools" 네임스페이스에 같은 key 로 문구를 넣는다.
 * slug 는 모든 언어에서 같은 영문 주소를 쓴다(가이드 주소와 같은 방식).
 */
export type ToolKey = "ndFilter" | "flightTime" | "batteryCheck" | "goldenHour";

export type ToolDef = {
  key: ToolKey;
  slug: string;
  /** 함께 읽을 가이드 slug (해당 언어에 번역본이 있는 것만 보여 준다) */
  guides: string[];
};

export const TOOLS: readonly ToolDef[] = [
  {
    key: "ndFilter",
    slug: "nd-filter-calculator",
    guides: ["nd-filter-guide-for-drone-cinematography", "best-time-of-day-to-fly-a-drone"],
  },
  {
    key: "flightTime",
    slug: "flight-time-calculator",
    guides: [
      "how-to-extend-drone-flight-time",
      "temperature-and-drone-battery-performance",
      "drone-wind-resistance-by-model",
    ],
  },
  {
    key: "batteryCheck",
    slug: "battery-airline-check",
    guides: ["packing-a-drone-travel-bag-checklist", "drone-battery-care-and-lifespan-tips"],
  },
  {
    key: "goldenHour",
    slug: "golden-hour-planner",
    guides: ["best-time-of-day-to-fly-a-drone", "what-weather-data-to-check-before-flying-a-drone"],
  },
];

export function getTool(key: ToolKey): ToolDef {
  const tool = TOOLS.find((t) => t.key === key);
  if (!tool) throw new Error(`Unknown tool: ${key}`);
  return tool;
}
