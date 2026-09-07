const KV_URL = process.env.KV_REST_API_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN;

// Redis key prefix — this project's slice of the shared Vercel KV
// (Upstash Redis) instance connected to all three sibling sites
// (ExifLens/FlyDroneMap/firelic), so one free-tier database can be reused
// instead of provisioning one per project.
const PROJECT = "flydronemap";
const TOTAL_KEY = `${PROJECT}:visitor_count`;
const DAILY_KEY_PREFIX = `${PROJECT}:visitor_count:daily:`;
// Old daily buckets clean themselves up via TTL instead of manual deletion.
const DAILY_TTL_SECONDS = 60 * 60 * 24 * 2;

// "Today" is defined by a single fixed time zone (KST, the site owner's
// own time zone), not each visitor's local time zone — this matches how
// GA4's "reporting time zone" and most visitor-counter tools work, so
// every visitor sees the same "today" number regardless of where they are
// (researched/confirmed with the user before implementing this way).
function todayKstDateString(): string {
  const kst = new Date(Date.now() + 9 * 60 * 60 * 1000);
  return kst.toISOString().slice(0, 10); // YYYY-MM-DD
}

async function upstash(...parts: (string | number)[]): Promise<number> {
  if (!KV_URL || !KV_TOKEN) return 0;
  try {
    const path = parts.map((p) => encodeURIComponent(String(p))).join("/");
    const res = await fetch(`${KV_URL}/${path}`, {
      headers: { Authorization: `Bearer ${KV_TOKEN}` },
      cache: "no-store",
    });
    if (!res.ok) return 0;
    const data = (await res.json()) as { result: number | string | null };
    const n = Number(data.result);
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
}

export interface VisitorCounts {
  daily: number;
  total: number;
}

/** Reads today's (KST) and cumulative visitor counts without incrementing. */
export async function getVisitorCounts(): Promise<VisitorCounts> {
  const dailyKey = DAILY_KEY_PREFIX + todayKstDateString();
  const [daily, total] = await Promise.all([
    upstash("get", dailyKey),
    upstash("get", TOTAL_KEY),
  ]);
  return { daily, total };
}

/** Atomically increments both counters and returns the new values. */
export async function incrementVisitorCounts(): Promise<VisitorCounts> {
  const dailyKey = DAILY_KEY_PREFIX + todayKstDateString();
  const [daily, total] = await Promise.all([
    upstash("incr", dailyKey),
    upstash("incr", TOTAL_KEY),
  ]);
  // Keep the daily bucket's TTL refreshed so old dates expire on their own.
  await upstash("expire", dailyKey, DAILY_TTL_SECONDS);
  return { daily, total };
}
