"use client";

import { useState } from "react";
import { toast } from "sonner";

export function OsmSyncButton({ trailId }: { trailId: string }) {
  const [loading, setLoading] = useState(false);

  async function run() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/trails/osm-sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trailId }),
      });

      const json = await res.json();

      if (!res.ok || !json?.ok) {
        toast.error(json?.error ?? "OSM sync failed");
        setLoading(false);
        return;
      }

      if (json.updated) {
        toast.success(`OSM route saved (${json.points} points). Refreshing…`);
        setTimeout(() => window.location.reload(), 600);
      } else {
        toast.message(json.reason ?? "No OSM route found nearby");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={run}
      disabled={loading}
      className="rounded-xl border bg-background px-3 py-2 text-xs font-semibold transition hover:bg-muted disabled:opacity-60"
      title="Try to fetch a real hiking route from OpenStreetMap (Overpass) and store it to this trail"
    >
      {loading ? "Syncing…" : "Sync OSM route"}
    </button>
  );
}