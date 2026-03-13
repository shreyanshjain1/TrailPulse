import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/src/server/prisma";
import PublicCopyButtons from "./public-copy-buttons";

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

  // Prefer APP_URL in production; fall back to relative path for local
  const baseUrl = process.env.APP_URL || "";
  const shareUrl = baseUrl ? `${baseUrl}/p/${token}` : `/p/${token}`;

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10">
      <div className="flex items-end justify-between gap-3">
        <div>
          <div className="text-xs text-muted-foreground">Shared Plan (Read-only)</div>
          <h1 className="mt-1 text-2xl font-semibold">{plan.trail.name}</h1>
          <div className="mt-2 text-sm text-muted-foreground">
            {plan.trail.region} • {plan.trail.difficulty} • {plan.trail.distanceKm} km • {plan.trail.elevationGainM} m gain
          </div>
          <div className="mt-2 text-sm text-muted-foreground">
            Start: {new Date(plan.startAt).toLocaleString()} • Duration: {plan.durationMin} min
          </div>
        </div>

        <Link
          href="/"
          className="inline-flex items-center justify-center rounded-xl border bg-background px-4 py-2 text-sm font-medium hover:bg-muted/50"
        >
          TrailPulse →
        </Link>
      </div>

      <div className="mt-8 grid gap-4 lg:grid-cols-12">
        <section className="rounded-2xl border bg-card p-5 lg:col-span-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="text-sm font-semibold">Plan Overview</div>
              <div className="mt-1 text-sm text-muted-foreground">Anyone with this link can view this plan.</div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href={`/trails/${plan.trailId}`}
                className="inline-flex items-center justify-center rounded-xl border bg-background px-4 py-2 text-sm font-medium hover:bg-muted/50"
              >
                Open Trail →
              </Link>
            </div>
          </div>

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

          <div className="mt-6 rounded-2xl border bg-muted/20 p-4">
            <div className="text-sm font-semibold">Notes</div>
            <div className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{plan.notes ? plan.notes : "No notes added."}</div>
          </div>

          <div className="mt-6 text-xs text-muted-foreground">
            Share link expires: {plan.shareExpiresAt ? plan.shareExpiresAt.toLocaleString() : "Never"}
          </div>
        </section>

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
            <div className="mt-2 text-sm text-muted-foreground">Copy the public link or a clean summary.</div>
            <div className="mt-4">
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
                shareUrl={shareUrl}
              />
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}