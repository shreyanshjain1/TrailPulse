"use client";

import { useEffect, useMemo, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

type RouteGeoJsonFeature = {
  type: "Feature";
  geometry: {
    type: "LineString";
    coordinates: [number, number][]; // [lng, lat]
  };
  properties?: {
    name?: string;
  };
};

type RouteSection = {
  id?: string;
  label: string;
  lat: number;
  lng: number;
  type?: "start" | "climb" | "ridge" | "summit" | string;
  note?: string;
};

type TrailMapProps = {
  lat: number;
  lng: number;
  name: string;
  routeGeoJson?: RouteGeoJsonFeature | null;
  routeSections?: RouteSection[] | null;
  className?: string;
};

function cn(...arr: (string | undefined)[]) {
  return arr.filter(Boolean).join(" ");
}

export default function TrailMap({
  lat,
  lng,
  name,
  routeGeoJson,
  routeSections,
  className,
}: TrailMapProps) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const leafletMapRef = useRef<L.Map | null>(null);

  const parsedSections = useMemo(() => {
    return Array.isArray(routeSections) ? routeSections : [];
  }, [routeSections]);

  useEffect(() => {
    if (!mapRef.current) return;
    if (leafletMapRef.current) return;

    const map = L.map(mapRef.current, {
      zoomControl: true,
      scrollWheelZoom: true,
    });

    leafletMapRef.current = map;

    // Base layer (OpenStreetMap)
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
      maxZoom: 19,
    }).addTo(map);

    // --- Fallback center marker if no route ---
    const fallbackMarker = L.circleMarker([lat, lng], {
      radius: 8,
      weight: 3,
      color: "#059669",
      fillColor: "#10b981",
      fillOpacity: 0.9,
    }).bindPopup(`<b>${name}</b><br/>Approximate trail center`);

    // --- Draw route polyline if provided ---
    let hasRoute = false;
    let routeLatLngs: L.LatLngExpression[] = [];

    if (
      routeGeoJson &&
      routeGeoJson.type === "Feature" &&
      routeGeoJson.geometry?.type === "LineString" &&
      Array.isArray(routeGeoJson.geometry.coordinates) &&
      routeGeoJson.geometry.coordinates.length > 1
    ) {
      hasRoute = true;
      routeLatLngs = routeGeoJson.geometry.coordinates
        .filter(
          (c) =>
            Array.isArray(c) &&
            c.length >= 2 &&
            Number.isFinite(c[0]) &&
            Number.isFinite(c[1])
        )
        .map((c) => [c[1], c[0]]); // GeoJSON [lng,lat] -> Leaflet [lat,lng]

      if (routeLatLngs.length > 1) {
        L.polyline(routeLatLngs, {
          color: "#10b981",
          weight: 5,
          opacity: 0.95,
          lineCap: "round",
          lineJoin: "round",
        }).addTo(map);

        // subtle outline under route
        L.polyline(routeLatLngs, {
          color: "#064e3b",
          weight: 8,
          opacity: 0.25,
          lineCap: "round",
          lineJoin: "round",
        }).addTo(map);

        // Start / End markers from route
        const start = routeLatLngs[0] as [number, number];
        const end = routeLatLngs[routeLatLngs.length - 1] as [number, number];

        L.circleMarker(start, {
          radius: 7,
          weight: 2,
          color: "#065f46",
          fillColor: "#10b981",
          fillOpacity: 1,
        })
          .addTo(map)
          .bindTooltip("Start", {
            permanent: true,
            direction: "top",
            className: "trail-map-label",
            offset: [0, -6],
          });

        L.circleMarker(end, {
          radius: 7,
          weight: 2,
          color: "#7c2d12",
          fillColor: "#fb923c",
          fillOpacity: 1,
        })
          .addTo(map)
          .bindTooltip("End", {
            permanent: true,
            direction: "top",
            className: "trail-map-label",
            offset: [0, -6],
          });
      }
    }

    // --- Section labels ---
    parsedSections.forEach((section) => {
      if (!Number.isFinite(section.lat) || !Number.isFinite(section.lng)) return;

      let color = "#3b82f6";
      if (section.type === "start") color = "#10b981";
      if (section.type === "climb") color = "#ef4444";
      if (section.type === "ridge") color = "#8b5cf6";
      if (section.type === "summit") color = "#f59e0b";

      L.circleMarker([section.lat, section.lng], {
        radius: 5,
        weight: 2,
        color,
        fillColor: color,
        fillOpacity: 0.85,
      })
        .addTo(map)
        .bindTooltip(section.label, {
          permanent: true,
          direction: "right",
          className: "trail-map-label",
          offset: [8, 0],
        })
        .bindPopup(
          `<div style="min-width:180px">
            <div style="font-weight:600">${section.label}</div>
            ${section.note ? `<div style="margin-top:4px;color:#666;font-size:12px">${section.note}</div>` : ""}
          </div>`
        );
    });

    // Fallback center marker if no usable route
    if (!hasRoute || routeLatLngs.length < 2) {
      fallbackMarker.addTo(map);
      map.setView([lat, lng], 13);
    } else {
      const bounds = L.latLngBounds(routeLatLngs as [number, number][]);
      // Include section markers in bounds too
      parsedSections.forEach((s) => {
        if (Number.isFinite(s.lat) && Number.isFinite(s.lng)) {
          bounds.extend([s.lat, s.lng]);
        }
      });
      map.fitBounds(bounds.pad(0.2));
    }

    // Fix rendering if container was hidden / resized
    setTimeout(() => map.invalidateSize(), 120);

    return () => {
      map.remove();
      leafletMapRef.current = null;
    };
  }, [lat, lng, name, parsedSections, routeGeoJson]);

  return (
    <div className={cn("space-y-2", className)}>
      <div className="overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800">
        <div ref={mapRef} className="h-[360px] w-full bg-zinc-100 dark:bg-zinc-900" />
      </div>

      <div className="flex flex-wrap gap-2 text-xs text-zinc-600 dark:text-zinc-400">
        <span className="rounded-full border px-2 py-1">Route line</span>
        <span className="rounded-full border px-2 py-1">Start / End markers</span>
        <span className="rounded-full border px-2 py-1">Section labels</span>
      </div>

      {/* local styles for permanent Leaflet labels */}
      <style jsx global>{`
        .trail-map-label {
          background: rgba(24, 24, 27, 0.88);
          color: #fff;
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 999px;
          padding: 2px 8px;
          font-size: 11px;
          font-weight: 500;
          box-shadow: none;
        }
        .trail-map-label:before {
          display: none;
        }
      `}</style>
    </div>
  );
}