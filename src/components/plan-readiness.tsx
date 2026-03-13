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

  if (sections.length >= 2) {
    const idx = pickSectionIndex(sections);
    const ratio = idx / (sections.length - 1);
    const summit = addMinutes(start, Math.round(durationMin * ratio));
    return { start, summit, end, usedSections: true };
  }

  const summit = addMinutes(start, Math.round(durationMin * 0.5));
  return { start, summit, end, usedSections: false };
}

function weatherStatus(payload: any) {
  const temp = payload?.temperature_c ?? payload?.raw?.current?.temperature_2m ?? null;
  const wind = payload?.wind_kph ?? payload?.raw?.current?.wind_speed_10m ?? null;
  const rain = payload?.precipitation_chance ?? payload?.raw?.hourly?.precipitation_probability?.[0] ?? null;

  const rainNum = rain != null ? Number(rain) : null;
  const windNum = wind != null ? Number(wind) : null;

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

async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      ta.style.top = "0";
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }
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
  const [items, setItems] = useState(checklist);
  const [packingMode, setPackingMode] = useState(false);

  // ✅ Share Link state
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [shareExpiresAt, setShareExpiresAt] = useState<string | null>(null);
  const [shareLoading, setShareLoading] = useState(false);

  const done = useMemo(() => items.filter((i) => i.isDone).length, [items]);
  const total = items.length;

  const sections = useMemo(
    () =>
      Array.isArray(routeSections)
        ? routeSections.map((s) => ({
            label: String(s?.label ?? "Section"),
            type: s?.type ? String(s.type) : undefined,
          }))
        : [],
    [routeSections],
  );

  const timeline = useMemo(() => planTimeline(startAt, durationMin, sections), [startAt, durationMin, sections]);
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
      window.location.reload();
    } catch {
      toast.error("Network error");
    }
  }

  async function ensureShareLink(expiresInDays: 1 | 7 | 30 = 7) {
    if (shareUrl) return shareUrl;

    setShareLoading(true);
    try {
      const res = await fetch("/api/plans/share/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId, expiresInDays }),
      });

      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) {
        toast.error(json?.error ?? "Failed to create share link");
        return null;
      }

      const url = `${window.location.origin}/p/${json.token}`;
      setShareUrl(url);
      setShareExpiresAt(json.expiresAt ?? null);
      return url;
    } catch {
      toast.error("Network error");
      return null;
    } finally {
      setShareLoading(false);
    }
  }

  async function copyPublicLink() {
    const url = await ensureShareLink(7);
    if (!url) return;

    const ok = await copyToClipboard(url);
    if (ok) toast.success("Public link copied");
    else toast.error("Copy failed");
  }

  async function openPublicLink() {
    const url = shareUrl ?? (await ensureShareLink(7));
    if (!url) return;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  async function copyPlanSummary() {
    const start = new Date(startAt);
    const link = typeof window !== "undefined" ? window.location.href : "";

    const weatherLine =
      w.temp != null || w.wind != null || w.rain != null
        ? `Weather: ${w.status} • Temp ${w.temp != null ? `${Number(w.temp).toFixed(1)}°C` : "-"} • Wind ${
            w.wind != null ? `${Math.round(w.wind)} kph` : "-"
          } • Rain ${w.rain != null ? `${Math.round(w.rain)}%` : "-"}`
        : `Weather: ${w.status}`;

    const snapshotLine = weatherFetchedAt ? `Snapshot: ${minutesAgo(weatherFetchedAt)} min ago` : "Snapshot: No data yet";

    const publicLine = shareUrl ? `Public link: ${shareUrl}` : "";

    const text = [
      `TrailPulse Plan`,
      `Trail: ${trailName}`,
      `Start: ${start.toLocaleString()}`,
      `Duration: ${durationMin} min`,
      `Checklist: ${done}/${total} done`,
      weatherLine,
      snapshotLine,
      publicLine,
      link ? `Link: ${link}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    const ok = await copyToClipboard(text);
    if (ok) toast.success("Plan summary copied");
    else toast.error("Copy failed");
  }

  const ring = ringProps(r.score);

  if (packingMode) {
    return (
      <div className="rounded-2xl border bg-card p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-xs text-muted-foreground">Packing mode</div>
            <div className="mt-1 text-lg font-semibold">{trailName}</div>
            <div className="mt-1 text-sm text-muted-foreground">
              {done}/{total} done
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={markAllDone} disabled={total === 0}>
              Mark all done
            </Button>
            <Button variant="outline" onClick={() => setPackingMode(false)}>
              Exit
            </Button>
          </div>
        </div>

        <div className="mt-4 grid gap-2">
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
                    "grid h-7 w-7 place-items-center rounded-full border",
                    it.isDone && "bg-emerald-600 text-white border-emerald-600",
                  )}
                >
                  ✓
                </span>
                <div className="font-medium">{it.text}</div>
              </div>
              <div className="text-xs text-muted-foreground">{it.isDone ? "Done" : "Tap"}</div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-12">
      {/* Left: Readiness */}
      <section className="rounded-2xl border bg-card p-5 lg:col-span-7">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-xs text-muted-foreground">Readiness</div>
            <h2 className="mt-1 text-lg font-semibold">Checklist + calendar + weather</h2>
            <p className="mt-1 text-sm text-muted-foreground">A quick readiness signal for your plan.</p>
          </div>
          <Badge className={cn("rounded-full px-3 py-1", badgeClass(r.status))}>{r.status}</Badge>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold">Readiness ring</div>
              <div className="text-xs text-muted-foreground">{r.score}/100</div>
            </div>

            <div className="mt-4 flex items-center gap-4">
              <div className="relative h-28 w-28">
                <svg width="112" height="112" viewBox="0 0 112 112">
                  <circle cx="56" cy="56" r={ring.r} stroke="currentColor" strokeOpacity="0.12" strokeWidth="10" fill="none" />
                  <motion.circle
                    cx="56"
                    cy="56"
                    r={ring.r}
                    stroke="currentColor"
                    strokeWidth="10"
                    fill="none"
                    strokeLinecap="round"
                    strokeDasharray={ring.c}
                    strokeDashoffset={ring.dash}
                    initial={{ strokeDashoffset: ring.c }}
                    animate={{ strokeDashoffset: ring.dash }}
                    transition={{ duration: 0.7 }}
                  />
                </svg>
                <div className="absolute inset-0 grid place-items-center">
                  <div className="text-center">
                    <div className="text-2xl font-semibold">{r.score}</div>
                    <div className="text-xs text-muted-foreground">score</div>
                  </div>
                </div>
              </div>

              <div className="text-sm text-muted-foreground">
                <div>
                  Checklist:{" "}
                  <span className="font-medium text-foreground">
                    {done}/{total}
                  </span>
                </div>
                <div className="mt-2">
                  <div className="text-xs text-muted-foreground">Plan timeline</div>
                  <div className="mt-1">Start {fmtTime(timeline.start)}</div>
                  <div className="mt-1">
                    {timeline.usedSections ? "Summit (est.)" : "Midpoint (est.)"} {fmtTime(timeline.summit)}
                  </div>
                  <div className="mt-1">End (est.) {fmtTime(timeline.end)}</div>
                  <div className="mt-2 text-xs text-muted-foreground">
                    {timeline.usedSections ? "Based on route sections." : "Based on midpoint of duration."}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold">Weather</div>
              <Badge className={cn("rounded-full px-3 py-1", badgeClass(w.status))}>{w.status}</Badge>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2">
              <div className="rounded-xl border bg-background p-3 text-center">
                <div className="text-xs text-muted-foreground">Temp</div>
                <div className="text-base font-semibold">{w.temp != null ? `${Number(w.temp).toFixed(1)}°C` : "-"}</div>
              </div>
              <div className="rounded-xl border bg-background p-3 text-center">
                <div className="text-xs text-muted-foreground">Wind</div>
                <div className="text-base font-semibold">{w.wind != null ? `${Math.round(w.wind)} kph` : "-"}</div>
              </div>
              <div className="rounded-xl border bg-background p-3 text-center">
                <div className="text-xs text-muted-foreground">Rain</div>
                <div className="text-base font-semibold">{w.rain != null ? `${Math.round(w.rain)}%` : "-"}</div>
              </div>
            </div>

            <div className="mt-3 text-xs text-muted-foreground">
              Snapshot: {weatherFetchedAt ? `${minutesAgo(weatherFetchedAt)} min ago` : "No data yet"}
              {w.reasons.length ? ` • ${w.reasons.join(" + ")}` : ""}
            </div>
          </div>
        </div>

        {/* ✅ Actions */}
        <div className="mt-5 flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={markAllDone} disabled={total === 0}>
            Mark all done
          </Button>
          <Button variant="outline" onClick={() => setPackingMode(true)} disabled={total === 0}>
            Packing mode
          </Button>

          <Button variant="outline" onClick={copyPlanSummary}>
            Copy plan summary
          </Button>

          {/* ✅ Share link buttons (flagship) */}
          <Button variant="outline" onClick={copyPublicLink} disabled={shareLoading}>
            {shareLoading ? "Generating…" : shareUrl ? "Copy public link" : "Create + copy public link"}
          </Button>

          <Button variant="outline" onClick={openPublicLink} disabled={shareLoading || !shareUrl}>
            Open public link
          </Button>

          {!calendarSynced ? (
            <Button onClick={syncCalendar}>Add to Google Calendar</Button>
          ) : (
            <Button variant="outline" disabled>
              Calendar synced
            </Button>
          )}
        </div>

        {shareUrl ? (
          <div className="mt-4 rounded-2xl border bg-muted/20 p-4">
            <div className="text-xs text-muted-foreground">Public link</div>
            <div className="mt-1 break-all text-sm font-medium">{shareUrl}</div>
            <div className="mt-2 text-xs text-muted-foreground">
              Expires: {shareExpiresAt ? new Date(shareExpiresAt).toLocaleString() : "Unknown"}
            </div>
          </div>
        ) : null}

        <div className="mt-5 rounded-2xl border bg-muted/20 p-4">
          <div className="text-sm font-semibold">What to improve</div>
          <div className="mt-2 text-sm text-muted-foreground">
            {r.reasons.length === 0 ? "Looks good." : r.reasons.map((x) => <div key={x}>• {x}</div>)}
          </div>
        </div>
      </section>

      {/* Right: Checklist */}
      <section className="rounded-2xl border bg-card p-5 lg:col-span-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-xs text-muted-foreground">Checklist</div>
            <h2 className="mt-1 text-lg font-semibold">Tap items as you pack</h2>
            <div className="mt-1 text-sm text-muted-foreground">
              {done}/{total} done
            </div>
          </div>
        </div>

        <div className="mt-4 grid gap-2">
          {items.length === 0 ? (
            <div className="rounded-2xl border bg-muted/20 p-4 text-sm text-muted-foreground">No checklist items for this plan.</div>
          ) : (
            items.map((it) => (
              <button
                key={it.id}
                onClick={() => toggle(it.id)}
                className={cn(
                  "flex w-full items-start gap-3 rounded-xl border px-3 py-3 text-left transition",
                  it.isDone ? "bg-emerald-50 dark:bg-emerald-950/30" : "bg-background hover:bg-muted/40",
                )}
              >
                <span
                  className={cn(
                    "mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full border",
                    it.isDone && "bg-emerald-600 text-white border-emerald-600",
                  )}
                >
                  ✓
                </span>
                <div className="text-sm">
                  <div className="font-medium">{it.text}</div>
                  <div className="text-xs text-muted-foreground">{it.isDone ? "Done" : "Tap to mark done"}</div>
                </div>
              </button>
            ))
          )}
        </div>
      </section>
    </div>
  );
}