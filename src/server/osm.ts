// src/server/osm.ts
export type GeoJsonLineFeature = {
  type: "Feature";
  geometry: { type: "LineString"; coordinates: [number, number][] }; // [lng, lat]
  properties?: Record<string, unknown>;
};

type OverpassElement =
  | {
      type: "way";
      id: number;
      tags?: Record<string, string>;
      geometry?: { lat: number; lon: number }[];
    }
  | {
      type: "relation";
      id: number;
      tags?: Record<string, string>;
      members?: Array<{
        type: "way" | "node" | "relation";
        ref: number;
        role: string;
        geometry?: { lat: number; lon: number }[];
      }>;
    };

type OverpassResponse = { elements: OverpassElement[] };

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function bboxAround(lat: number, lng: number, delta = 0.08) {
  // ~0.08 deg ~ 8-9km depending on latitude; good “nearby” search
  const south = lat - delta;
  const west = lng - delta;
  const north = lat + delta;
  const east = lng + delta;
  return { south, west, north, east };
}

function toLineFeature(coords: [number, number][], props?: Record<string, unknown>): GeoJsonLineFeature | null {
  const cleaned = coords.filter(
    (c) => Array.isArray(c) && c.length === 2 && Number.isFinite(c[0]) && Number.isFinite(c[1])
  );
  if (cleaned.length < 2) return null;
  return { type: "Feature", geometry: { type: "LineString", coordinates: cleaned }, properties: props ?? {} };
}

function wayToCoords(geom?: { lat: number; lon: number }[]): [number, number][] {
  if (!geom || geom.length < 2) return [];
  return geom
    .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lon))
    .map((p) => [p.lon, p.lat]); // [lng, lat]
}

function pickLongest(lines: [number, number][][]) {
  let best: [number, number][] = [];
  for (const l of lines) if (l.length > best.length) best = l;
  return best;
}

function routeSectionsFromLine(line: [number, number][]) {
  // sections at 0%, 50%, 100%
  const start = line[0];
  const mid = line[Math.floor(line.length / 2)];
  const end = line[line.length - 1];
  return [
    { id: "start", label: "Start", lat: start[1], lng: start[0], type: "start", note: "Trail start (OSM best-effort)" },
    { id: "mid", label: "Midpoint", lat: mid[1], lng: mid[0], type: "ridge", note: "Approximate midpoint" },
    { id: "end", label: "End", lat: end[1], lng: end[0], type: "summit", note: "Trail end (OSM best-effort)" },
  ];
}

export async function fetchOsmHikingRoute(params: {
  lat: number;
  lng: number;
  name: string;
}): Promise<{ feature: GeoJsonLineFeature | null; sections: any[] }> {
  const { lat, lng, name } = params;
  const { south, west, north, east } = bboxAround(lat, lng, 0.08);
  const nre = escapeRegex(name);

  // Strategy:
  // 1) try hiking route relations by name in bbox
  // 2) else try ways (paths) by name in bbox
  // Return the longest geometry we can extract.
  const q = `
[out:json][timeout:25];
(
  relation["type"="route"]["route"="hiking"]( ${south},${west},${north},${east} );
  way["highway"~"path|footway|track"]["name"~"${nre}",i]( ${south},${west},${north},${east} );
);
out body;
>;
out geom;
`.trim();

  const url = "https://overpass-api.de/api/interpreter";
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "text/plain", "User-Agent": "TrailPulse/1.0" },
    body: q,
  });

  if (!res.ok) return { feature: null, sections: [] };
  const data = (await res.json()) as OverpassResponse;

  const lines: [number, number][][] = [];

  for (const el of data.elements) {
    if (el.type === "way") {
      const coords = wayToCoords(el.geometry);
      if (coords.length >= 2) lines.push(coords);
    }
    if (el.type === "relation" && el.members?.length) {
      // collect way member geometries
      for (const m of el.members) {
        if (m.type !== "way") continue;
        const coords = wayToCoords(m.geometry);
        if (coords.length >= 2) lines.push(coords);
      }
    }
  }

  const best = pickLongest(lines);
  const feature = toLineFeature(best, { source: "openstreetmap", query: name });

  return { feature, sections: feature ? routeSectionsFromLine(best) : [] };
}