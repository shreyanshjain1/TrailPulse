"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Button } from "@/src/components/ui/button";
import { Badge } from "@/src/components/ui/badge";

type Item = { id: string; text: string; isDone: boolean };
type RouteSection = { label: string; type?: string };

function minutesAgo(iso: string) {
  const ms = Date.now() - new Date(iso).getTime();
  return Math.max(0, Math.floor(ms / 60000));
}

function fmtTime(d: Date) {
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function addMinutes(d: Date, mins: number) {
  const x = new Date(d);
  x.setMinutes(x.getMinutes() + mins);
  return x;
}

function pickSectionIndex(sections: RouteSection[]) {
  const summitIdx = sections.findIndex((s) => String(s.type).toLowerCase() === "summit");
  if (summitIdx >= 0) return summitIdx;
  return Math.max(0, Math.floor(sections.length / 2));
}

function planTimeline(startAtIso: string, durationMin: number, sections: RouteSection[]) {
  const start = new Date(startAtIso);
  const end = addMinutes(start, durationMin);

  // If we have sections, estimate summit time aligned to summit index or midpoint
  if (sections.length >= 2) {
    const idx = pickSectionIndex(sections);
    const ratio = idx / (sections.length - 1);
    const summit = addMinutes(start, Math.round(durationMin * ratio));
    return { start, summit, end, usedSections: true };
  }

  // Otherwise midpoint
  const summit = addMinutes(start, Math.round(durationMin * 0.5));
  return { start, summit, end, usedSections: false };
}

function weatherStatus(payload: any) {
  // expects your summarized fields if present, otherwise tries raw open-meteo structure
  const temp = payload?.temperature_c ?? payload?.raw?.current?.temperature_2m ?? null;
  const wind = payload?.wind_kph ?? payload?.raw?.current?.wind_speed_10m ?? null;
  const rain =
    payload?.precipitation_chance ?? payload?.raw?.hourly?.precipitation_probability?.[0] ?? null;

  const rainNum = rain != null ? Number(rain) : null;
  const windNum = wind != null ? Number(wind) : null;

  // Simple heuristic:
  // - rain >= 55 => RISK
  // - wind >= 28 => WATCH
  // - rain 30-54 => WATCH
  // else GO
  let status: "GO" | "WATCH" | "RISK" = "GO";
  const reasons: string[] = [];

  if (rainNum != null) {
    if (rainNum >= 55) {
      status = "RISK";
      reasons.push("High rain chance");
    } else if (rainNum >= 30) {
      status = status === "RISK" ? status : "WATCH";
      reasons.push("Moderate rain chance");
    }
  }

  if (windNum != null) {
    if (windNum >= 40) {
      status = "RISK";
      reasons.push("Very strong winds");
    } else if (windNum >= 28) {
      status = status === "RISK" ? status : "WATCH";
      reasons.push("Windy conditions");
    }
  }

  return {
    status,
    reasons: reasons.slice(0, 2),
    temp,
    wind: windNum,
    rain: rainNum,
  };
}

function readinessScore(opts: {
  calendarSynced: boolean;
  checklistDone: number;
  checklistTotal: number;
  weatherFetchedAt: string | null;
  weatherGoStatus: "GO" | "WATCH" | "RISK";
}) {
  let score = 0;
  const reasons: string[] = [];

  // checklist up to 55
  if (opts.checklistTotal > 0) {
    const ratio = opts.checklistDone / opts.checklistTotal;
    score += Math.round(ratio * 55);
    if (ratio < 1) reasons.push("Finish your checklist");
  } else {
    reasons.push("Add a checklist");
  }

  // calendar 15
  if (opts.calendarSynced) score += 15;
  else reasons.push("Sync to Google Calendar");

  // weather freshness 20
  if (opts.weatherFetchedAt) {
    const mins = minutesAgo(opts.weatherFetchedAt);
    if (mins <= 360) score += 20;
    else if (mins <= 1440) score += 12;
    else score += 5;
    if (mins > 360) reasons.push("Refresh weather snapshot");
  } else {
    reasons.push("No weather snapshot yet");
  }

  // weather GO/WATCH/RISK contributes 10 (GO=10, WATCH=6, RISK=2)
  score += opts.weatherGoStatus === "GO" ? 10 : opts.weatherGoStatus === "WATCH" ? 6 : 2;
  if (opts.weatherGoStatus === "RISK") reasons.push("Weather risk is high");

  score = Math.max(0, Math.min(100, score));
  const status = score >= 85 ? "GO" : score >= 65 ? "WATCH" : "RISK";

  return { score, status, reasons: Array.from(new Set(reasons)).slice(0, 4) };
}

function ringProps(score: number) {
  const r = 42;
  const c = 2 * Math.PI * r;
  const dash = c - (score / 100) * c;
  return { r, c, dash };
}

function badgeClass(s: string) {
  if (s === "GO") return "bg-emerald-600 text-white";
  if (s === "WATCH") return "bg-amber-600 text-white";
  return "bg-rose-600 text-white";
}

function cn(...arr: (string | false | undefined)[]) {
  return arr.filter(Boolean).join(" ");
}

export function PlanReadiness({
  planId,
  trailId,
  trailName,
  startAt,
  durationMin,
  calendarSynced,
  checklist,
  weatherFetchedAt,
  weatherPayload,
  routeSections,
}: {
  planId: string;
  trailId: string;
  trailName: string;
  startAt: string;
  durationMin: number;
  calendarSynced: boolean;
  checklist: Item[];
  weatherFetchedAt: string | null;
  weatherPayload: any | null;
  routeSections: any[]; // from Json
}) {
  const [items, setItems] = useState<Item[]>(checklist);
  const [packingMode, setPackingMode] = useState(false);

  const done = useMemo(() => items.filter((i) => i.isDone).length, [items]);
  const total = items.length;

  const sections = useMemo<RouteSection[]>(
    () =>
      Array.isArray(routeSections)
        ? routeSections.map((s) => ({
            label: String(s?.label ?? "Section"),
            type: s?.type ? String(s.type) : undefined,
          }))
        : [],
    [routeSections],
  );

  const timeline = useMemo(
    () => planTimeline(startAt, durationMin, sections),
    [startAt, durationMin, sections],
  );

  const w = useMemo(() => weatherStatus(weatherPayload), [weatherPayload]);

  const r = useMemo(
    () =>
      readinessScore({
        calendarSynced,
        checklistDone: done,
        checklistTotal: total,
        weatherFetchedAt,
        weatherGoStatus: w.status,
      }),
    [calendarSynced, done, total, weatherFetchedAt, w.status],
  );

  async function toggle(id: string) {
    const prev = items;
    setItems((p) => p.map((x) => (x.id === id ? { ...x, isDone: !x.isDone } : x)));

    try {
      const res = await fetch("/api/plans/checklist/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId, itemId: id }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        setItems(prev);
        toast.error(json?.error ?? "Failed");
      }
    } catch {
      setItems(prev);
      toast.error("Network error");
    }
  }

  async function markAllDone() {
    const prev = items;
    setItems((p) => p.map((x) => ({ ...x, isDone: true })));

    try {
      const res = await fetch("/api/plans/checklist/mark-all", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        setItems(prev);
        toast.error(json?.error ?? "Failed");
        return;
      }
      toast.success("Checklist completed");
    } catch {
      setItems(prev);
      toast.error("Network error");
    }
  }

  async function syncCalendar() {
    try {
      const res = await fetch("/api/calendar/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        toast.error(json?.error ?? "Failed to sync calendar");
        return;
      }
      toast.success("Added to Google Calendar");
      // quick refresh
      window.location.reload();
    } catch {
      toast.error("Network error");
    }
  }

  const ring = ringProps(r.score);

  if (packingMode) {
    return (
      <div className="fixed inset-0 z-[80] bg-zinc-50 p-4 dark:bg-zinc-950">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-2 pb-3">
          <div>
            <div className="text-xs text-muted-foreground">Packing mode</div>
            <div className="text-base font-semibold">{trailName}</div>
            <div className="text-xs text-muted-foreground">
              {done}/{total} done
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={markAllDone}
              disabled={total === 0 || done === total}
            >
              Mark all done
            </Button>
            <Button onClick={() => setPackingMode(false)}>Exit</Button>
          </div>
        </div>

        <div className="mx-auto max-w-3xl space-y-3">
          {items.map((it) => (
            <button
              key={it.id}
              onClick={() => toggle(it.id)}
              className={cn(
                "flex w-full items-center justify-between rounded-2xl border px-4 py-4 text-left transition",
                it.isDone ? "bg-emerald-50 dark:bg-emerald-950/30" : "bg-card hover:bg-muted/30",
              )}
            >
              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    "inline-flex h-8 w-8 items-center justify-center rounded-xl border text-sm font-bold",
                    it.isDone
                      ? "border-emerald-600 bg-emerald-600 text-white"
                      : "border-zinc-300 dark:border-zinc-700",
                  )}
                >
                  ✓
                </span>
                <div
                  className={cn(
                    "text-base font-semibold",
                    it.isDone && "line-through text-muted-foreground",
                  )}
                >
                  {it.text}
                </div>
              </div>

              <span className="text-xs text-muted-foreground">{it.isDone ? "Done" : "Tap"}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-12">
      {/* Left: Readiness + ring */}
      <section className="rounded-2xl border bg-card p-5 lg:col-span-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Readiness</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Checklist + calendar + weather = ready-to-go.
            </p>
          </div>
          <Badge className={badgeClass(r.status)}>{r.status}</Badge>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-2xl border p-4">
            <div className="text-xs text-muted-foreground">Readiness ring</div>

            <div className="mt-3 flex items-center justify-center">
              <svg width="120" height="120" viewBox="0 0 120 120">
                <circle
                  cx="60"
                  cy="60"
                  r={ring.r}
                  stroke="currentColor"
                  strokeOpacity="0.12"
                  strokeWidth="12"
                  fill="none"
                />
                <motion.circle
                  cx="60"
                  cy="60"
                  r={ring.r}
                  stroke="currentColor"
                  strokeWidth="12"
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray={ring.c}
                  animate={{ strokeDashoffset: ring.dash }}
                  initial={{ strokeDashoffset: ring.c }}
                  transition={{ duration: 0.7, ease: "easeOut" }}
                  style={{ transformOrigin: "60px 60px", transform: "rotate(-90deg)" }}
                />
              </svg>
              <div className="absolute text-center">
                <div className="text-3xl font-semibold">{r.score}</div>
                <div className="text-xs text-muted-foreground">score</div>
              </div>
            </div>

            <div className="mt-3 text-xs text-muted-foreground">
              Checklist: {done}/{total}
            </div>
          </div>

          <div className="rounded-2xl border p-4">
            <div className="text-xs text-muted-foreground">Plan timeline</div>

            <div className="mt-3 space-y-2 text-sm">
              <div className="flex items-center justify-between rounded-xl border bg-muted/30 px-3 py-2">
                <span className="text-muted-foreground">Start</span>
                <span className="font-semibold">{fmtTime(timeline.start)}</span>
              </div>

              <div className="flex items-center justify-between rounded-xl border bg-muted/30 px-3 py-2">
                <span className="text-muted-foreground">
                  {timeline.usedSections ? "Summit (est.)" : "Midpoint (est.)"}
                </span>
                <span className="font-semibold">{fmtTime(timeline.summit)}</span>
              </div>

              <div className="flex items-center justify-between rounded-xl border bg-muted/30 px-3 py-2">
                <span className="text-muted-foreground">End (est.)</span>
                <span className="font-semibold">{fmtTime(timeline.end)}</span>
              </div>

              <div className="text-xs text-muted-foreground">
                {timeline.usedSections
                  ? "Based on route sections."
                  : "Based on midpoint of duration."}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 rounded-2xl border p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold">Weather</div>
            <Badge className={badgeClass(w.status)}>{w.status}</Badge>
          </div>

          <div className="mt-2 grid grid-cols-3 gap-2">
            <div className="rounded-xl border bg-muted/30 p-3 text-center">
              <div className="text-xs text-muted-foreground">Temp</div>
              <div className="text-sm font-semibold">
                {w.temp != null ? `${Number(w.temp).toFixed(1)}°C` : "-"}
              </div>
            </div>
            <div className="rounded-xl border bg-muted/30 p-3 text-center">
              <div className="text-xs text-muted-foreground">Wind</div>
              <div className="text-sm font-semibold">
                {w.wind != null ? `${Math.round(w.wind)} kph` : "-"}
              </div>
            </div>
            <div className="rounded-xl border bg-muted/30 p-3 text-center">
              <div className="text-xs text-muted-foreground">Rain</div>
              <div className="text-sm font-semibold">
                {w.rain != null ? `${Math.round(w.rain)}%` : "-"}
              </div>
            </div>
          </div>

          <div className="mt-2 text-xs text-muted-foreground">
            Snapshot: {weatherFetchedAt ? `${minutesAgo(weatherFetchedAt)} min ago` : "No data yet"}
            {w.reasons.length ? ` • ${w.reasons.join(" + ")}` : ""}
          </div>
        </div>

        <div className="mt-4 grid gap-2">
          <Button onClick={markAllDone} disabled={total === 0 || done === total}>
            Mark all done
          </Button>

          <Button variant="outline" onClick={() => setPackingMode(true)} disabled={total === 0}>
            Packing mode
          </Button>

          {!calendarSynced ? (
            <Button
              onClick={syncCalendar}
              className="bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
            >
              Add to Google Calendar
            </Button>
          ) : (
            <Button variant="outline" disabled>
              Calendar synced
            </Button>
          )}
        </div>

        <div className="mt-4 space-y-2">
          <div className="text-sm font-semibold">What to improve</div>
          {r.reasons.length === 0 ? (
            <div className="text-sm text-muted-foreground">Looks good.</div>
          ) : (
            <ul className="space-y-1 text-sm text-muted-foreground">
              {r.reasons.map((x) => (
                <li key={x}>• {x}</li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* Right: Checklist */}
      <section className="rounded-2xl border bg-card p-5 lg:col-span-7">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Checklist</h2>
            <p className="mt-1 text-sm text-muted-foreground">Tap items as you pack.</p>
          </div>
          <Badge variant="secondary">
            {done}/{total} done
          </Badge>
        </div>

        {items.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
            No checklist items for this plan.
          </div>
        ) : (
          <div className="mt-4 space-y-2">
            {items.map((it) => (
              <button
                key={it.id}
                onClick={() => toggle(it.id)}
                className={cn(
                  "flex w-full items-start gap-3 rounded-xl border px-3 py-3 text-left transition",
                  it.isDone
                    ? "bg-emerald-50 dark:bg-emerald-950/30"
                    : "bg-background hover:bg-muted/40",
                )}
              >
                <span
                  className={cn(
                    "mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-md border text-xs font-semibold",
                    it.isDone
                      ? "border-emerald-500 bg-emerald-500 text-white"
                      : "border-zinc-300 dark:border-zinc-700",
                  )}
                >
                  ✓
                </span>
                <div className="min-w-0">
                  <div
                    className={cn(
                      "text-sm font-medium",
                      it.isDone && "line-through text-muted-foreground",
                    )}
                  >
                    {it.text}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
