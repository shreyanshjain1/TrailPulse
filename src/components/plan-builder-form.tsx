"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/src/components/ui/button";
import { Badge } from "@/src/components/ui/badge";

type Trail = {
  id: string;
  name: string;
  region: string;
  difficulty: "EASY" | "MODERATE" | "HARD" | string;
  distanceKm: number;
  elevationGainM: number;
  imageUrl: string | null;
  shortDescription: string;
};

type TemplateKey = "day" | "rainy" | "long";

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function roundTo(n: number, step: number) {
  return Math.round(n / step) * step;
}

function estimateDurationMinutes(distanceKm: number, elevationGainM: number, difficulty: string) {
  const baseHours = distanceKm / 4;
  const ascentHours = elevationGainM / 600;

  let mod = 1;
  if (difficulty === "MODERATE") mod = 1.15;
  if (difficulty === "HARD") mod = 1.35;

  const hours = (baseHours + ascentHours) * mod;
  const mins = Math.ceil(hours * 60);

  return clamp(roundTo(mins, 5), 30, 24 * 60);
}

function waterLiters(distanceKm: number, durationMin: number, hotFactor: number) {
  const hours = durationMin / 60;
  const liters = (0.5 * hours + 0.2 * (distanceKm / 5)) * hotFactor;
  return clamp(Number(liters.toFixed(1)), 0.5, 6);
}

function snacksEstimate(durationMin: number) {
  const snacks = Math.max(1, Math.round(durationMin / 75));
  return snacks;
}

const templates: Record<
  TemplateKey,
  {
    name: string;
    items: string[];
  }
> = {
  day: {
    name: "Day Hike",
    items: ["Water (1–2L minimum)", "Trail shoes / grip", "Cap + sunscreen", "Small first aid kit", "Power bank", "Snacks / light meal"],
  },
  rainy: {
    name: "Rainy / Windy",
    items: ["Rain jacket / poncho", "Dry bag / waterproof pouch", "Extra socks", "Headlamp / flashlight", "Towel / wipes", "Warm layer"],
  },
  long: {
    name: "Long Hike",
    items: ["3L water capacity", "Extra snacks (energy bars)", "Electrolytes", "Emergency blanket", "Whistle", "Extra battery / power bank"],
  },
};

