import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/src/server/prisma";
import { requireUser } from "@/src/server/authz";
import { PlanReadiness } from "@/src/components/plan-readiness";

export default async function PlanDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!user) redirect("/api/auth/signin");

  const { id } = await params;

  const plan = await prisma.hikePlan.findUnique({
    where: { id },
    include: {
      trail: true,
      checklist: { orderBy: { sortOrder: "asc" } },
      calendarLink: true,
    },
  });

  if (!plan) notFound();
  if (plan.userId !== user.id) redirect("/plans");

  const latestWeather = await prisma.weatherSnapshot.findFirst({
    where: { trailId: plan.trailId },
    orderBy: { fetchedAt: "desc" },
    select: { fetchedAt: true, payload: true },
  });

  // Trail sections (optional, from Json field)
  const routeSections = ((plan.trail as any).routeSections as any[] | null | undefined) ?? [];

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border bg-gradient-to-r from-emerald-100/70 via-cyan-50 to-sky-50 p-6 dark:from-emerald-950/20 dark:via-cyan-950/10 dark:to-sky-950/10">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="text-xs text-muted-foreground">Plan</div>
            <h1 className="text-2xl font-semibold tracking-tight">{plan.trail.name}</h1>
            <p className="text-sm text-muted-foreground">
              {new Date(plan.startAt).toLocaleString()} • {plan.durationMin} min •{" "}
              {plan.trail.distanceKm} km • {plan.trail.elevationGainM} m gain
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/plans"
              className="rounded-xl border bg-background px-4 py-2 text-sm font-medium hover:bg-muted"
            >
              Back to Plans
            </Link>
            <Link
              href={`/trails/${plan.trailId}`}
              className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
            >
              View trail
            </Link>
          </div>
        </div>
      </section>

      <PlanReadiness
        planId={plan.id}
        trailId={plan.trailId}
        trailName={plan.trail.name}
        startAt={plan.startAt.toISOString()}
        durationMin={plan.durationMin}
        calendarSynced={!!plan.calendarLink}
        checklist={plan.checklist.map((c) => ({ id: c.id, text: c.text, isDone: c.isDone }))}
        weatherFetchedAt={latestWeather?.fetchedAt?.toISOString() ?? null}
        weatherPayload={(latestWeather?.payload as any) ?? null}
        routeSections={routeSections}
      />

      <section className="rounded-2xl border bg-card p-5">
        <div className="text-sm font-semibold">Notes</div>
        <div className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
          {plan.notes ? plan.notes : "No notes added."}
        </div>
      </section>
    </div>
  );
}
