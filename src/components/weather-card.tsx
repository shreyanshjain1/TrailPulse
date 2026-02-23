"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";

function fmtUpdated(ts: string | Date) {
  const d = typeof ts === "string" ? new Date(ts) : ts;
  const diff = Date.now() - d.getTime();
  const mins = Math.max(1, Math.round(diff / 60000));
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  return `${hrs} hr ago`;
}

function statusFromRainChance(rainPct: number | null) {
  if (rainPct == null) return { label: "Conditions", emoji: "🌤️" };
  if (rainPct >= 70) return { label: "Likely rain", emoji: "🌧️" };
  if (rainPct >= 40) return { label: "Chance of rain", emoji: "🌦️" };
  if (rainPct >= 15) return { label: "Mostly clear", emoji: "⛅" };
  return { label: "Clear", emoji: "☀️" };
}

export function WeatherCard({
  snapshot,
}: {
  snapshot:
    | null
    | {
        fetchedAt: Date;
        payload: any;
      };
}) {
  if (!snapshot) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Latest conditions</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          No weather yet. Save or plan this trail to trigger a background refresh.
        </CardContent>
      </Card>
    );
  }

  const p = snapshot.payload ?? {};
  const temp = typeof p.temperature_c === "number" ? p.temperature_c : null;
  const wind = typeof p.wind_kph === "number" ? p.wind_kph : null;
  const rain = typeof p.precipitation_chance === "number" ? p.precipitation_chance : null;

  const status = statusFromRainChance(rain);
  const provider = p.provider ?? "open-meteo";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Latest conditions</CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Main status row */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-sm font-semibold flex items-center gap-2">
              <span className="text-lg">{status.emoji}</span>
              <span>{status.label}</span>
            </div>
            <div className="text-xs text-muted-foreground">
              Updated {fmtUpdated(snapshot.fetchedAt)} • Provider: {provider}
            </div>
          </div>

          <div className="rounded-xl border px-3 py-2 text-right">
            <div className="text-xs text-muted-foreground">Temperature</div>
            <div className="text-lg font-semibold">{temp != null ? `${temp.toFixed(1)}°C` : "—"}</div>
          </div>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl border p-3">
            <div className="text-xs text-muted-foreground">Wind</div>
            <div className="text-sm font-semibold">{wind != null ? `${wind.toFixed(0)} km/h` : "—"}</div>
          </div>

          <div className="rounded-xl border p-3">
            <div className="text-xs text-muted-foreground">Rain chance</div>
            <div className="text-sm font-semibold">{rain != null ? `${rain}%` : "—"}</div>
          </div>

          <div className="rounded-xl border p-3">
            <div className="text-xs text-muted-foreground">Hike note</div>
            <div className="text-sm font-semibold">
              {rain != null && rain >= 40 ? "Bring poncho" : "Good to go"}
            </div>
          </div>
        </div>

        {/* Debug (hidden unless clicked) */}
        <details className="text-xs text-muted-foreground">
          <summary className="cursor-pointer select-none">Debug: view raw snapshot</summary>
          <pre className="mt-2 max-h-64 overflow-auto rounded-md bg-muted p-3 text-[11px] leading-4">
            {JSON.stringify(snapshot.payload, null, 2)}
          </pre>
        </details>
      </CardContent>
    </Card>
  );
}