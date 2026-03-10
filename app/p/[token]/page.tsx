import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/src/server/prisma";

function minsAgo(iso: string) {
  const ms = Date.now() - new Date(iso).getTime();
  return Math.max(0, Math.floor(ms / 60000));
}

export default async function PublicPlanPage({ params }: { params: { token: string } }) {
  const token = params?.token ? String(params.token) : "";
  if (!token) notFound();

  const plan = await prisma.hikePlan.findFirst({
    where: {
      shareEnabled: true,
      shareToken: token,
    },
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
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-10">
      <div className="flex items-end justify-between gap-3">
        <div>
          <div className="text-xs text-muted-foreground">Shared plan</div>
          <h1 className="mt-1 text-2xl font-semibold">{plan.trail.name}</h1>
          <div className="mt-2 text-sm text-muted-foreground">
            {plan.trail.region} • {plan.trail.distanceKm} km • {plan.trail.elevationGainM} m gain • {plan.trail.difficulty}
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

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border bg-card p-5">
          <div className="text-sm font-semibold">Checklist progress</div>
          <div className="mt-2 text-2xl font-semibold">{pct}%</div>
          <div className="mt-1 text-sm text-muted-foreground">
            {done}/{total} items done
          </div>

          <div className="mt-4 space-y-2">
            {plan.checklist.slice(0, 10).map((c) => (
              <div key={c.id} className="flex items-center justify-between rounded-xl border bg-background px-3 py-2 text-sm">
                <div className="font-medium">{c.text}</div>
                <div className="text-xs text-muted-foreground">{c.isDone ? "Done" : "Pending"}</div>
              </div>
            ))}
            {plan.checklist.length > 10 ? (
              <div className="text-xs text-muted-foreground">Showing first 10 items…</div>
            ) : null}
          </div>
        </div>

        <div className="rounded-2xl border bg-card p-5">
          <div className="text-sm font-semibold">Weather snapshot</div>
          <div className="mt-2 text-sm text-muted-foreground">
            {latestWeather?.fetchedAt ? `Updated ${minsAgo(latestWeather.fetchedAt.toISOString())} min ago` : "No weather snapshot yet"}
          </div>

          <div className="mt-4 rounded-2xl border bg-muted/20 p-4 text-sm text-muted-foreground">
            This is a public demo view. Weather details are shown as available from the latest snapshot.
          </div>

          <div className="mt-4">
            <Link
              href={`/trails/${plan.trailId}`}
              className="inline-flex items-center justify-center rounded-xl border bg-background px-4 py-2 text-sm font-medium hover:bg-muted/50"
            >
              View trail →
            </Link>
          </div>
        </div>
      </div>

      {plan.notes ? (
        <div className="mt-8 rounded-2xl border bg-card p-5">
          <div className="text-sm font-semibold">Notes</div>
          <div className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{plan.notes}</div>
        </div>
      ) : null}

      <div className="mt-10 text-center text-xs text-muted-foreground">
        Shared link expires: {plan.shareExpiresAt ? plan.shareExpiresAt.toLocaleString() : "Never"}
      </div>
    </main>
  );
}