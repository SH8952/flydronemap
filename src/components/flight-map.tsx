"use client";

import { useEffect, type ReactNode } from "react";
import {
  MapContainer,
  TileLayer,
  WMSTileLayer,
  Marker,
  Polygon,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// VWorld WMS tiles are requested directly from the browser as <img> tiles —
// see src/lib/airspace-layers.ts's header comment for why (VWorld blocks
// server-side requests from Vercel, and CORS blocks a client-side fetch()
// rewrite of the JSON API). This intentionally exposes the key in tile
// request URLs; NEXT_PUBLIC_ vars are inlined at build time.
const VWORLD_KEY = process.env.NEXT_PUBLIC_VWORLD_API_KEY;
const VWORLD_DOMAIN = process.env.NEXT_PUBLIC_VWORLD_DOMAIN;
const VWORLD_WMS_URL = VWORLD_KEY
  ? `https://api.vworld.kr/req/wms?key=${VWORLD_KEY}${
      VWORLD_DOMAIN ? `&domain=${encodeURIComponent(VWORLD_DOMAIN)}` : ""
    }`
  : null;

// Leaflet's default marker icon files don't resolve correctly under
// Next.js's bundler — point them at the CDN copies instead (small, cached).
const markerIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

type LatLngRing = [number, number][];

export type AirspaceOverlayLayer = {
  id: string;
  label: string;
  /** Comma-separated VWorld WMS layer ids (lowercase) — see
   * getWmsLayerParam in src/lib/airspace-layers.ts. */
  wmsLayers: string;
};

type FlightMapProps = {
  latitude: number;
  longitude: number;
  /** FAA-style: a single polygon's rings (outer boundary + optional holes). */
  faaBoundary?: LatLngRing[];
  /** Korea-style: one or more polygons (a MultiPolygon), each its own rings. */
  krBoundary?: LatLngRing[][];
  restricted?: boolean;
  /** Called with (lat, lon) when the user clicks anywhere on the map — lets
   * the parent look up conditions for that point without needing a search. */
  onMapClick?: (lat: number, lon: number) => void;
  /** Small translated hint shown over the map, e.g. "Click anywhere to check that location". */
  clickHintText?: string;
  /** National airspace layers (관제권, 비행제한구역, etc.) to draw as VWorld WMS
   * tile overlays — see src/lib/airspace-layers.ts. */
  airspaceOverlayLayers?: AirspaceOverlayLayer[];
  /** Arbitrary UI (e.g. the layer toggle panel) absolutely positioned on top
   * of the map, inside the same relative wrapper. */
  mapOverlay?: ReactNode;
};

function RecenterOnChange({ lat, lon }: { lat: number; lon: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lon], map.getZoom() < 10 ? 12 : map.getZoom());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lat, lon]);
  return null;
}

function ClickHandler({
  onMapClick,
}: {
  onMapClick?: (lat: number, lon: number) => void;
}) {
  useMapEvents({
    click(e) {
      onMapClick?.(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export function FlightMap({
  latitude,
  longitude,
  faaBoundary,
  krBoundary,
  restricted,
  onMapClick,
  clickHintText,
  airspaceOverlayLayers,
  mapOverlay,
}: FlightMapProps) {
  const zoneColor = restricted ? "#ef4444" : "#3b82f6";

  return (
    <div className="relative h-72 w-full overflow-hidden rounded-lg border border-border sm:h-96">
      <MapContainer
        center={[latitude, longitude]}
        zoom={12}
        scrollWheelZoom={true}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <RecenterOnChange lat={latitude} lon={longitude} />
        <ClickHandler onMapClick={onMapClick} />
        <Marker position={[latitude, longitude]} icon={markerIcon} />

        {faaBoundary ? (
          <Polygon
            positions={faaBoundary}
            pathOptions={{ color: zoneColor, weight: 2, fillOpacity: 0.15 }}
          />
        ) : null}

        {krBoundary
          ? krBoundary.map((polygon, i) => (
              <Polygon
                key={i}
                positions={polygon}
                pathOptions={{
                  color: zoneColor,
                  weight: 2,
                  fillOpacity: 0.15,
                }}
              />
            ))
          : null}

        {VWORLD_WMS_URL
          ? airspaceOverlayLayers?.map((layer) => (
              <WMSTileLayer
                key={layer.id}
                url={VWORLD_WMS_URL}
                layers={layer.wmsLayers}
                format="image/png"
                transparent
                version="1.3.0"
                uppercase
              />
            ))
          : null}
      </MapContainer>

      {mapOverlay}

      {clickHintText ? (
        <div className="pointer-events-none absolute bottom-2 left-1/2 z-[500] -translate-x-1/2 rounded-full bg-background/90 px-3 py-1 text-xs text-muted-foreground shadow">
          {clickHintText}
        </div>
      ) : null}
    </div>
  );
}
