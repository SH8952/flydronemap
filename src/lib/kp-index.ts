export type KpReading = {
  time: string;
  kp: number;
};

/**
 * NOAA Space Weather Prediction Center's free, public planetary K-index feed.
 * No API key required. https://services.swpc.noaa.gov/json/planetary_k_index_1m.json
 *
 * The endpoint returns an array of [time_tag, kp_index, kp, running_average, ...]
 * rows with a header row first; we defensively look up columns by name rather
 * than assuming a fixed position.
 */
export async function fetchLatestKpIndex(): Promise<KpReading | null> {
  const res = await fetch(
    "https://services.swpc.noaa.gov/json/planetary_k_index_1m.json",
    { next: { revalidate: 300 } },
  );
  if (!res.ok) return null;

  const rows = (await res.json()) as Array<Record<string, string | number>>;
  if (!Array.isArray(rows) || rows.length === 0) return null;

  const last = rows[rows.length - 1];
  const time = String(last.time_tag ?? "");
  const kpRaw = last.kp_index ?? last.kp ?? last.Kp;
  const kp = typeof kpRaw === "number" ? kpRaw : parseFloat(String(kpRaw));

  if (!time || Number.isNaN(kp)) return null;
  return { time, kp };
}

/**
 * Rough, widely-cited guidance on what a Kp reading means for GPS/compass
 * reliability during geomagnetic disturbances. Kp 0-3 is normal background
 * activity; higher values correlate with increased GPS positioning error and
 * compass drift, which matters for drones relying on GPS-hold or
 * return-to-home.
 */
export function kpRiskLevel(kp: number): "quiet" | "unsettled" | "storm" {
  if (kp < 4) return "quiet";
  if (kp < 5) return "unsettled";
  return "storm";
}