export function PlanBuilderForm({ trail }: { trail: Trail }) {
  const [startAtLocal, setStartAtLocal] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(7, 0, 0, 0);

    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  });

  const suggestedDuration = useMemo(
    () => estimateDurationMinutes(trail.distanceKm, trail.elevationGainM, trail.difficulty),
    [trail.distanceKm, trail.elevationGainM, trail.difficulty],
  );

  const [durationMin, setDurationMin] = useState(suggestedDuration);
  const [notes, setNotes] = useState("");
  const [heatFactor, setHeatFactor] = useState(1.0);
  const [templateKey, setTemplateKey] = useState<TemplateKey>("day");
  const [extraItems, setExtraItems] = useState<string[]>([]);
  const [newItem, setNewItem] = useState("");

  const water = useMemo(() => waterLiters(trail.distanceKm, durationMin, heatFactor), [trail.distanceKm, durationMin, heatFactor]);
  const snacks = useMemo(() => snacksEstimate(durationMin), [durationMin]);

  const checklist = useMemo(() => {
    const base = templates[templateKey].items;
    const extra = extraItems.filter((x) => x.trim().length > 0);
    const uniq = Array.from(new Set([...base, ...extra]));
    return uniq;
  }, [templateKey, extraItems]);

  async function createPlan() {
    try {
      const start = new Date(startAtLocal);
      if (Number.isNaN(start.getTime())) {
        toast.error("Invalid start date/time");
        return;
      }

      const payload = {
        trailId: trail.id,
        startAt: start.toISOString(),
        durationMin,
        notes: notes.trim() ? notes.trim() : "",
        // ✅ match createPlanSchema: array of objects
        checklist: checklist.map((text, i) => ({ text, sortOrder: i })),
      };

      const res = await fetch("/api/plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok || !json?.ok) {
        toast.error(json?.error ?? "Failed to create plan");
        return;
      }

      toast.success("Plan created", {
        action: {
          label: "Open plan",
          onClick: () => {
            window.location.href = `/plans/${json.planId}`;
          },
        },
      });

      setTimeout(() => {
        window.location.href = `/plans/${json.planId}`;
      }, 700);
    } catch {
      toast.error("Network error");
    }
  }

  function addExtraItem() {
    const t = newItem.trim();
    if (!t) return;
    setExtraItems((p) => [...p, t]);
    setNewItem("");
  }

  return (
    <div className="grid gap-6 lg:grid-cols-12">
      <section className="rounded-2xl border bg-card p-5 lg:col-span-7">
        <h1 className="text-xl font-semibold">Plan builder</h1>
        <p className="mt-1 text-sm text-muted-foreground">Tune time + duration, then generate a practical checklist.</p>

        <div className="mt-4 rounded-2xl border bg-muted/30 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-xs text-muted-foreground">Trail</div>
              <div className="mt-1 text-base font-semibold">{trail.name}</div>
              <div className="mt-1 text-sm text-muted-foreground">
                {trail.region} • {trail.distanceKm} km • {trail.elevationGainM} m gain
              </div>
              <div className="mt-2 text-sm text-muted-foreground">{trail.shortDescription}</div>
            </div>
            <Badge variant="secondary" className="shrink-0">
              {trail.difficulty}
            </Badge>
          </div>
        </div>

        <div className="mt-5 grid gap-4">
          <div>
            <div className="text-sm font-semibold">Start date/time</div>
            <div className="mt-2">
              <input
                type="datetime-local"
                value={startAtLocal}
                onChange={(e) => setStartAtLocal(e.target.value)}
                className="w-full rounded-xl border bg-background px-3 py-2 text-sm"
              />
            </div>
            <div className="mt-2 text-xs text-muted-foreground">Tip: Pick early start for heat + safety.</div>
          </div>

          <div>
            <div className="flex items-center justify-between gap-2">
              <div className="text-sm font-semibold">Duration</div>
              <div className="text-xs text-muted-foreground">Suggested: {suggestedDuration} min</div>
            </div>
            <div className="mt-3">
              <input
                type="range"
                min={30}
                max={12 * 60}
                step={5}
                value={durationMin}
                onChange={(e) => setDurationMin(Number(e.target.value))}
                className="w-full"
              />
              <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
                <span>30m</span>
                <span className="font-medium text-foreground">{durationMin} min</span>
                <span>12h</span>
              </div>
            </div>
          </div>

          <div>
            <div className="text-sm font-semibold">Conditions (heat)</div>
            <div className="mt-2">
              <select
                value={heatFactor}
                onChange={(e) => setHeatFactor(Number(e.target.value))}
                className="w-full rounded-xl border bg-background px-3 py-2 text-sm"
              >
                <option value={0.9}>Cool</option>
                <option value={1.0}>Normal</option>
                <option value={1.2}>Hot</option>
              </select>
            </div>
            <div className="mt-2 text-xs text-muted-foreground">Used for water estimate (rule of thumb).</div>
          </div>

          <div>
            <div className="text-sm font-semibold">Notes</div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Group size, meetup point, reminders..."
              className="mt-2 min-h-[96px] w-full rounded-xl border bg-background px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="mt-5 rounded-2xl border bg-muted/30 p-4">
          <div className="text-sm font-semibold">Smart estimates</div>
          <div className="mt-3 grid grid-cols-3 gap-2">
            <div className="rounded-xl border bg-background p-3 text-center">
              <div className="text-xs text-muted-foreground">Water</div>
              <div className="text-lg font-semibold">{water} L</div>
            </div>
            <div className="rounded-xl border bg-background p-3 text-center">
              <div className="text-xs text-muted-foreground">Snacks</div>
              <div className="text-lg font-semibold">{snacks}</div>
            </div>
            <div className="rounded-xl border bg-background p-3 text-center">
              <div className="text-xs text-muted-foreground">Pace</div>
              <div className="text-lg font-semibold">
                ~{Math.max(1, Math.round((trail.distanceKm / (durationMin / 60)) * 10) / 10)} km/h
              </div>
            </div>
          </div>
          <div className="mt-2 text-xs text-muted-foreground">These are simple heuristics — adjust based on fitness + trail conditions.</div>
        </div>

        <div className="mt-5 flex items-center justify-end gap-2">
          <Button onClick={createPlan} className="rounded-xl">
            Create plan
          </Button>
        </div>
      </section>

      <section className="rounded-2xl border bg-card p-5 lg:col-span-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Checklist</h2>
            <p className="mt-1 text-sm text-muted-foreground">Pick a template, add extras, then save with your plan.</p>
          </div>
          <Badge variant="secondary">{templates[templateKey].name}</Badge>
        </div>

        <div className="mt-4 grid gap-2">
          <div className="text-sm font-semibold">Template</div>
          <div className="grid grid-cols-3 gap-2">
            {(["day", "rainy", "long"] as TemplateKey[]).map((k) => (
              <button
                key={k}
                onClick={() => setTemplateKey(k)}
                className={[
                  "rounded-xl border px-3 py-2 text-sm font-medium transition",
                  templateKey === k ? "bg-zinc-900 text-white dark:bg-white dark:text-black" : "bg-background hover:bg-muted/50",
                ].join(" ")}
              >
                {templates[k].name}
              </button>
            ))}
          </div>

          <div className="mt-4 text-sm font-semibold">Add custom item</div>
          <div className="flex gap-2">
            <input
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addExtraItem();
                }
              }}
              placeholder="e.g., Trekking poles"
              className="flex-1 rounded-xl border bg-background px-3 py-2 text-sm"
            />
            <Button variant="outline" onClick={addExtraItem}>
              Add
            </Button>
          </div>
        </div>

        <div className="mt-5 rounded-2xl border p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold">Items</div>
            <div className="text-xs text-muted-foreground">{checklist.length} items</div>
          </div>
          <ul className="mt-3 space-y-2">
            {checklist.map((item) => (
              <li key={item} className="flex items-start gap-2 text-sm">
                <span className="mt-1 inline-block h-2 w-2 rounded-full bg-emerald-500" />
                <span className="text-muted-foreground">{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-5 rounded-2xl border bg-emerald-50 p-4 text-sm text-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200">
          <div className="font-semibold">Ready-to-go tip</div>
          <div className="mt-1 text-xs">After creating your plan, TrailPulse shows readiness (checklist + weather freshness + calendar sync).</div>
        </div>
      </section>
    </div>
  );
}