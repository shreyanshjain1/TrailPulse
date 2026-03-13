"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";

type TrailRow = {
  id: string;
  name: string;
  region: string;
  difficulty: string;
  distanceKm: number;
  elevationGainM: number;
  imageUrl: string | null;
  weather: { fetchedAt: string; payload: any } | null;
};

function minsAgo(d: string) {
  const ms = Date.now() - new Date(d).getTime();
  return Math.max(0, Math.floor(ms / 60000));
}

export default function TrailCompare() {
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<TrailRow[]>([]);
  const [selected, setSelected] = useState<TrailRow[]>([]);
  const [loading, setLoading] = useState(false);

  // simple search via existing /trails page UX: we’ll just filter client-side from options
  useEffect(() => {
    (async () => {
      // lightweight trail list fetch: reuse compare endpoint pattern by fetching all trails minimal
      const res = await fetch("/api/trails/list", { method: "GET" }).catch(() => null);
      if (!res) return;
      const json = await res.json().catch(() => null);
      if (json?.ok && Array.isArray(json.trails)) setOptions(json.trails);
    })();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options.slice(0, 12);
    return options.filter((t) => `${t.name} ${t.region}`.toLowerCase().includes(q)).slice(0, 12);
  }, [query, options]);

  async function runCompare(ids: string[]) {
    setLoading(true);
    try {
      const res = await fetch("/api/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trailIds: ids }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) {
        toast.error(json?.error ?? "Compare failed");
        return;
      }
      setSelected(json.trails);
      // shareable link
      const url = new URL(window.location.href);
      url.searchParams.set("ids", ids.join(","));
      window.history.replaceState({}, "", url.toString());
    } finally {
      setLoading(false);
    }
  }

  function toggle(id: string) {
    const has = selected.some((s) => s.id === id);
    let nextIds: string[] = [];
    if (has) nextIds = selected.filter((s) => s.id !== id).map((s) => s.id);
    else nextIds = [...selected.map((s) => s.id), id].slice(0, 3);

    if (nextIds.length >= 2) runCompare(nextIds);
    else setSelected(selected.filter((s) => s.id !== id));
  }

  async function copyLink() {
    const url = window.location.href;
    await navigator.clipboard.writeText(url);
    toast.success("Compare link copied");
  }

  return (
    <div className="grid gap-4">
      <div className="rounded-2xl border bg-card p-4">
        <div className="text-sm font-semibold">Pick trails (2–3)</div>
        <input
          className="mt-3 w-full rounded-xl border bg-background px-3 py-2 text-sm"
          placeholder="Search trails..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {filtered.map((t) => (
            <button
              key={t.id}
              onClick={() => toggle(t.id)}
              className="flex items-center justify-between rounded-xl border bg-background px-3 py-2 text-left text-sm hover:bg-muted/30"
            >
              <div>
                <div className="font-medium">{t.name}</div>
                <div className="text-xs text-muted-foreground">{t.region}</div>
              </div>
              <div className="text-xs text-muted-foreground">{t.difficulty}</div>
            </button>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            onClick={copyLink}
            className="rounded-xl border bg-background px-3 py-2 text-sm font-medium hover:bg-muted/40"
            disabled={selected.length < 2}
          >
            Copy compare link
          </button>
          {loading ? <span className="text-xs text-muted-foreground">Comparing…</span> : null}
        </div>
      </div>

      {selected.length >= 2 ? (
        <div className="overflow-x-auto rounded-2xl border bg-card p-4">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="text-left text-xs text-muted-foreground">
                <th className="py-2">Metric</th>
                {selected.map((t) => (
                  <th key={t.id} className="py-2">
                    <Link className="font-medium hover:underline" href={`/trails/${t.id}`}>
                      {t.name}
                    </Link>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                ["Region", (t: TrailRow) => t.region],
                ["Difficulty", (t: TrailRow) => t.difficulty],
                ["Distance (km)", (t: TrailRow) => String(t.distanceKm)],
                ["Elevation gain (m)", (t: TrailRow) => String(t.elevationGainM)],
                [
                  "Weather snapshot",
                  (t: TrailRow) => (t.weather ? `${minsAgo(t.weather.fetchedAt)} min ago` : "No snapshot"),
                ],
              ].map(([label, fn]) => (
                <tr key={label as string} className="border-t">
                  <td className="py-3 font-medium">{label as string}</td>
                  {selected.map((t) => (
                    <td key={t.id} className="py-3 text-muted-foreground">
                      {(fn as any)(t)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-2xl border bg-muted/20 p-4 text-sm text-muted-foreground">
          Select at least two trails to see a comparison table.
        </div>
      )}
    </div>
  );
}