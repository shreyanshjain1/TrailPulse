"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/src/components/ui/button";

type Filters = {
  q?: string;
  difficulty?: string;
  minDistanceKm?: string;
  maxDistanceKm?: string;
  minElevationGainM?: string;
  maxElevationGainM?: string;
};

export function TrailsFilters({ initial }: { initial: Filters }) {
  const router = useRouter();

  const [q, setQ] = useState(initial.q ?? "");
  const [difficulty, setDifficulty] = useState(initial.difficulty ?? "");
  const [minDistanceKm, setMinDistanceKm] = useState(initial.minDistanceKm ?? "");
  const [maxDistanceKm, setMaxDistanceKm] = useState(initial.maxDistanceKm ?? "");
  const [minElevationGainM, setMinElevationGainM] = useState(initial.minElevationGainM ?? "");
  const [maxElevationGainM, setMaxElevationGainM] = useState(initial.maxElevationGainM ?? "");

  function applyFilters() {
    const p = new URLSearchParams();

    if (q.trim()) p.set("q", q.trim());
    if (difficulty) p.set("difficulty", difficulty);
    if (minDistanceKm) p.set("minDistanceKm", minDistanceKm);
    if (maxDistanceKm) p.set("maxDistanceKm", maxDistanceKm);
    if (minElevationGainM) p.set("minElevationGainM", minElevationGainM);
    if (maxElevationGainM) p.set("maxElevationGainM", maxElevationGainM);

    router.push(`/trails${p.toString() ? `?${p.toString()}` : ""}`);
  }

  function resetFilters() {
    setQ("");
    setDifficulty("");
    setMinDistanceKm("");
    setMaxDistanceKm("");
    setMinElevationGainM("");
    setMaxElevationGainM("");
    router.push("/trails");
  }

  return (
    <div className="rounded-2xl border bg-card p-4 md:p-5">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <div className="xl:col-span-2">
          <label className="mb-1 block text-sm font-medium">Search</label>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Name, region, summary..."
            className="w-full rounded-xl border bg-background px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Difficulty</label>
          <select
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value)}
            className="w-full rounded-xl border bg-background px-3 py-2 text-sm"
          >
            <option value="">Any</option>
            <option value="EASY">Easy</option>
            <option value="MODERATE">Moderate</option>
            <option value="HARD">Hard</option>
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Min km</label>
          <input
            type="number"
            value={minDistanceKm}
            onChange={(e) => setMinDistanceKm(e.target.value)}
            className="w-full rounded-xl border bg-background px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Max km</label>
          <input
            type="number"
            value={maxDistanceKm}
            onChange={(e) => setMaxDistanceKm(e.target.value)}
            className="w-full rounded-xl border bg-background px-3 py-2 text-sm"
          />
        </div>

        <div className="flex items-end">
          <Button onClick={applyFilters} className="w-full rounded-xl">
            Apply
          </Button>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Min gain (m)</label>
          <input
            type="number"
            value={minElevationGainM}
            onChange={(e) => setMinElevationGainM(e.target.value)}
            className="w-full rounded-xl border bg-background px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Max gain (m)</label>
          <input
            type="number"
            value={maxElevationGainM}
            onChange={(e) => setMaxElevationGainM(e.target.value)}
            className="w-full rounded-xl border bg-background px-3 py-2 text-sm"
          />
        </div>

        <div className="md:col-span-2 xl:col-span-4 flex items-end justify-end">
          <Button variant="secondary" onClick={resetFilters} className="rounded-xl">
            Reset
          </Button>
        </div>
      </div>
    </div>
  );
}