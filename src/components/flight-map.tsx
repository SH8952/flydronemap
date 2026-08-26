"use client";

import { useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Polygon,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

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

type FlightMapProps = {
  latitude: number;
  longitude: number;
  /** FAA-style: a single polygon's rings (outer boundary + optional holes). */
  faaBoundary?: LatLngRing[];
  /** Korea-style: one or more polygons (a MultiPolygon), each its own rings. */
  krBoundary?: LatLngRing[][];
  restricted?: boolean;
};

function RecenterOnChange({ lat, lon }: { lat: number; lon: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lon], map.getZoom() < 10 ? 12 : map.getZoom());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lat, lon]);
  return null;
}

export function FlightMap({
  latitude,
  longitude,
  faaBoundary,
  krBoundary,
  restricted,
}: FlightMapProps) {
  const zoneColor = restricted ? "#ef4444" : "#3b82f6";

  return (
    <div className="h-72 w-full overflow-hidden rounded-lg border border-border sm:h-96">
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
      </MapContainer>
    </div>
  );
}
