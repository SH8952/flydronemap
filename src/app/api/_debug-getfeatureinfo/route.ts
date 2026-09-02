/**
 * TEMPORARY DIAGNOSTIC ROUTE — NOT A REAL FEATURE.
 *
 * Purpose: test whether a SERVER-SIDE (Vercel serverless) call to VWorld's
 * WMS GetFeatureInfo succeeds, as a last check before giving up on
 * per-click airspace zone lookup entirely.
 *
 * Context: GetFeatureInfo called from the BROWSER (client-side, see
 * src/lib/airspace-wms-lookup.ts) always returns HTTP 503 in production —
 * confirmed again 2026-09-02 with fetch(url, {referrerPolicy:"no-referrer"}),
 * so it isn't simply about the Referer header. Server-side calls to a
 * different VWorld endpoint (api.vworld.kr/req/data, the 2D데이터 API) were
 * separately confirmed blocked by VWorld for Vercel's IP ranges (both iad1
 * and icn1). This route checks whether that same IP block also applies to
 * /req/wms (GetMap/GetFeatureInfo) specifically, since it has never been
 * tested — a server request has no Origin/Referer header at all, unlike a
 * browser fetch, so it is a genuinely different request shape.
 *
 * Delete this route (and this comment) once the test result is recorded in
 * CHANGELOG.md, regardless of outcome — see that entry for what happened.
 */
import { NextResponse } from "next/server";

export async function GET() {
  const apiKey = process.env.VWORLD_API_KEY;
  const domain = process.env.VWORLD_DOMAIN ?? "https://flydronemap.com";
  if (!apiKey) {
    return NextResponse.json({ error: "VWORLD_API_KEY not set" }, { status: 500 });
  }

  // 고리원전 인근, LT_C_AISPRHC(비행금지구역) 레이어가 실제로 존재하는 지점.
  const lat = 35.3219;
  const lon = 129.2939;
  const delta = 0.01;
  const size = 256;
  const center = 128;

  const url = new URL("https://api.vworld.kr/req/wms");
  url.searchParams.set("key", apiKey);
  url.searchParams.set("domain", domain);
  url.searchParams.set("SERVICE", "WMS");
  url.searchParams.set("VERSION", "1.3.0");
  url.searchParams.set("REQUEST", "GetFeatureInfo");
  url.searchParams.set("LAYERS", "lt_c_aisprhc");
  url.searchParams.set("QUERY_LAYERS", "lt_c_aisprhc");
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
      ok: res.ok,
      status: res.status,
      elapsedMs: Date.now() - startedAt,
      bodyPreview: bodyText.slice(0, 500),
    });
  } catch (e) {
    return NextResponse.json(
      {
        ok: false,
        error: String(e),
        elapsedMs: Date.now() - startedAt,
      },
      { status: 500 },
    );
  }
}
