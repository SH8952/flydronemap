/**
 * TEMPORARY DIAGNOSTIC ROUTE — NOT A REAL FEATURE.
 *
 * See CHANGELOG.md (2026-09-03 entries) for full context. First test proved
 * server-side (Vercel) GetFeatureInfo calls to VWorld succeed when using
 * NEXT_PUBLIC_VWORLD_API_KEY — this route now runs deeper feasibility
 * checks (multiple layers per request, a zone-free point, repeatability)
 * before committing to building the real per-click lookup feature.
 *
 * Query params: lat, lon (default: 고리원전 근처), layers (comma-separated
 * VWorld layer ids, lowercase, default: lt_c_aisprhc).
 *
 * Delete this route once the real feature ships or the idea is dropped.
 */
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const apiKey = process.env.NEXT_PUBLIC_VWORLD_API_KEY;
  const domain = process.env.NEXT_PUBLIC_VWORLD_DOMAIN ?? "https://flydronemap.com";
  if (!apiKey) {
    return NextResponse.json({ error: "NEXT_PUBLIC_VWORLD_API_KEY not set" }, { status: 500 });
  }

  const params = request.nextUrl.searchParams;
  const lat = Number(params.get("lat") ?? "35.3219");
  const lon = Number(params.get("lon") ?? "129.2939");
  const layers = params.get("layers") ?? "lt_c_aisprhc";
  const delta = Number(params.get("delta") ?? "0.01");
  const size = 256;
  const center = 128;

  const url = new URL("https://api.vworld.kr/req/wms");
  url.searchParams.set("key", apiKey);
  url.searchParams.set("domain", domain);
  url.searchParams.set("SERVICE", "WMS");
  url.searchParams.set("VERSION", "1.3.0");
  url.searchParams.set("REQUEST", "GetFeatureInfo");
  url.searchParams.set("LAYERS", layers);
  url.searchParams.set("QUERY_LAYERS", layers);
  url.searchParams.set("STYLES", "");
  url.searchParams.set("FORMAT", "image/png");
  url.searchParams.set("INFO_FORMAT", "application/json");
  url.searchParams.set("TRANSPARENT", "true");
  url.searchParams.set("CRS", "EPSG:4326");
  url.searchParams.set(
    "BBOX",
    `${lat - delta},${lon - delta},${lat + delta},${lon + delta}`,
  );
  url.searchParams.set("WIDTH", String(size));
  url.searchParams.set("HEIGHT", String(size));
  url.searchParams.set("I", String(center));
  url.searchParams.set("J", String(center));

  const startedAt = Date.now();
  try {
    const res = await fetch(url.toString(), { cache: "no-store" });
    const bodyText = await res.text();
    return NextResponse.json({
      requested: { lat, lon, layers },
      ok: res.ok,
      status: res.status,
      elapsedMs: Date.now() - startedAt,
      bodyPreview: bodyText.slice(0, 6000),
    });
  } catch (e) {
    return NextResponse.json(
      {
        requested: { lat, lon, layers },
        ok: false,
        error: String(e),
        elapsedMs: Date.now() - startedAt,
      },
      { status: 500 },
    );
  }
}
