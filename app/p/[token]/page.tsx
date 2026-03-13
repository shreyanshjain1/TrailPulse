import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/src/server/prisma";

function minsAgo(d: Date) {
  const ms = Date.now() - d.getTime();
  return Math.max(0, Math.floor(ms / 60000));
}

function pickWeather(payload: any) {
  const temp = payload?.temperature_c ?? payload?.raw?.current?.temperature_2m ?? null;
  const wind = payload?.wind_kph ?? payload?.raw?.current?.wind_speed_10m ?? null;
  const rain = payload?.precipitation_chance ?? payload?.raw?.hourly?.precipitation_probability?.[0] ?? null;

  return {
    temp: temp != null ? Number(temp) : null,
    wind: wind != null ? Number(wind) : null,
    rain: rain != null ? Number(rain) : null,
  };
}

function pct(done: number, total: number) {
  if (total <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((done / total) * 100)));
}

export default async function PublicPlanPage({ params }: { params: { token: string } }) {
  const token = params?.token ? String(params.token) : "";
  if (!token) notFound();

  const plan = await prisma.hikePlan.findFirst({
    where: { shareEnabled: true, shareToken: token },
    include: {
      trail: true,
      checklist: { orderBy: { sortOrder: "asc" } },
    },
  });

  if (!plan) notFound();
  if (plan.shareExpiresAt && plan.shareExpiresAt.getTime() < Date.now()) notFound();

  const latestWeather = await prisma.weatherSnapshot.findFirst({
    where: { trailId: plan.trailId },
    orderBy: { fetchedAt: "desc" },
    select: { fetchedAt: true, payload: true },
  });

  const total = plan.checklist.length;
  const done = plan.checklist.filter((c) => c.isDone).length;
  const progress = pct(done, total);

  const w = latestWeather ? pickWeather(latestWeather.payload) : { temp: null, wind: null, rain: null };
  const startStr = new Date(plan.startAt).toLocaleString();
  const expStr = plan.shareExpiresAt ? plan.shareExpiresAt.toLocaleString() : "Never";

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10">
      {/* Top bar */}
      <div className="flex items-end justify-between gap-3">
        <div>
          <div className="text-xs text-muted-foreground">Shared Plan (Read-only)</div>
          <h1 className="mt-1 text-2xl font-semibold">{plan.trail.name}</h1>
          <div className="mt-2 text-sm text-muted-foreground">
            {plan.trail.region} • {plan.trail.difficulty} • {plan.trail.distanceKm} km • {plan.trail.elevationGainM} m gain
          </div>
          <div className="mt-2 text-sm text-muted-foreground">
            Start: {startStr} • Duration: {plan.durationMin} min
          </div>
        </div>

        <Link
          href="/"
          className="inline-flex items-center justify-center rounded-xl border bg-background px-4 py-2 text-sm font-medium hover:bg-muted/50"
        >
          TrailPulse →
        </Link>
      </div>

      {/* Hero */}
      <div className="mt-8 grid gap-4 lg:grid-cols-12">
        <section className="rounded-2xl border bg-card p-5 lg:col-span-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="text-sm font-semibold">Plan Overview</div>
              <div className="mt-1 text-sm text-muted-foreground">
                This is a public share link. No login required.
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href={`/trails/${plan.trailId}`}
                className="inline-flex items-center justify-center rounded-xl border bg-background px-4 py-2 text-sm font-medium hover:bg-muted/50"
              >
                Open Trail →
              </Link>

              {/* Copy Share Link (client-safe inline) */}
              <button
                className="inline-flex items-center justify-center rounded-xl border bg-background px-4 py-2 text-sm font-medium hover:bg-muted/50"
                onClick={async () => {
                  "use client";
                }}
              >
                {/* This button is visually here; actual copy buttons below in client widget */}
                Copy tools below ↓
              </button>
            </div>
          </div>

          {/* Checklist progress */}
          <div className="mt-6 rounded-2xl border bg-muted/20 p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="text-sm font-semibold">Checklist Progress</div>
              <div className="text-xs text-muted-foreground">
                {done}/{total} done • {progress}%
              </div>
            </div>

            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-emerald-600" style={{ width: `${progress}%` }} />
            </div>

            <div className="mt-4 grid gap-2">
              {total === 0 ? (
                <div className="rounded-xl border bg-background p-3 text-sm text-muted-foreground">No checklist items in this plan.</div>
              ) : (
                plan.checklist.slice(0, 8).map((c) => (
                  <div key={c.id} className="flex items-start justify-between gap-3 rounded-xl border bg-background px-3 py-2">
                    <div className="text-sm font-medium">{c.text}</div>
                    <div className="text-xs text-muted-foreground">{c.isDone ? "Done" : "Pending"}</div>
                  </div>
                ))
              )}

              {total > 8 ? <div className="text-xs text-muted-foreground">Showing first 8 items…</div> : null}
            </div>
          </div>

          {/* Notes */}
          <div className="mt-6 rounded-2xl border bg-muted/20 p-4">
            <div className="text-sm font-semibold">Notes</div>
            <div className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
              {plan.notes ? plan.notes : "No notes added."}
            </div>
          </div>

          <div className="mt-6 text-xs text-muted-foreground">Share link expires: {expStr}</div>
        </section>

        {/* Right column */}
        <aside className="rounded-2xl border bg-card p-5 lg:col-span-4">
          <div className="text-sm font-semibold">Weather Snapshot</div>
          <div className="mt-1 text-xs text-muted-foreground">
            {latestWeather?.fetchedAt ? `Updated ${minsAgo(latestWeather.fetchedAt)} min ago` : "No snapshot available"}
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2">
            <div className="rounded-xl border bg-background p-3 text-center">
              <div className="text-xs text-muted-foreground">Temp</div>
              <div className="text-base font-semibold">{w.temp != null ? `${w.temp.toFixed(1)}°C` : "-"}</div>
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

          <div className="mt-6 rounded-2xl border bg-muted/20 p-4">
            <div className="text-sm font-semibold">Share Tools</div>
            <div className="mt-2 text-sm text-muted-foreground">
              Copy the public link or a neat plan summary to share with friends.
            </div>

            {/* Client buttons */}
            <div className="mt-4 grid gap-2">
              <PublicCopyButtons
                trailName={plan.trail.name}
                startAt={plan.startAt.toISOString()}
                durationMin={plan.durationMin}
                checklistDone={done}
                checklistTotal={total}
                weatherLine={
                  w.temp != null || w.wind != null || w.rain != null
                    ? `Weather • Temp ${w.temp != null ? `${w.temp.toFixed(1)}°C` : "-"} • Wind ${
                        w.wind != null ? `${Math.round(w.wind)} kph` : "-"
                      } • Rain ${w.rain != null ? `${Math.round(w.rain)}%` : "-"}`
                    : "Weather • No snapshot"
                }
                shareUrl={`${process.env.APP_URL || "http://localhost:3000"}/p/${token}`}
              />
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}

/**
 * Client component embedded in the public page for copy-to-clipboard actions.
 * Keeping UI premium while page stays read-only / no auth required.
 */
function PublicCopyButtons(props: {
  trailName: string;
  startAt: string;
  durationMin: number;
  checklistDone: number;
  checklistTotal: number;
  weatherLine: string;
  shareUrl: string;
}) {
  // Next.js Server Component file: define client component inline via "use client" boundary
  // eslint-disable-next-line @next/next/no-async-client-component
  const Client = require("./public-copy-buttons").default;
  return <Client {...props} />;
}