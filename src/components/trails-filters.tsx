"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/src/components/ui/input";
import { Button } from "@/src/components/ui/button";
import { Card, CardContent } from "@/src/components/ui/card";
import { Label } from "@/src/components/ui/label";

type Filters = {
  q?: string;
  difficulty?: "EASY" | "MODERATE" | "HARD";
  minDistance?: number;
  maxDistance?: number;
  minElevation?: number;
  maxElevation?: number;
};

export function TrailsFilters({ initial }: { initial: Filters }) {
  const [q, setQ] = useState(initial.q ?? "");
  const [difficulty, setDifficulty] = useState(initial.difficulty ?? "");
  const [minDistance, setMinDistance] = useState(initial.minDistance?.toString() ?? "");
  const [maxDistance, setMaxDistance] = useState(initial.maxDistance?.toString() ?? "");
  const [minElevation, setMinElevation] = useState(initial.minElevation?.toString() ?? "");
  const [maxElevation, setMaxElevation] = useState(initial.maxElevation?.toString() ?? "");

  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const base = useMemo(() => new URLSearchParams(sp.toString()), [sp]);

  function apply() {
    const next = new URLSearchParams(base.toString());
    const setOrDelete = (k: string, v: string) => {
      if (v && v.trim() !== "") next.set(k, v.trim());
      else next.delete(k);
    };
    setOrDelete("q", q);
    setOrDelete("difficulty", difficulty);
    setOrDelete("minDistance", minDistance);
    setOrDelete("maxDistance", maxDistance);
    setOrDelete("minElevation", minElevation);
    setOrDelete("maxElevation", maxElevation);
    router.push(`${pathname}?${next.toString()}`);
  }

  function reset() {
    router.push(pathname);
    setQ("");
    setDifficulty("");
    setMinDistance("");
    setMaxDistance("");
    setMinElevation("");
    setMaxElevation("");
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="grid gap-4 md:grid-cols-6">
          <div className="md:col-span-2">
            <Label>Search</Label>
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name or region…" />
          </div>

          <div>
            <Label>Difficulty</Label>
            <select
              className="mt-1 h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm dark:border-zinc-800 dark:bg-zinc-950"
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value as any)}
            >
              <option value="">Any</option>
              <option value="EASY">Easy</option>
              <option value="MODERATE">Moderate</option>
              <option value="HARD">Hard</option>
            </select>
          </div>

          <div>
            <Label>Min km</Label>
            <Input inputMode="decimal" value={minDistance} onChange={(e) => setMinDistance(e.target.value)} placeholder="0" />
          </div>
          <div>
            <Label>Max km</Label>
            <Input inputMode="decimal" value={maxDistance} onChange={(e) => setMaxDistance(e.target.value)} placeholder="25" />
          </div>
          <div className="flex items-end gap-2 md:col-span-1">
            <Button className="w-full" onClick={apply}>Apply</Button>
          </div>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-6">
          <div>
            <Label>Min elevation (m)</Label>
            <Input inputMode="numeric" value={minElevation} onChange={(e) => setMinElevation(e.target.value)} placeholder="0" />
          </div>
          <div>
            <Label>Max elevation (m)</Label>
            <Input inputMode="numeric" value={maxElevation} onChange={(e) => setMaxElevation(e.target.value)} placeholder="2000" />
          </div>
          <div className="md:col-span-4 flex items-end justify-end">
            <Button variant="secondary" onClick={reset}>Reset</Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
