import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/src/server/prisma";
import { requireUser } from "@/src/server/authz";
import { PlanReadiness } from "@/src/components/plan-readiness";

export default async function PlanDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
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
  if (plan.userId !== user.id) redirect("/dashboard");

  const latestWeather = await prisma.weatherSnapshot.findFirst({
    where: { trailId: plan.trailId },
    orderBy: { fetchedAt: "desc" },
    select: { fetchedAt: true },
  });

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border bg-gradient-to-r from-emerald-100/70 via-cyan-50 to-sky-50 p-6 dark:from-emerald-950/20 dark:via-cyan-950/10 dark:to-sky-950/10">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Plan</h1>
            <p className="text-sm text-muted-foreground">
              {plan.trail.name} • {new Date(plan.startAt).toLocaleString()} • {plan.durationMin} min
            </p>
          </div>
          <Link href={`/trails/${plan.trailId}`} className="text-sm font-medium underline">
            View trail →
          </Link>
        </div>
      </section>

      <PlanReadiness
        planId={plan.id}
        calendarSynced={!!plan.calendarLink}
        checklist={plan.checklist.map((c) => ({ id: c.id, text: c.text, isDone: c.isDone }))}
        weatherFetchedAt={latestWeather?.fetchedAt?.toISOString() ?? null}
      />

      <section className="rounded-2xl border bg-card p-5">
        <div className="text-sm font-semibold">Notes</div>
        <div className="mt-2 text-sm text-muted-foreground whitespace-pre-wrap">
          {plan.notes ? plan.notes : "No notes added."}
        </div>
      </section>
    </div>
  );
}