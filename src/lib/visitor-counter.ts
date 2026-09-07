const KV_URL = process.env.KV_REST_API_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN;

// Redis key prefix — this project's slice of the shared Vercel KV
// (Upstash Redis) instance connected to all three sibling sites
// (ExifLens/FlyDroneMap/firelic), so one free-tier database can be reused
// instead of provisioning one per project. See src/app/api/visitor-count/
// route.ts for how the developer-exclusion cookie skips incrementing this.
const COUNT_KEY = "flydronemap:visitor_count";

async function upstashCommand(...parts: (string | number)[]): Promise<number> {
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

/** Reads the current visitor count without incrementing it. */
export async function getVisitorCount(): Promise<number> {
  return upstashCommand("get", COUNT_KEY);
}

/** Atomically increments and returns the new visitor count. */
export async function incrementVisitorCount(): Promise<number> {
  return upstashCommand("incr", COUNT_KEY);
}
